import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  round2,
  getDateFilterBounds,
  filterTransactionsByDate,
  getTransactionCogs,
  computeSalesMetrics,
  computePurchaseMetrics,
  computeExpenseAndIncome,
  computeProfitAndLoss,
  computeCumulativeDues,
  reconcileAccountBalances,
  type TransactionLike,
  type ProductLike,
  type EntityLike,
  type FinancialAccountLike,
} from './financialReconciliation.ts';

describe('financialReconciliation', () => {
  it('correctly sets date bounds at 00:00:00 and 23:59:59.999', () => {
    const refDate = new Date(2026, 9, 17, 15, 30, 0); // Oct 17, 2026 3:30 PM
    const todayBounds = getDateFilterBounds({ filterType: 'today', referenceDate: refDate });
    assert.equal(todayBounds.startDate.getHours(), 0);
    assert.equal(todayBounds.startDate.getMinutes(), 0);
    assert.equal(todayBounds.endDate.getHours(), 23);
    assert.equal(todayBounds.endDate.getMinutes(), 59);
    assert.equal(todayBounds.endDate.getSeconds(), 59);

    const customBounds = getDateFilterBounds({
      filterType: 'custom',
      customStart: '2026-10-01',
      customEnd: '2026-10-17',
      referenceDate: refDate,
    });
    assert.equal(customBounds.startDate.getDate(), 1);
    assert.equal(customBounds.startDate.getHours(), 0);
    assert.equal(customBounds.endDate.getDate(), 17);
    assert.equal(customBounds.endDate.getHours(), 23);
  });

  it('computes sales metrics with cash, credit, partial splits, and returns', () => {
    const txs: TransactionLike[] = [
      { id: '1', type: 'Sale', amount: 1000, paymentMethod: 'Cash', date: '2026-10-10' },
      { id: '2', type: 'Sale', amount: 500, paymentMethod: 'Due', date: '2026-10-11' },
      { id: '3', type: 'Sale', amount: 800, paymentMethod: 'Partial', amountPaid: 300, dueAmount: 500, date: '2026-10-12' },
      { id: '4', type: 'Sales Return', amount: 200, paymentMethod: 'Cash', date: '2026-10-13' },
      { id: '5', type: 'Sales Return', amount: 100, paymentMethod: 'Due', date: '2026-10-14' },
    ];

    const sales = computeSalesMetrics(txs);
    // Gross: 1000 + 500 + 800 = 2300
    // Returns: 200 + 100 = 300
    // Net: 2000
    assert.equal(sales.grossSales, 2300);
    assert.equal(sales.salesReturns, 300);
    assert.equal(sales.netSales, 2000);
    // Cash Sales: 1000 + 300 - 200 = 1100
    assert.equal(sales.cashSales, 1100);
    // Credit Sales: 500 + 500 - 100 = 900
    assert.equal(sales.creditSales, 900);
    assert.equal(sales.salesCount, 3);
    assert.equal(sales.returnsCount, 2);
  });

  it('evaluates COGS accurately without hardcoded fallbacks', () => {
    const products: ProductLike[] = [
      { id: 'p1', name: 'Widget A', purchasePrice: 40, salePrice: 100 },
      { id: 'p2', name: 'Widget B', purchasePrice: 60, salePrice: 150 },
    ];

    // Priority 1: explicit cogs
    const tx1: TransactionLike = { id: 't1', type: 'Sale', amount: 200, cogs: 80 };
    assert.equal(getTransactionCogs(tx1, products), 80);

    // Priority 2: explicit cost
    const tx2: TransactionLike = { id: 't2', type: 'Sale', amount: 200, cost: 75 };
    assert.equal(getTransactionCogs(tx2, products), 75);

    // Priority 3: profit specified -> amount - profit
    const tx3: TransactionLike = { id: 't3', type: 'Sale', amount: 200, profit: 90 };
    assert.equal(getTransactionCogs(tx3, products), 110);

    // Priority 4: items
    const tx4: TransactionLike = {
      id: 't4',
      type: 'Sale',
      amount: 350,
      items: [
        { productId: 'p1', qty: 2 }, // 2 * 40 = 80
        { productId: 'p2', qty: 1, costPrice: 55 }, // 1 * 55 = 55
      ],
    };
    assert.equal(getTransactionCogs(tx4, products), 135);

    // Priority 5: zero fallback if unknown
    const tx5: TransactionLike = { id: 't5', type: 'Sale', amount: 100 };
    assert.equal(getTransactionCogs(tx5, products), 0);
  });

  it('separates customer due collection from non-operating other income', () => {
    const customers: EntityLike[] = [
      { id: 'c1', name: 'Acme Corp', type: 'Customer' },
    ];
    const suppliers: EntityLike[] = [
      { id: 's1', name: 'Global Supply', type: 'Supplier' },
    ];

    const txs: TransactionLike[] = [
      { id: '1', type: 'Expense', amount: 300, entityName: 'Office Rent' },
      { id: '2', type: 'Salary', amount: 1500, entityName: 'John Doe' },
      { id: '3', type: 'Expense', amount: 400, entityName: 'Global Supply' }, // Supplier past due payment
      { id: '4', type: 'Income', amount: 500, entityName: 'Acme Corp' }, // Due collection
      { id: '5', type: 'Income', amount: 10000, entityName: 'Owner Equity Investment' }, // Non-operating capital
    ];

    const expInc = computeExpenseAndIncome(txs, customers, suppliers);
    assert.equal(expInc.operatingExpenses, 1800); // 300 rent + 1500 salary
    assert.equal(expInc.salaryExpenses, 1500);
    assert.equal(expInc.supplierPayments, 400); // Excluded from operating expenses
    assert.equal(expInc.customerDueCollections, 500);
    assert.equal(expInc.nonOperatingIncome, 10000);
  });

  it('computes accurate profit & loss reconciliation', () => {
    const products: ProductLike[] = [
      { id: 'p1', purchasePrice: 50, salePrice: 100 },
    ];
    const txs: TransactionLike[] = [
      { id: '1', type: 'Sale', amount: 1000, items: [{ productId: 'p1', qty: 10 }] }, // COGS: 500, Sales: 1000
      { id: '2', type: 'Sales Return', amount: 100, items: [{ productId: 'p1', qty: 1 }] }, // COGS: -50, Sales: -100
      { id: '3', type: 'Expense', amount: 200, entityName: 'Electricity Bill' },
      { id: '4', type: 'Income', amount: 50, entityName: 'Bank Interest' }, // Other income
    ];

    const pnl = computeProfitAndLoss(txs, products);
    assert.equal(pnl.netSales, 900);
    assert.equal(pnl.cogs, 450);
    assert.equal(pnl.grossProfit, 450);
    assert.equal(pnl.grossMarginPercent, 50);
    assert.equal(pnl.operatingExpenses, 200);
    assert.equal(pnl.operatingProfit, 250);
    assert.equal(pnl.nonOperatingIncome, 50);
    assert.equal(pnl.netProfit, 300);
    assert.equal(pnl.netMarginPercent, 33.33);
  });

  it('computes cumulative customer receivables and supplier payables accurately across history', () => {
    const customers: EntityLike[] = [
      { id: 'c1', name: 'Alice', type: 'Customer', openingBalance: 100 },
      { id: 'c2', name: 'Bob', type: 'Customer' },
    ];
    const suppliers: EntityLike[] = [
      { id: 's1', name: 'Supplier X', type: 'Supplier' },
    ];

    const history: TransactionLike[] = [
      // Alice: 100 opening + 400 due sale - 250 payment = 250
      { id: '1', type: 'Sale', amount: 400, paymentMethod: 'Due', entityName: 'Alice' },
      { id: '2', type: 'Income', amount: 250, entityName: 'Alice' },
      // Bob: 600 due sale - 100 return = 500
      { id: '3', type: 'Sale', amount: 600, paymentMethod: 'Due', entityName: 'Bob' },
      { id: '4', type: 'Sales Return', amount: 100, paymentMethod: 'Due', entityName: 'Bob' },
      // Supplier X: 1000 credit purchase - 400 payment = 600
      { id: '5', type: 'Purchase', amount: 1000, paymentMethod: 'Due', entityName: 'Supplier X' },
      { id: '6', type: 'Supplier Payment', amount: 400, entityName: 'Supplier X' },
    ];

    const dues = computeCumulativeDues(history, customers, suppliers);
    assert.equal(dues.totalCustomerReceivables, 750); // Alice (250) + Bob (500)
    assert.equal(dues.totalSupplierPayables, 600); // Supplier X (600)
    assert.equal(dues.customerCountWithDue, 2);
    assert.equal(dues.supplierCountWithDue, 1);
  });

  it('reconciles multi-store account balances safely without store leakage or zero-wipes', () => {
    const accounts: FinancialAccountLike[] = [
      { id: 'acc-cash-1', name: 'Store 1 Cash', type: 'Cash', balance: 0, openingBalance: 500, storeId: 'store-1' },
      { id: 'acc-cash-2', name: 'Store 2 Cash', type: 'Cash', balance: 0, openingBalance: 300, storeId: 'store-2' },
      { id: 'acc-corp-bank', name: 'Central Bank', type: 'Bank', balance: 0, openingBalance: 5000 }, // Business-wide
    ];

    const txs: TransactionLike[] = [
      // Store 1 Sale -> Cash 1
      { id: '1', type: 'Sale', amount: 200, paymentMethod: 'Cash', accountId: 'acc-cash-1', storeId: 'store-1' },
      // Store 2 Sale -> Cash 2
      { id: '2', type: 'Sale', amount: 400, paymentMethod: 'Cash', accountId: 'acc-cash-2', storeId: 'store-2' },
      // Store 1 Sale -> Central Bank
      { id: '3', type: 'Sale', amount: 1000, paymentMethod: 'Bank', accountId: 'acc-corp-bank', storeId: 'store-1' },
      // Store 2 Sale -> Central Bank
      { id: '4', type: 'Sale', amount: 1500, paymentMethod: 'Bank', accountId: 'acc-corp-bank', storeId: 'store-2' },
      // Store 1 Expense -> Cash 1
      { id: '5', type: 'Expense', amount: 50, paymentMethod: 'Cash', accountId: 'acc-cash-1', storeId: 'store-1' },
    ];

    const rec = reconcileAccountBalances(accounts, txs);
    const cash1 = rec.accounts.find(a => a.id === 'acc-cash-1')!;
    const cash2 = rec.accounts.find(a => a.id === 'acc-cash-2')!;
    const bank = rec.accounts.find(a => a.id === 'acc-corp-bank')!;

    // Cash 1: 500 opening + 200 - 50 = 650
    assert.equal(cash1.calculatedBalance, 650);
    // Cash 2: 300 opening + 400 = 700
    assert.equal(cash2.calculatedBalance, 700);
    // Central Bank: 5000 opening + 1000 (from store 1) + 1500 (from store 2) = 7500
    assert.equal(bank.calculatedBalance, 7500);
    assert.equal(rec.totalLiquidity, 650 + 700 + 7500);
  });
});

