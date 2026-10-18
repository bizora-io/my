/**
 * Build P&L and Balance Sheet from posted journal lines.
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type CoaRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
};

export type JournalLineLike = {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  debit?: number;
  credit?: number;
};

export type JournalEntryLike = {
  isPosted?: boolean;
  date?: string;
  lines?: JournalLineLike[];
};

export function netByAccount(
  entries: JournalEntryLike[],
  coa: CoaRow[],
  opts?: { from?: string; to?: string }
): Map<string, { debit: number; credit: number; net: number; account: CoaRow }> {
  const byCode = new Map(coa.map((a) => [a.code, a]));
  const byId = new Map(coa.map((a) => [a.id, a]));
  const map = new Map<string, { debit: number; credit: number; net: number; account: CoaRow }>();

  for (const e of entries) {
    if (e.isPosted === false) continue;
    const d = String(e.date || '').slice(0, 10);
    if (opts?.from && d && d < opts.from) continue;
    if (opts?.to && d && d > opts.to) continue;
    for (const l of e.lines || []) {
      const acc =
        (l.accountId && byId.get(l.accountId)) ||
        (l.accountCode && byCode.get(l.accountCode)) ||
        null;
      if (!acc) continue;
      const cur = map.get(acc.id) || { debit: 0, credit: 0, net: 0, account: acc };
      cur.debit += Number(l.debit) || 0;
      cur.credit += Number(l.credit) || 0;
      // Asset/Expense: debit-positive; Liability/Equity/Revenue: credit-positive
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        cur.net = cur.debit - cur.credit;
      } else {
        cur.net = cur.credit - cur.debit;
      }
      map.set(acc.id, cur);
    }
  }
  return map;
}

export function buildPnL(
  entries: JournalEntryLike[],
  coa: CoaRow[],
  opts?: { from?: string; to?: string }
) {
  const nets = netByAccount(entries, coa, opts);
  const revenue = [...nets.values()].filter((x) => x.account.type === 'Revenue');
  const expense = [...nets.values()].filter((x) => x.account.type === 'Expense');
  const totalRevenue = revenue.reduce((s, x) => s + x.net, 0);
  const totalExpense = expense.reduce((s, x) => s + x.net, 0);
  return {
    revenue: revenue.map((x) => ({ ...x.account, amount: Math.round(x.net * 100) / 100 })),
    expense: expense.map((x) => ({ ...x.account, amount: Math.round(x.net * 100) / 100 })),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netIncome: Math.round((totalRevenue - totalExpense) * 100) / 100,
  };
}

export function buildBalanceSheet(
  entries: JournalEntryLike[],
  coa: CoaRow[],
  opts?: { to?: string }
) {
  const nets = netByAccount(entries, coa, opts?.to ? { to: opts.to } : undefined);
  const assets = [...nets.values()].filter((x) => x.account.type === 'Asset');
  const liabilities = [...nets.values()].filter((x) => x.account.type === 'Liability');
  const equity = [...nets.values()].filter((x) => x.account.type === 'Equity');
  const pnl = buildPnL(entries, coa, opts?.to ? { to: opts.to } : undefined);
  const totalAssets = assets.reduce((s, x) => s + x.net, 0);
  const totalLiabilities = liabilities.reduce((s, x) => s + x.net, 0);
  const equityBook = equity.reduce((s, x) => s + x.net, 0);
  const totalEquity = equityBook + pnl.netIncome;
  return {
    assets: assets.map((x) => ({ ...x.account, amount: Math.round(x.net * 100) / 100 })),
    liabilities: liabilities.map((x) => ({ ...x.account, amount: Math.round(x.net * 100) / 100 })),
    equity: equity.map((x) => ({ ...x.account, amount: Math.round(x.net * 100) / 100 })),
    retainedEarnings: Math.round(pnl.netIncome * 100) / 100,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
  };
}
