'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TelecomApiResponse, TelecomRecord, TelecomView } from '@/lib/types';

const TELECOM_REFRESH_INTERVAL = 60000;

const emptyData: Record<TelecomView, TelecomRecord[]> = {
  incidents: [],
  events: [],
  'planned-works': [],
  orders: [],
};

const emptyLoading: Record<TelecomView, boolean> = {
  incidents: false,
  events: false,
  'planned-works': false,
  orders: false,
};

const emptyErrors: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
  orders: null,
};

const emptySelected: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
  orders: null,
};

const emptyLoadedAt: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
  orders: null,
};

export type UseTelecomOptions = {
  onContextViewChange?: (view: TelecomView) => void;
  /** When true, fetch active view once on mount / view change (module dashboard). Default false for agentic cockpit. */
  autoLoadOnMount?: boolean;
  /** When true, refresh active view on an interval after first load. Default false. */
  enablePolling?: boolean;
};

export function useTelecom(
  activeView: TelecomView,
  getAuthToken: () => Promise<string | null>,
  search: string,
  options?: UseTelecomOptions,
) {
  const onContextViewChange = options?.onContextViewChange;
  const autoLoadOnMount = options?.autoLoadOnMount ?? false;
  const enablePolling = options?.enablePolling ?? false;

  const [telecomData, setTelecomData] = useState<Record<TelecomView, TelecomRecord[]>>(emptyData);
  const [telecomLoading, setTelecomLoading] = useState<Record<TelecomView, boolean>>(emptyLoading);
  const [telecomError, setTelecomError] = useState<Record<TelecomView, string | null>>(emptyErrors);
  const [telecomLoadedAt, setTelecomLoadedAt] = useState<Record<TelecomView, string | null>>(emptyLoadedAt);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Record<TelecomView, string | null>>(emptySelected);

  const fetchTelecomPayload = useCallback(
    async (view: TelecomView, recordId?: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Missing auth token');
      let url = `/api/telecom?view=${view}`;
      if (recordId) url += `&recordId=${encodeURIComponent(recordId)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json()) as TelecomApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to load records');
      }
      return payload;
    },
    [getAuthToken],
  );

  const applyPayload = useCallback((view: TelecomView, payload: TelecomApiResponse, preferRecordId?: string | null) => {
    setTelecomData((prev) => ({ ...prev, [view]: payload.items }));
    setTelecomLoadedAt((prev) => ({ ...prev, [view]: new Date().toISOString() }));
    setSelectedRecordIds((prev) => {
      let next: string | null = null;
      if (preferRecordId && payload.items.some((i) => i.recordId === preferRecordId)) {
        next = preferRecordId;
      } else if (prev[view] && payload.items.some((item) => item.recordId === prev[view])) {
        next = prev[view];
      }
      return { ...prev, [view]: next };
    });
  }, []);

  const loadTelecomView = useCallback(
    async (view: TelecomView, force = false, recordId?: string) => {
      if (!recordId && !force && telecomData[view].length > 0) return;

      setTelecomLoading((prev) => ({ ...prev, [view]: true }));
      setTelecomError((prev) => ({ ...prev, [view]: null }));

      try {
        const payload = await fetchTelecomPayload(view, recordId);
        applyPayload(view, payload, recordId ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load records';
        setTelecomError((prev) => ({ ...prev, [view]: message }));
      } finally {
        setTelecomLoading((prev) => ({ ...prev, [view]: false }));
      }
    },
    [fetchTelecomPayload, applyPayload, telecomData],
  );

  const selectedRecordIdForActiveView = selectedRecordIds[activeView] ?? undefined;

  const focusRecord = useCallback(
    async (view: TelecomView, recordId: string) => {
      onContextViewChange?.(view);
      await loadTelecomView(view, true, recordId);
    },
    [onContextViewChange, loadTelecomView],
  );

  const clearOperationalContext = useCallback(() => {
    setTelecomData({ ...emptyData });
    setSelectedRecordIds({ ...emptySelected });
    setTelecomLoadedAt({ ...emptyLoadedAt });
    setTelecomError({ ...emptyErrors });
  }, []);

  useEffect(() => {
    if (!autoLoadOnMount) return;
    void loadTelecomView(activeView);
  }, [activeView, loadTelecomView, autoLoadOnMount]);

  useEffect(() => {
    if (!enablePolling) return;
    const interval = setInterval(() => {
      void loadTelecomView(activeView, true, selectedRecordIdForActiveView);
    }, TELECOM_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeView, loadTelecomView, enablePolling, selectedRecordIdForActiveView]);

  const records = telecomData[activeView];

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => buildSearch(record).includes(term));
  }, [records, search]);

  const selectedRecord = useMemo(() => {
    const selectedId = selectedRecordIds[activeView];
    if (!selectedId) return null;
    return filteredRecords.find((record) => record.recordId === selectedId) ?? null;
  }, [activeView, filteredRecords, selectedRecordIds]);

  /**
   * Override the active view + selected record from chat context.
   * Used by useChatContext when the conversation references a record.
   */
  const selectRecord = useCallback((view: TelecomView, recordId: string) => {
    setSelectedRecordIds((prev) => ({ ...prev, [view]: recordId }));
  }, []);

  return {
    recordsByView: telecomData,
    records,
    filteredRecords,
    selectedRecord,
    selectedRecordIds,
    setSelectedRecordIds,
    selectRecord,
    telecomLoading,
    telecomError,
    telecomLoadedAt,
    loadTelecomView,
    focusRecord,
    clearOperationalContext,
  };
}

/* ─── helpers ─── */

function buildSearch(record: TelecomRecord) {
  return [
    record.title, record.summary, record.status, record.severity, record.priority,
    record.typeCode, record.companyName, record.customerName, record.customerContactName,
    record.customerEmail, record.customerPhone, record.city, record.networkRegion,
    record.networkCountry, record.operatorName, record.serviceType, record.networkSegment,
    record.fiberId, record.circuitId, record.siteCode, record.customerText,
    ...record.highlights.map((item) => item.value),
    ...record.facts.map((item) => item.value),
  ].join(' ').toLowerCase();
}
