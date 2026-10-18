/**
 * SaaS churn metrics from business + ticket + payment signals.
 * Pure helpers — safe for admin UI and backend.
 */

export const PLAN_MRR_DEFAULTS: Record<string, number> = {
  Basic: 0,
  Free: 0,
  Trial: 0,
  Starter: 999,
  Growth: 2499,
  Pro: 4999,
  'Nexus Pro': 4999,
  Business: 7999,
  Enterprise: 14999,
};

export interface BizChurnInput {
  id: string;
  plan?: string;
  accountStatus?: string;
  subscriptionStatus?: string;
  isPremium?: boolean;
  monthlyFee?: number;
  mrr?: number;
  subscriptionAmount?: number;
  subscriptionRenewsAt?: string | null;
  cancelledAt?: string | null;
  suspendedAt?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  /** Involuntary churn / dunning signals */
  failedPaymentCount?: number;
  lastPaymentFailedAt?: string | null;
  lastPaymentStatus?: string | null;
  involuntaryChurnAt?: string | null;
}

export interface TicketChurnInput {
  businessId?: string;
  status?: string;
  priority?: string;
}

export function planMrr(b: BizChurnInput): number {
  const custom = Number(b.monthlyFee ?? b.mrr ?? b.subscriptionAmount);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return PLAN_MRR_DEFAULTS[b.plan || 'Basic'] ?? 0;
}

export function isPaying(b: BizChurnInput): boolean {
  const status = b.accountStatus || 'Active';
  if (status === 'Suspended' || status === 'PendingApproval' || status === 'Cancelled') return false;
  const sub = (b.subscriptionStatus || 'Active').toLowerCase();
  if (['cancelled', 'canceled', 'expired', 'churned'].includes(sub)) return false;
  return planMrr(b) > 0;
}

export function isChurned(b: BizChurnInput): boolean {
  const status = b.accountStatus || 'Active';
  if (status === 'Suspended' || status === 'Cancelled') return true;
  const sub = (b.subscriptionStatus || '').toLowerCase();
  if (['cancelled', 'canceled', 'expired', 'churned'].includes(sub)) return true;
  // Hard involuntary: explicit stamp after repeated failures
  if (b.involuntaryChurnAt) return true;
  return false;
}

export function isAtRisk(
  b: BizChurnInput,
  ticketCountByBiz: Record<string, number>,
  opts?: { renewWithinDays?: number; inactiveDays?: number; now?: Date }
): { risk: boolean; reasons: string[] } {
  const now = opts?.now || new Date();
  const reasons: string[] = [];
  const renewDays = opts?.renewWithinDays ?? 14;
  const inactiveDays = opts?.inactiveDays ?? 30;

  if (isChurned(b)) return { risk: false, reasons: [] };

  const tickets = ticketCountByBiz[b.id] || 0;
  if (tickets >= 2) reasons.push(`${tickets} open tickets`);

  if (b.subscriptionRenewsAt) {
    const r = Date.parse(b.subscriptionRenewsAt);
    if (!Number.isNaN(r)) {
      const days = (r - now.getTime()) / (24 * 60 * 60 * 1000);
      if (days >= 0 && days <= renewDays) reasons.push(`renews in ${Math.ceil(days)}d`);
      if (days < 0) reasons.push('subscription past renew date');
    }
  }

  if (b.lastLoginAt) {
    const l = Date.parse(b.lastLoginAt);
    if (!Number.isNaN(l)) {
      const days = (now.getTime() - l) / (24 * 60 * 60 * 1000);
      if (days >= inactiveDays) reasons.push(`no login ${Math.floor(days)}d`);
    }
  }

  const fails = Number(b.failedPaymentCount) || 0;
  if (fails >= 1) reasons.push(`${fails} failed payment(s)`);
  if (b.lastPaymentFailedAt) {
    const f = Date.parse(b.lastPaymentFailedAt);
    if (!Number.isNaN(f)) {
      const days = (now.getTime() - f) / (24 * 60 * 60 * 1000);
      if (days <= 30) reasons.push(`payment failed ${Math.floor(days)}d ago`);
    }
  }
  if (b.involuntaryChurnAt) reasons.push('marked involuntary churn');

  return { risk: reasons.length > 0, reasons };
}

export interface ChurnMetricsResult {
  /** Logo churn: churned / (paying start proxy = paying + churned) */
  logoChurnRate: number;
  /** Revenue churn: lost MRR / (current paying MRR + lost MRR) */
  revenueChurnRate: number;
  currentPaying: number;
  churnedCount: number;
  currentMRR: number;
  lostMRR: number;
  atRiskCount: number;
  atRiskMRR: number;
  involuntaryChurnCount: number;
  paymentRiskCount: number;
  atRisk: { id: string; plan?: string; mrr: number; reasons: string[] }[];
  churned: { id: string; plan?: string; mrr: number; status: string }[];
  notes: string[];
}

export function computeChurnMetrics(
  businesses: BizChurnInput[],
  tickets: TicketChurnInput[] = [],
  opts?: { renewWithinDays?: number; inactiveDays?: number; now?: Date }
): ChurnMetricsResult {
  const ticketCountByBiz: Record<string, number> = {};
  tickets.forEach((t) => {
    if (!t.businessId) return;
    if (['Closed', 'Resolved'].includes(t.status || '')) return;
    ticketCountByBiz[t.businessId] = (ticketCountByBiz[t.businessId] || 0) + 1;
  });

  const paying = businesses.filter(isPaying);
  const churnedList = businesses.filter(isChurned);
  const currentMRR = paying.reduce((s, b) => s + planMrr(b), 0);
  // Lost MRR: use plan price of churned accounts (best available signal)
  const lostMRR = churnedList.reduce((s, b) => s + planMrr(b), 0);
  const denomLogo = paying.length + churnedList.length;
  const logoChurnRate = denomLogo > 0 ? churnedList.length / denomLogo : 0;
  const denomRev = currentMRR + lostMRR;
  const revenueChurnRate = denomRev > 0 ? lostMRR / denomRev : 0;

  const atRisk: ChurnMetricsResult['atRisk'] = [];
  paying.forEach((b) => {
    const { risk, reasons } = isAtRisk(b, ticketCountByBiz, opts);
    if (risk) atRisk.push({ id: b.id, plan: b.plan, mrr: planMrr(b), reasons });
  });
  atRisk.sort((a, b) => b.mrr - a.mrr);

  const involuntaryChurnCount = businesses.filter((b) => !!b.involuntaryChurnAt).length;
  const paymentRiskCount = businesses.filter((b) => (Number(b.failedPaymentCount) || 0) >= 1 && !isChurned(b)).length;

  const notes = [
    'Logo/revenue churn use Suspended/Cancelled status and subscriptionStatus — not cohort time-series yet.',
    'At-risk: tickets, renew window, inactivity, or failed subscription payments.',
    'Involuntary churn: involuntaryChurnAt stamp after repeated payment failures.',
    'Set business.monthlyFee / subscriptionRenewsAt / lastLoginAt for sharper metrics.',
  ];

  return {
    logoChurnRate: Math.round(logoChurnRate * 10000) / 10000,
    revenueChurnRate: Math.round(revenueChurnRate * 10000) / 10000,
    currentPaying: paying.length,
    churnedCount: churnedList.length,
    currentMRR,
    lostMRR,
    atRiskCount: atRisk.length,
    atRiskMRR: atRisk.reduce((s, a) => s + a.mrr, 0),
    involuntaryChurnCount,
    paymentRiskCount,
    atRisk: atRisk.slice(0, 25),
    churned: churnedList.slice(0, 25).map((b) => ({
      id: b.id,
      plan: b.plan,
      mrr: planMrr(b),
      status: b.accountStatus || b.subscriptionStatus || 'Churned',
    })),
    notes,
  };
}

export interface CohortRow {
  /** YYYY-MM of signup */
  cohort: string;
  signups: number;
  stillActive: number;
  stillPaying: number;
  churned: number;
  /** stillActive / signups */
  retentionRate: number;
  /** stillPaying / signups */
  payingRetentionRate: number;
  startingMrr: number;
  remainingMrr: number;
}

function monthKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return null;
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Signup-month cohorts from createdAt. Retention = not currently churned.
 * Approximate (point-in-time), not classic month-N survival curves.
 */
export function computeCohorts(businesses: BizChurnInput[], months = 12): CohortRow[] {
  const map = new Map<string, BizChurnInput[]>();
  businesses.forEach((b) => {
    const k = monthKey(b.createdAt);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(b);
  });

  const keys = [...map.keys()].sort().slice(-months);
  return keys.map((cohort) => {
    const list = map.get(cohort) || [];
    const churned = list.filter(isChurned);
    const active = list.filter((b) => !isChurned(b));
    const paying = list.filter(isPaying);
    const startingMrr = list.reduce((s, b) => s + planMrr(b), 0);
    const remainingMrr = paying.reduce((s, b) => s + planMrr(b), 0);
    const signups = list.length;
    return {
      cohort,
      signups,
      stillActive: active.length,
      stillPaying: paying.length,
      churned: churned.length,
      retentionRate: signups ? Math.round((active.length / signups) * 10000) / 10000 : 0,
      payingRetentionRate: signups ? Math.round((paying.length / signups) * 10000) / 10000 : 0,
      startingMrr,
      remainingMrr,
    };
  });
}

export interface NrrResult {
  /** Net revenue retention proxy: (startMRR - churnedMRR + expansionMRR) / startMRR */
  nrr: number;
  startMrr: number;
  endMrr: number;
  churnedMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  notes: string[];
}

/**
 * Point-in-time NRR proxy without historical snapshots:
 * - startMrr ≈ current paying + lost (churned) MRR
 * - endMrr = current paying MRR
 * - expansion: tenants with monthlyFee > plan default (treated as upsell residual)
 * True NRR needs month-start snapshots; this is a directional estimate.
 */
export function computeNrrProxy(businesses: BizChurnInput[]): NrrResult {
  const paying = businesses.filter(isPaying);
  const churned = businesses.filter(isChurned);
  const endMrr = paying.reduce((s, b) => s + planMrr(b), 0);
  const churnedMrr = churned.reduce((s, b) => s + planMrr(b), 0);
  const startMrr = endMrr + churnedMrr;

  let expansionMrr = 0;
  let contractionMrr = 0;
  paying.forEach((b) => {
    const actual = planMrr(b);
    const base = PLAN_MRR_DEFAULTS[b.plan || 'Basic'] ?? 0;
    if (actual > base + 0.5) expansionMrr += actual - base;
    if (base > 0 && actual + 0.5 < base) contractionMrr += base - actual;
  });

  const nrr = startMrr > 0 ? (endMrr) / startMrr : 1;
  return {
    nrr: Math.round(nrr * 10000) / 10000,
    startMrr,
    endMrr,
    churnedMrr,
    expansionMrr: Math.round(expansionMrr * 100) / 100,
    contractionMrr: Math.round(contractionMrr * 100) / 100,
    notes: [
      'NRR proxy = current paying MRR / (current + churned MRR). Expansion is fee above plan list price.',
      'For GAAP-style NRR, store monthly MRR snapshots per tenant.',
    ],
  };
}


export interface MrrSnapshotTenant {
  id: string;
  plan?: string;
  mrr: number;
  status: string;
  paying: boolean;
}

export interface MrrSnapshot {
  id?: string;
  month: string; // YYYY-MM
  capturedAt: string;
  totalMrr: number;
  payingCount: number;
  churnedCount: number;
  tenants: MrrSnapshotTenant[];
}

export function buildMrrSnapshot(businesses: BizChurnInput[], at = new Date()): Omit<MrrSnapshot, 'id'> {
  const month = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
  const tenants: MrrSnapshotTenant[] = businesses.map((b) => ({
    id: b.id,
    plan: b.plan || 'Trial',
    mrr: Number(planMrr(b)) || 0,
    status: b.accountStatus || b.subscriptionStatus || 'Active',
    paying: Boolean(isPaying(b)),
  }));
  const paying = tenants.filter((t) => t.paying);
  // JSON round-trip strips undefined (Firestore rejects undefined fields)
  return JSON.parse(
    JSON.stringify({
      month,
      capturedAt: at.toISOString(),
      totalMrr: paying.reduce((s, t) => s + t.mrr, 0),
      payingCount: paying.length,
      churnedCount: tenants.filter(
        (t) =>
          !t.paying &&
          (t.status === 'Suspended' ||
            t.status === 'Cancelled' ||
            /cancel|churn|expir/i.test(t.status))
      ).length,
      tenants,
    })
  ) as Omit<MrrSnapshot, 'id'>;
}

export interface HistoricalNrr {
  fromMonth: string;
  toMonth: string;
  startMrr: number;
  endMrr: number;
  retainedMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  newMrr: number;
  /** (retained + expansion - contraction) / start  — classic NRR style on intersection */
  nrr: number;
  /** end / start including new logos */
  grossGrowth: number;
}

/**
 * Compare two snapshots for historical NRR.
 * start = earlier snapshot, end = later.
 */
export function nrrFromSnapshots(start: MrrSnapshot, end: MrrSnapshot): HistoricalNrr {
  const startTenants = Array.isArray(start?.tenants) ? start.tenants : [];
  const endTenants = Array.isArray(end?.tenants) ? end.tenants : [];
  const startMap = new Map(startTenants.filter((t) => t.paying).map((t) => [t.id, t.mrr]));
  const endMap = new Map(endTenants.filter((t) => t.paying).map((t) => [t.id, t.mrr]));

  let retainedMrr = 0;
  let expansionMrr = 0;
  let contractionMrr = 0;
  let churnedMrr = 0;
  let newMrr = 0;

  startMap.forEach((smrr, id) => {
    if (!endMap.has(id)) {
      churnedMrr += smrr;
      return;
    }
    const emrr = endMap.get(id)!;
    if (emrr >= smrr) {
      retainedMrr += smrr;
      expansionMrr += emrr - smrr;
    } else {
      retainedMrr += emrr;
      contractionMrr += smrr - emrr;
    }
  });

  endMap.forEach((emrr, id) => {
    if (!startMap.has(id)) newMrr += emrr;
  });

  const startMrr = [...startMap.values()].reduce((s, n) => s + n, 0);
  const endMrr = [...endMap.values()].reduce((s, n) => s + n, 0);
  const nrr = startMrr > 0 ? (retainedMrr + expansionMrr - contractionMrr) / startMrr : 1;

  return {
    fromMonth: start.month,
    toMonth: end.month,
    startMrr,
    endMrr,
    retainedMrr: Math.round(retainedMrr * 100) / 100,
    expansionMrr: Math.round(expansionMrr * 100) / 100,
    contractionMrr: Math.round(contractionMrr * 100) / 100,
    churnedMrr: Math.round(churnedMrr * 100) / 100,
    newMrr: Math.round(newMrr * 100) / 100,
    nrr: Math.round(nrr * 10000) / 10000,
    grossGrowth: startMrr > 0 ? Math.round((endMrr / startMrr) * 10000) / 10000 : 1,
  };
}
