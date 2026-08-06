'use client';

import type { PresenceState } from '@/lib/types';
import type { AgentActivityState } from '../hooks/useCockpitState';
import type { ActionLogEntry } from '../hooks/useActionLog';
import { cn } from '../chat-utils';
import styles from '../styles/agent-run-strip.module.css';

type AgentRunStripProps = {
  activity: AgentActivityState;
  actions: ActionLogEntry[];
  presence: PresenceState;
};

function runCopy(presence: PresenceState, activity: AgentActivityState) {
  if (presence === 'error') return { eyebrow: 'Run interrupted', title: 'The agent needs attention' };
  if (activity) return { eyebrow: activity.phase || 'Active run', title: activity.message };
  if (presence === 'processing') return { eyebrow: 'Active run', title: 'Xena is planning the next operation' };
  if (presence === 'typing') return { eyebrow: 'Active run', title: 'Preparing the operator response' };
  return { eyebrow: 'Agent channel', title: 'Ready for your next intent' };
}

export function AgentRunStrip({ activity, actions, presence }: AgentRunStripProps) {
  const copy = runCopy(presence, activity);
  const visibleActions = actions
    .filter((entry) => entry.source === 'tool' || entry.source === 'stream')
    .slice(-3);
  const active = presence === 'processing' || presence === 'typing' || Boolean(activity);

  return (
    <section
      className={cn(styles.runStrip, active && styles.runStripActive, presence === 'error' && styles.runStripError)}
      aria-label="Current agent run"
    >
      <div className={styles.runSignal} aria-hidden="true">
        <span className={styles.runSignalCore} />
        {active && <span className={styles.runSignalOrbit} />}
      </div>

      <div className={styles.runSummary} role="status" aria-live="polite">
        <span className={styles.runEyebrow}>{copy.eyebrow}</span>
        <strong className={styles.runTitle}>{copy.title}</strong>
      </div>

      <div className={styles.runSteps} aria-label="Recent run events">
        {visibleActions.length === 0 ? (
          <span className={styles.runHint}>Tool calls and verified actions will surface here.</span>
        ) : (
          visibleActions.map((entry) => (
            <div
              key={entry.id}
              className={cn(styles.runStep, styles[`runStep_${entry.status}`])}
              title={entry.detail || entry.label}
            >
              <span className={styles.runStepState} aria-hidden="true" />
              <span className={styles.runStepLabel}>{entry.label}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.runTrust} title="Only structured agent and tool events are shown in the live run">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5.5 5.8v5.6c0 4.1 2.7 7.8 6.5 9.1 3.8-1.3 6.5-5 6.5-9.1V5.8L12 3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        Verified stream
      </div>
    </section>
  );
}
