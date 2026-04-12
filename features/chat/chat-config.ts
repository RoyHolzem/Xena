export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Xena',
  assistantName: process.env.NEXT_PUBLIC_ASSISTANT_NAME || 'Xena',
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || '',
  chatPath: process.env.NEXT_PUBLIC_GATEWAY_CHAT_PATH || '/v1/chat/completions',
  cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'eu-central-1',
  },
};
