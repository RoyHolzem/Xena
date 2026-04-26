import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// Amplify SSR (Lambda) max execution — 60s for streaming LLM responses
export const maxDuration = 60;

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

  let body: { messages?: Array<{ role: string; content: string }>; model?: string; stream?: boolean };
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000); // 25s per attempt

      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + gatewayToken,
        },
        body: JSON.stringify({
          model: body.model || 'operator',
          stream: true,
          messages: body.messages,
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
        return Response.json(
          { error: lastError },
          { status: response.status }
        );
      }

      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
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

  return Response.json({ error: `Gateway unavailable after ${maxRetries} attempts: ${lastError}` }, { status: 504 });
}
