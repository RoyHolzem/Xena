import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';
const SECRET_NAME = process.env.GATEWAY_TOKEN_SECRET_NAME || '';
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION || 'eu-central-1';

const secretsClient = new SecretsManagerClient({ region: REGION });

// Cache the token in memory for 60 seconds to avoid hitting Secrets Manager on every request
let cachedToken = "";
let cachedAt = 0;
const CACHE_TTL = 60_000;

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) return cachedToken;

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_NAME })
  );
  const parsed = JSON.parse(response.SecretString || '{}');
  cachedToken = parsed.token || '';
  cachedAt = now;
  return cachedToken;
}

export async function POST(request: Request) {
  // -- Auth check --
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // -- Parse body --
  let body: { messages?: Array<{ role: string; content: string }>; model?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.messages?.length) {
    return Response.json({ error: 'Messages required' }, { status: 400 });
  }

  // -- Fetch gateway token from Secrets Manager --
  let gatewayToken: string;
  try {
    gatewayToken = await getGatewayToken();
  } catch (err) {
    console.error('Failed to fetch gateway token from Secrets Manager:', err);
    return Response.json({ error: 'Gateway configuration error' }, { status: 500 });
  }

  if (!gatewayToken || gatewayToken === 'placeholder') {
    return Response.json({ error: 'Gateway token not configured. Push it via Secrets Manager.' }, { status: 503 });
  }

  // -- Forward to gateway --
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

    // -- Stream response --
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
