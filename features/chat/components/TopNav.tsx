'use client';

import { useEffect, useRef, useState } from 'react';
import type { TelecomView } from '@/lib/types';
import type { ModelInfo } from '../hooks/useModels';
import { XenaLogo } from '@/features/landing/XenaLogo';
import { cn } from '../chat-utils';
import styles from '../styles/top-nav.module.css';

export type AppMode = 'xena' | TelecomView;

const NAV_ITEMS: Array<{ key: AppMode; label: string }> = [
  { key: 'xena', label: 'Operate' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'events', label: 'Events' },
  { key: 'planned-works', label: 'Maintenance' },
  { key: 'orders', label: 'Orders' },
];

export type ModelFallbackInfo = { requested: string; actual?: string; fellBack: boolean } | null;

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

function NavGlyph({ mode }: { mode: AppMode }) {
  if (mode === 'xena') return <svg viewBox="0 0 24 24"><path d="M4 14h4l2-7 4 11 2-7h4" /></svg>;
  if (mode === 'incidents') return <svg viewBox="0 0 24 24"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16.5v.1" /></svg>;
  if (mode === 'events') return <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 16 0M7 12a5 5 0 0 1 10 0M10 12a2 2 0 0 1 4 0M12 14v7" /></svg>;
  if (mode === 'planned-works') return <svg viewBox="0 0 24 24"><path d="m14 6 4-3 3 3-3 4M13 7 5 15l4 4 8-8M4 20h6" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM8 7V4h8v3M8 12h8" /></svg>;
}

export function TopNav({ mode, setMode, ghStatus, ghCommit, models, selectedModel, setSelectedModel, modelFallback, theme, onToggleTheme }: TopNavProps) {
  const [systemOpen, setSystemOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const currentModel = models.find((model) => model.id === selectedModel);
  const displayName = currentModel?.name || selectedModel.split('/').pop() || selectedModel;

  useEffect(() => {
    const closePanel = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setSystemOpen(false);
    };
    document.addEventListener('mousedown', closePanel);
    return () => document.removeEventListener('mousedown', closePanel);
  }, []);

  return (
    <nav className={styles.topNav} aria-label="Xena workspace navigation">
      <div className={styles.brandZone}>
        <div className={styles.brandMark}><XenaLogo size={31} withWordmark={false} /></div>
        <span className={styles.brandWord}>XENA</span>
        <span className={styles.environment}>Operations cockpit</span>
      </div>

      <div className={styles.navItems}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cn(styles.navItem, mode === item.key && styles.navItemActive)}
            onClick={() => setMode(item.key)}
            aria-current={mode === item.key ? 'page' : undefined}
          >
            <NavGlyph mode={item.key} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.controlZone} ref={panelRef}>
        <div className={styles.agentOnline}><span /> Agent online</div>
        <button type="button" className={cn(styles.systemButton, systemOpen && styles.systemButtonActive)} onClick={() => setSystemOpen((value) => !value)} aria-expanded={systemOpen}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
          <span>System</span>
        </button>

        {systemOpen && (
          <div className={styles.systemPanel}>
            <div className={styles.systemPanelHeader}>
              <div><span>Environment</span><strong>Production control plane</strong></div>
              <span className={cn(styles.connectionBadge, styles[`connection_${ghStatus}`])}><i />{ghStatus}</span>
            </div>

            <label className={styles.systemField}>
              <span>Agent model</span>
              <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
                {models.length === 0 && <option value={selectedModel}>{displayName}</option>}
                {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
              {modelFallback?.fellBack && <small>Fallback active: {modelFallback.actual || 'default model'}</small>}
            </label>

            <div className={styles.systemRows}>
              <div><span>Repository</span><strong>RoyHolzem/Xena</strong></div>
              <div><span>Commit</span><strong className={styles.mono}>{ghCommit || 'checking'}</strong></div>
              <div><span>Runtime</span><strong>Serverless · eu-central-1</strong></div>
            </div>

            <button type="button" className={styles.themeButton} onClick={onToggleTheme}>
              <span>{theme === 'dark' ? 'Dark cockpit' : 'Light cockpit'}</span>
              <i className={cn(theme === 'light' && styles.themeToggleLight)}><b /></i>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
