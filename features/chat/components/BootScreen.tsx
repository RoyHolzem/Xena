'use client';

import type { BootStep, BootState } from '../hooks/useBootSequence';
import { cn } from '../chat-utils';
import styles from '../chat-shell.module.css';

interface BootScreenProps {
  bootState: BootState;
  steps: BootStep[];
  progress: number;
  onStart: () => void;
  assistantName: string;
  assistantInitial: string;
}

export function BootScreen({ bootState, steps, progress, onStart, assistantName, assistantInitial }: BootScreenProps) {
  const isIdle = bootState === 'idle';
  const isBooting = bootState === 'booting';
  const isError = bootState === 'error';

  return (
    <div className={styles.bootScreen}>
      <div className={styles.bootContainer}>
        {/* Logo */}
        <div className={styles.bootLogo}>
          <div className={styles.bootLogoCircle}>
            {assistantInitial}
          </div>
          <div className={styles.bootLogoGlow} />
        </div>

        {/* Title */}
        <h1 className={styles.bootTitle}>{assistantName}</h1>
        <p className={styles.bootSubtitle}>
          {isIdle && 'AI Operations Cockpit'}
          {isBooting && 'Initializing systems...'}
          {isError && 'Startup failed'}
        </p>

        {/* Start button or progress */}
        {isIdle && (
          <button className={styles.bootStartBtn} onClick={onStart}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,3 20,12 6,21" />
            </svg>
            <span>Start Agent</span>
          </button>
        )}

        {(isBooting || isError) && (
          <>
            {/* Progress bar */}
            <div className={styles.bootProgressBar}>
              <div
                className={cn(styles.bootProgressFill, isError && styles.bootProgressError)}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Steps */}
            <div className={styles.bootSteps}>
              {steps.map((step, i) => (
                <div key={i} className={cn(
                  styles.bootStep,
                  step.status === 'running' && styles.bootStepRunning,
                  step.status === 'ok' && styles.bootStepOk,
                  step.status === 'fail' && styles.bootStepFail,
                )}>
                  <span className={styles.bootStepIcon}>
                    {step.status === 'pending' && '○'}
                    {step.status === 'running' && '●'}
                    {step.status === 'ok' && '✓'}
                    {step.status === 'fail' && '✗'}
                  </span>
                  <span className={styles.bootStepLabel}>{step.label}</span>
                  {step.detail && (
                    <span className={styles.bootStepDetail}>
                      {step.detail}
                      {step.ms ? ` (${step.ms}ms)` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {isError && (
              <button className={styles.bootRetryBtn} onClick={onStart}>
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
