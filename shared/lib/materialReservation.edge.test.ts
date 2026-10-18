import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canReserve, findOverReservations } from './materialReservation.ts';

describe('materialReservation edges', () => {
  it('canReserve shortfall', () => {
    const r = canReserve(10, 8, 5);
    assert.equal(r.ok, false);
    assert.equal(r.free, 2);
    assert.equal(r.shortfall, 3);
  });
  it('findOverReservations', () => {
    const over = findOverReservations({ m1: 5 }, new Map([['m1', 9]]));
    assert.equal(over.length, 1);
    assert.equal(over[0].excess, 4);
  });
});
