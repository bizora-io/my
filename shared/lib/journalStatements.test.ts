import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPnL, buildBalanceSheet } from './journalStatements.ts';
import { AUTO_JOURNAL_ACCOUNTS, buildAutoJournalEntry } from './journalAutoPost.ts';

const coa = Object.values(AUTO_JOURNAL_ACCOUNTS).map((a) => ({
  id: a.id,
  code: a.code,
  name: a.name,
  type: a.type!,
}));

describe('journal statements', () => {
  it('builds P&L from sale and expense journals', () => {
    const sale = buildAutoJournalEntry({
      id: '1',
      type: 'Sale',
      amount: 1000,
      amountPaid: 1000,
      paymentMethod: 'Cash',
      cogsAmount: 400,
      date: '2026-01-15',
    })!;
    const exp = buildAutoJournalEntry({
      id: '2',
      type: 'Expense',
      amount: 100,
      paymentMethod: 'Cash',
      date: '2026-01-20',
    })!;
    const pnl = buildPnL([sale, exp], coa);
    assert.equal(pnl.totalRevenue, 1000);
    assert.ok(pnl.totalExpense >= 500); // cogs 400 + opex 100
    assert.equal(pnl.netIncome, pnl.totalRevenue - pnl.totalExpense);
  });

  it('balance sheet assets include cash and inventory effects', () => {
    const sale = buildAutoJournalEntry({
      id: '1',
      type: 'Sale',
      amount: 500,
      amountPaid: 500,
      paymentMethod: 'Cash',
      cogsAmount: 200,
      date: '2026-02-01',
    })!;
    const bs = buildBalanceSheet([sale], coa);
    assert.ok(bs.totalAssets > 0);
    // Assets ≈ Liabilities + Equity (retained earnings)
    const right = bs.totalLiabilities + bs.totalEquity;
    assert.ok(Math.abs(bs.totalAssets - right) < 0.02);
  });
});
