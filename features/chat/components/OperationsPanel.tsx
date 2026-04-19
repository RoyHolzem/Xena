'use client';

import type { TelecomRecord, TelecomView } from '@/lib/types';
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

interface OperationsPanelProps {
  activeView: TelecomView;
  setActiveView: (view: TelecomView) => void;
  search: string;
  setSearch: (search: string) => void;
  records: TelecomRecord[];
  filteredRecords: TelecomRecord[];
  selectedRecord: TelecomRecord | null;
  setSelectedRecordId: (id: string) => void;
  telecomLoading: Record<TelecomView, boolean>;
  telecomError: Record<TelecomView, string | null>;
  telecomLoadedAt: Record<TelecomView, string | null>;
  loadTelecomView: (view: TelecomView, force?: boolean) => void;
}

export function OperationsPanel({
  activeView,
  setActiveView,
  search,
  setSearch,
  records,
  filteredRecords,
  selectedRecord,
  setSelectedRecordId,
  telecomLoading,
  telecomError,
  telecomLoadedAt,
  loadTelecomView,
}: OperationsPanelProps) {
  const summaryCards = buildSummaryCards(activeView, records);

  return (
    <section className={styles.operationsPanel}>
      <div className={styles.viewSwitcher}>
        {VIEW_META.map((view) => (
          <button
            key={view.key}
            className={cn(styles.viewButton, activeView === view.key && styles.activeViewButton)}
            onClick={() => setActiveView(view.key)}
            type="button"
          >
            <span>{view.label}</span>
            <small>{view.subtitle}</small>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchWrap}>
          <span>Search records</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Company, city, fiber ID, service, contact."
          />
        </label>
        <div className={styles.toolbarMeta}>
          <div className={styles.lastUpdated}>
            {telecomLoadedAt[activeView] ? `Updated ${formatRelative(telecomLoadedAt[activeView] || '')}` : 'Not loaded yet'}
          </div>
          <button className={styles.refreshButton} type="button" onClick={() => void loadTelecomView(activeView, true)}>
            Refresh view
          </button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{card.label}</div>
            <div className={styles.summaryValue}>{card.value}</div>
            <div className={styles.summaryHint}>{card.hint}</div>
          </article>
        ))}
      </div>

      <div className={styles.recordsLayout}>
        <RecordList
          activeView={activeView}
          filteredRecords={filteredRecords}
          selectedRecord={selectedRecord}
          setSelectedRecordId={setSelectedRecordId}
          telecomLoading={telecomLoading}
          telecomError={telecomError}
        />
        <RecordDetail selectedRecord={selectedRecord} />
      </div>
    </section>
  );
}

/* ─── Record List ─── */

function RecordList({
  activeView,
  filteredRecords,
  selectedRecord,
  setSelectedRecordId,
  telecomLoading,
  telecomError,
}: {
  activeView: TelecomView;
  filteredRecords: TelecomRecord[];
  selectedRecord: TelecomRecord | null;
  setSelectedRecordId: (id: string) => void;
  telecomLoading: Record<TelecomView, boolean>;
  telecomError: Record<TelecomView, string | null>;
}) {
  return (
    <div className={styles.recordListPanel}>
      <div className={styles.panelHead}>
        <div>
          <h2>{VIEW_META.find((item) => item.key === activeView)?.label}</h2>
          <p>{filteredRecords.length} visible of {filteredRecords.length} total rows</p>
        </div>
      </div>
      <div className={styles.recordScroller}>
        {telecomLoading[activeView] ? (
          <div className={styles.emptyState}>Loading {activeView} from DynamoDB.</div>
        ) : telecomError[activeView] ? (
          <div className={styles.emptyState}>Couldn&apos;t load data: {telecomError[activeView]}</div>
        ) : filteredRecords.length === 0 ? (
          <div className={styles.emptyState}>No records match that search.</div>
        ) : (
          filteredRecords.map((record) => (
            <button
              key={record.recordId}
              type="button"
              className={cn(styles.recordCard, selectedRecord?.recordId === record.recordId && styles.recordCardActive)}
              onClick={() => setSelectedRecordId(record.recordId)}
            >
              <div className={styles.recordHead}>
                <div className={styles.recordBadges}>
                  <span className={cn(styles.severityBadge, styles[`tone_${severityTone(record.severity)}`])}>{record.severity}</span>
                  <span className={cn(styles.statusBadge, styles[`statusTone_${statusTone(record.status)}`])}>{record.status.replaceAll('_', ' ')}</span>
                </div>
                <time>{formatRelative(record.updatedAt)}</time>
              </div>
              <div className={styles.recordTitle}>{record.title}</div>
              <div className={styles.recordSummary}>{record.summary}</div>
              <div className={styles.recordMeta}>{record.companyName} &middot; {record.serviceType}</div>
              <div className={styles.recordMeta}>{record.city}, {record.networkRegion} &middot; {record.fiberId}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Record Detail ─── */

function RecordDetail({ selectedRecord }: { selectedRecord: TelecomRecord | null }) {
  if (!selectedRecord) {
    return (
      <div className={styles.detailPanel}>
        <div className={styles.emptyState}>Select a record to inspect the full detail panel.</div>
      </div>
    );
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.panelHead}>
        <div>
          <h2>{selectedRecord.title}</h2>
          <p>{selectedRecord.recordId} &middot; {selectedRecord.operatorName}</p>
        </div>
      </div>

      <div className={styles.detailHero}>
        <div className={styles.detailHeroTop}>
          <span className={cn(styles.severityBadge, styles[`tone_${severityTone(selectedRecord.severity)}`])}>{selectedRecord.severity}</span>
          <span className={cn(styles.statusBadge, styles[`statusTone_${statusTone(selectedRecord.status)}`])}>{selectedRecord.status.replaceAll('_', ' ')}</span>
          <span className={styles.detailPriority}>{selectedRecord.priority}</span>
        </div>
        <div className={styles.detailSummary}>{selectedRecord.summary}</div>
        <div className={styles.detailTiming}>
          <span>Start {formatDateTime(selectedRecord.startTime)}</span>
          <span>{selectedRecord.endTime ? `End ${formatDateTime(selectedRecord.endTime)}` : `Updated ${formatDateTime(selectedRecord.updatedAt)}`}</span>
        </div>
      </div>

      <div className={styles.infoGrid}>
        {selectedRecord.highlights.map((item) => (
          <div key={`${selectedRecord.recordId}-${item.label}`} className={styles.infoTile}>
            <div className={styles.infoTileLabel}>{item.label}</div>
            <div className={styles.infoTileValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.noticeCard}>
        <div className={styles.cardLabel}>Customer notice</div>
        <p>{selectedRecord.customerText}</p>
      </div>

      <div className={styles.factSection}>
        <div className={styles.cardLabel}>Network and contact details</div>
        <div className={styles.factList}>
          {selectedRecord.facts.map((fact) => (
            <div key={`${selectedRecord.recordId}-${fact.label}`} className={styles.factRow}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Summary helpers ─── */

function buildSummaryCards(view: TelecomView, records: TelecomRecord[]) {
  const regions = new Set(records.map((r) => r.networkRegion)).size;
  const critical = records.filter((r) => r.severity === 'SEV1').length;
  const operators = new Set(records.map((r) => r.operatorName)).size;
  return [
    { label: 'Total records', value: String(records.length), hint: 'loaded from DynamoDB' },
    { label: summaryLabel(view), value: String(summaryValue(view, records)), hint: 'currently relevant' },
    { label: 'SEV1 / critical', value: String(critical), hint: 'highest severity' },
    { label: 'Operators / regions', value: `${operators} / ${regions}`, hint: 'Lux coverage spread' },
  ];
}
