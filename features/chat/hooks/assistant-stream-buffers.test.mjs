import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendAssistantStream,
  createAssistantStreamBuffers,
  resetAssistantStream,
} from './assistant-stream-buffers.ts';

describe('assistant stream buffers', () => {
  it('keeps text and voice deltas isolated when streams overlap', () => {
    const buffers = createAssistantStreamBuffers();

    appendAssistantStream(buffers, 'text', 'Incident ');
    appendAssistantStream(buffers, 'text', 'A is open.');
    // Voice starts mid-text stream and must not wipe or join text content.
    resetAssistantStream(buffers, 'voice');
    appendAssistantStream(buffers, 'voice', 'Acknowledged.');

    assert.equal(buffers.text, 'Incident A is open.');
    assert.equal(buffers.voice, 'Acknowledged.');
  });

  it('resetting voice does not truncate an in-flight text buffer', () => {
    const buffers = createAssistantStreamBuffers();
    appendAssistantStream(buffers, 'text', 'Partial answer');
    resetAssistantStream(buffers, 'voice');
    appendAssistantStream(buffers, 'text', ' continues.');

    assert.equal(buffers.text, 'Partial answer continues.');
    assert.equal(buffers.voice, '');
  });
});
