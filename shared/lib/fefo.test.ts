import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateFefo, sortLotsFefo, upsertLot } from './fefo.ts';

describe('fefo', () => {
  const lots = [
    { lotNumber: 'B', qty: 10, expiryDate: '2026-06-01' },
    { lotNumber: 'A', qty: 5, expiryDate: '2026-04-01' },
    { lotNumber: 'C', qty: 20, expiryDate: '2025-01-01' },
  ];

  it('sorts earliest expiry first', () => {
    const s = sortLotsFefo(lots, new Date('2026-03-01'));
    assert.equal(s[0].lotNumber, 'C');
    assert.equal(s[1].lotNumber, 'A');
  });

  it('allocates FEFO skipping expired by default', () => {
    const r = allocateFefo(lots, 12, { asOf: new Date('2026-03-01') });
    assert.equal(r.ok, true);
    assert.equal(r.allocated, 12);
    assert.equal(r.lines[0].lotNumber, 'A');
    assert.equal(r.skippedExpired.length, 1);
  });

  it('upsertLot merges same lot number', () => {
    let list = upsertLot([], { lotNumber: 'X', qty: 2, expiryDate: '2026-12-01' });
    list = upsertLot(list, { lotNumber: 'X', qty: 3 });
    assert.equal(list.length, 1);
    assert.equal(list[0].qty, 5);
  });
});

describe('FEFO warehouse scope', () => {
  it('allocates only from matching warehouse lots', () => {
    const lots = [
      { lotNumber: 'A', qty: 10, expiryDate: '2028-10-01', warehouseId: 'WH1' },
      { lotNumber: 'B', qty: 10, expiryDate: '2028-11-01', warehouseId: 'WH2' },
    ];
    const r = allocateFefo(lots, 5, { warehouseId: 'WH1', asOf: new Date('2028-09-01') });
    assert.equal(r.allocated, 5);
    assert.equal(r.lines[0].lotNumber, 'A');
    assert.equal(r.remainingLots.find((l) => l.lotNumber === 'B')?.qty, 10);
  });

  it('upsert merges same lot+warehouse only', () => {
    let lots = upsertLot([], { lotNumber: 'X', qty: 3, warehouseId: 'WH1' });
    lots = upsertLot(lots, { lotNumber: 'X', qty: 2, warehouseId: 'WH2' });
    lots = upsertLot(lots, { lotNumber: 'X', qty: 1, warehouseId: 'WH1' });
    assert.equal(lots.length, 2);
    assert.equal(lots.find((l) => l.warehouseId === 'WH1')?.qty, 4);
    assert.equal(lots.find((l) => l.warehouseId === 'WH2')?.qty, 2);
  });
});

describe('variant-style lot isolation', () => {
  it('keeps separate lot registers per key (simulates variants)', () => {
    const variantA = [{ lotNumber: 'A1', qty: 5, expiryDate: '2028-10-01' }];
    const variantB = [{ lotNumber: 'B1', qty: 8, expiryDate: '2028-11-01' }];
    const a = allocateFefo(variantA, 3, { asOf: new Date('2028-09-01') });
    const b = allocateFefo(variantB, 3, { asOf: new Date('2028-09-01') });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(a.lines[0]?.lotNumber, 'A1');
    assert.equal(b.lines[0]?.lotNumber, 'B1');
    assert.equal(a.allocated, 3);
    assert.equal(b.allocated, 3);
    assert.equal(a.remainingLots.find((l) => l.lotNumber === 'A1')?.qty, 2);
    assert.equal(b.remainingLots.find((l) => l.lotNumber === 'B1')?.qty, 5);
  });
});
