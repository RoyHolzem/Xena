'use client';

import type { TelecomRecord, TelecomView } from '@/lib/types';
import { cn } from '../chat-utils';
import {
  formatDateTime,
  severityTone,
  statusTone,
} from '@/features/operations/ops-helpers';
import styles from '../chat-shell.module.css';

interface RightPanelProps {
  visible: boolean;
  selectedRecord: TelecomRecord | null;
  activeView: TelecomView;
}

export function RightPanel({ visible, selectedRecord, activeView }: RightPanelProps) {
  return (
    <aside className={cn(styles.sidePanel, styles.rightPanel, visible && styles.panelVisible)}>
      {!selectedRecord ? (
        <div className={styles.panelEmpty}>
          <div className={styles.panelEmptyIcon}>&#x25B8;</div>
          <div>Operational details will appear here when relevant to your conversation</div>
        </div>
      ) : (
        <>
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              {activeView === 'incidents' ? 'Incident' : activeView === 'events' ? 'Event' : 'Maintenance'}
            </div>

            <div className={styles.detailHeader}>
              <div className={styles.detailTitle}>{selectedRecord.title}</div>
              <div className={styles.detailBadges}>
                <span className={cn(styles.sevBadge, styles[`tone_${severityTone(selectedRecord.severity)}`])}>
                  {selectedRecord.severity}
                </span>
                <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(selectedRecord.status)}`])}>
                  {selectedRecord.status.replaceAll('_', ' ')}
                </span>
              </div>
            </div>

            <div className={styles.detailSummary}>{selectedRecord.summary}</div>

            <div className={styles.detailTimes}>
              <div className={styles.detailTimeRow}>
                <span>Start</span>
                <strong>{formatDateTime(selectedRecord.startTime)}</strong>
              </div>
              {selectedRecord.endTime && (
                <div className={styles.detailTimeRow}>
                  <span>End</span>
                  <strong>{formatDateTime(selectedRecord.endTime)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>Key facts</div>
            <div className={styles.factGrid}>
              {selectedRecord.highlights.map((h) => (
                <div key={h.label} className={styles.factTile}>
                  <div className={styles.factTileLabel}>{h.label}</div>
                  <div className={styles.factTileValue}>{h.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>Network &amp; contacts</div>
            <div className={styles.detailFactList}>
              {selectedRecord.facts.slice(0, 8).map((f) => (
                <div key={f.label} className={styles.detailFactRow}>
                  <span>{f.label}</span>
                  <strong>{f.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {selectedRecord.customerText && (
            <div className={styles.panelSection}>
              <div className={styles.panelSectionTitle}>Customer notice</div>
              <div className={styles.noticeText}>{selectedRecord.customerText}</div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
