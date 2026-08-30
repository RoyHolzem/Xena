import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { presenceLogActions } from './presence-log-actions.mjs';

describe('presenceLogActions', () => {
  it('logs a single Error entry on transition into error', () => {
    const actions = presenceLogActions('processing', 'error');
    assert.deepEqual(
      actions.map((a) => a.type),
      ['mark_all_running_done', 'add'],
    );
    assert.equal(actions[1].entry.label, 'Error');
    assert.equal(actions[1].entry.status, 'error');
  });

  it('does not re-log while presence remains error (prevents render loop)', () => {
    // Simulates effect re-runs caused by unstable actionLog object identity
    // after addEntry updates state.
    assert.deepEqual(presenceLogActions('error', 'error'), []);
  });

  it('allows a fresh Error entry after recovery', () => {
    assert.equal(presenceLogActions('error', 'idle').length, 0);
    const actions = presenceLogActions('idle', 'error');
    assert.equal(actions.filter((a) => a.type === 'add' && a.entry.label === 'Error').length, 1);
  });

  it('still emits processing and streaming transitions', () => {
    assert.equal(presenceLogActions('idle', 'processing')[0].entry.label, 'Processing');
    assert.equal(presenceLogActions('processing', 'typing')[0].entry.label, 'Streaming response');
    assert.deepEqual(presenceLogActions('typing', 'idle'), [{ type: 'mark_all_running_done' }]);
  });
});
