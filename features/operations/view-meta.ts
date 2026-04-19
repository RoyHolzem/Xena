import type { TelecomView } from '@/lib/types';

export const VIEW_META: Array<{ key: TelecomView; label: string; subtitle: string }> = [
  { key: 'incidents', label: 'Incidents', subtitle: 'Live faults and degradations' },
  { key: 'events', label: 'Events', subtitle: 'Operational updates and notices' },
  { key: 'planned-works', label: 'Planned works', subtitle: 'Scheduled maintenance windows' },
];
