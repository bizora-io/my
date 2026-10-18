/**
 * Trial usage tracking — pure helpers + localStorage session sync.
 */
import {
  bumpTrialUsage,
  canUseTrialAction,
  isTrialExhausted,
  isTrialPlan,
  normalizeTrialUsage,
  emptyTrialUsage,
  type TrialLimitKey,
  type TrialUsage,
  type TrialLimits,
} from './trialLimits.ts';

export type UsageEvent =
  | { type: 'product_created'; count?: number }
  | { type: 'customer_created'; count?: number }
  | { type: 'sale_completed'; count?: number; quick?: boolean }
  | { type: 'purchase_completed'; count?: number }
  | { type: 'expense_created'; count?: number };

export function eventToKey(ev: UsageEvent): TrialLimitKey {
  switch (ev.type) {
    case 'product_created':
      return 'products';
    case 'customer_created':
      return 'customers';
    case 'purchase_completed':
      return 'buys';
    case 'expense_created':
      return 'expenses';
    case 'sale_completed':
      return ev.quick ? 'quickSales' : 'sells';
    default:
      return 'sells';
  }
}

export type TrackResult = {
  allowed: boolean;
  key: TrialLimitKey;
  usage: TrialUsage;
  exhausted: boolean;
  messageEn: string;
  messageBn: string;
};

/** Check + optionally apply increment in one pure step. */
export function trackUsageEvent(
  userLike: {
    subscriptionStatus?: string;
    plan?: string;
    trialLimits?: Partial<TrialLimits>;
    trialUsage?: Partial<TrialUsage>;
  } | null | undefined,
  event: UsageEvent,
  apply: boolean
): TrackResult {
  const key = eventToKey(event);
  const count =
    event.type === 'sale_completed' || event.type === 'purchase_completed'
      ? Math.max(1, event.count || 1)
      : Math.max(1, (event as { count?: number }).count || 1);

  if (!isTrialPlan(userLike)) {
    return {
      allowed: true,
      key,
      usage: normalizeTrialUsage(userLike?.trialUsage),
      exhausted: false,
      messageEn: '',
      messageBn: '',
    };
  }

  const check = canUseTrialAction(key, userLike?.trialLimits, userLike?.trialUsage, count);
  if (!check.ok) {
    return {
      allowed: false,
      key,
      usage: normalizeTrialUsage(userLike?.trialUsage),
      exhausted: check.exhausted,
      messageEn: check.messageEn,
      messageBn: check.messageBn,
    };
  }

  const usage = apply
    ? bumpTrialUsage(userLike?.trialUsage, key, count)
    : normalizeTrialUsage(userLike?.trialUsage);

  return {
    allowed: true,
    key,
    usage,
    exhausted: apply ? isTrialExhausted(userLike?.trialLimits, usage) : false,
    messageEn: '',
    messageBn: '',
  };
}

const LS_KEY = 'nexus_user';

export function readSessionUser(): any | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSessionTrialUsage(
  usage: TrialUsage,
  extra?: { subscriptionStatus?: string; subscriptionEnforce?: boolean }
): any | null {
  const user = readSessionUser();
  if (!user) return null;
  const next = {
    ...user,
    trialUsage: normalizeTrialUsage(usage),
    ...(extra || {}),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return next;
}

/** Recompute usage from live collections (reconciliation). */
export function deriveUsageFromData(data: {
  products?: { isDeleted?: boolean }[];
  customers?: { isDeleted?: boolean; type?: string }[];
  transactions?: { isDeleted?: boolean; type?: string; reference?: string }[];
}): TrialUsage {
  const u = emptyTrialUsage();
  u.products = (data.products || []).filter((p) => !p.isDeleted).length;
  u.customers = (data.customers || []).filter((c) => !c.isDeleted && (c.type === 'Customer' || !c.type)).length;
  for (const t of data.transactions || []) {
    if (t.isDeleted) continue;
    if (t.type === 'Sale') {
      if (String(t.reference || '').startsWith('QS-')) u.quickSales += 1;
      else u.sells += 1;
    } else if (t.type === 'Purchase') u.buys += 1;
    else if (t.type === 'Expense') u.expenses += 1;
  }
  return u;
}

export function mergeUsageMax(a: Partial<TrialUsage> | undefined, b: Partial<TrialUsage> | undefined): TrialUsage {
  const A = normalizeTrialUsage(a);
  const B = normalizeTrialUsage(b);
  return {
    products: Math.max(A.products, B.products),
    customers: Math.max(A.customers, B.customers),
    buys: Math.max(A.buys, B.buys),
    sells: Math.max(A.sells, B.sells),
    expenses: Math.max(A.expenses, B.expenses),
    quickSales: Math.max(A.quickSales, B.quickSales),
  };
}
