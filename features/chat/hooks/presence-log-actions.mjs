/**
 * Pure presence→action-log planner (shared by the React hook and tests).
 *
 * Error logging must be transition-gated. `useActionLog()` returns a new object
 * each render and `addEntry` updates state — an unguarded `presence === 'error'`
 * check re-fires forever and freezes the chat UI.
 */

/** @type {'idle' | 'processing' | 'typing' | 'error'} */
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

/**
 * @param {ChatPresence} prev
 * @param {ChatPresence} next
 * @returns {PresenceLogAction[]}
 */
export function presenceLogActions(prev, next) {
  /** @type {PresenceLogAction[]} */
  const actions = [];

  if (prev === 'idle' && next === 'processing') {
    actions.push({
      type: 'add',
      entry: {
        source: 'stream',
        label: 'Processing',
        detail: 'Operator thinking...',
        status: 'running',
        icon: '▸',
      },
    });
  }

  if (prev === 'processing' && next === 'typing') {
    actions.push({
      type: 'add',
      entry: {
        source: 'stream',
        label: 'Streaming response',
        status: 'running',
        icon: '💬',
      },
    });
  }

  if ((prev === 'typing' || prev === 'processing') && next === 'idle') {
    actions.push({ type: 'mark_all_running_done' });
  }

  if (prev !== 'error' && next === 'error') {
    actions.push({ type: 'mark_all_running_done' });
    actions.push({
      type: 'add',
      entry: { source: 'stream', label: 'Error', status: 'error', icon: '❌' },
    });
  }

  return actions;
}
