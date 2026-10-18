import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  alreadyReturnedByLine,
  remainingReturnable,
  calculatePartialRefund,
  sliceLotsForQty,
  isReturnForSale,
  isReturnForPurchase,
  calculatePartialRefundWithAdjustments,
} from './partialSalesReturn.ts';

describe('partialSalesReturn', () => {
  const saleItems = [
    { productId: 'p1', qty: 10, price: 100 },
    { productId: 'p2', variantId: 'v1', qty: 5, price: 50 },
  ];

  it('tracks remaining after prior partial returns', () => {
    const prior = [
      {
        type: 'Sales Return',
        reference: 'RET-abc123',
        items: [{ productId: 'p1', qty: 3, price: 100 }],
      },
    ];
    // without sale id match helper in remaining - use direct alreadyReturned
    const returned = alreadyReturnedByLine(saleItems, prior as any);
    assert.equal(returned[0], 3);
    assert.equal(returned[1], 0);
    const rem = remainingReturnable(saleItems, prior as any);
    assert.equal(rem[0], 7);
    assert.equal(rem[1], 5);
  });

  it('calculatePartialRefund is line-proportional', () => {
    assert.equal(calculatePartialRefund(saleItems, [2, 1]), 2 * 100 + 1 * 50);
  });

  it('sliceLotsForQty takes earliest lots first', () => {
    const lots = [
      { lotNumber: 'A', qty: 4, expiryDate: '2026-10-01' },
      { lotNumber: 'B', qty: 6, expiryDate: '2026-11-01' },
    ];
    const s = sliceLotsForQty(lots, 5);
    assert.equal(s.length, 2);
    assert.equal(s[0].lotNumber, 'A');
    assert.equal(s[0].qty, 4);
    assert.equal(s[1].lotNumber, 'B');
    assert.equal(s[1].qty, 1);
  });

  it('isReturnForSale matches RET suffix', () => {
    assert.equal(isReturnForSale({ type: 'Sales Return', reference: 'RET-123456' }, 'xx123456'), true);
    assert.equal(isReturnForSale({ type: 'Sale', reference: 'RET-123456' }, 'xx123456'), false);
  });

  it('isReturnForPurchase matches PRET reference', () => {
    assert.equal(
      isReturnForPurchase({ type: 'Purchase Return', reference: 'PRET-abc999' }, 'xxabc999'),
      true
    );
    assert.equal(
      isReturnForPurchase({ type: 'Sales Return', reference: 'PRET-abc999' }, 'xxabc999'),
      false
    );
  });

  it('allocates discount and tax proportionally', () => {
    // Full sale subtotal 1000; discount 100; tax 50
    const items = [{ productId: 'p1', qty: 10, price: 100 }];
    const half = calculatePartialRefundWithAdjustments(items, [5], {
      subtotal: 1000,
      discount: 100,
      tax: 50,
    });
    assert.equal(half.linesSubtotal, 500);
    assert.equal(half.ratio, 0.5);
    assert.equal(half.discountShare, 50);
    assert.equal(half.taxShare, 25);
    assert.equal(half.refund, 475); // 500 - 50 + 25
  });
});
