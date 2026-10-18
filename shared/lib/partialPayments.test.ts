import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sumCollected,
  sumCredit,
  validatePaymentSplits,
  ensureDueLine,
  computePaidDue,
  accountTypeForTender,
} from './partialPayments.ts';

describe('partialPayments', () => {
  it('splits collected vs credit', () => {
    const lines = [
      { method: 'Cash', amount: 500 },
      { method: 'Due', amount: 200 },
    ];
    assert.equal(sumCollected(lines), 500);
    assert.equal(sumCredit(lines), 200);
  });

  it('validatePaymentSplits accepts balanced tender', () => {
    const v = validatePaymentSplits(
      [
        { method: 'Cash', amount: 300 },
        { method: 'Card', amount: 200 },
      ],
      500
    );
    assert.equal(v.ok, true);
    assert.equal(v.errors.length, 0);
  });

  it('validatePaymentSplits flags due without customer', () => {
    const v = validatePaymentSplits([{ method: 'Due', amount: 100 }], 100, {
      customerName: '',
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.length > 0);
  });

  it('ensureDueLine fills remainder as Due', () => {
    const next = ensureDueLine([{ method: 'Cash', amount: 40 }], 100);
    const due = next.find((p) => p.method === 'Due');
    assert.ok(due);
    assert.equal(due!.amount, 60);
  });

  it('computePaidDue detects partial', () => {
    const r = computePaidDue(1000, 400);
    assert.equal(r.isPartial, true);
    assert.equal(r.dueAmount, 600);
  });

  it('accountTypeForTender maps cash and bank', () => {
    assert.equal(accountTypeForTender('Cash'), 'Cash');
    assert.equal(accountTypeForTender('Card'), 'Bank');
    assert.equal(accountTypeForTender('Mobile Wallet'), 'Mobile Wallet');
  });
});
