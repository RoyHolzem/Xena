'use client';

import type { ActionLogEntry } from '@/lib/types';
import { cn } from '../chat-utils';
import { severityTone } from '@/features/operations/ops-helpers';
import styles from '../chat-shell.module.css';

interface LeftPanelProps {
  visible: boolean;
  actionLog: ActionLogEntry[];
  selectedContext: string | null;
}

export function LeftPanel({ visible, actionLog, selectedContext }: LeftPanelProps) {
  return (
    <aside className={cn(styles.sidePanel, styles.leftPanel, visible && styles.panelVisible)}>
      <div className={styles.panelSection}>
        <div className={styles.panelSectionTitle}>Context</div>
        {selectedContext ? (
          <div className={styles.contextCard}>
            <div className={styles.contextLabel}>{selectedContext}</div>
            <div className={styles.contextHint}>Xena is focused on this record</div>
          </div>
        ) : (
          <div className={styles.panelEmpty}>
            <div className={styles.panelEmptyIcon}>&#x2726;</div>
            <div>Say &quot;show me incident SEV-001&quot; or ask Xena about any record</div>
          </div>
        )}
      </div>

      <div className={styles.panelSection}>
        <div className={styles.panelSectionTitle}>
          Activity feed
          <span className={styles.panelBadge}>{actionLog.length}</span>
        </div>
        <div className={styles.activityFeed}>
          {actionLog.length === 0 ? (
            <div className={styles.panelEmptySmall}>Waiting for CloudTrail or Xena actions</div>
          ) : (
            [...actionLog].slice(-12).reverse().map((entry) => (
              <div key={entry.id} className={styles.activityEntry}>
                <div className={styles.activityEntryHead}>
                  <span className={cn(
                    styles.activityVerbBadge,
                    styles[`verb_${severityTone(entry.verb === 'deleted' ? 'SEV1' : 'SEV3')}`]
                  )}>
                    {entry.verb}
                  </span>
                  <time className={styles.activityTime}>{entry.timestamp}</time>
                </div>
                <div className={styles.activityLabel}>{entry.label}</div>
                {entry.resource && (
                  <div className={styles.activityMeta}>{entry.category} &middot; {entry.resource}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
