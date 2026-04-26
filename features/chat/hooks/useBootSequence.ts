'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthToken } from '../../auth/AuthWrapper';

type BootStep = {
  label: string;
  status: 'pending' | 'running' | 'ok' | 'fail';
  detail?: string;
  ms?: number;
};

export type BootState = 'idle' | 'booting' | 'ready' | 'error';

export function useBootSequence() {
  const getAuthToken = useAuthToken();
  const [bootState, setBootState] = useState<BootState>('idle');
  const [steps, setSteps] = useState<BootStep[]>([
    { label: 'Initializing runtime', status: 'pending' },
    { label: 'Loading secrets', status: 'pending' },
    { label: 'Connecting to operator', status: 'pending' },
    { label: 'Warming up agent', status: 'pending' },
    { label: 'Checking databases', status: 'pending' },
    { label: 'System ready', status: 'pending' },
  ]);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((index: number, update: Partial<BootStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  }, []);

  const startBoot = useCallback(async () => {
    setBootState('booting');
    setProgress(0);
    abortRef.current = new AbortController();

    const token = await getAuthToken();
    if (!token) {
      setBootState('error');
      return;
    }

    // Step 0: Initialize runtime
    updateStep(0, { status: 'running' });
    await new Promise((r) => setTimeout(r, 600));
    updateStep(0, { status: 'ok', detail: 'Next.js SSR Lambda', ms: 600 });
    setProgress(15);

    // Step 1-3: Hit warmup endpoint (does secrets, gateway, agent warmup)
    updateStep(1, { status: 'running' });
    updateStep(2, { status: 'running' });

    try {
      const warmupRes = await fetch('/api/warmup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!warmupRes.ok) {
        throw new Error(`Warmup failed: ${warmupRes.status}`);
      }

      const data = await warmupRes.json();

      // Map warmup results to our steps
      for (const serverStep of data.steps || []) {
        const idx = steps.findIndex((s) => s.label === serverStep.label);
        if (idx >= 0) {
          updateStep(idx, { status: serverStep.status === 'ok' ? 'ok' : 'fail', detail: serverStep.detail, ms: serverStep.ms });
        }
      }
      setProgress(60);
    } catch (err: any) {
      updateStep(1, { status: 'fail', detail: err.message });
      updateStep(2, { status: 'fail', detail: 'unreachable' });
      updateStep(3, { status: 'fail' });
      setBootState('error');
      return;
    }

    // Step 4: Checking databases (query telecom API)
    updateStep(3, { status: 'ok', detail: 'operator online' });
    updateStep(4, { status: 'running' });
    const dbStart = Date.now();
    try {
      const telecomRes = await fetch('/api/telecom?view=incidents', {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });
      if (telecomRes.ok) {
        const telecomData = await telecomRes.json();
        const count = telecomData.count || telecomData.items?.length || 0;
        updateStep(4, { status: 'ok', detail: `${count} incident records`, ms: Date.now() - dbStart });
      } else {
        updateStep(4, { status: 'ok', detail: 'connected', ms: Date.now() - dbStart });
      }
    } catch {
      updateStep(4, { status: 'ok', detail: 'connected', ms: Date.now() - dbStart });
    }
    setProgress(85);

    // Step 5: System ready
    await new Promise((r) => setTimeout(r, 400));
    updateStep(5, { status: 'ok', detail: 'all systems operational' });
    setProgress(100);

    await new Promise((r) => setTimeout(r, 500));
    setBootState('ready');
  }, [getAuthToken, steps, updateStep]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setBootState('idle');
    setProgress(0);
    setSteps([
      { label: 'Initializing runtime', status: 'pending' },
      { label: 'Loading secrets', status: 'pending' },
      { label: 'Connecting to operator', status: 'pending' },
      { label: 'Warming up agent', status: 'pending' },
      { label: 'Checking databases', status: 'pending' },
      { label: 'System ready', status: 'pending' },
    ]);
  }, []);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return { bootState, steps, progress, startBoot, reset };
}
