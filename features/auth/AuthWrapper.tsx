'use client';

import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { ReactNode, useMemo } from 'react';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    },
  },
});

const formFields = {
  signIn: {
    username: { placeholder: 'Email', isRequired: true },
    password: { placeholder: 'Password', isRequired: true },
  },
  signUp: {
    username: { order: 1, placeholder: 'Email', label: 'Email', isRequired: true },
    password: { order: 2, placeholder: 'Password', isRequired: true },
    confirm_password: { order: 3, placeholder: 'Confirm password', isRequired: true },
  },
  confirmResetPassword: {
    confirmation_code: { placeholder: 'Code', label: 'Verification code' },
    password: { placeholder: 'New password' },
  },
  confirmSignIn: {
    confirmation_code: { label: 'Verification code', placeholder: 'Code' },
  },
};

const components = {
  Header() {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ffc8, #0088ff)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#0a0e17',
          boxShadow: '0 0 24px rgba(0,255,200,0.3)',
        }}>X</div>
        <div style={{ color: '#e0e6f0', fontSize: 20, fontWeight: 600, marginTop: 12 }}>
          {process.env.NEXT_PUBLIC_APP_NAME || 'Xena'}
        </div>
        <div style={{ color: '#5a6a80', fontSize: 13 }}>AI Assistant Interface</div>
      </div>
    );
  },
};

export function AuthWrapper({ children }: { children: ReactNode }) {
  return (
    <Authenticator
      formFields={formFields}
      components={components}
      variation="modal"
    >
      {children}
    </Authenticator>
  );
}

export function useAuthToken() {
  const { user } = useAuthenticator((ctx) => [ctx.user]);
  return useMemo(() => {
    return async (): Promise<string | null> => {
      if (!user) return null;
      try {
        const { tokens } = await fetchAuthSession();
        return tokens?.accessToken?.toString() || null;
      } catch {
        return null;
      }
    };
  }, [user]);
}

export function useSignOut() {
  const { signOut } = useAuthenticator((ctx) => [ctx.user]);
  return signOut;
}

export function useCurrentUser() {
  const { user } = useAuthenticator((ctx) => [ctx.user]);
  return useMemo(() => {
    if (!user) return null;
    return {
      email: user.signInDetails?.loginId || '',
      name: user.username || '',
    };
  }, [user]);
}
