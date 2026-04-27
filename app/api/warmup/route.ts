import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const SECRET_NAME = 'xena/gateway-token';
const REGION = 'eu-central-1';
const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedToken = '';
let cachedAt = 0;

async function getGatewayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < 300_000) return cachedToken;
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  const parsed = JSON.parse(response.SecretString || '{}');
  cachedToken = parsed.token || '';
  cachedAt = now;
  return cachedToken;
}

// POST /api/warmup — spins up the Lambda, checks gateway, returns AWS status
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const steps: Array<{ label: string; status: 'ok' | 'fail' | 'skip'; detail?: string; ms?: number }> = [];

  // Step 1: Lambda warmup (this request itself IS the warmup, but we also hit chat)
  const t0 = Date.now();
  try {
    const token = await getGatewayToken();
    steps.push({ label: 'Loading secrets', status: 'ok', detail: 'xena/gateway-token', ms: Date.now() - t0 });

    // Step 2: Ping the gateway
    const t1 = Date.now();
    const gwRes = await fetch('https://api.xena.lu/v1/models', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (gwRes.ok) {
      const models = await gwRes.json();
      const modelList = (models.data || []).map((m: any) => m.id).filter((id: string) => id.includes('operator') || id.includes('openclaw'));
      steps.push({ label: 'Connecting to operator', status: 'ok', detail: modelList[0] || 'operator', ms: Date.now() - t1 });
    } else {
      steps.push({ label: 'Connecting to operator', status: 'fail', detail: `HTTP ${gwRes.status}`, ms: Date.now() - t1 });
    }

    // Step 3: Warm the chat endpoint (send a minimal request)
    const t2 = Date.now();
    try {
      const chatRes = await fetch('https://api.xena.lu/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model: 'operator', stream: false, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(30_000),
      });
      if (chatRes.ok) {
        steps.push({ label: 'Warming up agent', status: 'ok', detail: 'operator ready', ms: Date.now() - t2 });
      } else {
        steps.push({ label: 'Warming up agent', status: 'fail', detail: `HTTP ${chatRes.status}`, ms: Date.now() - t2 });
      }
    } catch {
      steps.push({ label: 'Warming up agent', status: 'fail', detail: 'timeout', ms: Date.now() - t2 });
    }
  } catch (err: any) {
    steps.push({ label: 'Loading secrets', status: 'fail', detail: err.message, ms: Date.now() - t0 });
  }

  const allOk = steps.every((s) => s.status === 'ok');

  return Response.json({
    ready: allOk,
    steps,
    timestamp: new Date().toISOString(),
  });
}
