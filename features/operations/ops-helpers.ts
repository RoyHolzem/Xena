import type { TelecomRecord, TelecomView } from '@/lib/types';

export function formatDateTime(value: string, withSeconds = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

export function formatRelative(value: string) {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '-';
  const diffMinutes = Math.round((date - Date.now()) / 60000);
  const abs = Math.abs(diffMinutes);
  if (abs < 60) return diffMinutes >= 0 ? `in ${abs}m` : `${abs}m ago`;
  const hours = Math.round(abs / 60);
  if (hours < 24) return diffMinutes >= 0 ? `in ${hours}h` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return diffMinutes >= 0 ? `in ${days}d` : `${days}d ago`;
}

export function statusTone(status: string) {
  const value = status.toUpperCase();
  if (['CLOSED', 'RESOLVED', 'COMPLETED'].includes(value)) return 'ok';
  if (['IN_EXECUTION', 'IN_PROGRESS', 'ACTIVE', 'ACKNOWLEDGED', 'READY'].includes(value)) return 'warn';
  if (['POSTPONED'].includes(value)) return 'muted';
  return 'neutral';
}

export function severityTone(severity: string) {
  if (severity === 'SEV1') return 'critical';
  if (severity === 'SEV2') return 'high';
  if (severity === 'SEV3') return 'medium';
  return 'low';
}

export function summaryLabel(view: TelecomView) {
  if (view === 'incidents') return 'Open / live';
  if (view === 'events') return 'Active updates';
  return 'Upcoming windows';
}

export function summaryValue(view: TelecomView, records: TelecomRecord[]) {
  const activeStatuses =
    view === 'incidents'
      ? new Set(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'MONITORING'])
      : view === 'events'
        ? new Set(['INFO', 'ACTIVE', 'MONITORING'])
        : new Set(['PLANNED', 'APPROVED', 'CUSTOMER_NOTIFIED', 'READY', 'IN_EXECUTION']);
  return records.filter((record) => activeStatuses.has(record.status)).length;
}
