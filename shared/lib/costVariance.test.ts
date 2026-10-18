import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCostVariance, standardLaborFromOperations } from './costVariance.ts';

describe('costVariance', () => {
  it('flags unfavorable total when actual exceeds standard', () => {
    const v = computeCostVariance(
      { material: 100, labor: 50 },
      { material: 120, labor: 40 }
    );
    assert.equal(v.materialVariance, 20);
    assert.equal(v.laborVariance, -10);
    assert.equal(v.totalVariance, 10);
    assert.equal(v.favorable, false);
  });

  it('computes standard labor from routing hours', () => {
    const labor = standardLaborFromOperations(
      [{ standardHours: 1 }, { standardHours: 0.5 }],
      10,
      100,
      1
    );
    // 1.5h * 10 * 100 = 1500
    assert.equal(labor, 1500);
  });
});
