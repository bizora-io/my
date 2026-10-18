import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVatSummary, vatSummaryToCsv } from './vatReport.ts';

describe('vatReport', () => {
  it('nets output and input with returns', () => {
    const s = buildVatSummary([
      { id: '1', type: 'Sale', amount: 110, details: { tax: 10, subtotal: 100 }, date: '2026-01-05', entityName: 'C1' },
      { id: '2', type: 'Sales Return', amount: 11, details: { tax: 1, subtotal: 10 }, date: '2026-01-06' },
      { id: '3', type: 'Purchase', amount: 55, details: { tax: 5, subtotal: 50 }, date: '2026-01-07' },
      { id: '4', type: 'Purchase Return', amount: 11, details: { tax: 1, subtotal: 10 }, date: '2026-01-08' },
    ]);
    assert.equal(s.netOutputTax, 9);
    assert.equal(s.netInputTax, 4);
    assert.equal(s.netPayable, 5);
    assert.equal(s.taxableSales, 90);
    assert.equal(s.taxablePurchases, 40);
  });

  it('counts expense VAT as input', () => {
    const s = buildVatSummary([
      { id: 'e1', type: 'Expense', amount: 110, details: { tax: 10, subtotal: 100 }, date: '2026-01-09' },
    ]);
    assert.equal(s.netInputTax, 10);
    assert.equal(s.inputLines.length, 1);
  });

  it('csv includes summary rows', () => {
    const s = buildVatSummary([{ id: '1', type: 'Sale', amount: 110, details: { tax: 10, subtotal: 100 } }]);
    const csv = vatSummaryToCsv(s);
    assert.match(csv, /Net VAT payable/);
    assert.match(csv, /Output/);
  });
});
