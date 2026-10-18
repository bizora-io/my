/**
 * Leave quota / balance helpers — carry-forward + optional monthly accrual.
 */

export type LeaveType = 'Annual' | 'Sick' | 'Unpaid' | 'Casual' | 'Other';

export interface LeavePolicy {
  year: number;
  annualDays: number;
  sickDays: number;
  casualDays: number;
  otherDays?: number;
  excludeWeekends?: boolean;
  carryForwardEnabled?: boolean;
  carryForwardMaxAnnual?: number;
  carryForwardSick?: boolean;
  carryForwardCasual?: boolean;
  /**
   * When true, Annual entitlement unlocks gradually over the year
   * (annualDays / 12 per month). Sick/Casual stay full-year grants.
   */
  accrualEnabled?: boolean;
  /** As-of date for accrual (tests); defaults to today */
  accrualAsOf?: string;
}

export const DEFAULT_LEAVE_POLICY = (year = new Date().getFullYear()): LeavePolicy => ({
  year,
  annualDays: 14,
  sickDays: 10,
  casualDays: 5,
  otherDays: 0,
  excludeWeekends: true,
  carryForwardEnabled: true,
  carryForwardMaxAnnual: 5,
  carryForwardSick: false,
  carryForwardCasual: false,
  accrualEnabled: true,
});

export function countLeaveDays(
  startDate: string,
  endDate: string,
  excludeWeekends = true
): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (end < start) return 0;
  let n = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (excludeWeekends && (day === 0 || day === 6)) continue;
    n++;
  }
  return n;
}

/**
 * Months of the policy year that have started (1–12), capped by as-of date.
 * Optional joiningDate (YYYY-MM-DD) delays accrual until join month.
 */
export function monthsAccruedInYear(
  policyYear: number,
  asOf: Date = new Date(),
  joiningDate?: string | null
): number {
  if (asOf.getFullYear() > policyYear) return 12;
  if (asOf.getFullYear() < policyYear) return 0;

  let startMonth = 1;
  if (joiningDate && joiningDate.startsWith(String(policyYear))) {
    const jm = parseInt(joiningDate.slice(5, 7), 10);
    if (!Number.isNaN(jm)) startMonth = jm;
  } else if (joiningDate) {
    const jy = parseInt(joiningDate.slice(0, 4), 10);
    if (!Number.isNaN(jy) && jy > policyYear) return 0;
    if (!Number.isNaN(jy) && jy < policyYear) startMonth = 1;
  }

  const currentMonth = asOf.getMonth() + 1;
  return Math.max(0, Math.min(12, currentMonth - startMonth + 1));
}

/** Annual days available under monthly accrual (before carry-forward). */
export function accruedAnnualDays(
  policy: LeavePolicy,
  opts?: { asOf?: Date; joiningDate?: string | null }
): number {
  const full = policy.annualDays;
  if (!policy.accrualEnabled) return full;
  const asOf = opts?.asOf || (policy.accrualAsOf ? new Date(policy.accrualAsOf) : new Date());
  const months = monthsAccruedInYear(policy.year, asOf, opts?.joiningDate);
  // Round to 2 decimals then floor to half-days friendly: keep 2 dp
  const raw = (full / 12) * months;
  return Math.min(full, Math.round(raw * 100) / 100);
}

export function quotaForType(
  policy: LeavePolicy,
  leaveType: LeaveType,
  opts?: { joiningDate?: string | null; asOf?: Date }
): number | null {
  switch (leaveType) {
    case 'Annual':
      return accruedAnnualDays(policy, opts);
    case 'Sick':
      return policy.sickDays;
    case 'Casual':
      return policy.casualDays;
    case 'Unpaid':
      return null;
    case 'Other':
      return policy.otherDays && policy.otherDays > 0 ? policy.otherDays : null;
    default:
      return null;
  }
}

export interface LeaveLike {
  staffId: string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  baseQuota: number | null;
  /** Full-year entitlement (before accrual cut) for Annual */
  yearEntitlement?: number | null;
  accruedMonths?: number;
  carriedIn: number;
  quota: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}

function usedInYear(
  staffId: string,
  leaveType: LeaveType,
  year: number,
  requests: LeaveLike[],
  excludeWeekends?: boolean
): { used: number; pending: number } {
  const prefix = String(year);
  let used = 0;
  let pending = 0;
  for (const r of requests) {
    if (r.staffId !== staffId || r.leaveType !== leaveType) continue;
    if (r.status !== 'Approved' && r.status !== 'Pending') continue;
    if (!r.startDate.startsWith(prefix)) continue;
    const days = countLeaveDays(r.startDate, r.endDate, excludeWeekends !== false);
    if (r.status === 'Approved') used += days;
    else pending += days;
  }
  return { used, pending };
}

export function yearEndRemainder(
  staffId: string,
  leaveType: LeaveType,
  year: number,
  requests: LeaveLike[],
  baseQuota: number,
  excludeWeekends?: boolean
): number {
  const { used } = usedInYear(staffId, leaveType, year, requests, excludeWeekends);
  return Math.max(0, baseQuota - used);
}

export function carryInDays(
  staffId: string,
  leaveType: LeaveType,
  policy: LeavePolicy,
  requests: LeaveLike[]
): number {
  if (!policy.carryForwardEnabled) return 0;
  if (leaveType === 'Unpaid' || leaveType === 'Other') return 0;
  if (leaveType === 'Sick' && !policy.carryForwardSick) return 0;
  if (leaveType === 'Casual' && !policy.carryForwardCasual) return 0;
  if (leaveType === 'Annual') {
    const priorYear = policy.year - 1;
    const priorPolicyBase = policy.annualDays;
    let remainder = yearEndRemainder(
      staffId,
      'Annual',
      priorYear,
      requests,
      priorPolicyBase,
      policy.excludeWeekends
    );
    const max = policy.carryForwardMaxAnnual;
    if (max != null && max > 0) remainder = Math.min(remainder, max);
    return remainder;
  }
  if (leaveType === 'Sick') {
    return yearEndRemainder(staffId, 'Sick', policy.year - 1, requests, policy.sickDays, policy.excludeWeekends);
  }
  if (leaveType === 'Casual') {
    return yearEndRemainder(staffId, 'Casual', policy.year - 1, requests, policy.casualDays, policy.excludeWeekends);
  }
  return 0;
}

export function getStaffLeaveBalances(
  staffId: string,
  requests: LeaveLike[],
  policy: LeavePolicy,
  opts?: { joiningDate?: string | null }
): LeaveBalance[] {
  const types: LeaveType[] = ['Annual', 'Sick', 'Casual', 'Unpaid', 'Other'];
  const asOf = policy.accrualAsOf ? new Date(policy.accrualAsOf) : new Date();
  const months = monthsAccruedInYear(policy.year, asOf, opts?.joiningDate);

  return types.map((leaveType) => {
    const yearEntitlement =
      leaveType === 'Annual' ? policy.annualDays : quotaForType({ ...policy, accrualEnabled: false }, leaveType);
    const baseQuota = quotaForType(policy, leaveType, {
      joiningDate: opts?.joiningDate,
      asOf,
    });
    const carriedIn = baseQuota == null ? 0 : carryInDays(staffId, leaveType, policy, requests);
    const quota = baseQuota == null ? null : baseQuota + carriedIn;
    const { used, pending } = usedInYear(
      staffId,
      leaveType,
      policy.year,
      requests,
      policy.excludeWeekends
    );
    const remaining = quota == null ? null : Math.max(0, Math.round((quota - used - pending) * 100) / 100);
    return {
      leaveType,
      baseQuota,
      yearEntitlement: yearEntitlement ?? null,
      accruedMonths: leaveType === 'Annual' && policy.accrualEnabled ? months : undefined,
      carriedIn,
      quota,
      used,
      pending,
      remaining,
    };
  });
}

export function canRequestLeave(opts: {
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  requests: LeaveLike[];
  policy: LeavePolicy;
  joiningDate?: string | null;
}): { ok: boolean; error?: string; days: number } {
  const days = countLeaveDays(opts.startDate, opts.endDate, opts.policy.excludeWeekends);
  if (days <= 0) return { ok: false, error: 'Invalid date range (no countable days).', days: 0 };
  if (opts.leaveType === 'Unpaid') return { ok: true, days };

  const balances = getStaffLeaveBalances(opts.staffId, opts.requests, opts.policy, {
    joiningDate: opts.joiningDate,
  });
  const bal = balances.find((b) => b.leaveType === opts.leaveType);
  if (!bal || bal.quota == null) return { ok: true, days };
  if ((bal.remaining ?? 0) < days) {
    const bits = [
      bal.carriedIn > 0 ? `+${bal.carriedIn} CF` : null,
      bal.accruedMonths != null ? `${bal.accruedMonths}/12 mo accrued` : null,
    ]
      .filter(Boolean)
      .join(', ');
    return {
      ok: false,
      error: `Insufficient ${opts.leaveType} leave. Need ${days} day(s), remaining ${bal.remaining}${bits ? ` (${bits})` : ''}.`,
      days,
    };
  }
  return { ok: true, days };
}
