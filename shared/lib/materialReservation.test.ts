import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateReservations,
  availableStock,
  applyReservationsToMrpLines,
} from './materialReservation.ts';

describe('materialReservation', () => {
  it('aggregates open batch leaves and ignores completed', () => {
    const map = aggregateReservations([
      { id: '1', status: 'Planned', standardLeaves: [{ materialId: 'r1', qty: 10 }] },
      { id: '2', status: 'In Progress', standardLeaves: [{ materialId: 'r1', qty: 5 }] },
      { id: '3', status: 'Completed', standardLeaves: [{ materialId: 'r1', qty: 100 }] },
    ]);
    assert.equal(map.get('r1'), 15);
  });

  it('excludeBatchId skips self', () => {
    const map = aggregateReservations(
      [
        { id: 'self', status: 'Planned', standardLeaves: [{ materialId: 'r1', qty: 10 }] },
        { id: 'other', status: 'Planned', standardLeaves: [{ materialId: 'r1', qty: 3 }] },
      ],
      { excludeBatchId: 'self' }
    );
    assert.equal(map.get('r1'), 3);
  });

  it('applyReservationsToMrpLines computes available and shortage', () => {
    const reserved = new Map([['r1', 40]]);
    const lines = applyReservationsToMrpLines(
      [{ materialId: 'r1', required: 30, onHand: 50 }],
      reserved
    );
    assert.equal(lines[0].available, 10);
    assert.equal(lines[0].shortage, 20);
    assert.equal(lines[0].ok, false);
  });

  it('availableStock never negative', () => {
    assert.equal(availableStock(5, 10), 0);
  });
});
