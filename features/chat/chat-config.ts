export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'LiveCenter Simple',
  assistantName: process.env.NEXT_PUBLIC_ASSISTANT_NAME || 'Xena',
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://18.194.41.114',
  gatewayToken: process.env.NEXT_PUBLIC_GATEWAY_AUTH_TOKEN || '',
  chatPath: process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions'
};
