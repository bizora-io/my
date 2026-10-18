import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseTrialAction,
  isTrialExhausted,
  bumpTrialUsage,
  DEFAULT_TRIAL_LIMITS,
  emptyTrialUsage,
} from './trialLimits.ts';

describe('trialLimits', () => {
  it('blocks when a single metric would exceed', () => {
    const usage = { ...emptyTrialUsage(), products: 5 };
    const c = canUseTrialAction('products', DEFAULT_TRIAL_LIMITS, usage);
    assert.equal(c.ok, false);
    assert.equal(isTrialExhausted(DEFAULT_TRIAL_LIMITS, usage), true);
  });

  it('allows under limit and bumps', () => {
    const u0 = emptyTrialUsage();
    const c = canUseTrialAction('sells', DEFAULT_TRIAL_LIMITS, u0);
    assert.equal(c.ok, true);
    const u1 = bumpTrialUsage(u0, 'sells', 1);
    assert.equal(u1.sells, 1);
  });
});
