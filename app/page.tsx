'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@/features/auth/AuthWrapper'; // ensures Amplify.configure runs
import { ChatShell } from '@/features/chat/ChatShell';
import { LandingPage } from '@/features/landing/LandingPage';
import styles from '@/features/chat/styles/shell.module.css';

export default function HomePage() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    let mounted = true;
    fetchAuthSession()
      .then(({ tokens }) => {
        if (mounted) setAuthState(tokens ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (mounted) setAuthState('unauthenticated');
      });
    return () => { mounted = false; };
  }, []);

  if (authState === 'loading') {
    return (
      <div className={styles.shell}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          border: '3px solid var(--line)',
          borderTopColor: 'var(--xena-blue)',
          animation: 'spin 0.8s linear infinite',
          margin: 'auto',
        }} aria-label="Loading" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <LandingPage onAuthenticated={() => setAuthState('authenticated')} />
    );
  }

  return <ChatShell />;
}
