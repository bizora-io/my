import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  planMrr,
  isPaying,
  isChurned,
  isAtRisk,
  computeChurnMetrics,
  computeNrrProxy,
  buildMrrSnapshot,
  nrrFromSnapshots,
} from './saasChurn.ts';

describe('saasChurn', () => {
  it('planMrr uses custom monthlyFee over plan default', () => {
    assert.equal(planMrr({ id: '1', plan: 'Pro', monthlyFee: 100 }), 100);
    assert.equal(planMrr({ id: '2', plan: 'Pro' }), 4999);
  });

  it('isPaying excludes suspended and cancelled subscription', () => {
    assert.equal(isPaying({ id: '1', plan: 'Pro', accountStatus: 'Active' }), true);
    assert.equal(isPaying({ id: '2', plan: 'Pro', accountStatus: 'Suspended' }), false);
    assert.equal(
      isPaying({ id: '3', plan: 'Pro', accountStatus: 'Active', subscriptionStatus: 'cancelled' }),
      false
    );
  });

  it('isChurned detects involuntaryChurnAt', () => {
    assert.equal(isChurned({ id: '1', accountStatus: 'Active', involuntaryChurnAt: '2026-01-01' }), true);
    assert.equal(isChurned({ id: '2', accountStatus: 'Active' }), false);
  });

  it('isAtRisk flags failed payments and open tickets', () => {
    const { risk, reasons } = isAtRisk(
      { id: 'biz1', plan: 'Pro', failedPaymentCount: 2 },
      { biz1: 3 }
    );
    assert.equal(risk, true);
    assert.ok(reasons.some((r) => r.includes('failed payment')));
    assert.ok(reasons.some((r) => r.includes('open tickets')));
  });

  it('computeChurnMetrics returns logo and revenue churn rates', () => {
    const m = computeChurnMetrics([
      { id: 'a', plan: 'Pro', accountStatus: 'Active' },
      { id: 'b', plan: 'Pro', accountStatus: 'Suspended' },
    ]);
    assert.equal(m.currentPaying, 1);
    assert.equal(m.churnedCount, 1);
    assert.ok(m.logoChurnRate > 0);
    assert.ok(m.lostMRR > 0);
  });

  it('nrrFromSnapshots computes expansion and churned MRR', () => {
    const start = buildMrrSnapshot([
      { id: 'a', plan: 'Pro', accountStatus: 'Active' },
      { id: 'b', plan: 'Starter', accountStatus: 'Active', monthlyFee: 999 },
    ]);
    const end = buildMrrSnapshot([
      { id: 'a', plan: 'Pro', accountStatus: 'Active', monthlyFee: 6000 }, // expansion
      // b churned
    ]);
    const nrr = nrrFromSnapshots(
      { ...start, id: '2026-01' },
      { ...end, id: '2026-02' }
    );
    assert.ok(nrr.churnedMrr > 0);
    assert.ok(nrr.expansionMrr > 0);
    assert.ok(Number.isFinite(nrr.nrr));
    // expansion on retained logo can push NRR above 1 even with logo churn
    assert.ok(nrr.nrr > 0);
  });

  it('computeNrrProxy is finite', () => {
    const n = computeNrrProxy([{ id: 'a', plan: 'Pro', accountStatus: 'Active' }]);
    assert.ok(Number.isFinite(n.nrr));
    assert.ok(n.endMrr > 0);
  });
});
