import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
const SECRET_NAME = 'xena/gateway-token';
const REGION = 'eu-central-1';

const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedToken = '';
let cachedAt = 0;
const CACHE_TTL = 300_000;

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) return cachedToken;
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_NAME })
  );
  const parsed = JSON.parse(response.SecretString || '{}');
  const token = parsed.token || '';
  cachedToken = token;
  cachedAt = now;
  return cachedToken;
}

export async function GET() {
  try {
    const token = await getGatewayToken();
    const res = await fetch(`${GATEWAY_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
