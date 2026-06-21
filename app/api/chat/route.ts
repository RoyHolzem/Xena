import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import type { XenaUiAction } from '@/lib/xena-ui-actions';

// Amplify SSR (Lambda) max execution ~ 60s for streaming LLM responses
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// SSE stream transform: inject xena_ui actions when record IDs appear in delta
// ---------------------------------------------------------------------------

const RECORD_ID_RE = /\b(INCIDENT-LUX-\d{4}-\d{4}|EVENT-LUX-\d{4}-\d{4}|PW-LUX-\d{4}-\d{4}|ORDER-LUX-\d{4}-\d{4})\b/g;

function recordIdToAction(recordId: string): XenaUiAction | null {
  if (recordId.startsWith('INCIDENT-')) return { type: 'OPEN_INCIDENT', recordId };
  if (recordId.startsWith('EVENT-')) return { type: 'OPEN_EVENT', recordId };
  if (recordId.startsWith('PW-')) return { type: 'OPEN_PLANNED_WORK', recordId };
  if (recordId.startsWith('ORDER-')) return { type: 'OPEN_ORDER', recordId };
  return null;
}

/**
 * Create a TransformStream that parses the SSE stream from the gateway.
 * When a `choices[0].delta.content` chunk contains a recognised record ID,
 * we inject an additional `data:` line with `{ type: "xena_ui", uiActions: [...] }`.
 * Each recordId is emitted at most once per request to avoid duplicates.
 *
 * SSE events are separated by blank lines (\n\n). The gateway sends each event as
 * `data: {json}\n\n`. We must forward the original event's full framing (including
 * the trailing \n\n) before injecting new events.
 */
function createXenaUiInjector(): TransformStream<Uint8Array, Uint8Array> {
  const seen = new Set<string>();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      // SSE events are separated by \n\n — split on that boundary
      const events = buffer.split('\n\n');
      buffer = events.pop()!; // keep the last incomplete fragment

      for (const event of events) {
        // Forward the complete SSE event with its terminator
        controller.enqueue(encoder.encode(event + '\n\n'));

        // Find the data: line within this event
        const dataLine = event.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine || dataLine === 'data: [DONE]') continue;

        try {
          const json = JSON.parse(dataLine.slice(6));
          const content: string =
            json?.choices?.[0]?.delta?.content ??
            json?.choices?.[0]?.message?.content ??
            '';
          if (!content) continue;

          let match: RegExpExecArray | null;
          RECORD_ID_RE.lastIndex = 0;
          while ((match = RECORD_ID_RE.exec(content)) !== null) {
            const recordId = match[1];
            if (seen.has(recordId)) continue;
            seen.add(recordId);

            const action = recordIdToAction(recordId);
            if (!action) continue;

            const payload = JSON.stringify({
              type: 'xena_ui',
              uiActions: [action],
            });
            // Inject as a separate SSE event with its own \n\n terminator
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          // Not JSON — skip
        }
      }
    },
    flush(controller) {
      if (buffer) {
        controller.enqueue(encoder.encode(buffer));
      }
    },
  });
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';
const SECRET_NAME = 'xena/gateway-token';
const REGION = 'eu-central-1';

const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedToken = '';
let cachedAt = 0;
const CACHE_TTL = 300_000; // 5 min cache

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) return cachedToken;

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    const parsed = JSON.parse(response.SecretString || '{}');
    const token = parsed.token || '';
    if (!token || token === 'placeholder') {
      throw new Error('Token is placeholder or empty');
    }
    console.log('[chat] Secret loaded, length:', token.length);
    cachedToken = token;
    cachedAt = now;
    return cachedToken;
  } catch (err: any) {
    console.error('[chat] Failed to fetch secret:', err.message);
    throw err;
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messages?: Array<{ role: string; content: string }>; model?: string; model_override?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.messages?.length) {
    return Response.json({ error: 'Messages required' }, { status: 400 });
  }

  let gatewayToken: string;
  try {
    gatewayToken = await getGatewayToken();
  } catch (err: any) {
    return Response.json({ error: 'Gateway config error: ' + err.message }, { status: 503 });
  }

  const gatewayUrl = GATEWAY_URL + CHAT_PATH;
  const maxRetries = 3;
  let lastError: string = '';
  const requestedModel = body.model_override || body.model || 'openclaw/operator';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000); // 25s per attempt

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + gatewayToken,
      };
      if (body.model_override) {
        headers['x-openclaw-model'] = body.model_override;
      }
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: body.model || 'openclaw/operator',
          stream: true,
          messages: body.messages,
          user: user.sub,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok || !response.body) {
        const text = await response.text();
        lastError = text || ('Gateway error ' + response.status);
        // Retry on 502/504 (cold start or gateway not ready)
        if ((response.status === 502 || response.status === 504) && attempt < maxRetries) {
          console.log(`[chat] Attempt ${attempt} failed (${response.status}), retrying...`);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        // Propagate error with model context so frontend can show what failed
        return Response.json(
          {
            error: lastError,
            requested_model: requestedModel,
            attempt,
          },
          { status: response.status }
        );
      }

      // Forward the actual model used (if gateway provides it) + what was requested
      const actualModel = response.headers.get('x-actual-model') || response.headers.get('x-model') || '';
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-requested-model': requestedModel,
      };
      if (actualModel) {
        responseHeaders['x-actual-model'] = actualModel;
      }

      // Pipe through the stream transformer:
      // 1. Inject xena_ui actions when record IDs appear in delta content
      // 2. Forward tool_calls from OpenAI-format deltas
      const seen = new Set<string>();
      const reader = response.body!.getReader();
      let buffer = '';

      const injectedStream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          const text = new TextDecoder().decode(value, { stream: true });
          buffer += text;
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            if (!event.trim()) continue;

            // Forward the event as-is
            controller.enqueue(new TextEncoder().encode(event + '\n\n'));

            const dataLine = event.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine || dataLine === 'data: [DONE]') continue;

            try {
              const json = JSON.parse(dataLine.slice(6));

              // Forward tool_calls from OpenAI-format deltas
              const toolCalls = json?.choices?.[0]?.delta?.tool_calls;
              if (Array.isArray(toolCalls)) {
                for (const tc of toolCalls) {
                  if (tc.function?.name) {
                    const actionPayload = JSON.stringify({
                      type: 'action',
                      verb: 'invoked',
                      category: 'general',
                      label: tc.function.name,
                      detail: tc.function.arguments?.substring(0, 200),
                      timestamp: new Date().toISOString(),
                    });
                    controller.enqueue(new TextEncoder().encode(`data: ${actionPayload}\n\n`));
                  }
                }
              }

              // Scan for record IDs in delta content
              const content: string =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                '';
              if (!content) continue;

              let match: RegExpExecArray | null;
              RECORD_ID_RE.lastIndex = 0;
              while ((match = RECORD_ID_RE.exec(content)) !== null) {
                const recordId = match[1];
                if (seen.has(recordId)) continue;
                seen.add(recordId);

                const action = recordIdToAction(recordId);
                if (!action) continue;

                const payload = JSON.stringify({
                  type: 'xena_ui',
                  uiActions: [action],
                });
                controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
              }
            } catch {
              // Not JSON — skip
            }
          }
        },
        cancel() {
          reader.cancel();
        },
      });

      return new Response(injectedStream, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gateway connection failed';
      lastError = message;
      if (attempt < maxRetries) {
        console.log(`[chat] Attempt ${attempt} failed (${message}), retrying...`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  return Response.json(
    {
      error: `Gateway unavailable after ${maxRetries} attempts: ${lastError}`,
      requested_model: requestedModel,
    },
    { status: 504 }
  );
}
