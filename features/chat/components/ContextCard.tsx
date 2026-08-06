'use client';

import { useState } from 'react';
import type { TelecomRecord, TelecomView } from '@/lib/types';
import { cn } from '../chat-utils';
import { formatDateTime, severityTone, statusTone } from '@/features/operations/ops-helpers';
import styles from '../styles/context-card.module.css';

interface ContextCardProps {
  record: TelecomRecord;
  view: TelecomView;
  compact?: boolean;
  onNavigate?: () => void;
}

const ENTITY_LABEL: Record<TelecomView, string> = {
  incidents: 'Incident',
  events: 'Event',
  'planned-works': 'Maintenance',
  orders: 'Order',
};

export function ContextCard({ record, view, compact = false, onNavigate }: ContextCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showDetails = !compact || expanded;
  const sevTone = severityTone(record.severity);
  const visibleHighlights = record.highlights.slice(0, compact ? 4 : 6);

  return (
    <article className={cn(styles.artifactCard, styles[`artifactTone_${sevTone}`])}>
      <div className={styles.artifactRail} aria-hidden="true" />
      <header className={styles.artifactHeader}>
        <div className={styles.artifactIdentity}>
          <span className={styles.artifactEyebrow}>Live {ENTITY_LABEL[view]} artifact</span>
          <span className={styles.artifactId}>{record.recordId}</span>
        </div>
        <div className={styles.artifactBadges}>
          <span className={cn(styles.sevBadge, styles[`tone_${sevTone}`])}>{record.severity}</span>
          <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(record.status)}`])}>
            {record.status.replaceAll('_', ' ')}
          </span>
        </div>
      </header>

      <h3 className={styles.artifactTitle}>{record.title}</h3>
      {showDetails && record.summary && <p className={styles.artifactSummary}>{record.summary}</p>}

      <div className={styles.artifactPulseLine} aria-hidden="true"><span /></div>

      <div className={styles.artifactFacts}>
        <div>
          <span>Started</span>
          <strong>{formatDateTime(record.startTime)}</strong>
        </div>
        {record.companyName && record.companyName !== '-' && (
          <div><span>Customer</span><strong>{record.companyName}</strong></div>
        )}
        {showDetails && record.city && record.city !== '-' && (
          <div><span>Location</span><strong>{record.city}</strong></div>
        )}
        {showDetails && visibleHighlights.map((fact) => (
          <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>
        ))}
      </div>

      <footer className={styles.artifactFooter}>
        <div className={styles.artifactProvenance}>
          <span className={styles.liveDot} />
          Company data
          <span aria-hidden="true">·</span>
          structured UI
        </div>
        <div className={styles.artifactActions}>
          {compact && (
            <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              {expanded ? 'Collapse' : 'Inspect'}
            </button>
          )}
          {onNavigate && (
            <button type="button" className={styles.focusButton} onClick={onNavigate}>
              Focus
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

export interface PinnedCard {
  messageId: string;
  record: TelecomRecord;
  view: TelecomView;
}
