import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPlannedWorkToday } from './index.mjs';

describe('isPlannedWorkToday', () => {
  it('matches when maintenance window is today even if startTime is an older create stamp', () => {
    const item = {
      startTime: '2026-07-01T10:00:00.000Z',
      maintenanceWindowStart: '2026-07-31T02:00:00.000Z',
      maintenanceWindowEnd: '2026-07-31T06:00:00.000Z',
    };
    assert.equal(isPlannedWorkToday(item, '2026-07-31'), true);
    assert.equal(isPlannedWorkToday(item, '2026-07-01'), false);
  });

  it('does not treat create-day as maintenance day when the window is later', () => {
    const item = {
      startTime: '2026-07-31T10:00:00.000Z',
      maintenanceWindowStart: '2026-08-05T02:00:00.000Z',
      maintenanceWindowEnd: '2026-08-05T06:00:00.000Z',
    };
    assert.equal(isPlannedWorkToday(item, '2026-07-31'), false);
    assert.equal(isPlannedWorkToday(item, '2026-08-05'), true);
  });

  it('prefers maintenanceWindowEnd over a stale endTime', () => {
    const item = {
      startTime: '2026-07-01T10:00:00.000Z',
      endTime: '2026-07-01T12:00:00.000Z',
      maintenanceWindowStart: '2026-07-31T02:00:00.000Z',
      maintenanceWindowEnd: '2026-07-31T06:00:00.000Z',
    };
    assert.equal(isPlannedWorkToday(item, '2026-07-31'), true);
    assert.equal(isPlannedWorkToday(item, '2026-07-01'), false);
  });

  it('falls back to startTime/endTime when no maintenance window is set', () => {
    const item = {
      startTime: '2026-07-31T10:00:00.000Z',
      endTime: '2026-07-31T12:00:00.000Z',
    };
    assert.equal(isPlannedWorkToday(item, '2026-07-31'), true);
    assert.equal(isPlannedWorkToday(item, '2026-08-01'), false);
  });
});
