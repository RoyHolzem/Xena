import { CognitoJwtVerifier } from 'aws-jwt-verify';

const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!poolId || !clientId) return null;
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: poolId,
      tokenUse: 'access',
      clientId,
    });
  }
  return verifier;
}

export async function verifyToken(authHeader: string | null): Promise<{ sub: string; email?: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const v = getVerifier();
  if (!v) return null;
  try {
    const payload = await v.verify(token);
    return { sub: payload.sub, email: payload.email as string | undefined };
  } catch {
    return null;
  }
}
