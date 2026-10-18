
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeTrialUsageAnalytics } from './trialUsageAnalytics.ts';
import { DEFAULT_TRIAL_LIMITS, emptyTrialUsage } from './trialLimits.ts';

describe('trialUsageAnalytics', () => {
  it('aggregates trial pressure', () => {
    const a = computeTrialUsageAnalytics([
      {
        id: '1',
        businessName: 'A',
        subscriptionStatus: 'Trial',
        plan: 'Trial',
        trialLimits: DEFAULT_TRIAL_LIMITS,
        trialUsage: { ...emptyTrialUsage(), sells: 10 },
      },
      {
        id: '2',
        businessName: 'B',
        subscriptionStatus: 'Trial',
        plan: 'Trial',
        trialLimits: DEFAULT_TRIAL_LIMITS,
        trialUsage: { ...emptyTrialUsage(), products: 1 },
      },
    ]);
    assert.equal(a.trialBusinesses, 2);
    assert.ok(a.exhaustedTrial >= 1);
    assert.ok(a.metrics.find((m) => m.key === 'sells')!.atLimit >= 1);
  });
});
