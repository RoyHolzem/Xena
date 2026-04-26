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

// POST /api/voice/stt — transcribe audio to text
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

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const formDataOpenAI = new FormData();
    formDataOpenAI.append('file', new Blob([audioBuffer], { type: audioFile.type }), audioFile.name);
    formDataOpenAI.append('model', 'whisper-1');
    formDataOpenAI.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formDataOpenAI,
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ text: data.text || '' });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
