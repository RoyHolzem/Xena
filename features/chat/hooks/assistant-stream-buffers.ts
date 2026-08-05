/**
 * Text and voice assistant streams must not share a content buffer.
 *
 * Overlapping streams previously concatenated into one ref and wrote the mixed
 * text onto both message ids, truncating/corrupting the visible transcript.
 */

export type AssistantStreamKind = 'text' | 'voice';

export type AssistantStreamBuffers = {
  text: string;
  voice: string;
};

export function createAssistantStreamBuffers(): AssistantStreamBuffers {
  return { text: '', voice: '' };
}

export function resetAssistantStream(
  buffers: AssistantStreamBuffers,
  stream: AssistantStreamKind,
): void {
  buffers[stream] = '';
}

export function appendAssistantStream(
  buffers: AssistantStreamBuffers,
  stream: AssistantStreamKind,
  delta: string,
): string {
  buffers[stream] += delta;
  return buffers[stream];
}
