import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const VALID_STATUSES = {
  incidents: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'MONITORING', 'RESOLVED', 'CLOSED'],
};

/** Mirrors the PUT/POST status gate in index.mjs / telecom route. */
function isInvalidStatus(bodyStatus, type = 'incidents') {
  if (bodyStatus === undefined || bodyStatus === null) return false;
  return !VALID_STATUSES[type] || !VALID_STATUSES[type].includes(bodyStatus);
}

/** Legacy falsy gate that allowed empty-string status writes. */
function legacyIsInvalidStatus(bodyStatus, type = 'incidents') {
  return Boolean(bodyStatus && VALID_STATUSES[type] && !VALID_STATUSES[type].includes(bodyStatus));
}

describe('status validation', () => {
  it('rejects empty string status that the legacy falsy check accepted', () => {
    assert.equal(legacyIsInvalidStatus(''), false);
    assert.equal(isInvalidStatus(''), true);
  });

  it('still accepts valid statuses and ignores omitted/null updates', () => {
    assert.equal(isInvalidStatus('OPEN'), false);
    assert.equal(isInvalidStatus(undefined), false);
    assert.equal(isInvalidStatus(null), false);
    assert.equal(isInvalidStatus('NOT_A_STATUS'), true);
  });
});
