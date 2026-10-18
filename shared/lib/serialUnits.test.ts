import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSerialUnits,
  allocateSerials,
  restoreSerials,
  availableSerials,
} from './serialUnits.ts';

describe('serialUnits', () => {
  it('normalizes legacy string array', () => {
    const u = normalizeSerialUnits({ serialNumbers: ['A1', 'A2'] });
    assert.equal(u.length, 2);
    assert.equal(u[0].status, 'available');
  });

  it('allocates FIFO and marks sold', () => {
    const units = normalizeSerialUnits({ serialNumbers: ['S1', 'S2', 'S3'] });
    const { next, used } = allocateSerials(units, 2, { saleId: 'sale1' });
    assert.equal(used.length, 2);
    assert.equal(availableSerials(next).length, 1);
    assert.equal(next[0].status, 'sold');
  });

  it('prefers lot when allocating', () => {
    const units = [
      { serial: 'X1', lotNumber: 'L1', status: 'available' as const },
      { serial: 'X2', lotNumber: 'L2', status: 'available' as const },
    ];
    const { used } = allocateSerials(units, 1, { preferredLot: 'L2' });
    assert.equal(used[0].serial, 'X2');
  });

  it('restores on return by saleId', () => {
    let units = normalizeSerialUnits({ serialNumbers: ['A'] });
    units = allocateSerials(units, 1, { saleId: 's1' }).next;
    units = restoreSerials(units, { saleId: 's1' });
    assert.equal(units[0].status, 'returned');
  });
});
