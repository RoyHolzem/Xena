import { verifyToken } from '@/lib/cognito-jwt';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const SECRET_NAME = 'xena/openai-key';
const REGION = 'eu-central-1';
const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedKey = '';
let cachedAt = 0;
const CACHE_TTL = 5 * 60_000;

async function getOpenAIKey(): Promise<string> {
  const now = Date.now();
  if (cachedKey && now - cachedAt < CACHE_TTL) return cachedKey;
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_NAME })
  );
  const parsed = JSON.parse(response.SecretString || '{}');
  cachedKey = parsed.apiKey || '';
  cachedAt = now;
  return cachedKey;
}

// POST /api/voice/tts — convert text to speech
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let apiKey: string;
  try {
    apiKey = await getOpenAIKey();
  } catch (err: any) {
    return Response.json({ error: 'Config error: ' + err.message }, { status: 503 });
  }

  let body: { text?: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: 'Text required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: body.voice || 'alloy',
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: errText }, { status: response.status });
    }

    // Stream audio back
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
