'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { XenaActionEvent } from '@/lib/types';

export type ActionLogEntry = {
  id: string;
  timestamp: string;
  source: 'api' | 'stream' | 'record' | 'tool';
  label: string;
  detail?: string;
  expanded?: string;
  status: 'running' | 'done' | 'error';
  icon: string;
};

let counter = 0;
function nextId(): string { return `a-${++counter}`; }
function nowIso(): string { return new Date().toISOString(); }

function toolIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('incident')) return '⚠';
  if (l.includes('event')) return '⚡';
  if (l.includes('planned') || l.includes('maintenance')) return '⚙';
  if (l.includes('order')) return '📦';
  if (l.includes('web_fetch') || l.includes('fetch')) return '🌐';
  if (l.includes('web_search') || l.includes('search')) return '🔍';
  if (l.includes('get')) return '⬇';
  if (l.includes('post')) return '⬆';
  if (l.includes('put')) return '✏️';
  if (l.includes('lambda')) return 'λ';
  return '▸';
}

export function useActionLog() {
  const [actions, setActions] = useState<ActionLogEntry[]>([]);

  const addEntry = useCallback((entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => {
    const full: ActionLogEntry = { ...entry, id: nextId(), timestamp: nowIso() };
    setActions((prev) => [...prev, full]);
    return full.id;
  }, []);

  const markAllRunningDone = useCallback(() => {
    setActions((prev) =>
      prev.map((e) => (e.status === 'running' ? { ...e, status: 'done' as const } : e)),
    );
  }, []);

  return { actions, addEntry, markAllRunningDone };
}

/** Handle an SSE action event from the server */
export function actionEventToEntry(event: XenaActionEvent): Omit<ActionLogEntry, 'id' | 'timestamp'> {
  const isComplete = event.verb === 'completed';
  const label = event.label;
  const detail = event.detail || event.resource || event.region;

  let expanded: string | undefined;
  if (detail && detail.includes('{')) {
    expanded = detail;
  } else if (isComplete) {
    expanded = `{\n  "status": "completed",\n  "verb": "${event.verb}"\n}`;
  } else {
    expanded = `{\n  "method": "${label.split(' ')[0]}",\n  "path": "${label.split(' ').slice(1).join(' ') || '/unknown'}",\n  "status": "${isComplete ? '200' : 'pending'}"\n}`;
  }

  return {
    source: 'tool',
    label: isComplete ? `${label}` : label,
    detail,
    expanded,
    status: isComplete ? 'done' : 'running',
    icon: isComplete ? '✓' : toolIcon(label),
  };
}

/** Parse assistant text for record IDs and action patterns after response completes */
function parseActionsFromText(text: string): Array<{ label: string; detail?: string; icon: string; expanded?: string }> {
  const actions: Array<{ label: string; detail?: string; icon: string; expanded?: string }> = [];

  // Record ID patterns
  const recordRe = /\b((?:INCIDENT|EVENT|PW|ORDER)-LUX-\d{4}(?:-\d{4})?)(?!-\d)\b/g;
  let match: RegExpExecArray | null;
  const seenRecords = new Set<string>();
  while ((match = recordRe.exec(text)) !== null) {
    const id = match[1];
    if (seenRecords.has(id)) continue;
    seenRecords.add(id);
    let label = 'Matched record';
    let icon = '📋';
    if (id.startsWith('INCIDENT')) { label = 'Incident'; icon = '⚠'; }
    else if (id.startsWith('EVENT')) { label = 'Event'; icon = '⚡'; }
    else if (id.startsWith('PW')) { label = 'Maintenance'; icon = '⚙'; }
    else if (id.startsWith('ORDER')) { label = 'Order'; icon = '📦'; }
    actions.push({ label, detail: id, icon, expanded: `{\n  "recordId": "${id}"\n}` });
  }

  return actions;
}

export function useActionLogSync(
  actionLog: ReturnType<typeof useActionLog>,
  presence: 'idle' | 'processing' | 'typing' | 'error',
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>,
  getAuthToken: () => Promise<string | null>,
) {
  const prevPresenceRef = useRef(presence);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevPresenceRef.current;
    prevPresenceRef.current = presence;

    if (prev === 'idle' && presence === 'processing') {
      actionLog.addEntry({
        source: 'stream',
        label: 'Processing',
        detail: 'Operator thinking...',
        status: 'running',
        icon: '▸',
        expanded: '{\n  "event": "processing_start",\n  "agent": "openclaw/operator",\n  "description": "The operator received your message and is deciding which tools to use. It may query APIs, search records, or fetch external data."\n}',
      });
    }

    if (prev === 'processing' && presence === 'typing') {
      // Don't mark processing as done — it stays until action events complete it
      actionLog.addEntry({
        source: 'stream',
        label: 'Streaming response',
        status: 'running',
        icon: '💬',
      });
    }

    if ((prev === 'typing' || prev === 'processing') && presence === 'idle') {
      actionLog.markAllRunningDone();
    }

    if (presence === 'error') {
      actionLog.markAllRunningDone();
      actionLog.addEntry({ source: 'stream', label: 'Error', status: 'error', icon: '❌' });
    }
  }, [presence, actionLog]);

  // Parse completed assistant messages for record IDs
  // AND poll CloudWatch for real API Gateway access logs
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      if (processedRef.current.has(msg.id)) continue;
      if (!msg.content || msg.content.length < 5) continue;
      if (presence !== 'idle') continue;

      processedRef.current.add(msg.id);

      const parsed = parseActionsFromText(msg.content);
      for (const action of parsed) {
        actionLog.addEntry({
          source: 'record',
          label: action.label,
          detail: action.detail,
          expanded: action.expanded,
          status: 'done',
          icon: action.icon,
        });
      }

      // Poll CloudWatch for real API Gateway logs
      // Logs have 1-2 min ingestion delay, so we retry multiple times
      const msgTime = new Date(msg.createdAt).getTime();
      const chatStartTime = msgTime - 10000; // 10s before message

      const pollCloudWatch = async (attempt: number) => {
        try {
          const token = await getAuthToken();
          if (!token) return;
          const res = await fetch('/api/api-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ afterTimestamp: chatStartTime }),
          });
          if (!res.ok) {
            if (attempt < 5) setTimeout(() => pollCloudWatch(attempt + 1), 20000);
            return;
          }
          const data: { events?: Array<Record<string, string>> } = await res.json();
          if (!data.events || data.events.length === 0) {
            if (attempt < 5) setTimeout(() => pollCloudWatch(attempt + 1), 20000);
            return;
          }
          for (const evt of data.events) {
            const method = evt.httpMethod || 'GET';
            const route = evt.routeKey || 'unknown';
            const status = evt.status || '?';
            const latency = evt.integrationLatency || '?';
            const requestTime = evt.requestTime || '';
            const path = route.includes(' ') ? route.split(' ').slice(1).join(' ') : route;
            actionLog.addEntry({
              source: 'api',
              label: `${method} ${path}`,
              detail: `${status} · ${latency}ms`,
              expanded: `{\n  "method": "${method}",\n  "route": "${route}",\n  "path": "${path}",\n  "status": ${status},\n  "latency": "${latency}ms",\n  "requestId": "${evt.requestId || ''}",\n  "timestamp": "${requestTime}"\n}`,
              status: String(status).startsWith('2') ? 'done' : 'error',
              icon: method === 'GET' ? '⬇' : method === 'POST' ? '⬆' : method === 'PUT' ? '✏️' : '▸',
            });
          }
        } catch (err) {
          console.error('[action-log] CloudWatch poll failed:', err);
        }
      };

      setTimeout(() => pollCloudWatch(0), 30000);

      break; // Only process the latest unprocessed assistant message
    }
  }, [messages, presence, actionLog, getAuthToken]);
}
