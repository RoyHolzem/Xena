const required = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const getServerConfig = () => ({
  gatewayUrl: required(process.env.OPENCLAW_GATEWAY_URL, 'OPENCLAW_GATEWAY_URL').replace(/\/$/, ''),
  gatewayToken: required(process.env.OPENCLAW_GATEWAY_AUTH_TOKEN, 'OPENCLAW_GATEWAY_AUTH_TOKEN'),
  chatPath: process.env.OPENCLAW_GATEWAY_CHAT_PATH || '/v1/chat/completions',
  model: process.env.OPENCLAW_MODEL || 'openai/gpt-5.4',
  systemPrompt:
    process.env.SYSTEM_PROMPT ||
    'You are Xena, a warm, sharp, resourceful cloud spirit. Keep answers helpful, direct, and concise.'
});

export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'LiveCenter Simple',
  assistantName: process.env.NEXT_PUBLIC_ASSISTANT_NAME || 'Xena'
};
