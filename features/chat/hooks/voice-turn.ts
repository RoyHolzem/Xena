/**
 * Voice turn identity helpers.
 * Cancel / supersede must invalidate in-flight STT→chat→TTS work so stale
 * transcripts, assistant deltas, and UI actions cannot mutate chat after cancel.
 */

export type VoiceTurnGate = {
  /** Monotonic id of the turn currently allowed to apply side effects. */
  activeTurnId: number;
};

export function createVoiceTurnGate(startId = 0): VoiceTurnGate {
  return { activeTurnId: startId };
}

/** Begin a new turn; returns the turn id that must be checked before side effects. */
export function beginVoiceTurn(gate: VoiceTurnGate): number {
  gate.activeTurnId += 1;
  return gate.activeTurnId;
}

/** Invalidate any in-flight turn (cancel or start of a replacement). */
export function invalidateVoiceTurn(gate: VoiceTurnGate): void {
  gate.activeTurnId += 1;
}

/** True only while this turn is still the active one. */
export function isVoiceTurnActive(gate: VoiceTurnGate, turnId: number): boolean {
  return gate.activeTurnId === turnId;
}
