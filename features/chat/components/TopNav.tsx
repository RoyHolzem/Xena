'use client';

import { useState, useRef, useEffect } from 'react';
import type { TelecomView } from '@/lib/types';
import type { ModelInfo } from '../hooks/useModels';
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
  models: ModelInfo[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export function TopNav({ mode, setMode, ghStatus, ghCommit, models, selectedModel, setSelectedModel }: TopNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = (id: string) => {
    const m = models.find((m) => m.id === id);
    return m?.name || m?.id || id;
  };

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
        {/* Model selector */}
        <div className={styles.modelSelector} ref={dropdownRef}>
          <button
            className={styles.modelSelectorButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
          >
            <span className={styles.modelSelectorIcon}>⬡</span>
            <span className={styles.modelSelectorLabel}>{displayName(selectedModel)}</span>
            <span className={cn(styles.modelSelectorChevron, dropdownOpen && styles.modelSelectorChevronOpen)}>▾</span>
          </button>
          {dropdownOpen && models.length > 0 && (
            <div className={styles.modelDropdown}>
              {models.map((m) => (
                <button
                  key={m.id}
                  className={cn(styles.modelOption, selectedModel === m.id && styles.modelOptionActive)}
                  onClick={() => { setSelectedModel(m.id); setDropdownOpen(false); }}
                  type="button"
                >
                  <span className={styles.modelOptionName}>{m.name || m.id}</span>
                  {m.owned_by && <span className={styles.modelOptionProvider}>{m.owned_by}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cn(styles.topNavLink, styles[`link_${ghStatus}`])}>
          <span className={styles.topNavLinkDot} />
          GitHub
        </div>
        <div className={styles.topNavLinkMono}>{ghCommit}</div>
      </div>
    </nav>
  );
}
