import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCapacitySchedule, suggestAvailableDay } from './capacityPlan.ts';

describe('capacityPlan', () => {
  it('loads batches onto work center days and detects overload', () => {
    const { centers, unassigned } = buildCapacitySchedule({
      workCenters: [{ id: 'wc1', name: 'Line A', capacityPerDay: 100 }],
      batches: [
        { id: 'b1', workCenter: 'wc1', quantity: 80, status: 'Planned', startDate: '2026-03-01' },
        { id: 'b2', workCenter: 'wc1', quantity: 50, status: 'In Progress', startDate: '2026-03-01' },
        { id: 'b3', quantity: 10, status: 'Planned', startDate: '2026-03-01' },
      ],
      from: '2026-03-01',
      to: '2026-03-03',
    });
    assert.equal(unassigned.length, 1);
    const day = centers[0].days.find((d) => d.date === '2026-03-01')!;
    assert.equal(day.load, 130);
    assert.ok(day.overload > 0);
    assert.ok(centers[0].overloadedDays.includes('2026-03-01'));
  });

  it('suggestAvailableDay finds free capacity', () => {
    const { centers } = buildCapacitySchedule({
      workCenters: [{ id: 'wc1', name: 'Line A', capacityPerDay: 50 }],
      batches: [{ id: 'b1', workCenter: 'wc1', quantity: 50, status: 'Planned', startDate: '2026-04-01' }],
      from: '2026-04-01',
      to: '2026-04-03',
    });
    const day = suggestAvailableDay(centers[0], 20, '2026-04-01');
    assert.equal(day, '2026-04-02');
  });
});
