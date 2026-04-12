import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';
const SECRET_NAME = process.env.NEXT_PUBLIC_GATEWAY_TOKEN_SECRET_NAME || '';
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION || 'eu-central-1';
const FALLBACK_TOKEN = process.env.GATEWAY_AUTH_TOKEN || '';

const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedToken = '';
let cachedAt = 0;
const CACHE_TTL = 60_000;

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) return cachedToken;

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    const parsed = JSON.parse(response.SecretString || '{}');
    const token = parsed.token || '';
    if (token && token !== 'placeholder') {
      cachedToken = token;
      cachedAt = now;
      return cachedToken;
    }
  } catch {
    // Secrets Manager unavailable, fall through to env var
  }

  return FALLBACK_TOKEN;
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

  const gatewayToken = await getGatewayToken();
  if (!gatewayToken) {
    return Response.json({ error: 'Gateway token not configured.' }, { status: 503 });
  }

  const gatewayUrl = `${GATEWAY_URL}${CHAT_PATH}`;
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
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
