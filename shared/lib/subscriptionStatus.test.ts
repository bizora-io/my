import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSubscriptionView } from './subscriptionStatus.ts';

describe('subscriptionStatus', () => {
  it('marks expired when renewsAt past and overdue > grace', () => {
    const past = new Date(Date.now() - 20 * 86400000).toISOString();
    const v = getSubscriptionView({
      plan: 'Pro',
      isPremium: true,
      subscriptionRenewsAt: past,
      subscriptionEnforce: true,
    });
    assert.equal(v.phase, 'expired');
    assert.equal(v.isBlocked, true);
  });

  it('grace when slightly overdue', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString();
    const v = getSubscriptionView({
      plan: 'Pro',
      isPremium: true,
      subscriptionRenewsAt: past,
    });
    assert.equal(v.phase, 'grace');
    assert.equal(v.isBlocked, false);
  });

  it('active with future renew date', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    const v = getSubscriptionView({
      plan: 'Pro',
      isPremium: true,
      subscriptionStatus: 'active',
      subscriptionRenewsAt: future,
    });
    assert.equal(v.phase, 'active');
    assert.ok((v.daysRemaining || 0) > 0);
  });
});
