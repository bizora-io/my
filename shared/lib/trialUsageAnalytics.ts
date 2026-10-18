/**
 * Aggregate trial package usage across tenants for SaaS analytics.
 */
import {
  DEFAULT_TRIAL_LIMITS,
  isTrialExhausted,
  normalizeTrialLimits,
  normalizeTrialUsage,
  TRIAL_LIMIT_LABELS,
  type TrialLimitKey,
  type TrialLimits,
  type TrialUsage,
} from './trialLimits.ts';

export type BusinessTrialLike = {
  id: string;
  businessName?: string;
  name?: string;
  plan?: string;
  subscriptionStatus?: string;
  accountStatus?: string;
  trialLimits?: Partial<TrialLimits>;
  trialUsage?: Partial<TrialUsage>;
  trialStartedAt?: string;
  createdAt?: string;
  subscriptionRenewsAt?: string | null;
};

export type MetricPressure = {
  key: TrialLimitKey;
  labelEn: string;
  atLimit: number;
  nearLimit: number; // >= 80%
  totalUsed: number;
  avgUsed: number;
  avgLimit: number;
};

export type TrialUsageAnalytics = {
  trialBusinesses: number;
  activeTrial: number;
  exhaustedTrial: number;
  expiredTrial: number;
  /** Share of trial tenants that hit any limit */
  conversionPressureRate: number;
  metrics: MetricPressure[];
  topNearLimit: {
    id: string;
    name: string;
    key: TrialLimitKey;
    used: number;
    limit: number;
    pct: number;
  }[];
  generatedAt: string;
};

function isTrialBiz(b: BusinessTrialLike): boolean {
  const st = String(b.subscriptionStatus || '').toLowerCase();
  const plan = String(b.plan || '').toLowerCase();
  if (st === 'trial' || plan === 'trial') return true;
  if (b.trialLimits || b.trialUsage) return true;
  return false;
}

export function computeTrialUsageAnalytics(
  businesses: BusinessTrialLike[],
  opts?: { nearPct?: number; topN?: number }
): TrialUsageAnalytics {
  const nearPct = opts?.nearPct ?? 80;
  const topN = opts?.topN ?? 10;
  const keys = Object.keys(DEFAULT_TRIAL_LIMITS) as TrialLimitKey[];

  const trials = businesses.filter(isTrialBiz);
  let activeTrial = 0;
  let exhaustedTrial = 0;
  let expiredTrial = 0;

  const sumsUsed: Record<TrialLimitKey, number> = {
    products: 0, customers: 0, buys: 0, sells: 0, expenses: 0, quickSales: 0,
  };
  const sumsLimit: Record<TrialLimitKey, number> = { ...sumsUsed };
  const atLimit: Record<TrialLimitKey, number> = { ...sumsUsed };
  const nearLimit: Record<TrialLimitKey, number> = { ...sumsUsed };

  type Near = TrialUsageAnalytics['topNearLimit'][0];
  const nearList: Near[] = [];

  for (const b of trials) {
    const st = String(b.subscriptionStatus || '').toLowerCase();
    const L = normalizeTrialLimits(b.trialLimits || DEFAULT_TRIAL_LIMITS);
    const U = normalizeTrialUsage(b.trialUsage);
    const exhausted = isTrialExhausted(L, U) || st === 'expired';

    if (st === 'expired' || exhausted) exhaustedTrial++;
    else if (st === 'trial' || String(b.plan || '').toLowerCase() === 'trial') activeTrial++;

    if (st === 'expired') expiredTrial++;

    for (const k of keys) {
      sumsUsed[k] += U[k];
      sumsLimit[k] += L[k];
      if (L[k] > 0 && U[k] >= L[k]) atLimit[k]++;
      const pct = L[k] > 0 ? (U[k] / L[k]) * 100 : 0;
      if (L[k] > 0 && pct >= nearPct) {
        nearLimit[k]++;
        nearList.push({
          id: b.id,
          name: b.businessName || b.name || b.id,
          key: k,
          used: U[k],
          limit: L[k],
          pct: Math.round(pct),
        });
      }
    }
  }

  const n = Math.max(1, trials.length);
  const metrics: MetricPressure[] = keys.map((k) => ({
    key: k,
    labelEn: TRIAL_LIMIT_LABELS[k].en,
    atLimit: atLimit[k],
    nearLimit: nearLimit[k],
    totalUsed: sumsUsed[k],
    avgUsed: Math.round((sumsUsed[k] / n) * 10) / 10,
    avgLimit: Math.round((sumsLimit[k] / n) * 10) / 10,
  }));

  nearList.sort((a, b) => b.pct - a.pct);
  const conversionPressureRate =
    trials.length === 0 ? 0 : Math.round((exhaustedTrial / trials.length) * 1000) / 10;

  return {
    trialBusinesses: trials.length,
    activeTrial,
    exhaustedTrial,
    expiredTrial,
    conversionPressureRate,
    metrics,
    topNearLimit: nearList.slice(0, topN),
    generatedAt: new Date().toISOString(),
  };
}
