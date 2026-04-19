'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActionLogEntry, ActionSource, XenaActionEvent } from '@/lib/types';
import { makeId } from '../chat-utils';

const CT_POLL_INTERVAL = 15000;

export function useCloudTrail(
  getAuthToken: () => Promise<string | null>,
) {
  const [awsStatus, setAwsStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const seenActionIds = useRef<Set<string>>(new Set());

  const addAction = (entry: {
    id?: string;
    timestamp: string;
    verb: string;
    category: string;
    label: string;
    resource?: string;
    region?: string;
    detail?: string;
  }, source: ActionSource) => {
    const id = entry.id || makeId();
    if (seenActionIds.current.has(id)) return;
    seenActionIds.current.add(id);
    setActionLog((prev) => [...prev, { ...entry, id, source }]);
  };

  const addXenaAction = (event: XenaActionEvent) => {
    const ts = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };
    addAction({
      timestamp: event.timestamp || ts(),
      verb: event.verb,
      category: event.category,
      label: event.label,
      resource: event.resource,
      region: event.region,
      detail: event.detail,
    }, 'xena');
  };

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch('/api/aws-activity?minutes=30', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (cancelled) return;
        setAwsStatus('connected');
        if (data.actions) {
          for (const action of data.actions) {
            addAction({
              timestamp: action.timestamp,
              verb: action.verb,
              category: action.category,
              label: action.label,
              resource: action.resource,
              region: action.region,
              detail: action.detail,
            }, 'cloudtrail');
          }
        }
      } catch {
        if (!cancelled) setAwsStatus('error');
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), CT_POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [getAuthToken]);

  return { awsStatus, actionLog, addXenaAction };
}
