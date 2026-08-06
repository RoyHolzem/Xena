'use client';

import { useState } from 'react';
import type { TelecomRecord, TelecomView } from '@/lib/types';
import { cn } from '../chat-utils';
import { formatDateTime, severityTone, statusTone } from '@/features/operations/ops-helpers';
import styles from '../chat-shell.module.css';

type Section = 'details' | 'facts' | 'network' | 'notice';

export function RecordOverlay({
  record,
  view,
  onClose,
}: {
  record: TelecomRecord;
  view: TelecomView;
  onClose: () => void;
}) {
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['details']));

  const toggle = (s: Section) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const entityLabel =
    view === 'incidents' ? 'Incident'
    : view === 'events' ? 'Event'
    : view === 'orders' ? 'Order'
    : 'Maintenance';

  return (
    <>
      <button className={styles.recordCardClose} onClick={onClose} type="button">✕</button>

      <div className={styles.recordCardHeader} key={record.recordId}>
        <div className={styles.recordCardEntity}>{entityLabel}</div>
        <div className={styles.recordCardTitle}>{record.title}</div>
        <div className={styles.recordCardBadges}>
          <span className={cn(styles.sevBadge, styles[`tone_${severityTone(record.severity)}`])}>
            {record.severity}
          </span>
          <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(record.status)}`])}>
            {record.status.replaceAll('_', ' ')}
          </span>
          {record.priority && record.priority !== '—' && (
            <span className={styles.moduleDetailPriority}>{record.priority}</span>
          )}
        </div>
        {record.summary && (
          <div className={styles.recordCardSummary}>{record.summary}</div>
        )}
      </div>

      {/* Details */}
      <SectionToggle
        title="Timeline"
        open={openSections.has('details')}
        onToggle={() => toggle('details')}
      >
        <div className={styles.recordTimeGrid}>
          <div className={styles.recordTimeRow}>
            <span>Started</span>
            <strong>{formatDateTime(record.startTime)}</strong>
          </div>
          {record.endTime && (
            <div className={styles.recordTimeRow}>
              <span>Ended</span>
              <strong>{formatDateTime(record.endTime)}</strong>
            </div>
          )}
          <div className={styles.recordTimeRow}>
            <span>Record</span>
            <strong style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10 }}>{record.recordId}</strong>
          </div>
        </div>
      </SectionToggle>

      {/* Key facts */}
      {record.highlights.length > 0 && (
        <SectionToggle
          title="Key facts"
          count={record.highlights.length}
          open={openSections.has('facts')}
          onToggle={() => toggle('facts')}
        >
          <div className={styles.recordFactGrid}>
            {record.highlights.map(h => (
              <div key={h.label} className={styles.recordFactTile}>
                <div className={styles.recordFactLabel}>{h.label}</div>
                <div className={styles.recordFactValue}>{h.value}</div>
              </div>
            ))}
          </div>
        </SectionToggle>
      )}

      {/* Network & contacts */}
      {record.facts.length > 0 && (
        <SectionToggle
          title="Network & contacts"
          count={record.facts.length}
          open={openSections.has('network')}
          onToggle={() => toggle('network')}
        >
          <div className={styles.recordDetailList}>
            {record.facts.slice(0, 10).map(f => (
              <div key={f.label} className={styles.recordDetailRow}>
                <span>{f.label}</span>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
        </SectionToggle>
      )}

      {/* Customer notice */}
      {record.customerText && (
        <SectionToggle
          title="Customer notice"
          open={openSections.has('notice')}
          onToggle={() => toggle('notice')}
        >
          <div className={styles.recordNotice}>{record.customerText}</div>
        </SectionToggle>
      )}
    </>
  );
}

function SectionToggle({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.recordSection}>
      <button className={styles.recordSectionToggle} onClick={onToggle} type="button">
        <span className={styles.recordSectionChevron} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>
          ▸
        </span>
        {title}
        {count != null && <span className={styles.recordSectionBadge}>{count}</span>}
      </button>
      <div className={cn(styles.recordSectionBody, open && styles.recordSectionBodyOpen)}>
        {children}
      </div>
    </div>
  );
}
