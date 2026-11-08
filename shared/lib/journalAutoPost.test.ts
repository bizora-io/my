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

  it('posts loan disbursement and repayment with principal/interest split', () => {
    // Borrowing: Dr Cash / Cr Loan Payable
    const disb = buildAutoJournalEntry({
      id: 'loan-1',
      type: 'Income',
      subType: 'Loan Disbursement',
      category: 'Loans Payable',
      amount: 50000,
      paymentMethod: 'Bank',
    });
    assert.ok(disb);
    const dCheck = sumDebitsCredits(disb!.lines);
    assert.equal(dCheck.debit, 50000);
    assert.equal(dCheck.credit, 50000);
    assert.ok(disb!.lines.some(l => l.accountCode === '2200' && l.credit === 50000));

    // Repayment: Dr Loan Payable 4000, Dr Interest Expense 1000, Cr Bank 5000
    const repay = buildAutoJournalEntry({
      id: 'loan-pmt-1',
      type: 'Expense',
      subType: 'Loan Repayment',
      category: 'Loan Repayment',
      amount: 5000,
      interest: 1000,
      paymentMethod: 'Bank',
    } as any);
    assert.ok(repay);
    const rCheck = sumDebitsCredits(repay!.lines);
    assert.equal(rCheck.debit, 5000);
    assert.equal(rCheck.credit, 5000);
    assert.ok(repay!.lines.some(l => l.accountCode === '2200' && l.debit === 4000));
    assert.ok(repay!.lines.some(l => l.accountCode === '5300' && l.debit === 1000));
  });

  it('posts PF contribution and settlement cleanly', () => {
    // Employer PF match: Dr Salary Expense 5000 / Cr PF Liability 5000
    const contrib = buildAutoJournalEntry({
      id: 'pf-1',
      type: 'Expense',
      subType: 'HR / Payroll',
      category: 'Provident Fund Employer Contribution',
      amount: 5000,
    });
    assert.ok(contrib);
    const cCheck = sumDebitsCredits(contrib!.lines);
    assert.equal(cCheck.debit, 5000);
    assert.equal(cCheck.credit, 5000);
    assert.ok(contrib!.lines.some(l => l.accountCode === '2300' && l.credit === 5000));

    // Final settlement payout: Dr PF Liability 50000 / Cr Cash 50000
    const settle = buildAutoJournalEntry({
      id: 'pf-settle-1',
      type: 'Expense',
      subType: 'HR Settlement',
      category: 'Provident Fund Settlement Payout',
      amount: 50000,
      paymentMethod: 'Bank',
    });
    assert.ok(settle);
    const sCheck = sumDebitsCredits(settle!.lines);
    assert.equal(sCheck.debit, 50000);
    assert.equal(sCheck.credit, 50000);
    assert.ok(settle!.lines.some(l => l.accountCode === '2300' && l.debit === 50000));
  });

  it('posts hotel, vehicle, project, and dealer transactions with balanced debit/credit', () => {
    // Hotel folio check-out
    const hotel = buildAutoJournalEntry({
      id: 'hotel-1',
      type: 'Sale',
      subType: 'Hotel Accommodation',
      category: 'Room Revenue',
      amount: 12000,
      paymentMethod: 'Card',
    });
    assert.ok(hotel);
    const hCheck = sumDebitsCredits(hotel!.lines);
    assert.equal(hCheck.debit, 12000);
    assert.equal(hCheck.credit, 12000);
    assert.ok(hotel!.lines.some(l => l.accountCode === '4200' && l.credit === 12000));

    // Vehicle fuel expense
    const vehicle = buildAutoJournalEntry({
      id: 'veh-1',
      type: 'Expense',
      subType: 'Fleet & Logistics',
      category: 'Vehicle Fuel',
      amount: 4500,
      paymentMethod: 'Cash',
    });
    assert.ok(vehicle);
    const vCheck = sumDebitsCredits(vehicle!.lines);
    assert.equal(vCheck.debit, 4500);
    assert.equal(vCheck.credit, 4500);
    assert.ok(vehicle!.lines.some(l => l.accountCode === '5400' && l.debit === 4500));

    // Project milestone expense
    const project = buildAutoJournalEntry({
      id: 'proj-1',
      type: 'Expense',
      category: 'Project Milestone Civil Work',
      amount: 75000,
      paymentMethod: 'Bank',
    });
    assert.ok(project);
    const pCheck = sumDebitsCredits(project!.lines);
    assert.equal(pCheck.debit, 75000);
    assert.equal(pCheck.credit, 75000);
    assert.ok(project!.lines.some(l => l.accountCode === '5500' && l.debit === 75000));

    // Dealer sales quota commission
    const dealer = buildAutoJournalEntry({
      id: 'dlr-1',
      type: 'Expense',
      subType: 'Dealer Commission',
      category: 'Dealer Quota Incentive',
      amount: 15000,
      paymentMethod: 'Bank',
    });
    assert.ok(dealer);
    const dlCheck = sumDebitsCredits(dealer!.lines);
    assert.equal(dlCheck.debit, 15000);
    assert.equal(dlCheck.credit, 15000);
    assert.ok(dealer!.lines.some(l => l.accountCode === '5600' && l.debit === 15000));
  });
});
