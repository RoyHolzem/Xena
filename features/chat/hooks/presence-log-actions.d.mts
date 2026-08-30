export type ChatPresence = 'idle' | 'processing' | 'typing' | 'error';

export type PresenceLogAction =
  | {
      type: 'add';
      entry: {
        source: 'api' | 'stream' | 'record' | 'tool';
        label: string;
        detail?: string;
        expanded?: string;
        status: 'running' | 'done' | 'error';
        icon: string;
      };
    }
  | { type: 'mark_all_running_done' };

export function presenceLogActions(prev: ChatPresence, next: ChatPresence): PresenceLogAction[];
