import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecord } from './normalize-record.mjs';

describe('normalizeRecord', () => {
  it('prefers maintenance window over create-time startTime for planned works', () => {
    const item = {
      recordId: 'PW-LUX-2026-0001',
      title: 'Fiber splice',
      status: 'PLANNED',
      severity: 'SEV3',
      startTime: '2026-08-01T10:00:00.000Z', // create stamp
      endTime: '2026-08-01T11:00:00.000Z', // stale
      maintenanceWindowStart: '2026-08-05T02:00:00.000Z',
      maintenanceWindowEnd: '2026-08-05T06:00:00.000Z',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    };

    const out = normalizeRecord(item);
    assert.equal(out.startTime, '2026-08-05T02:00:00.000Z');
    assert.equal(out.endTime, '2026-08-05T06:00:00.000Z');
    assert.equal(out.maintenanceWindowStart, '2026-08-05T02:00:00.000Z');
    assert.equal(out.maintenanceWindowEnd, '2026-08-05T06:00:00.000Z');
  });

  it('falls back to startTime/endTime when window fields are absent', () => {
    const out = normalizeRecord({
      recordId: 'INCIDENT-LUX-2026-0001',
      title: 'Outage',
      status: 'OPEN',
      severity: 'SEV1',
      startTime: '2026-08-05T08:00:00.000Z',
      endTime: '2026-08-05T09:00:00.000Z',
      createdAt: '2026-08-05T08:00:00.000Z',
      updatedAt: '2026-08-05T08:00:00.000Z',
    });

    assert.equal(out.startTime, '2026-08-05T08:00:00.000Z');
    assert.equal(out.endTime, '2026-08-05T09:00:00.000Z');
    assert.equal(out.maintenanceWindowStart, undefined);
    assert.equal(out.maintenanceWindowEnd, undefined);
  });

  it('does not invent endTime when neither end field is set', () => {
    const out = normalizeRecord({
      recordId: 'PW-LUX-2026-0002',
      title: 'Open-ended work',
      startTime: '2026-08-05T08:00:00.000Z',
    });
    assert.equal(out.endTime, undefined);
  });
});
