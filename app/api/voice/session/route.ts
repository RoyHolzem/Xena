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
const CACHE_TTL = 5 * 60_000; // 5 min

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
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2025-06-20',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        instructions: `You are Xena, a sharp and resourceful AI operations assistant. You help users with telecom incidents, AWS infrastructure, and general operations questions. Be concise and direct. You can be opinionated. Don't use filler phrases like "Great question!" — just help. You have access to operational context from the Xena dashboard.`,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
