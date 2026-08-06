'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BootStep, BootState } from '../hooks/useBootSequence';
import { XenaLogo } from '@/features/landing/XenaLogo';
import { cn } from '../chat-utils';
import styles from '../styles/boot-screen.module.css';

interface BootScreenProps {
  bootState: BootState;
  steps: BootStep[];
  progress: number;
  onStart: () => void;
  assistantName: string;
  assistantInitial: string;
}

function formatElapsed(seconds: number) {
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds)}s`;
}

export function BootScreen({ bootState, steps, progress, onStart, assistantName }: BootScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const isIdle = bootState === 'idle';
  const isBooting = bootState === 'booting';
  const isError = bootState === 'error';
  const completed = steps.filter((step) => step.status === 'ok').length;
  const failed = steps.filter((step) => step.status === 'fail').length;
  const activeStep = steps.find((step) => step.status === 'running');
  const stageProgress = Math.round((completed / steps.length) * 100);

  useEffect(() => {
    if (!isBooting) {
      setElapsed(0);
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => setElapsed((performance.now() - startedAt) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [isBooting]);

  const headline = useMemo(() => {
    if (isIdle) return 'Human judgment. Agentic execution.';
    if (isError) return 'Something went wrong starting up.';
    if (elapsed > 8) return 'Still warming up — serverless runtime can take a moment.';
    return 'Starting Xena.';
  }, [elapsed, isError, isIdle]);

  return (
    <main className={styles.bootScreen}>
      <section className={styles.bootSurface} aria-label={isBooting ? 'Starting Xena' : undefined}>
        <div className={styles.bootBrand}>
          <XenaLogo size={32} withWordmark={false} />
          <span>Xena</span>
          <i>Operations</i>
        </div>

        <div className={styles.bootLayout}>
          <div className={styles.bootHero}>
            <div className={cn(styles.ignitionMark, isBooting && styles.ignitionMarkActive, isError && styles.ignitionMarkError)}>
              <div className={styles.ignitionCore}><XenaLogo size={56} withWordmark={false} /></div>
            </div>

            <span className={styles.bootEyebrow}>
              {isIdle ? 'Ready to start' : isError ? 'Startup failed' : `Step ${Math.min(completed + 1, steps.length)} of ${steps.length}`}
            </span>
            <h1>{headline}</h1>
            <p>
              {isIdle
                ? 'Connect Xena to your operations and start working with the AI agent.'
                : isError
                  ? 'Completed steps are saved below. You can retry when ready.'
                  : activeStep?.detail || activeStep?.label || 'Connecting to the operations workspace.'}
            </p>

            {isIdle && (
              <button type="button" className={styles.startButton} onClick={onStart}>
                <span>Get started</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 9 7-9 7V5Z" /></svg>
              </button>
            )}

            {isBooting && (
              <div className={styles.elapsedRow} role="status" aria-live="polite">
                <span className={styles.elapsedSignal} />
                <span>{activeStep?.label || 'Finishing up'}</span>
                <time>{formatElapsed(elapsed)}</time>
              </div>
            )}

            {isError && (
              <button type="button" className={styles.retryButton} onClick={onStart}>
                Try again
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5" /></svg>
              </button>
            )}
          </div>

          <div className={styles.stagePanel}>
            <div className={styles.stagePanelHeader}>
              <div><span>Setup progress</span><strong>{isIdle ? 'Ready' : isError ? `${failed} step failed` : `${completed}/${steps.length} complete`}</strong></div>
              <span className={styles.stagePercent}>{isIdle ? '—' : `${stageProgress}%`}</span>
            </div>

            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${isIdle ? 0 : stageProgress}%` }} />
            </div>

            <div className={styles.stageList}>
              {steps.map((step, index) => (
                <div key={step.label} className={cn(styles.stage, styles[`stage_${step.status}`])}>
                  <span className={styles.stageIndex}>{index + 1}</span>
                  <span className={styles.stageState}><i /></span>
                  <div className={styles.stageCopy}>
                    <strong>{step.label}</strong>
                    <small>{step.detail || (step.status === 'running' ? 'In progress' : step.status === 'pending' ? 'Waiting' : step.status)}</small>
                  </div>
                  <time>{step.ms != null ? `${step.ms}ms` : step.status === 'running' ? '...' : ''}</time>
                </div>
              ))}
            </div>

            <footer className={styles.stageFooter}>
              <span><i /> Authenticated</span>
              <span><i /> eu-central-1</span>
            </footer>
          </div>
        </div>

        <div className={styles.bootMeta}>
          <span>Serverless · eu-central-1</span>
          <span>Human-controlled</span>
        </div>
      </section>
    </main>
  );
}
