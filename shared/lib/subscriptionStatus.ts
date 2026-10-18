export type SubscriptionPhase = 'active' | 'grace' | 'expired' | 'trial' | 'unknown';

export interface SubscriptionView {
  phase: SubscriptionPhase;
  label: string;
  renewsAt: Date | null;
  daysRemaining: number | null;
  isBlocked: boolean;
  plan: string;
}

const GRACE_DAYS = 7;

export function getSubscriptionView(user: {
  plan?: string;
  isPremium?: boolean;
  subscriptionStatus?: string;
  subscriptionRenewsAt?: string | null;
  subscriptionEnforce?: boolean;
} | null | undefined): SubscriptionView {
  const plan = user?.plan || (user?.isPremium ? 'Pro' : 'Basic');
  const renewsAt = user?.subscriptionRenewsAt ? new Date(user.subscriptionRenewsAt) : null;
  const now = Date.now();
  let phase: SubscriptionPhase = 'unknown';
  let daysRemaining: number | null = null;

  const status = (user?.subscriptionStatus || '').toLowerCase();
  if (status === 'trial') phase = 'trial';
  else if (status === 'expired') phase = 'expired';
  else if (status === 'grace') phase = 'grace';
  else if (status === 'active' || user?.isPremium) phase = 'active';
  else if (!user?.isPremium && plan.toLowerCase().includes('basic')) phase = 'active'; // free tier
  else phase = user?.isPremium ? 'active' : 'unknown';

  if (renewsAt && !Number.isNaN(renewsAt.getTime())) {
    const ms = renewsAt.getTime() - now;
    daysRemaining = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (daysRemaining < 0) {
      const overdue = Math.abs(daysRemaining);
      if (overdue <= GRACE_DAYS && status !== 'expired') {
        phase = 'grace';
      } else {
        phase = 'expired';
      }
    } else if (status === 'trial') {
      phase = 'trial';
    } else if (phase === 'unknown') {
      phase = 'active';
    }
  }

  if (status === 'expired') phase = 'expired';

  const isBlocked = phase === 'expired' && !!user?.subscriptionEnforce;

  const labels: Record<SubscriptionPhase, string> = {
    active: 'Active',
    grace: 'Grace period',
    expired: 'Expired',
    trial: 'Trial',
    unknown: 'Unknown',
  };

  return {
    phase,
    label: labels[phase],
    renewsAt,
    daysRemaining,
    isBlocked,
    plan,
  };
}
