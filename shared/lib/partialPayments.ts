/**
 * Multi-tender payment split logic for POS / purchases.
 */

export interface PaymentLine {
  method: string;
  amount: number;
  intentId?: string;
  paidOnline?: boolean;
}

export type ResolvedPayMethod =
  | 'Cash'
  | 'Card'
  | 'Bank'
  | 'Due'
  | 'Mobile'
  | 'Transfer'
  | 'Gift Card'
  | 'Partial'
  | 'Installment'
  | 'Online'
  | string;

export const TENDER_METHODS = [
  'Cash',
  'Card',
  'Bank',
  'Bank Transfer',
  'Mobile Wallet',
  'Online',
  'Due',
  'Installment',
  'Gift Card',
] as const;

/** Methods that do not reduce cash-drawer / bank accounts (credit). */
export const CREDIT_METHODS = new Set(['Due', 'Installment']);

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function isCreditMethod(method: string): boolean {
  return CREDIT_METHODS.has(method);
}

export function sumPayments(payments: PaymentLine[]): number {
  return roundMoney(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
}

export function sumCollected(payments: PaymentLine[]): number {
  return roundMoney(
    payments
      .filter((p) => !isCreditMethod(p.method))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
}

export function sumCredit(payments: PaymentLine[]): number {
  return roundMoney(
    payments
      .filter((p) => isCreditMethod(p.method))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
}

export function computePaidDue(
  total: number,
  paid: number
): {
  amountPaid: number;
  dueAmount: number;
  isPartial: boolean;
  isFullyPaid: boolean;
  isFullyDue: boolean;
} {
  const t = roundMoney(total);
  const p = roundMoney(Math.max(0, paid));
  const due = roundMoney(Math.max(0, t - p));
  return {
    amountPaid: Math.min(p, t),
    dueAmount: due,
    isPartial: p > 0.009 && due > 0.009,
    isFullyPaid: due <= 0.009,
    isFullyDue: p <= 0.009 && t > 0.009,
  };
}

export interface SplitValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  total: number;
  splitSum: number;
  collected: number;
  credit: number;
  remainder: number; // total - splitSum (should be ~0)
  change: number; // overpay on collected (not including credit)
}

/**
 * Validate that payment lines cover the bill.
 * - Sum of all lines should equal grandTotal (within 0.01)
 * - Over-collection on non-credit can be treated as change
 * - Requires a named customer if any Due/Installment amount > 0
 */
export function validatePaymentSplits(
  payments: PaymentLine[],
  grandTotal: number,
  opts?: { allowChange?: boolean; customerName?: string; requireDueMethod?: boolean }
): SplitValidation {
  const total = roundMoney(grandTotal);
  const splitSum = sumPayments(payments);
  const collected = sumCollected(payments);
  const credit = sumCredit(payments);
  const remainder = roundMoney(total - splitSum);
  const change = collected > total ? roundMoney(collected - total) : 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowChange = opts?.allowChange !== false;

  if (!payments.length) {
    errors.push('Add at least one payment line');
  }

  payments.forEach((p, i) => {
    if ((Number(p.amount) || 0) < 0) errors.push(`Line ${i + 1}: amount cannot be negative`);
    if (!p.method) errors.push(`Line ${i + 1}: method required`);
  });

  if (credit > 0.009) {
    const name = (opts?.customerName || '').trim();
    if (!name || name === 'Walk-in Customer') {
      errors.push('Customer required for Due / Installment');
    }
  }

  // Under-paid without credit covering remainder
  if (remainder > 0.02) {
    errors.push(`Splits short by ${remainder.toFixed(2)} — add tender or Due`);
  }

  // Over-allocated (sum > total) beyond change tolerance
  if (remainder < -0.02) {
    if (!allowChange || credit > 0.009) {
      errors.push(`Splits exceed bill by ${Math.abs(remainder).toFixed(2)}`);
    } else {
      warnings.push(`Change due to customer: ${Math.abs(remainder).toFixed(2)}`);
    }
  }

  // Collected + credit should cover total (gift applied separately by caller)
  const covered = roundMoney(collected + credit);
  if (covered + 0.02 < total && remainder > 0.02) {
    // already reported short
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    total,
    splitSum,
    collected,
    credit,
    remainder,
    change: remainder < -0.02 && allowChange ? Math.abs(remainder) : change,
  };
}

/**
 * Resolve ledger paymentMethod from payment lines + balances.
 */
export function resolvePaymentMethod(opts: {
  payments: PaymentLine[];
  amountPaid: number;
  dueAmount: number;
  giftApplied?: number;
  hasInstallments?: boolean;
}): ResolvedPayMethod {
  if (opts.hasInstallments) return 'Installment';
  const { amountPaid, dueAmount, giftApplied = 0, payments } = opts;
  const bal = computePaidDue(amountPaid + dueAmount, amountPaid);

  if (giftApplied > 0 && amountPaid <= giftApplied + 0.009 && dueAmount <= 0.009) {
    return 'Gift Card';
  }
  if (bal.isPartial || (giftApplied > 0 && dueAmount > 0.009)) return 'Partial';
  if (bal.isFullyDue) return 'Due';

  const cashMethods = payments.filter(
    (p) => p.amount > 0 && !isCreditMethod(p.method) && p.method !== 'Gift Card'
  );
  if (cashMethods.length > 1) return 'Partial';
  if (cashMethods.length === 1) {
    const m = cashMethods[0].method;
    if (m === 'Online' || m === 'Bank Transfer') return 'Bank';
    if (m === 'Mobile Wallet') return 'Mobile';
    return m as ResolvedPayMethod;
  }
  return 'Cash';
}

export function paymentSplitsSummary(payments: PaymentLine[]): string {
  return payments
    .filter((p) => p.amount > 0)
    .map((p) => `${p.method}: ${roundMoney(p.amount)}`)
    .join(' · ');
}

/** Ensure a Due line covers the unpaid remainder. */
export function ensureDueLine(payments: PaymentLine[], grandTotal: number): PaymentLine[] {
  const nonDue = payments.filter((p) => !isCreditMethod(p.method));
  const paid = sumPayments(nonDue);
  const due = roundMoney(Math.max(0, grandTotal - paid));
  if (due <= 0.009) {
    return nonDue.length ? nonDue.map((p) => ({ ...p, amount: roundMoney(p.amount) })) : [{ method: 'Cash', amount: grandTotal }];
  }
  return [...nonDue.map((p) => ({ ...p, amount: roundMoney(p.amount) })), { method: 'Due', amount: due }];
}

/**
 * When editing one line amount, optionally auto-adjust the Due line so sum = total.
 */
export function rebalanceDueLine(
  payments: PaymentLine[],
  grandTotal: number,
  editedIndex: number
): PaymentLine[] {
  const next = payments.map((p, i) =>
    i === editedIndex ? p : { ...p, amount: roundMoney(p.amount) }
  );
  const dueIdx = next.findIndex((p) => p.method === 'Due');
  if (dueIdx < 0 || dueIdx === editedIndex) return next;

  const others = next.reduce((s, p, i) => (i === dueIdx ? s : s + (Number(p.amount) || 0)), 0);
  const dueAmt = roundMoney(Math.max(0, grandTotal - others));
  next[dueIdx] = { ...next[dueIdx], amount: dueAmt };
  return next;
}

/**
 * Distribute a single amount across methods in order (e.g. templates).
 * Last method receives the remainder.
 */
export function splitAmountAcrossMethods(
  total: number,
  methods: string[],
  amounts?: number[]
): PaymentLine[] {
  const t = roundMoney(total);
  if (!methods.length) return [{ method: 'Cash', amount: t }];
  const lines: PaymentLine[] = [];
  let remaining = t;
  methods.forEach((method, i) => {
    const isLast = i === methods.length - 1;
    let amt: number;
    if (isLast) {
      amt = roundMoney(remaining);
    } else if (amounts && amounts[i] != null) {
      amt = roundMoney(Math.min(amounts[i], remaining));
    } else {
      amt = 0;
    }
    remaining = roundMoney(remaining - amt);
    lines.push({ method, amount: amt });
  });
  return lines;
}

/** Suggested remaining amount when adding a new payment line. */
export function remainingToAllocate(payments: PaymentLine[], grandTotal: number): number {
  return roundMoney(Math.max(0, grandTotal - sumPayments(payments)));
}


/** Map POS tender method → financial account type (null = no cash impact). */
export function accountTypeForTender(
  method: string
): 'Cash' | 'Bank' | 'Mobile Wallet' | null {
  const m = (method || '').toLowerCase();
  if (!m || m === 'due' || m === 'installment' || m === 'gift card') return null;
  if (m === 'cash') return 'Cash';
  if (m.includes('mobile')) return 'Mobile Wallet';
  if (m === 'card' || m === 'bank' || m.includes('bank') || m === 'online') return 'Bank';
  return 'Cash';
}

export interface AccountLite {
  id: string;
  type: string;
  isDefault?: boolean;
  storeId?: string;
  balance?: number;
}

/** Pick best financial account for a tender method. */
export function resolveAccountForTender(
  method: string,
  accounts: AccountLite[],
  preferredId?: string
): string | undefined {
  if (preferredId && accounts.some((a) => a.id === preferredId)) {
    const pref = accounts.find((a) => a.id === preferredId)!;
    const need = accountTypeForTender(method);
    if (!need || pref.type === need) return preferredId;
  }
  const need = accountTypeForTender(method);
  if (!need) return undefined;
  const match = accounts.filter((a) => a.type === need);
  if (!match.length) return accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
  return match.find((a) => a.isDefault)?.id || match[0].id;
}

export interface SplitAccountPosting {
  accountId: string;
  method: string;
  amount: number;
}

/** Build per-account postings from payment splits. */
export function buildSplitAccountPostings(
  payments: PaymentLine[],
  accounts: AccountLite[],
  fallbackAccountId?: string
): SplitAccountPosting[] {
  const posts: SplitAccountPosting[] = [];
  for (const p of payments) {
    const amt = roundMoney(p.amount);
    if (amt <= 0.009) continue;
    if (isCreditMethod(p.method)) continue;
    const accountId = resolveAccountForTender(p.method, accounts, fallbackAccountId);
    if (!accountId) continue;
    posts.push({ accountId, method: p.method, amount: amt });
  }
  // merge same account
  const map = new Map<string, SplitAccountPosting>();
  for (const p of posts) {
    const prev = map.get(p.accountId);
    if (prev) prev.amount = roundMoney(prev.amount + p.amount);
    else map.set(p.accountId, { ...p });
  }
  return [...map.values()];
}
