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
    if (isError) return 'The agent channel needs attention.';
    if (elapsed > 8) return 'The serverless runtime is still warming.';
    return 'Bringing Xena online.';
  }, [elapsed, isError, isIdle]);

  return (
    <main className={styles.bootScreen}>
      <div className={styles.cockpitGhost} aria-hidden="true">
        <span className={styles.ghostNav} />
        <span className={styles.ghostRun} />
        <span className={styles.ghostChat} />
        <span className={styles.ghostArtifact} />
      </div>

      <section className={styles.bootSurface} aria-label={isBooting ? 'Starting Xena' : undefined}>
        <div className={styles.bootBrand}>
          <XenaLogo size={35} withWordmark={false} />
          <span>XENA</span>
          <i>Operations cockpit</i>
        </div>

        <div className={styles.bootLayout}>
          <div className={styles.bootHero}>
            <div className={cn(styles.ignitionMark, isBooting && styles.ignitionMarkActive, isError && styles.ignitionMarkError)}>
              <span className={styles.ignitionOrbitOne} />
              <span className={styles.ignitionOrbitTwo} />
              <span className={styles.ignitionAxis} />
              <div className={styles.ignitionCore}><XenaLogo size={84} withWordmark={false} /></div>
            </div>

            <span className={styles.bootEyebrow}>
              {isIdle ? 'Secure agent ignition' : isError ? 'Startup interrupted' : `Stage ${Math.min(completed + 1, steps.length)} of ${steps.length}`}
            </span>
            <h1>{headline}</h1>
            <p>
              {isIdle
                ? 'Start the secured serverless control plane and connect Xena to company operations.'
                : isError
                  ? 'The completed stages are preserved below. Retry the secured startup sequence when ready.'
                  : activeStep?.detail || activeStep?.label || 'Establishing the trusted operations channel.'}
            </p>

            {isIdle && (
              <button type="button" className={styles.startButton} onClick={onStart}>
                <span>Start agent</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 9 7-9 7V5Z" /></svg>
              </button>
            )}

            {isBooting && (
              <div className={styles.elapsedRow} role="status" aria-live="polite">
                <span className={styles.elapsedSignal} />
                <span>{activeStep?.label || 'Finalizing workspace'}</span>
                <time>{formatElapsed(elapsed)}</time>
              </div>
            )}

            {isError && (
              <button type="button" className={styles.retryButton} onClick={onStart}>
                Retry ignition
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5" /></svg>
              </button>
            )}
          </div>

          <div className={styles.stagePanel}>
            <div className={styles.stagePanelHeader}>
              <div><span>Startup sequence</span><strong>{isIdle ? 'Ready to initiate' : isError ? `${failed} stage failed` : `${completed}/${steps.length} secured`}</strong></div>
              <span className={styles.stagePercent}>{isIdle ? 'Standby' : `${stageProgress}%`}</span>
            </div>

            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${isIdle ? 0 : stageProgress}%` }} />
            </div>

            <div className={styles.stageList}>
              {steps.map((step, index) => (
                <div key={step.label} className={cn(styles.stage, styles[`stage_${step.status}`])}>
                  <span className={styles.stageIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.stageState}><i /></span>
                  <div className={styles.stageCopy}>
                    <strong>{step.label}</strong>
                    <small>{step.detail || (step.status === 'running' ? 'Secure handshake in progress' : step.status === 'pending' ? 'Awaiting previous stage' : step.status)}</small>
                  </div>
                  <time>{step.ms != null ? `${step.ms}ms` : step.status === 'running' ? 'live' : ''}</time>
                </div>
              ))}
            </div>

            <footer className={styles.stageFooter}>
              <span><i /> Cognito session</span>
              <span><i /> IAM scoped</span>
              <span><i /> Encrypted stream</span>
            </footer>
          </div>
        </div>

        <div className={styles.bootMeta}>
          <span>Serverless runtime · eu-central-1</span>
          <span>Human-controlled operations</span>
        </div>
      </section>
    </main>
  );
}
