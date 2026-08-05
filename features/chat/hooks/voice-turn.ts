/**
 * Voice turn gate — prevents cancelled turns from mutating chat state.
 *
 * Starting voice while a text reply was still streaming, or cancelling
 * mid-STT/chat/TTS, previously continued to emit deltas, focus records,
 * and play audio after the user had cancelled. This module gives each
 * turn a unique id and an AbortController; cancelled turns are silently
 * dropped by the stillActive() check.
 */

export type VoiceTurnGate = {
  activeId: number | null;
};

export function createVoiceTurnGate(): VoiceTurnGate {
  return { activeId: null };
}

export function beginVoiceTurn(gate: VoiceTurnGate): number {
  const id = (gate.activeId ?? 0) + 1;
  gate.activeId = id;
  return id;
}

export function invalidateVoiceTurn(gate: VoiceTurnGate): void {
  gate.activeId = null;
}

export function isVoiceTurnActive(gate: VoiceTurnGate, id: number): boolean {
  return gate.activeId === id;
}
