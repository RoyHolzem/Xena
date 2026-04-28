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

const TIER_BADGE: Record<string, { label: string; emoji: string }> = {
  fast: { label: 'Fast', emoji: '⚡' },
  balanced: { label: 'Balanced', emoji: '⚖️' },
  powerful: { label: 'Powerful', emoji: '🧠' },
};

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

  const currentModel = models.find((m) => m.id === selectedModel);
  const displayName = currentModel?.name || selectedModel.split('/').pop() || selectedModel;

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const key = m.provider || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

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
            <span className={styles.modelSelectorLabel}>{displayName}</span>
            <span className={cn(styles.modelSelectorChevron, dropdownOpen && styles.modelSelectorChevronOpen)}>▾</span>
          </button>
          {dropdownOpen && models.length > 0 && (
            <div className={styles.modelDropdown}>
              {Object.entries(grouped).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className={styles.modelGroupLabel}>{provider}</div>
                  {providerModels.map((m) => {
                    const badge = TIER_BADGE[m.tier] || { label: '', emoji: '' };
                    return (
                      <button
                        key={m.id}
                        className={cn(styles.modelOption, selectedModel === m.id && styles.modelOptionActive)}
                        onClick={() => { setSelectedModel(m.id); setDropdownOpen(false); }}
                        type="button"
                      >
                        <span className={styles.modelOptionBadge}>{badge.emoji}</span>
                        <span className={styles.modelOptionName}>{m.name}</span>
                        <span className={styles.modelOptionTier}>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
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
