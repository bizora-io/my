/**
 * Shared FEFO / lot expiry policy helpers.
 */

export type LotExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok' | 'none';

export interface FefoPolicy {
  warnDays: number;
  criticalDays: number;
  blockExpired: boolean;
}

export const DEFAULT_FEFO_POLICY: FefoPolicy = {
  warnDays: 30,
  criticalDays: 7,
  blockExpired: false,
};

export function policyFromSettings(settings?: Record<string, any> | null): FefoPolicy {
  return {
    warnDays: Math.max(1, Number(settings?.fefoWarnDays) || DEFAULT_FEFO_POLICY.warnDays),
    criticalDays: Math.max(0, Number(settings?.fefoCriticalDays) || DEFAULT_FEFO_POLICY.criticalDays),
    blockExpired: !!settings?.fefoBlockExpired,
  };
}

export function daysUntilExpiry(iso?: string, asOf = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(asOf);
  t.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
}

export function statusFromDays(
  days: number | null,
  policy: FefoPolicy = DEFAULT_FEFO_POLICY
): LotExpiryStatus {
  if (days == null) return 'none';
  if (days < 0) return 'expired';
  if (days <= policy.criticalDays) return 'critical';
  if (days <= policy.warnDays) return 'warning';
  return 'ok';
}

export interface LotLike {
  lotNumber?: string;
  qty?: number;
  expiryDate?: string;
}

/** Worst status across on-hand lots (expired > critical > warning). */
export function worstLotStatus(
  lots: LotLike[],
  policy: FefoPolicy = DEFAULT_FEFO_POLICY,
  asOf = new Date()
): { status: LotExpiryStatus; days: number | null; lotNumber?: string } {
  let worst: LotExpiryStatus = 'none';
  let worstDays: number | null = null;
  let lotNumber: string | undefined;
  const rank = { expired: 4, critical: 3, warning: 2, ok: 1, none: 0 };

  for (const lot of lots) {
    if ((Number(lot.qty) || 0) <= 0) continue;
    const days = daysUntilExpiry(lot.expiryDate, asOf);
    const st = statusFromDays(days, policy);
    if (rank[st] > rank[worst]) {
      worst = st;
      worstDays = days;
      lotNumber = lot.lotNumber;
    }
  }
  return { status: worst, days: worstDays, lotNumber };
}

export function lotsFromProduct(p: {
  stock?: number;
  lots?: LotLike[];
  batchNumber?: string;
  expiryDate?: string;
  type?: string;
  variants?: {
    id?: string;
    name?: string;
    stock?: number;
    lots?: LotLike[];
    batchNumber?: string;
    expiryDate?: string;
  }[];
}): LotLike[] {
  if (p.type === 'Service') return [];
  const lots = Array.isArray(p.lots) ? p.lots.filter((l) => (Number(l.qty) || 0) > 0) : [];
  // Merge variant lots so expiry badges/worst status see size-color inventory
  const fromVariants: LotLike[] = [];
  if (Array.isArray(p.variants)) {
    for (const v of p.variants) {
      const vl = Array.isArray(v.lots) ? v.lots.filter((l) => (Number(l.qty) || 0) > 0) : [];
      if (vl.length) {
        fromVariants.push(...vl);
      } else if ((Number(v.stock) || 0) > 0 && (v.batchNumber || v.expiryDate)) {
        fromVariants.push({
          lotNumber: v.batchNumber || 'DEFAULT',
          qty: Number(v.stock) || 0,
          expiryDate: v.expiryDate,
        });
      }
    }
  }
  if (lots.length || fromVariants.length) return [...lots, ...fromVariants];
  if ((Number(p.stock) || 0) > 0 && (p.batchNumber || p.expiryDate)) {
    return [
      {
        lotNumber: p.batchNumber || 'DEFAULT',
        qty: Number(p.stock) || 0,
        expiryDate: p.expiryDate,
      },
    ];
  }
  return [];
}
