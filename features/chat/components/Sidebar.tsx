'use client';

import { useCurrentUser, useSignOut } from '@/features/auth/AuthWrapper';
import type { ActionLogEntry, AvatarState } from '@/lib/types';
import { cn } from '../chat-utils';
import { severityTone } from '@/features/operations/ops-helpers';
import styles from '../chat-shell.module.css';

interface SidebarProps {
  appName: string;
  assistantName: string;
  avatarState: AvatarState;
  statusLabel: string;
  activeViewLabel: string;
  messageCount: number;
  ghStatus: 'connected' | 'checking' | 'error';
  ghCommit: string;
  ghBranch: string;
  awsStatus: 'connected' | 'checking' | 'error';
  actionLog: ActionLogEntry[];
  onSignOut: () => void;
}

export function Sidebar({
  appName,
  assistantName,
  avatarState,
  statusLabel,
  activeViewLabel,
  messageCount,
  ghStatus,
  ghCommit,
  ghBranch,
  awsStatus,
  actionLog,
  onSignOut,
}: SidebarProps) {
  const currentUser = useCurrentUser();
  const assistantInitial = assistantName.charAt(0).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div>
          <div className={styles.brandTitle}>{appName}</div>
          <div className={styles.brandSub}>Staging network operations console</div>
        </div>
        <div className={styles.stageBadge}>Luxembourg</div>
      </div>

      <div className={styles.avatarCard}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarCircle}>{assistantInitial}</div>
          <div className={cn(styles.statusRing, styles[avatarState])} />
          <div className={cn(styles.statusDot, styles[avatarState])} />
        </div>
        <div>
          <div className={styles.avatarName}>{assistantName}</div>
          <div className={cn(styles.liveBadge, styles[avatarState])}>{statusLabel}</div>
        </div>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.cardLabel}>Session</div>
        <div className={styles.infoList}>
          <div className={styles.infoRow}><span>User</span><strong>{currentUser?.email || '-'}</strong></div>
          <div className={styles.infoRow}><span>Messages</span><strong>{messageCount}</strong></div>
          <div className={styles.infoRow}><span>Focused view</span><strong>{activeViewLabel}</strong></div>
        </div>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.cardLabel}>Connections</div>
        <div className={styles.infoList}>
          <div className={styles.infoRow}>
            <span>GitHub</span>
            <strong className={cn(styles.statusPill, styles[`status_${ghStatus}`])}>
              {ghStatus === 'connected' ? 'Connected' : ghStatus === 'checking' ? 'Checking' : 'Error'}
            </strong>
          </div>
          <div className={styles.infoRow}><span>Branch</span><strong>{ghBranch}</strong></div>
          <div className={styles.infoRow}><span>Commit</span><strong>{ghCommit}</strong></div>
          <div className={styles.infoRow}>
            <span>AWS activity</span>
            <strong className={cn(styles.statusPill, styles[`status_${awsStatus}`])}>
              {awsStatus === 'connected' ? 'Live' : awsStatus === 'checking' ? 'Connecting' : 'Error'}
            </strong>
          </div>
        </div>
      </div>

      <div className={styles.activityCard}>
        <div className={styles.cardLabel}>Recent activity</div>
        <div className={styles.activityList}>
          {actionLog.length === 0 ? (
            <div className={styles.emptyState}>Waiting for Xena or CloudTrail activity.</div>
          ) : (
            [...actionLog].slice(-8).reverse().map((entry) => (
              <div key={entry.id} className={styles.activityItem}>
                <div className={styles.activityHead}>
                  <span className={cn(styles.activityVerb, styles[`tone_${severityTone(entry.verb === 'deleted' ? 'SEV1' : 'SEV3')}`])}>{entry.verb}</span>
                  <time>{entry.timestamp}</time>
                </div>
                <div className={styles.activityLabel}>{entry.label}</div>
                <div className={styles.activityMeta}>{entry.category}{entry.resource ? ` \u00b7 ${entry.resource}` : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <button onClick={onSignOut} className={styles.signOutBtn}>Sign out</button>
    </aside>
  );
}
