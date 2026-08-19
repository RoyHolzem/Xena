import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  beginVoiceTurn,
  createVoiceTurnGate,
  invalidateVoiceTurn,
  isVoiceTurnActive,
} from './voice-turn.ts';

describe('voice turn gate', () => {
  it('allows side effects only for the active turn', () => {
    const gate = createVoiceTurnGate();
    const turnA = beginVoiceTurn(gate);
    assert.equal(isVoiceTurnActive(gate, turnA), true);

    invalidateVoiceTurn(gate);
    assert.equal(isVoiceTurnActive(gate, turnA), false);
  });

  it('superseding with a new turn keeps only the latest turn active', () => {
    const gate = createVoiceTurnGate();
    const turnA = beginVoiceTurn(gate);
    const turnB = beginVoiceTurn(gate);

    assert.equal(isVoiceTurnActive(gate, turnA), false);
    assert.equal(isVoiceTurnActive(gate, turnB), true);
  });

  it('cancel after begin blocks the cancelled turn even if work later resolves', () => {
    const gate = createVoiceTurnGate();
    const turn = beginVoiceTurn(gate);
    // Simulate user tapping cancel mid-STT/chat.
    invalidateVoiceTurn(gate);
    assert.equal(isVoiceTurnActive(gate, turn), false);
  });
});
