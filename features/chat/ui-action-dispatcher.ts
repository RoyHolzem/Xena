import type { XenaUiAction, XenaSearchResultRow } from '@/lib/xena-ui-actions';
import {
  entityKindToTelecomView,
  openActionRecordId,
  openActionToView,
} from '@/lib/xena-ui-actions';

const OPEN_TYPES = new Set<string>([
  'OPEN_INCIDENT',
  'OPEN_EVENT',
  'OPEN_PLANNED_WORK',
  'OPEN_ORDER',
  'SHOW_INCIDENT',
  'SHOW_EVENT',
  'SHOW_PLANNED_WORK',
  'SHOW_ORDER',
]);

function isRecordId(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function narrowSearchRow(o: Record<string, unknown>): XenaSearchResultRow | null {
  if (!isRecordId(o.recordId)) return null;
  return {
    recordId: o.recordId.trim(),
    title: typeof o.title === 'string' ? o.title : '—',
    status: typeof o.status === 'string' ? o.status : '—',
    severity: typeof o.severity === 'string' ? o.severity : '—',
  };
}

/** Validate and narrow one action object from the wire. */
export function narrowUiAction(raw: unknown): XenaUiAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const t = o.type;
  if (typeof t !== 'string') return null;

  if (t === 'CLEAR_CONTEXT') return { type: 'CLEAR_CONTEXT' };
  if (t === 'CLEAR_AGENT_ACTIVITY') return { type: 'CLEAR_AGENT_ACTIVITY' };

  if (t === 'SET_AGENT_ACTIVITY') {
    const phaseRaw = typeof o.phase === 'string' ? o.phase.trim() : '';
    const messageRaw = typeof o.message === 'string' ? o.message.trim() : '';
    const message = messageRaw || phaseRaw;
    if (!message) return null;
    const phase = phaseRaw || 'activity';
    return { type: 'SET_AGENT_ACTIVITY', phase, message };
  }

  if (OPEN_TYPES.has(t) && isRecordId(o.recordId)) {
    return { type: t as XenaUiAction['type'], recordId: (o.recordId as string).trim() } as XenaUiAction;
  }

  if (t === 'SHOW_SEARCH_RESULTS') {
    const entity = o.entity;
    if (entity !== 'incident' && entity !== 'event' && entity !== 'planned-work' && entity !== 'order') return null;
    const results = o.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    const rows: XenaSearchResultRow[] = [];
    for (const item of results) {
      if (!item || typeof item !== 'object') continue;
      const row = narrowSearchRow(item as Record<string, unknown>);
      if (row) rows.push(row);
    }
    if (!rows.length) return null;
    return { type: 'SHOW_SEARCH_RESULTS', entity, results: rows };
  }

  return null;
}

/** Normalize `uiActions` array from an SSE payload (drops invalid entries). */
export function normalizeUiActions(raw: unknown): XenaUiAction[] {
  if (!Array.isArray(raw)) return [];
  const out: XenaUiAction[] = [];
  for (const item of raw) {
    const a = narrowUiAction(item);
    if (a) out.push(a);
  }
  return out;
}

export function describeAction(action: XenaUiAction): string {
  switch (action.type) {
    case 'OPEN_INCIDENT':
    case 'OPEN_EVENT':
    case 'OPEN_PLANNED_WORK':
    case 'OPEN_ORDER':
      return `${action.type}(${action.recordId})`;
    case 'SHOW_INCIDENT':
    case 'SHOW_EVENT':
    case 'SHOW_PLANNED_WORK':
    case 'SHOW_ORDER':
      return `${action.type}(${action.recordId})`;
    case 'SHOW_SEARCH_RESULTS':
      return `SHOW_SEARCH_RESULTS(${action.entity},${action.results.length})`;
    case 'CLEAR_CONTEXT':
      return 'CLEAR_CONTEXT';
    case 'SET_AGENT_ACTIVITY':
      return `SET_AGENT_ACTIVITY(${action.phase})`;
    case 'CLEAR_AGENT_ACTIVITY':
      return 'CLEAR_AGENT_ACTIVITY';
    default:
      return 'unknown';
  }
}

export type CockpitDispatchDeps = {
  focusRecord: (view: import('@/lib/types').TelecomView, recordId: string) => Promise<void>;
  clearOperationalContext: () => void;
  setContextView: (view: import('@/lib/types').TelecomView) => void;
  setAgentActivity: (v: { phase: string; message: string } | null) => void;
  setSearchResults: (v: { entity: import('@/lib/xena-ui-actions').XenaEntityKind; results: XenaSearchResultRow[] } | null) => void;
};

/**
 * Apply validated UI actions (side effects via deps).
 * OPEN_* and SHOW_* both load detail on the right (MVP); SHOW_SEARCH_RESULTS fills the left list only.
 */
export async function applyUiActions(actions: XenaUiAction[], deps: CockpitDispatchDeps): Promise<void> {
  for (const action of actions) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[xena-ui]', describeAction(action));
    }
    switch (action.type) {
      case 'CLEAR_CONTEXT':
        deps.clearOperationalContext();
        deps.setSearchResults(null);
        deps.setAgentActivity(null);
        break;
      case 'CLEAR_AGENT_ACTIVITY':
        deps.setAgentActivity(null);
        break;
      case 'SET_AGENT_ACTIVITY':
        deps.setAgentActivity({ phase: action.phase, message: action.message });
        break;
      case 'SHOW_SEARCH_RESULTS': {
        const view = entityKindToTelecomView(action.entity);
        if (view) deps.setContextView(view);
        deps.setSearchResults({ entity: action.entity, results: action.results });
        const v = entityKindToTelecomView(action.entity);
        if (v && action.results.length === 1) {
          await deps.focusRecord(v, action.results[0].recordId);
          deps.setSearchResults(null);
        }
        break;
      }
      case 'OPEN_INCIDENT':
      case 'OPEN_EVENT':
      case 'OPEN_PLANNED_WORK':
      case 'OPEN_ORDER':
      case 'SHOW_INCIDENT':
      case 'SHOW_EVENT':
      case 'SHOW_PLANNED_WORK':
      case 'SHOW_ORDER': {
        const view = openActionToView(action);
        const id = openActionRecordId(action);
        if (view && id) {
          deps.setSearchResults(null);
          await deps.focusRecord(view, id);
        }
        break;
      }
      default:
        break;
    }
  }
}
