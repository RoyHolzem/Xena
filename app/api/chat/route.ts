import { verifyToken } from '@/lib/cognito-jwt';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const GATEWAY_TOKEN = process.env.GATEWAY_AUTH_TOKEN || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';

export async function POST(request: Request) {
  // ── Auth check ──
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ──
  let body: { messages?: Array<{ role: string; content: string }>; model?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.messages?.length) {
    return Response.json({ error: 'Messages required' }, { status: 400 });
  }

  // ── Forward to gateway ──
  const gatewayUrl = `${GATEWAY_URL}${CHAT_PATH}`;
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: body.model || 'openclaw',
        stream: true,
        messages: body.messages,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      return Response.json(
        { error: text || `Gateway error ${response.status}` },
        { status: response.status }
      );
    }

    // ── Stream response ──
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
    return Response.json({ error: message }, { status: 502 });
  }
}
