'use client';

import { useMemo, useState } from 'react';
import type { TelecomRecord, TelecomView } from '@/lib/types';
import type { SearchResultsState } from '../hooks/useCockpitState';
import { cn } from '../chat-utils';
import { formatDateTime, severityTone, statusTone } from '@/features/operations/ops-helpers';
import styles from '../styles/side-panel.module.css';

interface RightPanelProps {
  visible: boolean;
  selectedRecord: TelecomRecord | null;
  activeView: TelecomView;
  loading?: boolean;
  error?: string | null;
  loadedAt?: string | null;
  searchResults?: SearchResultsState;
  onSelectSearchResult?: (recordId: string) => void;
  onOpenModule?: (view: TelecomView) => void;
}

const VIEW_LABEL: Record<TelecomView, string> = {
  incidents: 'Incident',
  events: 'Event',
  'planned-works': 'Maintenance',
  orders: 'Order',
};

export function RightPanel({ visible, selectedRecord, activeView, loading, error, loadedAt, searchResults, onSelectSearchResult, onOpenModule }: RightPanelProps) {
  return (
    <aside className={cn(styles.sidePanel, visible && styles.panelVisible)} aria-label="Artifact workbench">
      <header className={styles.workbenchHeader}>
        <div>
          <span className={styles.workbenchEyebrow}>Adaptive surface</span>
          <strong>Artifact workbench</strong>
        </div>
        <div className={styles.workbenchState}>
          <span className={cn(styles.workbenchStateDot, loading && styles.workbenchStateLoading)} />
          {loading ? 'Retrieving' : searchResults ? `${searchResults.results.length} found` : selectedRecord ? 'Hydrated' : 'Standby'}
        </div>
      </header>

      {searchResults ? (
        <SearchArtifact results={searchResults} onSelect={onSelectSearchResult} />
      ) : loading && !selectedRecord ? (
        <ArtifactSkeleton />
      ) : error && !selectedRecord ? (
        <div className={styles.panelError} role="alert">
          <span>Artifact retrieval failed</span>
          <strong>{error}</strong>
        </div>
      ) : !selectedRecord ? (
        <WorkbenchStandby />
      ) : (
        <RecordDossier
          key={selectedRecord.recordId}
          record={selectedRecord}
          activeView={activeView}
          loadedAt={loadedAt}
          onOpenModule={onOpenModule}
        />
      )}
    </aside>
  );
}

function SearchArtifact({ results, onSelect }: { results: NonNullable<SearchResultsState>; onSelect?: (recordId: string) => void }) {
  const entity = results.entity === 'planned-work' ? 'maintenance' : results.entity;
  return (
    <div className={styles.searchArtifact}>
      <div className={styles.searchArtifactIntro}>
        <span>Search result artifact</span>
        <h2>{results.results.length} {entity} records matched</h2>
        <p>Xena returned structured company records. Select one to hydrate the full operational artifact.</p>
      </div>
      <div className={styles.searchResultList}>
        {results.results.map((result, index) => (
          <button key={result.recordId} type="button" onClick={() => onSelect?.(result.recordId)}>
            <span className={styles.searchResultIndex}>{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.searchResultCopy}>
              <strong>{result.title}</strong>
              <small>{result.recordId}</small>
            </span>
            <span className={styles.searchResultMeta}>
              <i>{result.severity}</i>
              <em>{result.status.replaceAll('_', ' ')}</em>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        ))}
      </div>
      <footer className={styles.searchArtifactFooter}><span /> Structured UI · verified company data</footer>
    </div>
  );
}

function WorkbenchStandby() {
  return (
    <div className={styles.panelEmpty}>
      <div className={styles.emptyTopology} aria-hidden="true">
        <span className={styles.emptyNodePrimary} />
        <span className={styles.emptyLineOne} />
        <span className={styles.emptyNodeSecondary} />
        <span className={styles.emptyLineTwo} />
        <span className={styles.emptyNodeTertiary} />
      </div>
      <span className={styles.emptyEyebrow}>Context-aware workspace</span>
      <h2>Artifacts appear as Xena works.</h2>
      <p>Records, search results, approvals and action receipts hydrate here without interrupting the conversation.</p>
      <div className={styles.emptyCapabilities}>
        <span>Company data</span><span>Human control</span><span>Verified actions</span>
      </div>
    </div>
  );
}

function ArtifactSkeleton() {
  return (
    <div className={styles.skeletonWrap} role="status" aria-label="Retrieving operational artifact">
      <div className={styles.skeletonSignal}><span /></div>
      <div className={styles.skeletonLineShort} />
      <div className={styles.skeletonLineWide} />
      <div className={styles.skeletonLineMedium} />
      <div className={styles.skeletonGrid}><span /><span /><span /><span /></div>
      <div className={styles.skeletonStatus}>Retrieving company context…</div>
    </div>
  );
}

function RecordDossier({
  record,
  activeView,
  loadedAt,
  onOpenModule,
}: {
  record: TelecomRecord;
  activeView: TelecomView;
  loadedAt?: string | null;
  onOpenModule?: (view: TelecomView) => void;
}) {
  const sevTone = severityTone(record.severity);

  return (
    <div className={styles.detailWrap}>
      <section className={cn(styles.detailHero, styles[`toneRow_${sevTone}`])}>
        <div className={styles.artifactLiveRow}>
          <span><i /> Live {VIEW_LABEL[activeView]} artifact</span>
          {onOpenModule && (
            <button type="button" onClick={() => onOpenModule(activeView)}>
              Open workspace
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </div>
        <div className={styles.detailRecordId}>{record.recordId}</div>
        <h2 className={styles.detailTitle}>{record.title}</h2>
        <div className={styles.detailBadges}>
          <span className={cn(styles.sevBadge, styles[`tone_${sevTone}`])}>{record.severity}</span>
          <span className={cn(styles.statusBadgeChip, styles[`stat_${statusTone(record.status)}`])}>
            {record.status.replaceAll('_', ' ')}
          </span>
          {record.priority && record.priority !== '—' && <span className={styles.priorityBadge}>{record.priority}</span>}
        </div>
        {record.summary && <p className={styles.detailSummary}>{record.summary}</p>}
        <div className={styles.detailTimes}>
          <div><span>Started</span><strong>{formatDateTime(record.startTime)}</strong></div>
          {record.endTime && <div><span>Ended</span><strong>{formatDateTime(record.endTime)}</strong></div>}
          <div><span>Updated</span><strong>{formatDateTime(record.updatedAt)}</strong></div>
        </div>
      </section>

      <ExpandSection title="Operational signal" count={record.highlights.length} defaultOpen>
        <div className={styles.factGrid}>
          {record.highlights.map((item) => (
            <div key={item.label} className={styles.factTile}>
              <span>{item.label}</span><strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </ExpandSection>

      {record.facts.length > 0 && (
        <ExpandSection title="Network & contacts" count={record.facts.length}>
          <div className={styles.detailFactList}>
            {record.facts.map((item) => (
              <div key={item.label} className={styles.detailFactRow}>
                <span>{item.label}</span><strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </ExpandSection>
      )}

      {record.customerText && (
        <ExpandSection title="Customer notice">
          <div className={styles.noticeText}>{record.customerText}</div>
        </ExpandSection>
      )}

      <footer className={styles.provenanceFooter}>
        <div><span /> DynamoDB record</div>
        <time>{loadedAt ? `Fetched ${formatDateTime(loadedAt)}` : 'Current session'}</time>
      </footer>
    </div>
  );
}

function ExpandSection({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useMemo(() => `artifact-${Math.random().toString(36).slice(2, 9)}`, []);
  return (
    <section className={styles.expandSection}>
      <button type="button" className={styles.expandHeader} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span>{title}{typeof count === 'number' && <i>{count}</i>}</span>
        <svg className={cn(open && styles.expandChevronOpen)} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      {open && <div id={id} className={styles.expandBody}>{children}</div>}
    </section>
  );
}
