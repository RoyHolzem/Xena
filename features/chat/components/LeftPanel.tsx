'use client';

import { cn } from '../chat-utils';
import styles from '../chat-shell.module.css';

interface LeftPanelProps {
  visible: boolean;
  selectedContext: string | null;
}

export function LeftPanel({ visible, selectedContext }: LeftPanelProps) {
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
    </aside>
  );
}
