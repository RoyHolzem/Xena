import { verifyToken } from '@/lib/cognito-jwt';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_AUTH_TOKEN || '';

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

  if (!GATEWAY_TOKEN) {
    return Response.json({ error: 'Gateway token not configured.' }, { status: 503 });
  }

  const gatewayUrl = GATEWAY_URL + CHAT_PATH;
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + GATEWAY_TOKEN,
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
        { error: text || 'Gateway error' },
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
    return Response.json({ error: message }, { status: 502 });
  }
}
