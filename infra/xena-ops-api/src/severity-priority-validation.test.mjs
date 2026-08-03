import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  invalidPriorityError,
  invalidSeverityError,
  VALID_PRIORITIES,
  VALID_SEVERITIES,
} from './severity-priority-validation.mjs';

describe('severity / priority validation', () => {
  it('rejects empty-string and non-canonical severity that would hide SEV1 triage', () => {
    assert.match(invalidSeverityError(''), /Invalid severity/);
    assert.match(invalidSeverityError('critical'), /Invalid severity/);
    assert.match(invalidSeverityError('sev1'), /Invalid severity/);
    assert.match(invalidSeverityError('SEV-1'), /Invalid severity/);
    assert.equal(invalidSeverityError('SEV1'), null);
    assert.equal(invalidSeverityError(undefined), null);
    assert.equal(invalidSeverityError(null), null);
  });

  it('rejects empty-string and non-canonical priority', () => {
    assert.match(invalidPriorityError(''), /Invalid priority/);
    assert.match(invalidPriorityError('high'), /Invalid priority/);
    assert.match(invalidPriorityError('1'), /Invalid priority/);
    assert.equal(invalidPriorityError('P1'), null);
    assert.equal(invalidPriorityError(undefined), null);
    assert.equal(invalidPriorityError(null), null);
  });

  it('exposes the canonical option lists used by the dashboard', () => {
    assert.deepEqual(VALID_SEVERITIES, ['SEV1', 'SEV2', 'SEV3', 'SEV4']);
    assert.deepEqual(VALID_PRIORITIES, ['P1', 'P2', 'P3', 'P4', 'P5']);
  });
});
