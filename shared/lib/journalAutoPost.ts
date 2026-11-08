/**
 * Double-entry auto-post: map ledger transactions → balanced journal lines.
 * Account codes align with Journal.tsx DEFAULT_ACCOUNTS.
 */

export interface AutoJournalAccount {
  id: string;
  code: string;
  name: string;
  type?: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export const AUTO_JOURNAL_ACCOUNTS: Record<string, AutoJournalAccount> = {
  cash: { id: 'a-1000', code: '1000', name: 'Cash', type: 'Asset' },
  bank: { id: 'a-1100', code: '1100', name: 'Bank', type: 'Asset' },
  ar: { id: 'a-1200', code: '1200', name: 'Accounts Receivable', type: 'Asset' },
  inventory: { id: 'a-1300', code: '1300', name: 'Inventory', type: 'Asset' },
  ap: { id: 'a-2000', code: '2000', name: 'Accounts Payable', type: 'Liability' },
  storeCredit: { id: 'a-2100', code: '2100', name: 'Store Credit Liability', type: 'Liability' },
  loanPayable: { id: 'a-2200', code: '2200', name: 'Bank Loans Payable', type: 'Liability' },
  pfPayable: { id: 'a-2300', code: '2300', name: 'Provident Fund Liability', type: 'Liability' },
  equity: { id: 'a-3000', code: '3000', name: 'Owner Equity', type: 'Equity' },
  sales: { id: 'a-4000', code: '4000', name: 'Sales Revenue', type: 'Revenue' },
  otherIncome: { id: 'a-4100', code: '4100', name: 'Other Income', type: 'Revenue' },
  hotelRevenue: { id: 'a-4200', code: '4200', name: 'Hospitality & Room Revenue', type: 'Revenue' },
  cogs: { id: 'a-5000', code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
  opex: { id: 'a-5100', code: '5100', name: 'Operating Expense', type: 'Expense' },
  salary: { id: 'a-5200', code: '5200', name: 'Salary Expense', type: 'Expense' },
  interestExpense: { id: 'a-5300', code: '5300', name: 'Interest Expense', type: 'Expense' },
  vehicleExpense: { id: 'a-5400', code: '5400', name: 'Vehicle & Transport Expense', type: 'Expense' },
  projectExpense: { id: 'a-5500', code: '5500', name: 'Project & Milestone Expense', type: 'Expense' },
  dealerCommission: { id: 'a-5600', code: '5600', name: 'Dealer Sales Commission', type: 'Expense' },
};

export function journalLine(
  acc: AutoJournalAccount,
  debit: number,
  credit: number
) {
  return {
    accountId: acc.id,
    accountCode: acc.code,
    accountName: acc.name,
    debit: Math.round(Math.max(0, debit) * 100) / 100,
    credit: Math.round(Math.max(0, credit) * 100) / 100,
  };
}

/** @deprecated use journalLine */
const line = journalLine;

export function cashOrBank(paymentMethod?: string): AutoJournalAccount {
  const m = (paymentMethod || 'Cash').toLowerCase();
  if (
    m.includes('bank') ||
    m.includes('card') ||
    m.includes('transfer') ||
    m.includes('online') ||
    m.includes('mobile')
  ) {
    return AUTO_JOURNAL_ACCOUNTS.bank;
  }
  return AUTO_JOURNAL_ACCOUNTS.cash;
}

export interface LedgerLike {
  id: string;
  type: string;
  amount: number;
  amountPaid?: number;
  dueAmount?: number;
  paymentMethod?: string;
  date?: string;
  entityName?: string;
  reference?: string;
  notes?: string;
  category?: string;
  /** Optional COGS for sales (sum of cost × qty) */
  cogsAmount?: number;
  items?: { qty?: number; price?: number; purchasePrice?: number; total?: number }[];
}

export interface AutoJournalResult {
  id: string;
  date: string;
  memo: string;
  reference?: string;
  lines: ReturnType<typeof journalLine>[];
  createdAt: string;
  createdBy?: string;
  isPosted: boolean;
  sourceTransactionId: string;
  autoPosted: true;
}

export function sumDebitsCredits(lines: { debit?: number; credit?: number }[]) {
  const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  return {
    debit: Math.round(debit * 100) / 100,
    credit: Math.round(credit * 100) / 100,
  };
}

export function validateJournalLines(
  lines: { debit?: number; credit?: number; accountId?: string }[]
): { ok: boolean; error?: string; debit: number; credit: number } {
  if (!lines || lines.length < 2) {
    return { ok: false, error: 'At least two lines required.', debit: 0, credit: 0 };
  }
  for (const l of lines) {
    if (!l.accountId) {
      return { ok: false, error: 'Each line needs an account.', debit: 0, credit: 0 };
    }
    const d = Number(l.debit) || 0;
    const c = Number(l.credit) || 0;
    if (d > 0 && c > 0) {
      return { ok: false, error: 'A line cannot have both debit and credit.', debit: 0, credit: 0 };
    }
  }
  const { debit, credit } = sumDebitsCredits(lines);
  if (debit <= 0) {
    return { ok: false, error: 'Entry amount must be greater than zero.', debit, credit };
  }
  if (Math.abs(debit - credit) > 0.009) {
    return {
      ok: false,
      error: `Debits (${debit}) must equal credits (${credit}).`,
      debit,
      credit,
    };
  }
  return { ok: true, debit, credit };
}

function estimateCogs(entry: LedgerLike): number {
  if (entry.cogsAmount != null && entry.cogsAmount > 0) {
    return Math.round(Number(entry.cogsAmount) * 100) / 100;
  }
  if (!entry.items?.length) return 0;
  let cogs = 0;
  for (const it of entry.items) {
    const qty = Number(it.qty) || 0;
    const unitCost = Number(it.purchasePrice) || 0;
    if (unitCost > 0) cogs += qty * unitCost;
  }
  return Math.round(cogs * 100) / 100;
}

/**
 * Build a balanced journal entry for a ledger transaction, or null if not mapped.
 */
export function buildAutoJournalEntry(
  entry: LedgerLike,
  opts?: { createdBy?: string }
): AutoJournalResult | null {
  const amount = Number(entry.amount) || 0;
  if (amount <= 0 && entry.type !== 'Stock Adjustment' && entry.type !== 'Transfer') {
    return null;
  }

  const paid =
    entry.amountPaid != null
      ? Number(entry.amountPaid)
      : entry.paymentMethod === 'Due'
        ? 0
        : amount;
  const dueExplicit =
    entry.dueAmount != null
      ? Number(entry.dueAmount)
      : Math.max(0, amount - paid);
  const method = (entry.paymentMethod || '').toLowerCase();
  const isStoreCredit =
    method.includes('store credit') || method.includes('storecredit');
  const isDue =
    method === 'due' ||
    method === 'installment' ||
    (paid <= 0 && !isStoreCredit && method !== 'adjustment');
  const cashAcc = cashOrBank(entry.paymentMethod);
  const date = (entry.date || new Date().toISOString()).slice(0, 10);
  const memoBase = `${entry.type}: ${entry.entityName || entry.category || 'General'}`;
  const lines: ReturnType<typeof journalLine>[] = [];

  const rawType = (entry.type || '').trim();
  const subType = String((entry as any).subType || '').trim();
  const category = String(entry.category || '').toLowerCase();

  let effectiveType = rawType;
  if (rawType === 'Loan Disbursement' || subType === 'Loan Disbursement' || category.includes('loans payable') || category.includes('loans receivable')) {
    effectiveType = 'Loan Disbursement';
  } else if (rawType === 'Loan Repayment' || subType === 'Loan Repayment' || category.includes('loan repayment') || category.includes('loan recovery')) {
    effectiveType = 'Loan Repayment';
  } else if (rawType === 'PF Contribution' || category.includes('provident fund employer contribution') || (subType === 'HR / Payroll' && category.includes('provident fund'))) {
    effectiveType = 'PF Contribution';
  } else if (rawType === 'PF Settlement' || category.includes('provident fund settlement') || (subType === 'HR Settlement' && category.includes('provident fund'))) {
    effectiveType = 'PF Settlement';
  } else if (rawType === 'Hotel Accommodation' || subType === 'Hotel Accommodation' || category.includes('room revenue')) {
    effectiveType = 'Hotel Accommodation';
  } else if (rawType === 'Vehicle Expense' || subType === 'Fleet & Logistics' || category.startsWith('vehicle')) {
    effectiveType = 'Vehicle Expense';
  } else if (rawType === 'Project Expense' || category.includes('project')) {
    effectiveType = 'Project Expense';
  } else if (rawType === 'Dealer Commission' || subType === 'Dealer Commission' || category.includes('dealer')) {
    effectiveType = 'Dealer Commission';
  }

  switch (effectiveType) {
    case 'Loan Disbursement': {
      const isReceivable = category.includes('receivable');
      if (isReceivable) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, amount, 0));
        lines.push(line(cashAcc, 0, amount));
      } else {
        lines.push(line(cashAcc, amount, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.loanPayable, 0, amount));
      }
      break;
    }
    case 'Loan Repayment': {
      const isRecovery = category.includes('recovery');
      const interestPart = Math.round(Number((entry as any).interestPaid || (entry as any).interest || 0) * 100) / 100;
      const principalPart = Math.round(Math.max(0, amount - interestPart) * 100) / 100;

      if (isRecovery) {
        lines.push(line(cashAcc, amount, 0));
        if (principalPart > 0) lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, 0, principalPart));
        if (interestPart > 0) lines.push(line(AUTO_JOURNAL_ACCOUNTS.otherIncome, 0, interestPart));
      } else {
        if (principalPart > 0) lines.push(line(AUTO_JOURNAL_ACCOUNTS.loanPayable, principalPart, 0));
        if (interestPart > 0) lines.push(line(AUTO_JOURNAL_ACCOUNTS.interestExpense, interestPart, 0));
        lines.push(line(cashAcc, 0, amount));
      }
      break;
    }
    case 'PF Contribution': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.salary, amount, 0));
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.pfPayable, 0, amount));
      break;
    }
    case 'PF Settlement': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.pfPayable, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Hotel Accommodation':
    case 'Room Revenue': {
      if (isDue) lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, amount, 0));
      else lines.push(line(cashAcc, amount, 0));
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.hotelRevenue, 0, amount));
      break;
    }
    case 'Vehicle Expense':
    case 'Fuel Log': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.vehicleExpense, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Project Expense': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.projectExpense, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Dealer Commission': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.dealerCommission, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Sale': {
      // Dr Cash/Bank/AR / Cr Sales ; optional Dr COGS / Cr Inventory
      if (isStoreCredit) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.storeCredit, amount, 0));
      } else if (isDue || paid <= 0) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, amount, 0));
      } else if (dueExplicit > 0.009) {
        lines.push(line(cashAcc, paid, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, dueExplicit, 0));
      } else {
        lines.push(line(cashAcc, amount, 0));
      }
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.sales, 0, amount));
      const cogs = estimateCogs(entry);
      if (cogs > 0) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.cogs, cogs, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, 0, cogs));
      }
      break;
    }
    case 'Sales Return': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.sales, amount, 0));
      if (isStoreCredit) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.storeCredit, 0, amount));
      } else if (isDue) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, 0, amount));
      } else {
        lines.push(line(cashAcc, 0, amount));
      }
      const cogs = estimateCogs(entry);
      if (cogs > 0) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, cogs, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.cogs, 0, cogs));
      }
      break;
    }
    case 'Purchase': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, amount, 0));
      if (isDue) lines.push(line(AUTO_JOURNAL_ACCOUNTS.ap, 0, amount));
      else lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Purchase Return': {
      if (isDue) lines.push(line(AUTO_JOURNAL_ACCOUNTS.ap, amount, 0));
      else lines.push(line(cashAcc, amount, 0));
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, 0, amount));
      break;
    }
    case 'Expense': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.opex, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Salary': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.salary, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Income': {
      lines.push(line(cashAcc, amount, 0));
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.otherIncome, 0, amount));
      break;
    }
    case 'Supplier Payment': {
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.ap, amount, 0));
      lines.push(line(cashAcc, 0, amount));
      break;
    }
    case 'Due': {
      // Customer collection against AR
      lines.push(line(cashAcc, amount, 0));
      lines.push(line(AUTO_JOURNAL_ACCOUNTS.ar, 0, amount));
      break;
    }
    case 'Stock Adjustment': {
      // amount = value of adjustment; reference indicates direction
      const ref = String(entry.reference || entry.notes || '').toLowerCase();
      const isDecrease =
        ref.includes('decrease') ||
        ref.includes('write') ||
        (entry as any).details?.mode === 'decrease';
      const isStockTake = ref.includes('stock take');
      // For stock take mixed variances, skip auto if not purely one direction
      if (isStockTake && entry.items?.length) {
        const over = entry.items.filter((i: any) => (i.variance ?? 0) > 0);
        const under = entry.items.filter((i: any) => (i.variance ?? 0) < 0);
        if (over.length && under.length) {
          // Split: Dr Inventory / Cr Equity (or Income) for over; Dr Expense / Cr Inventory for under
          const overVal = over.reduce((s: number, i: any) => s + Math.abs(Number(i.total) || 0), 0);
          const underVal = under.reduce((s: number, i: any) => s + Math.abs(Number(i.total) || 0), 0);
          if (overVal > 0) {
            lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, overVal, 0));
            lines.push(line(AUTO_JOURNAL_ACCOUNTS.otherIncome, 0, overVal));
          }
          if (underVal > 0) {
            lines.push(line(AUTO_JOURNAL_ACCOUNTS.opex, underVal, 0));
            lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, 0, underVal));
          }
          break;
        }
      }
      if (amount <= 0) return null;
      if (isDecrease) {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.opex, amount, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, 0, amount));
      } else {
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.inventory, amount, 0));
        lines.push(line(AUTO_JOURNAL_ACCOUNTS.otherIncome, 0, amount));
      }
      break;
    }
    case 'Transfer':
      // Inter-store stock move — no P&L impact
      return null;
    default:
      return null;
  }

  const check = validateJournalLines(lines);
  if (!check.ok) return null;

  return {
    id: `aje-${entry.id}`,
    date,
    memo: memoBase,
    reference: entry.reference || entry.id,
    lines,
    createdAt: new Date().toISOString(),
    createdBy: opts?.createdBy,
    isPosted: true,
    sourceTransactionId: entry.id,
    autoPosted: true,
  };
}
