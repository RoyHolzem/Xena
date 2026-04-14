import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const CHAT_PATH = process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions';
const SECRET_NAME = 'xena/gateway-token';
const REGION = 'eu-central-1';

const secretsClient = new SecretsManagerClient({ region: REGION });
const stsClient = new STSClient({ region: REGION });

let cachedToken = '';
let cachedAt = 0;
const CACHE_TTL = 60_000;

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) return cachedToken;

  // Step 3: Log who we're running as
  try {
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('[chat] Running as:', identity.Arn, 'Account:', identity.Account);
  } catch (err: any) {
    console.error('[chat] Cannot get caller identity:', err.message);
  }

  // Step 4: Fetch the secret
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    const parsed = JSON.parse(response.SecretString || '{}');
    const token = parsed.token || '';
    if (!token || token === 'placeholder') {
      throw new Error('Token is placeholder or empty');
    }
    // Step 5: Log success without exposing the secret
    console.log('[chat] Secret loaded successfully, length:', token.length);
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
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + gatewayToken,
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
        { error: text || ('Gateway error ' + response.status) },
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
