import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchStatementToBooks, summarizeMatchResults, type BookTxLite, type ParsedStatementLine } from './bankReconcile.ts';

describe('bankReconcile edges', () => {
  const accountId = 'bank1';
  const baseTx = (o: Partial<BookTxLite> & { id: string; amount: number }): BookTxLite => ({
    date: '2026-10-01',
    type: 'Sale',
    accountId,
    paymentMethod: 'Bank',
    ...o,
  });

  it('skips already reconciled book txs', () => {
    const lines: ParsedStatementLine[] = [
      { id: 'L1', date: '2026-10-01', description: 'Sale', amount: 100, reference: '' },
    ];
    const txs = [
      baseTx({ id: 'T1', amount: 100, bankReconciled: true }),
      baseTx({ id: 'T2', amount: 100 }),
    ];
    const r = matchStatementToBooks(lines, txs, accountId);
    assert.equal(r[0].status, 'matched');
    assert.deepEqual(r[0].matchedTransactionIds, ['T2']);
  });

  it('partial amount becomes suggested not auto-matched', () => {
    const lines: ParsedStatementLine[] = [
      { id: 'L1', date: '2026-10-01', description: 'Deposit', amount: 100, reference: '' },
    ];
    const txs = [baseTx({ id: 'T1', amount: 99.97 })];
    const r = matchStatementToBooks(lines, txs, accountId, { amountTolerance: 0.05 });
    assert.equal(r[0].status, 'suggested');
    assert.ok((r[0].suggestions || [])[0]?.reasons?.includes('partial_amount'));
  });

  it('summarize counts partial', () => {
    const s = summarizeMatchResults([
      { lineId: '1', status: 'matched', matchedTransactionIds: ['a'], suggestions: [], confidence: 1 },
      {
        lineId: '2',
        status: 'suggested',
        matchedTransactionIds: [],
        suggestions: [{ transactionId: 'b', score: 0.4, reasons: ['partial_amount'] }],
        confidence: 0.4,
      },
    ]);
    assert.equal(s.matched, 1);
    assert.equal(s.partial, 1);
  });
});
