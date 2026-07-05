'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { TelecomRecord, TelecomView } from '@/lib/types';
import { useTelecom } from '../hooks/useTelecom';
import { useTelecomMutation } from '../hooks/useTelecomMutation';
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
import styles from '../styles/module-dashboard.module.css';

/* ─── Status config per view ─── */

type StatusDef = { value: string; label: string; group: 'active' | 'closed' };

const STATUS_CONFIG: Record<TelecomView, StatusDef[]> = {
  incidents: [
    { value: 'OPEN', label: 'Open', group: 'active' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged', group: 'active' },
    { value: 'IN_PROGRESS', label: 'In Progress', group: 'active' },
    { value: 'MONITORING', label: 'Monitoring', group: 'active' },
    { value: 'RESOLVED', label: 'Resolved', group: 'closed' },
    { value: 'CLOSED', label: 'Closed', group: 'closed' },
  ],
  events: [
    { value: 'ACTIVE', label: 'Active', group: 'active' },
    { value: 'MONITORING', label: 'Monitoring', group: 'active' },
    { value: 'INFO', label: 'Info', group: 'active' },
    { value: 'COMPLETED', label: 'Completed', group: 'closed' },
    { value: 'CLOSED', label: 'Closed', group: 'closed' },
  ],
  'planned-works': [
    { value: 'PLANNED', label: 'Planned', group: 'active' },
    { value: 'APPROVED', label: 'Approved', group: 'active' },
    { value: 'CUSTOMER_NOTIFIED', label: 'Notified', group: 'active' },
    { value: 'READY', label: 'Ready', group: 'active' },
    { value: 'IN_EXECUTION', label: 'In Execution', group: 'active' },
    { value: 'COMPLETED', label: 'Completed', group: 'closed' },
    { value: 'CANCELLED', label: 'Cancelled', group: 'closed' },
    { value: 'POSTPONED', label: 'Postponed', group: 'closed' },
  ],
  orders: [
    { value: 'NEW', label: 'New', group: 'active' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged', group: 'active' },
    { value: 'IN_PROGRESS', label: 'In Progress', group: 'active' },
    { value: 'PENDING_INFO', label: 'Pending Info', group: 'active' },
    { value: 'COMPLETED', label: 'Completed', group: 'closed' },
    { value: 'CANCELLED', label: 'Cancelled', group: 'closed' },
  ],
};

const SEVERITY_OPTIONS = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
const PRIORITY_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5'];

const VIEW_ICON: Record<TelecomView, string> = {
  incidents: '⚡',
  events: '📡',
  'planned-works': '🔧',
  orders: '📦',
};

type StatusFilter = 'all' | 'active' | 'closed' | string;

interface ModuleDashboardProps {
  view: TelecomView;
  onBackToXena: () => void;
  initialRecordId?: string;
}

export function ModuleDashboard({ view, onBackToXena, initialRecordId }: ModuleDashboardProps) {
  const getAuthToken = useAuthToken();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const lastInitialRecordKey = useRef<string | null>(null);

  const {
    records,
    filteredRecords: searchFiltered,
    selectedRecord,
    setSelectedRecordIds,
    telecomLoading,
    telecomError,
    loadTelecomView,
  } = useTelecom(view, getAuthToken, search, {
    autoLoadOnMount: !initialRecordId,
    enablePolling: true,
  });

  const { updateRecord, createRecord } = useTelecomMutation();

  const meta = VIEW_META.find((v) => v.key === view);
  const statuses = STATUS_CONFIG[view];

  useEffect(() => {
    if (!initialRecordId) return;
    const key = `${view}:${initialRecordId}`;
    if (lastInitialRecordKey.current === key) return;
    lastInitialRecordKey.current = key;
    void loadTelecomView(view, true, initialRecordId);
  }, [view, initialRecordId, loadTelecomView]);

  // Apply status filter on top of search filter
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return searchFiltered;
    if (statusFilter === 'active') return searchFiltered.filter((r) => statuses.find((s) => s.value === r.status)?.group === 'active');
    if (statusFilter === 'closed') return searchFiltered.filter((r) => statuses.find((s) => s.value === r.status)?.group === 'closed');
    return searchFiltered.filter((r) => r.status === statusFilter);
  }, [searchFiltered, statusFilter, statuses]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: records.length, active: 0, closed: 0 };
    for (const s of statuses) counts[s.value] = 0;
    for (const r of records) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      const group = statuses.find((s) => s.value === r.status)?.group;
      if (group === 'active') counts.active++;
      if (group === 'closed') counts.closed++;
    }
    return counts;
  }, [records, statuses]);

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

  const handleStatusChange = useCallback(
    async (recordId: string, newStatus: string) => {
      const result = await updateRecord(view, recordId, { status: newStatus });
      if (result.ok) {
        void loadTelecomView(view, true);
      } else {
        console.error('Status update failed:', result.error);
      }
    },
    [view, updateRecord, loadTelecomView],
  );

  const handleFieldUpdate = useCallback(
    async (recordId: string, field: string, value: string) => {
      const result = await updateRecord(view, recordId, { [field]: value });
      if (result.ok) {
        void loadTelecomView(view, true);
      } else {
        console.error('Update failed:', result.error);
      }
    },
    [view, updateRecord, loadTelecomView],
  );

  const handleCreate = useCallback(
    async (fields: Record<string, unknown>) => {
      const result = await createRecord(view, fields);
      if (result.ok) {
        setShowCreateModal(false);
        void loadTelecomView(view, true);
      } else {
        console.error('Create failed:', result.error);
      }
      return result;
    },
    [view, createRecord, loadTelecomView],
  );

  // Next logical status transitions
  const getNextStatuses = useCallback(
    (currentStatus: string): StatusDef[] => {
      const idx = statuses.findIndex((s) => s.value === currentStatus);
      if (idx === -1) return statuses;
      // Return next 1-2 statuses and allow jumping to terminal states
      const next: StatusDef[] = [];
      if (idx + 1 < statuses.length) next.push(statuses[idx + 1]);
      if (idx + 2 < statuses.length) next.push(statuses[idx + 2]);
      // Always allow resolve/close
      const terminalStatuses = statuses.filter((s) => s.group === 'closed' && s.value !== currentStatus);
      for (const ts of terminalStatuses) {
        if (!next.find((n) => n.value === ts.value)) next.push(ts);
      }
      return next;
    },
    [statuses],
  );

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
            className={styles.moduleCreateBtn}
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            + New
          </button>
          <button
            className={styles.moduleRefresh}
            onClick={() => void loadTelecomView(view, true)}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.moduleSummaryRow}>
        {summaryCards.map((card) => (
          <div key={card.label} className={styles.moduleSummaryCard}>
            <div className={styles.moduleSummaryValue}>{card.value}</div>
            <div className={styles.moduleSummaryLabel}>{card.label}</div>
            <div className={styles.moduleSummaryHint}>{card.hint}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className={styles.statusFilterBar}>
        <button
          className={cn(styles.statusFilterTab, statusFilter === 'all' && styles.statusFilterTabActive)}
          onClick={() => setStatusFilter('all')}
          type="button"
        >
          All <span className={styles.statusFilterCount}>{statusCounts.all}</span>
        </button>
        <button
          className={cn(styles.statusFilterTab, statusFilter === 'active' && styles.statusFilterTabActive)}
          onClick={() => setStatusFilter('active')}
          type="button"
        >
          Active <span className={styles.statusFilterCount}>{statusCounts.active}</span>
        </button>
        {statuses.filter((s) => s.group === 'active').map((s) => (
          <button
            key={s.value}
            className={cn(styles.statusFilterTab, statusFilter === s.value && styles.statusFilterTabActive)}
            onClick={() => setStatusFilter(s.value)}
            type="button"
          >
            {s.label} <span className={styles.statusFilterCount}>{statusCounts[s.value] || 0}</span>
          </button>
        ))}
        <button
          className={cn(styles.statusFilterTab, statusFilter === 'closed' && styles.statusFilterTabActive)}
          onClick={() => setStatusFilter('closed')}
          type="button"
        >
          Closed <span className={styles.statusFilterCount}>{statusCounts.closed}</span>
        </button>
      </div>

      {/* Main grid: list + detail */}
      <div className={styles.moduleGrid}>
        <div className={styles.moduleList}>
          {telecomLoading[view] && records.length === 0 ? (
            <div className={styles.moduleEmpty}>Loading from DynamoDB...</div>
          ) : telecomError[view] ? (
            <div className={styles.moduleEmpty}>Error: {telecomError[view]}</div>
          ) : filteredRecords.length === 0 ? (
            <div className={styles.moduleEmpty}>
              <div>No records found.</div>
              <button
                className={styles.moduleCreateBtn}
                onClick={() => setShowCreateModal(true)}
                type="button"
                style={{ marginTop: 12 }}
              >
                + Create one
              </button>
            </div>
          ) : (
            filteredRecords.map((record, idx) => (
              <RecordCard
                key={record.recordId}
                record={record}
                view={view}
                isActive={selectedRecord?.recordId === record.recordId}
                index={idx}
                onClick={() => setSelectedRecordIds((prev) => ({ ...prev, [view]: record.recordId }))}
                onStatusChange={handleStatusChange}
                statuses={statuses}
              />
            ))
          )}
        </div>

        <div className={styles.moduleDetail}>
          {selectedRecord ? (
            <RecordDetail
              record={selectedRecord}
              view={view}
              statuses={statuses}
              getNextStatuses={getNextStatuses}
              onStatusChange={handleStatusChange}
              onFieldUpdate={handleFieldUpdate}
            />
          ) : (
            <div className={styles.moduleEmpty}>Select a record to view details and manage status</div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateRecordModal
          view={view}
          statuses={statuses}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

/* ─── Record Card (list item with quick actions) ─── */

function RecordCard({
  record,
  view,
  isActive,
  index,
  onClick,
  onStatusChange,
  statuses,
}: {
  record: TelecomRecord;
  view: TelecomView;
  isActive: boolean;
  index: number;
  onClick: () => void;
  onStatusChange: (recordId: string, newStatus: string) => Promise<void>;
  statuses: StatusDef[];
}) {
  const tone = severityTone(record.severity);
  const sTone = statusTone(record.status);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleQuickStatus = async (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    setUpdating(true);
    await onStatusChange(record.recordId, newStatus);
    setUpdating(false);
    setStatusMenuOpen(false);
  };

  return (
    <div
      className={cn(
        styles.moduleRecordCard,
        isActive && styles.moduleRecordCardActive,
        styles[`toneRow_${tone}`],
      )}
      style={{ animationDelay: `${Math.min(index * 25, 240)}ms` }}
    >
      <button
        type="button"
        className={styles.cardClickArea}
        onClick={onClick}
      >
        <div className={styles.moduleRecordHead}>
          <span className={styles.moduleRecordId}>
            {VIEW_ICON[view]} {record.recordId}
          </span>
          <time>{formatRelative(record.updatedAt)}</time>
        </div>

        <div className={styles.moduleRecordTitle}>{record.title}</div>

        <div className={styles.moduleRecordBadges}>
          <span className={cn(styles.sevBadge, styles[`tone_${tone}`])}>{record.severity}</span>
          <span className={cn(styles.statusBadgeChip, styles[`stat_${sTone}`])}>
            {record.status.replaceAll('_', ' ')}
          </span>
        </div>

        <div className={styles.moduleRecordMeta}>
          {record.companyName && <span>{record.companyName}</span>}
          {record.serviceType && <span>{record.serviceType}</span>}
          {record.city && <span>{record.city}</span>}
        </div>
      </button>

      {/* Quick status change button */}
      <div className={styles.cardQuickAction}>
        <button
          type="button"
          className={styles.cardStatusBtn}
          onClick={(e) => { e.stopPropagation(); setStatusMenuOpen(!statusMenuOpen); }}
          disabled={updating}
          title="Change status"
        >
          {updating ? '...' : '⋯'}
        </button>
        {statusMenuOpen && (
          <div className={styles.cardStatusMenu}>
            <div className={styles.cardStatusMenuTitle}>Set status</div>
            {statuses.map((s) => (
              <button
                key={s.value}
                type="button"
                className={cn(
                  styles.cardStatusOption,
                  record.status === s.value && styles.cardStatusOptionCurrent,
                )}
                onClick={(e) => void handleQuickStatus(e, s.value)}
                disabled={record.status === s.value}
              >
                {s.label}
                {record.status === s.value && ' ✓'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Record Detail with management controls ─── */

function RecordDetail({
  record,
  view,
  statuses,
  getNextStatuses,
  onStatusChange,
  onFieldUpdate,
}: {
  record: TelecomRecord;
  view: TelecomView;
  statuses: StatusDef[];
  getNextStatuses: (status: string) => StatusDef[];
  onStatusChange: (recordId: string, newStatus: string) => Promise<void>;
  onFieldUpdate: (recordId: string, field: string, value: string) => Promise<void>;
}) {
  const tone = severityTone(record.severity);
  const sTone = statusTone(record.status);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const nextStatuses = getNextStatuses(record.status);
  const currentStatusDef = statuses.find((s) => s.value === record.status);

  const handleStatusClick = async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    await onStatusChange(record.recordId, newStatus);
    setUpdatingStatus(null);
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (editingField && editValue.trim()) {
      await onFieldUpdate(record.recordId, editingField, editValue.trim());
    }
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  return (
    <div key={record.recordId} className={styles.moduleDetailInner}>
      {/* Hero header */}
      <div className={cn(styles.detailHero, styles[`tintBg_${tone}`])}>
        <div className={styles.detailHeroKind}>
          {VIEW_ICON[view]} {view.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </div>
        <div className={styles.detailHeroId}>{record.recordId}</div>
        <div className={styles.detailHeroTitle}>{record.title}</div>
        <div className={styles.detailHeroBadges}>
          <span className={cn(styles.sevBadge, styles[`tone_${tone}`])}>{record.severity}</span>
          <span className={cn(styles.statusBadgeChip, styles[`stat_${sTone}`])}>
            {record.status.replaceAll('_', ' ')}
          </span>
          <span className={styles.moduleDetailPriority}>{record.priority}</span>
        </div>
      </div>

      {/* Status transition bar */}
      <div className={styles.statusActionBar}>
        <div className={styles.statusActionLabel}>
          Status: <strong>{currentStatusDef?.label || record.status}</strong>
        </div>
        <div className={styles.statusActionButtons}>
          {nextStatuses.map((s) => (
            <button
              key={s.value}
              type="button"
              className={cn(
                styles.statusTransitionBtn,
                s.group === 'closed' && styles.statusTransitionBtnClose,
              )}
              disabled={updatingStatus === s.value}
              onClick={() => void handleStatusClick(s.value)}
            >
              {updatingStatus === s.value ? '...' : `→ ${s.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Quick edit: Severity & Priority */}
      <div className={styles.quickEditRow}>
        <div className={styles.quickEditGroup}>
          <span className={styles.quickEditLabel}>Severity</span>
          <div className={styles.quickEditOptions}>
            {SEVERITY_OPTIONS.map((sev) => (
              <button
                key={sev}
                type="button"
                className={cn(
                  styles.quickEditOption,
                  record.severity === sev && styles.quickEditOptionActive,
                  styles[`tone_${severityTone(sev)}`],
                )}
                onClick={() => void onFieldUpdate(record.recordId, 'severity', sev)}
                disabled={record.severity === sev}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.quickEditGroup}>
          <span className={styles.quickEditLabel}>Priority</span>
          <div className={styles.quickEditOptions}>
            {PRIORITY_OPTIONS.map((pri) => (
              <button
                key={pri}
                type="button"
                className={cn(
                  styles.quickEditOption,
                  record.priority === pri && styles.quickEditOptionActive,
                )}
                onClick={() => void onFieldUpdate(record.recordId, 'priority', pri)}
                disabled={record.priority === pri}
              >
                {pri}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editable summary */}
      {editingField === 'summary' ? (
        <div className={styles.inlineEditWrap}>
          <textarea
            className={styles.inlineEditTextarea}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className={styles.inlineEditActions}>
            <button type="button" className={styles.inlineEditSave} onClick={() => void saveEdit()}>Save</button>
            <button type="button" className={styles.inlineEditCancel} onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        record.summary && (
          <div className={styles.moduleDetailSummary}>
            {record.summary}
            <button
              type="button"
              className={styles.inlineEditTrigger}
              onClick={() => startEdit('summary', record.summary)}
              title="Edit summary"
            >
              ✏️
            </button>
          </div>
        )
      )}

      {/* Timestamps */}
      <div className={styles.detailTimes}>
        <div className={styles.detailTimeRow}>
          <span>Start</span>
          <strong>{formatDateTime(record.startTime)}</strong>
        </div>
        {record.endTime && (
          <div className={styles.detailTimeRow}>
            <span>End</span>
            <strong>{formatDateTime(record.endTime)}</strong>
          </div>
        )}
        <div className={styles.detailTimeRow}>
          <span>Updated</span>
          <strong>{formatDateTime(record.updatedAt)}</strong>
        </div>
      </div>

      {/* Highlights */}
      {record.highlights.length > 0 && (
        <div className={styles.moduleDetailHighlights}>
          {record.highlights.map((h) => (
            <div key={h.label} className={styles.moduleDetailHighlight}>
              <div className={styles.moduleDetailHLLabel}>{h.label}</div>
              <div className={styles.moduleDetailHLValue}>{h.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Facts */}
      {record.facts.length > 0 && (
        <div className={styles.moduleDetailFacts}>
          {record.facts.map((f) => (
            <div key={f.label} className={styles.moduleDetailFactRow}>
              <span>{f.label}</span>
              <strong>{f.value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Customer notice */}
      {record.customerText && (
        <div className={styles.moduleDetailNotice}>
          <div className={styles.panelSectionTitle}>Customer notice</div>
          <p>{record.customerText}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Create Record Modal ─── */

function CreateRecordModal({
  view,
  statuses,
  onClose,
  onCreate,
}: {
  view: TelecomView;
  statuses: StatusDef[];
  onClose: () => void;
  onCreate: (fields: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState(statuses[0]?.value || 'OPEN');
  const [severity, setSeverity] = useState('SEV3');
  const [priority, setPriority] = useState('P3');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await onCreate({
      title: title.trim(),
      summary: summary.trim(),
      status,
      severity,
      priority,
      companyName: companyName.trim() || undefined,
      city: city.trim() || undefined,
      serviceType: serviceType.trim() || undefined,
    });
    if (!result.ok) {
      setError(result.error || 'Failed to create record');
    }
    setSubmitting(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {VIEW_ICON[view]} New {view === 'planned-works' ? 'Planned Work' : view.replace(/s$/, '').replace(/^./, (c) => c.toUpperCase())}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.modalForm}>
          {error && <div className={styles.modalError}>{error}</div>}

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Title *</label>
            <input
              className={styles.modalInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue..."
              required
              autoFocus
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Summary</label>
            <textarea
              className={styles.modalTextarea}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detailed summary..."
              rows={3}
            />
          </div>

          <div className={styles.modalRow}>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Status</label>
              <select className={styles.modalSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Severity</label>
              <select className={styles.modalSelect} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Priority</label>
              <select className={styles.modalSelect} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.modalRow}>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Company</label>
              <input
                className={styles.modalInput}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Customer company"
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>City</label>
              <input
                className={styles.modalInput}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Service Type</label>
              <input
                className={styles.modalInput}
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g. Fiber, MPLS"
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
