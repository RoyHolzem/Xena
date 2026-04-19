'use client';

import { useMemo, useState } from 'react';
import type { TelecomRecord, TelecomView } from '@/lib/types';
import { useTelecom } from '../hooks/useTelecom';
import { useAuthToken } from '@/features/auth/AuthWrapper';
import { cn } from '../chat-utils';
import {
  formatDateTime,
  formatRelative,
  severityTone,
  statusTone,
  summaryLabel,
  summaryValue,
} from '@/features/operations/ops-helpers';
import { VIEW_META } from '@/features/operations/view-meta';
import styles from '../chat-shell.module.css';

interface ModuleDashboardProps {
  view: TelecomView;
  onBackToXena: () => void;
}

export function ModuleDashboard({ view, onBackToXena }: ModuleDashboardProps) {
  const getAuthToken = useAuthToken();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    records,
    filteredRecords,
    selectedRecord,
    setSelectedRecordIds,
    telecomLoading,
    telecomError,
    telecomLoadedAt,
    loadTelecomView,
  } = useTelecom(view, getAuthToken, search);

  const meta = VIEW_META.find((v) => v.key === view);

  const summaryCards = useMemo(() => {
    const regions = new Set(records.map((r) => r.networkRegion)).size;
    const critical = records.filter((r) => r.severity === 'SEV1').length;
    const operators = new Set(records.map((r) => r.operatorName)).size;
    return [
      { label: 'Total', value: records.length, hint: 'from DynamoDB' },
      { label: summaryLabel(view), value: summaryValue(view, records), hint: 'active' },
      { label: 'Critical', value: critical, hint: 'SEV1' },
      { label: 'Operators', value: operators, hint: `${regions} regions` },
    ];
  }, [view, records]);

  return (
    <div className={styles.moduleDashboard}>
      <div className={styles.moduleHeader}>
        <div className={styles.moduleHeaderLeft}>
          <button className={styles.backToXenaBtn} onClick={onBackToXena} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Xena
          </button>
          <div>
            <h1 className={styles.moduleTitle}>{meta?.label || view}</h1>
            <p className={styles.moduleSubtitle}>{meta?.subtitle}</p>
          </div>
        </div>

        <div className={styles.moduleToolbar}>
          <input
            className={styles.moduleSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, city, fiber, service..."
          />
          <button
            className={styles.moduleRefresh}
            onClick={() => void loadTelecomView(view, true)}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.moduleSummaryRow}>
        {summaryCards.map((card) => (
          <div key={card.label} className={styles.moduleSummaryCard}>
            <div className={styles.moduleSummaryValue}>{card.value}</div>
            <div className={styles.moduleSummaryLabel}>{card.label}</div>
            <div className={styles.moduleSummaryHint}>{card.hint}</div>
          </div>
        ))}
      </div>

      <div className={styles.moduleGrid}>
        <div className={styles.moduleList}>
          {telecomLoading[view] && records.length === 0 ? (
            <div className={styles.moduleEmpty}>Loading from DynamoDB...</div>
          ) : telecomError[view] ? (
            <div className={styles.moduleEmpty}>Error: {telecomError[view]}</div>
          ) : filteredRecords.length === 0 ? (
            <div className={styles.moduleEmpty}>No records found.</div>
          ) : (
            filteredRecords.map((record) => (
              <button
                key={record.recordId}
                type="button"
                className={cn(
                  styles.moduleRecordCard,
                  selectedRecord?.recordId === record.recordId && styles.moduleRecordCardActive
                )}
                onClick={() => setSelectedRecordIds((prev) => ({ ...prev, [view]: record.recordId }))}
              >
                <div className={styles.moduleRecordHead}>
                  <div className={styles.moduleRecordBadges}>
                    <span className={cn(styles.sevBadge, styles[`tone_${severityTone(record.severity)}`])}>{record.severity}</span>
                    <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(record.status)}`])}>
                      {record.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <time>{formatRelative(record.updatedAt)}</time>
                </div>
                <div className={styles.moduleRecordTitle}>{record.title}</div>
                <div className={styles.moduleRecordSummary}>{record.summary}</div>
                <div className={styles.moduleRecordMeta}>
                  {record.companyName} &middot; {record.serviceType} &middot; {record.city}
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.moduleDetail}>
          {selectedRecord ? (
            <div className={styles.moduleDetailInner}>
              <div className={styles.moduleDetailTitle}>{selectedRecord.title}</div>
              <div className={styles.moduleDetailBadges}>
                <span className={cn(styles.sevBadge, styles[`tone_${severityTone(selectedRecord.severity)}`])}>{selectedRecord.severity}</span>
                <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(selectedRecord.status)}`])}>
                  {selectedRecord.status.replaceAll('_', ' ')}
                </span>
                <span className={styles.moduleDetailPriority}>{selectedRecord.priority}</span>
              </div>
              <div className={styles.moduleDetailSummary}>{selectedRecord.summary}</div>

              <div className={styles.moduleDetailTimes}>
                <span>Start: {formatDateTime(selectedRecord.startTime)}</span>
                {selectedRecord.endTime && <span>End: {formatDateTime(selectedRecord.endTime)}</span>}
              </div>

              <div className={styles.moduleDetailHighlights}>
                {selectedRecord.highlights.map((h) => (
                  <div key={h.label} className={styles.moduleDetailHighlight}>
                    <div className={styles.moduleDetailHLLabel}>{h.label}</div>
                    <div className={styles.moduleDetailHLValue}>{h.value}</div>
                  </div>
                ))}
              </div>

              <div className={styles.moduleDetailFacts}>
                {selectedRecord.facts.map((f) => (
                  <div key={f.label} className={styles.moduleDetailFactRow}>
                    <span>{f.label}</span>
                    <strong>{f.value}</strong>
                  </div>
                ))}
              </div>

              {selectedRecord.customerText && (
                <div className={styles.moduleDetailNotice}>
                  <div className={styles.panelSectionTitle}>Customer notice</div>
                  <p>{selectedRecord.customerText}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.moduleEmpty}>Select a record to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
