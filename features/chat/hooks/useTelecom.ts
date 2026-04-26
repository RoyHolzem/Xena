'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TelecomApiResponse, TelecomRecord, TelecomView } from '@/lib/types';

const TELECOM_REFRESH_INTERVAL = 60000;

const emptyData: Record<TelecomView, TelecomRecord[]> = {
  incidents: [],
  events: [],
  'planned-works': [],
};

const emptyLoading: Record<TelecomView, boolean> = {
  incidents: false,
  events: false,
  'planned-works': false,
};

const emptyErrors: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
};

const emptySelected: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
};

const emptyLoadedAt: Record<TelecomView, string | null> = {
  incidents: null,
  events: null,
  'planned-works': null,
};

export function useTelecom(
  activeView: TelecomView,
  getAuthToken: () => Promise<string | null>,
  search: string,
) {
  const [telecomData, setTelecomData] = useState<Record<TelecomView, TelecomRecord[]>>(emptyData);
  const [telecomLoading, setTelecomLoading] = useState<Record<TelecomView, boolean>>(emptyLoading);
  const [telecomError, setTelecomError] = useState<Record<TelecomView, string | null>>(emptyErrors);
  const [telecomLoadedAt, setTelecomLoadedAt] = useState<Record<TelecomView, string | null>>(emptyLoadedAt);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Record<TelecomView, string | null>>(emptySelected);

  const loadTelecomView = useCallback(async (view: TelecomView, force = false) => {
    if (!force && telecomData[view].length > 0) return;

    setTelecomLoading((prev) => ({ ...prev, [view]: true }));
    setTelecomError((prev) => ({ ...prev, [view]: null }));

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Missing auth token');

      const response = await fetch(`/api/telecom?view=${view}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json()) as TelecomApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to load records');
      }

      setTelecomData((prev) => ({ ...prev, [view]: payload.items }));
      setTelecomLoadedAt((prev) => ({ ...prev, [view]: new Date().toISOString() }));
      setSelectedRecordIds((prev) => ({
        ...prev,
        [view]: prev[view] && payload.items.some((item) => item.recordId === prev[view])
          ? prev[view]
          : (payload.items[0]?.recordId ?? null),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records';
      setTelecomError((prev) => ({ ...prev, [view]: message }));
    } finally {
      setTelecomLoading((prev) => ({ ...prev, [view]: false }));
    }
  }, [getAuthToken, telecomData]);

  useEffect(() => {
    void loadTelecomView(activeView);
  }, [activeView, loadTelecomView]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadTelecomView(activeView, true);
    }, TELECOM_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeView, loadTelecomView]);

  const records = telecomData[activeView];

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => buildSearch(record).includes(term));
  }, [records, search]);

  useEffect(() => {
    if (!filteredRecords.length) return;
    const selectedId = selectedRecordIds[activeView];
    if (!selectedId || !filteredRecords.some((record) => record.recordId === selectedId)) {
      setSelectedRecordIds((prev) => ({ ...prev, [activeView]: filteredRecords[0].recordId }));
    }
  }, [activeView, filteredRecords, selectedRecordIds]);

  const selectedRecord = useMemo(() => {
    const selectedId = selectedRecordIds[activeView];
    return filteredRecords.find((record) => record.recordId === selectedId) || filteredRecords[0] || null;
  }, [activeView, filteredRecords, selectedRecordIds]);

  return {
    records,
    filteredRecords,
    selectedRecord,
    selectedRecordIds,
    setSelectedRecordIds,
    telecomLoading,
    telecomError,
    telecomLoadedAt,
    loadTelecomView,
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
