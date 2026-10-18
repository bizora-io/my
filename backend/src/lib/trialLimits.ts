/**
 * Signup trial package — usage counters vs caps.
 * When any counter reaches its limit, trial is considered exhausted.
 */

export type TrialLimitKey =
  | 'products'
  | 'customers'
  | 'buys'
  | 'sells'
  | 'expenses'
  | 'quickSales';

export type TrialLimits = Record<TrialLimitKey, number>;
export type TrialUsage = Record<TrialLimitKey, number>;

/** Default trial package started on shop owner signup. */
export const DEFAULT_TRIAL_LIMITS: TrialLimits = {
  products: 5,
  customers: 3,
  buys: 5,
  sells: 10,
  expenses: 5,
  quickSales: 20,
};

export const TRIAL_LIMIT_LABELS: Record<TrialLimitKey, { en: string; bn: string }> = {
  products: { en: 'Products', bn: 'পণ্য' },
  customers: { en: 'Customers', bn: 'কাস্টমার' },
  buys: { en: 'Purchases (Buy)', bn: 'ক্রয়' },
  sells: { en: 'Sales', bn: 'বিক্রি' },
  expenses: { en: 'Expenses', bn: 'খরচ' },
  quickSales: { en: 'Quick sales', bn: 'কুইক সেল' },
};

export function emptyTrialUsage(): TrialUsage {
  return {
    products: 0,
    customers: 0,
    buys: 0,
    sells: 0,
    expenses: 0,
    quickSales: 0,
  };
}

export function normalizeTrialLimits(raw?: Partial<TrialLimits> | null): TrialLimits {
  const d = DEFAULT_TRIAL_LIMITS;
  return {
    products: Math.max(0, Number(raw?.products ?? d.products) || 0),
    customers: Math.max(0, Number(raw?.customers ?? d.customers) || 0),
    buys: Math.max(0, Number(raw?.buys ?? d.buys) || 0),
    sells: Math.max(0, Number(raw?.sells ?? d.sells) || 0),
    expenses: Math.max(0, Number(raw?.expenses ?? d.expenses) || 0),
    quickSales: Math.max(0, Number(raw?.quickSales ?? d.quickSales) || 0),
  };
}

export function normalizeTrialUsage(raw?: Partial<TrialUsage> | null): TrialUsage {
  const z = emptyTrialUsage();
  return {
    products: Math.max(0, Number(raw?.products ?? 0) || 0),
    customers: Math.max(0, Number(raw?.customers ?? 0) || 0),
    buys: Math.max(0, Number(raw?.buys ?? 0) || 0),
    sells: Math.max(0, Number(raw?.sells ?? 0) || 0),
    expenses: Math.max(0, Number(raw?.expenses ?? 0) || 0),
    quickSales: Math.max(0, Number(raw?.quickSales ?? 0) || 0),
  };
}

export type TrialCheck = {
  ok: boolean;
  key?: TrialLimitKey;
  used?: number;
  limit?: number;
  /** True when any metric already at/over limit */
  exhausted: boolean;
  messageEn: string;
  messageBn: string;
};

export function isTrialPlan(user: {
  subscriptionStatus?: string;
  plan?: string;
  trialLimits?: Partial<TrialLimits>;
} | null | undefined): boolean {
  if (!user) return false;
  const st = String(user.subscriptionStatus || '').toLowerCase();
  if (st === 'trial') return true;
  if (String(user.plan || '').toLowerCase() === 'trial') return true;
  return false;
}

/** Any single limit reached → trial package exhausted. */
export function isTrialExhausted(
  limits: TrialLimits | Partial<TrialLimits> | undefined,
  usage: TrialUsage | Partial<TrialUsage> | undefined
): boolean {
  const L = normalizeTrialLimits(limits);
  const U = normalizeTrialUsage(usage);
  for (const k of Object.keys(L) as TrialLimitKey[]) {
    if (L[k] > 0 && U[k] >= L[k]) return true;
  }
  return false;
}

export function canUseTrialAction(
  key: TrialLimitKey,
  limits: TrialLimits | Partial<TrialLimits> | undefined,
  usage: TrialUsage | Partial<TrialUsage> | undefined,
  increment = 1
): TrialCheck {
  const L = normalizeTrialLimits(limits);
  const U = normalizeTrialUsage(usage);
  if (isTrialExhausted(L, U)) {
    return {
      ok: false,
      exhausted: true,
      messageEn: 'Your free trial limits are used up. Upgrade or ask support to extend the trial.',
      messageBn: 'আপনার ফ্রি ট্রায়াল লিমিট শেষ। আপগ্রেড করুন অথবা সাপোর্টকে লিমিট বাড়াতে বলুন।',
    };
  }
  const limit = L[key];
  const used = U[key];
  if (limit > 0 && used + increment > limit) {
    const labels = TRIAL_LIMIT_LABELS[key];
    return {
      ok: false,
      key,
      used,
      limit,
      exhausted: used >= limit,
      messageEn: `Trial limit reached for ${labels.en} (${used}/${limit}). Upgrade to continue.`,
      messageBn: `${labels.bn} ট্রায়াল লিমিট শেষ (${used}/${limit})। চালিয়ে যেতে আপগ্রেড করুন।`,
    };
  }
  return {
    ok: true,
    key,
    used,
    limit,
    exhausted: false,
    messageEn: '',
    messageBn: '',
  };
}

export function bumpTrialUsage(
  usage: TrialUsage | Partial<TrialUsage> | undefined,
  key: TrialLimitKey,
  by = 1
): TrialUsage {
  const U = normalizeTrialUsage(usage);
  U[key] = Math.max(0, U[key] + by);
  return U;
}

export function buildSignupTrialFields(trialDays = 14) {
  const ends = new Date();
  ends.setDate(ends.getDate() + trialDays);
  return {
    plan: 'Trial',
    subscriptionStatus: 'Trial',
    subscriptionRenewsAt: ends.toISOString(),
    subscriptionEnforce: true,
    trialLimits: { ...DEFAULT_TRIAL_LIMITS },
    trialUsage: emptyTrialUsage(),
    trialStartedAt: new Date().toISOString(),
  };
}
