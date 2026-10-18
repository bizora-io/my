import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutoJournalEntry,
  validateJournalLines,
  sumDebitsCredits,
  AUTO_JOURNAL_ACCOUNTS,
} from './journalAutoPost.ts';

describe('journal double-entry', () => {
  it('validates unbalanced lines', () => {
    const r = validateJournalLines([
      { accountId: 'a', debit: 100, credit: 0 },
      { accountId: 'b', debit: 0, credit: 50 },
    ]);
    assert.equal(r.ok, false);
  });

  it('posts cash sale balanced with COGS', () => {
    const je = buildAutoJournalEntry({
      id: 's1',
      type: 'Sale',
      amount: 1000,
      amountPaid: 1000,
      paymentMethod: 'Cash',
      cogsAmount: 400,
    });
    assert.ok(je);
    const { debit, credit } = sumDebitsCredits(je!.lines);
    assert.equal(debit, credit);
    assert.ok(je!.lines.some((l) => l.accountCode === '5000' && l.debit === 400));
    assert.ok(je!.lines.some((l) => l.accountCode === '1300' && l.credit === 400));
  });

  it('posts due sale to AR', () => {
    const je = buildAutoJournalEntry({
      id: 's2',
      type: 'Sale',
      amount: 500,
      amountPaid: 0,
      paymentMethod: 'Due',
    });
    assert.ok(je);
    assert.ok(je!.lines.some((l) => l.accountId === AUTO_JOURNAL_ACCOUNTS.ar.id && l.debit === 500));
  });

  it('posts sales return as store credit liability', () => {
    const je = buildAutoJournalEntry({
      id: 'r1',
      type: 'Sales Return',
      amount: 200,
      paymentMethod: 'Store Credit',
    });
    assert.ok(je);
    assert.ok(je!.lines.some((l) => l.accountCode === '2100' && l.credit === 200));
  });

  it('posts purchase to inventory and AP', () => {
    const je = buildAutoJournalEntry({
      id: 'p1',
      type: 'Purchase',
      amount: 300,
      paymentMethod: 'Due',
    });
    assert.ok(je);
    const { debit, credit } = sumDebitsCredits(je!.lines);
    assert.equal(debit, credit);
  });

  it('posts stock take mixed variances', () => {
    const je = buildAutoJournalEntry({
      id: 'st1',
      type: 'Stock Adjustment',
      amount: 100,
      reference: 'Stock Take',
      items: [
        { variance: 5, total: 50 },
        { variance: -3, total: 30 },
      ] as any,
    });
    assert.ok(je);
    const { debit, credit } = sumDebitsCredits(je!.lines);
    assert.equal(debit, credit);
  });
});
