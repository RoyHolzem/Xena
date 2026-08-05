import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  beginVoiceTurn,
  createVoiceTurnGate,
  invalidateVoiceTurn,
  isVoiceTurnActive,
} from './voice-turn.ts';

describe('voice turn gate', () => {
  it('starts active and becomes inactive after cancel', () => {
    const gate = createVoiceTurnGate();
    const id = beginVoiceTurn(gate);
    assert.ok(isVoiceTurnActive(gate, id));
    invalidateVoiceTurn(gate);
    assert.ok(!isVoiceTurnActive(gate, id));
  });

  it('new turn invalidates old turn ids', () => {
    const gate = createVoiceTurnGate();
    const turn1 = beginVoiceTurn(gate);
    const turn2 = beginVoiceTurn(gate);
    assert.ok(!isVoiceTurnActive(gate, turn1));
    assert.ok(isVoiceTurnActive(gate, turn2));
  });

  it('cancel is idempotent', () => {
    const gate = createVoiceTurnGate();
    beginVoiceTurn(gate);
    invalidateVoiceTurn(gate);
    invalidateVoiceTurn(gate);
    const newTurn = beginVoiceTurn(gate);
    assert.ok(isVoiceTurnActive(gate, newTurn));
  });
});
