
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trackUsageEvent, eventToKey, mergeUsageMax, deriveUsageFromData } from './trialUsageTrack.ts';
import { DEFAULT_TRIAL_LIMITS, emptyTrialUsage } from './trialLimits.ts';

describe('trialUsageTrack', () => {
  it('maps events to keys', () => {
    assert.equal(eventToKey({ type: 'product_created' }), 'products');
    assert.equal(eventToKey({ type: 'sale_completed', quick: true }), 'quickSales');
  });

  it('tracks and exhausts', () => {
    const user = { subscriptionStatus: 'Trial', trialLimits: DEFAULT_TRIAL_LIMITS, trialUsage: { ...emptyTrialUsage(), sells: 9 } };
    const r = trackUsageEvent(user, { type: 'sale_completed' }, true);
    assert.equal(r.allowed, true);
    assert.equal(r.usage.sells, 10);
    assert.equal(r.exhausted, true);
  });

  it('derives from transactions', () => {
    const u = deriveUsageFromData({
      products: [{}, { isDeleted: true }],
      customers: [{ type: 'Customer' }],
      transactions: [
        { type: 'Sale', reference: 'INV-1' },
        { type: 'Sale', reference: 'QS-99' },
        { type: 'Purchase' },
      ],
    });
    assert.equal(u.products, 1);
    assert.equal(u.sells, 1);
    assert.equal(u.quickSales, 1);
    assert.equal(u.buys, 1);
  });

  it('mergeUsageMax', () => {
    const m = mergeUsageMax({ sells: 2 }, { sells: 5, products: 1 });
    assert.equal(m.sells, 5);
    assert.equal(m.products, 1);
  });
});
