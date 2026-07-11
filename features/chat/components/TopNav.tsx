'use client';

import { useState, useRef, useEffect } from 'react';
import type { TelecomView } from '@/lib/types';
import type { ModelInfo } from '../hooks/useModels';
import { XenaLogo } from '@/features/landing/XenaLogo';
import { cn } from '../chat-utils';
import styles from '../styles/top-nav.module.css';

export type AppMode = 'xena' | TelecomView;

const NAV_ITEMS: Array<{ key: AppMode; label: string; icon: string }> = [
  { key: 'xena', label: 'Xena', icon: '\u2726' },
  { key: 'incidents', label: 'Incidents', icon: '\u26a0' },
  { key: 'events', label: 'Events', icon: '\u26a1' },
  { key: 'planned-works', label: 'Maintenance', icon: '\u2699' },
  { key: 'orders', label: 'Orders', icon: '\ud83d\udce6' },
];

export type ModelFallbackInfo = {
  requested: string;
  actual?: string;
  fellBack: boolean;
} | null;

interface TopNavProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  ghStatus: 'connected' | 'checking' | 'error';
  ghCommit: string;
  models: ModelInfo[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelFallback?: ModelFallbackInfo;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function TopNav({ mode, setMode, ghStatus, ghCommit, models, selectedModel, setSelectedModel, modelFallback, theme, onToggleTheme }: TopNavProps) {
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

  // Format the actual model name for the fallback badge
  const fallbackActualName = modelFallback?.actual
    ? modelFallback.actual.split('/').pop() || modelFallback.actual
    : 'default';

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const key = m.provider || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <nav className={styles.topNav}>
      <div className={styles.topNavLeft}>
        <div className={styles.topNavBrand}>
          <XenaLogo size={34} withWordmark={false} className={styles.topNavLogoMark} />
          <img src="/logo.png" alt="Xena" className={styles.topNavAppName} />
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
        {/* Theme toggle */}
        <button
          className={styles.themeToggle}
          onClick={onToggleTheme}
          type="button"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Model selector */}
        <div className={styles.modelSelector} ref={dropdownRef}>
          <button
            className={styles.modelSelectorButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
          >
            <span className={styles.modelSelectorIcon}>?</span>
            <span className={styles.modelSelectorLabel}>{displayName}</span>
            {modelFallback?.fellBack && (
              <span className={styles.modelFallbackBadge} title={`Fell back from ${modelFallback.requested} to ${fallbackActualName}`}>
                ? {fallbackActualName}
              </span>
            )}
            <span className={cn(styles.modelSelectorChevron, dropdownOpen && styles.modelSelectorChevronOpen)}>?</span>
          </button>
          {dropdownOpen && models.length > 0 && (
            <div className={styles.modelDropdown}>
              {Object.entries(grouped).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className={styles.modelGroupLabel}>{provider.toUpperCase()}</div>
                  {providerModels.map((m) => (
                    <button
                      key={m.id}
                      className={cn(styles.modelOption, selectedModel === m.id && styles.modelOptionActive)}
                      onClick={() => { setSelectedModel(m.id); setDropdownOpen(false); }}
                      type="button"
                    >
                      <span className={styles.modelOptionName}>{m.name}</span>
                    </button>
                  ))}
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
