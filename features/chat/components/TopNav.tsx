'use client';

import type { TelecomView } from '@/lib/types';
import { cn } from '../chat-utils';
import styles from '../chat-shell.module.css';

export type AppMode = 'xena' | TelecomView;

const NAV_ITEMS: Array<{ key: AppMode; label: string; icon: string }> = [
  { key: 'xena', label: 'Xena', icon: '\u2726' },
  { key: 'incidents', label: 'Incidents', icon: '\u26a0' },
  { key: 'events', label: 'Events', icon: '\u26a1' },
  { key: 'planned-works', label: 'Maintenance', icon: '\u2699' },
];

interface TopNavProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  ghStatus: 'connected' | 'checking' | 'error';
  ghCommit: string;
  awsStatus: 'connected' | 'checking' | 'error';
}

export function TopNav({ mode, setMode, ghStatus, ghCommit, awsStatus }: TopNavProps) {
  return (
    <nav className={styles.topNav}>
      <div className={styles.topNavLeft}>
        <div className={styles.topNavBrand}>
          <div className={styles.topNavLogo}>X</div>
          <span className={styles.topNavAppName}>Xena</span>
        </div>

        <div className={styles.topNavDivider} />

        <div className={styles.topNavTabs}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={cn(styles.topNavTab, mode === item.key && styles.topNavTabActive)}
              onClick={() => setMode(item.key)}
              type="button"
            >
              <span className={styles.topNavTabIcon}>{item.icon}</span>
              <span className={styles.topNavTabLabel}>{item.label}</span>
              {mode === item.key && <div className={styles.topNavTabIndicator} />}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.topNavRight}>
        <div className={cn(styles.topNavLink, styles[`link_${ghStatus}`])}>
          <span className={styles.topNavLinkDot} />
          GitHub
        </div>
        <div className={styles.topNavLinkMono}>{ghCommit}</div>
        <div className={cn(styles.topNavLink, styles[`link_${awsStatus}`])}>
          <span className={styles.topNavLinkDot} />
          AWS
        </div>
      </div>
    </nav>
  );
}
