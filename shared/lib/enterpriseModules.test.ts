import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLoanAmortization,
  calculateMonthlyPfContribution,
  calculatePfSettlement,
  summarizeWastage,
  calculateDealerAchievement,
  parseReceiptText,
  evaluateTenderBids
} from './enterpriseModules.ts';

describe('Enterprise Modules Core Verification', () => {
  describe('Loan Amortization', () => {
    it('calculates equal monthly installments and zero terminal balance', () => {
      const res = calculateLoanAmortization(100000, 12, 12, '2026-01-01');
      assert.equal(res.principal, 100000);
      assert.equal(res.tenureMonths, 12);
      assert.equal(res.schedule.length, 12);
      // Last installment balance must be 0
      const last = res.schedule[res.schedule.length - 1];
      assert.equal(last.balanceRemaining, 0);
      assert.ok(res.totalInterest > 0);
      assert.equal(res.totalRepayment, Math.round((res.principal + res.totalInterest) * 100) / 100);
    });

    it('handles zero-interest loan cleanly', () => {
      const res = calculateLoanAmortization(60000, 0, 6, '2026-01-01');
      assert.equal(res.installmentAmount, 10000);
      assert.equal(res.totalInterest, 0);
      assert.equal(res.totalRepayment, 60000);
      assert.equal(res.schedule[5].balanceRemaining, 0);
    });

    it('throws error on non-positive principal or tenure', () => {
      assert.throws(() => calculateLoanAmortization(0, 10, 12), /positive numbers/);
      assert.throws(() => calculateLoanAmortization(10000, 10, 0), /positive numbers/);
    });
  });

  describe('Provident Fund', () => {
    it('calculates 10% monthly contribution correctly', () => {
      const res = calculateMonthlyPfContribution(50000, 10, 10);
      assert.equal(res.basicSalary, 50000);
      assert.equal(res.employeeDeduction, 5000);
      assert.equal(res.employerMatch, 5000);
      assert.equal(res.totalMonthlyDeposit, 10000);
    });

    it('applies statutory vesting rules correctly on settlement', () => {
      // < 1 year: 0% employer match
      const s0 = calculatePfSettlement(20000, 20000, 1000, 0.5);
      assert.equal(s0.vestingPercentage, 0);
      assert.equal(s0.eligibleEmployerContributed, 0);
      assert.equal(s0.finalSettlementAmount, 21000);

      // 1.5 years: 50% employer match
      const s1 = calculatePfSettlement(30000, 30000, 2500, 1.5);
      assert.equal(s1.vestingPercentage, 50);
      assert.equal(s1.eligibleEmployerContributed, 15000);
      assert.equal(s1.finalSettlementAmount, 47500);

      // 4 years: 100% employer match
      const s2 = calculatePfSettlement(80000, 80000, 12000, 4);
      assert.equal(s2.vestingPercentage, 100);
      assert.equal(s2.eligibleEmployerContributed, 80000);
      assert.equal(s2.finalSettlementAmount, 172000);
    });
  });

  describe('Wastage and Stock Loss Reconciliation', () => {
    it('summarizes loss by item and category', () => {
      const res = summarizeWastage([
        { productId: 'p1', productName: 'Milk 1L', quantity: 5, costPrice: 80, reason: 'EXPIRED' },
        { productId: 'p2', productName: 'Glass Bottle', quantity: 2, costPrice: 150, reason: 'DAMAGED' },
        { productId: 'p1', productName: 'Milk 1L', quantity: 3, costPrice: 80, reason: 'EXPIRED' }
      ]);

      assert.equal(res.totalItems, 3);
      assert.equal(res.totalQuantity, 10);
      assert.equal(res.totalCostLoss, (8 * 80) + (2 * 150)); // 640 + 300 = 940
      assert.equal(res.breakdownByReason.EXPIRED.count, 8);
      assert.equal(res.breakdownByReason.EXPIRED.loss, 640);
      assert.equal(res.breakdownByReason.DAMAGED.count, 2);
      assert.equal(res.breakdownByReason.DAMAGED.loss, 300);
    });

    it('rejects zero or negative quantities to protect inventory integrity', () => {
      assert.throws(() => summarizeWastage([
        { productId: 'p1', productName: 'Bad Item', quantity: -2, costPrice: 10, reason: 'DAMAGED' }
      ]), /Invalid wastage quantity/);
    });
  });

  describe('Dealer Targets and Commission Tiers', () => {
    it('assigns correct tier and commission based on target achievement', () => {
      // Under 80%
      const d1 = calculateDealerAchievement(100000, 70000);
      assert.equal(d1.achievementPercent, 70);
      assert.equal(d1.tier, 'BELOW_TARGET');
      assert.equal(d1.commissionRate, 0);
      assert.equal(d1.commissionPayable, 0);

      // Bronze: 80-99%
      const d2 = calculateDealerAchievement(100000, 85000);
      assert.equal(d2.achievementPercent, 85);
      assert.equal(d2.tier, 'BRONZE');
      assert.equal(d2.commissionRate, 1);
      assert.equal(d2.commissionPayable, 850);

      // Silver: 100-119%
      const d3 = calculateDealerAchievement(100000, 110000);
      assert.equal(d3.achievementPercent, 110);
      assert.equal(d3.tier, 'SILVER');
      assert.equal(d3.commissionRate, 3);
      assert.equal(d3.commissionPayable, 3300);

      // Gold: 120%+
      const d4 = calculateDealerAchievement(100000, 150000);
      assert.equal(d4.achievementPercent, 150);
      assert.equal(d4.tier, 'GOLD');
      assert.equal(d4.commissionRate, 5);
      assert.equal(d4.commissionPayable, 7500);
    });
  });

  describe('Document AI OCR Heuristics Parser', () => {
    it('extracts vendor, invoice number, date, tax and total amount', () => {
      const sampleText = `
        Rahman Paper Mill Ltd.
        TAX INVOICE
        Invoice No: INV-2026-8891
        Date: 2026-03-15
        Item: Kraft Paper 10 Reams
        Subtotal: 4,000.00
        VAT (15%): 600.00
        Grand Total: 4,600.00
        Thank you for your business!
      `;

      const parsed = parseReceiptText(sampleText);
      assert.equal(parsed.vendorName, 'Rahman Paper Mill Ltd.');
      assert.equal(parsed.invoiceNumber, 'INV-2026-8891');
      assert.equal(parsed.date, '2026-03-15');
      assert.equal(parsed.taxAmount, 600);
      assert.equal(parsed.totalAmount, 4600);
      assert.equal(parsed.confidence, 100);
    });

    it('gracefully handles messy or partial receipts', () => {
      const partialText = `Receipt #9924\nTotal: $45.50`;
      const parsed = parseReceiptText(partialText);
      assert.equal(parsed.invoiceNumber, '9924');
      assert.equal(parsed.totalAmount, 45.5);
      assert.ok(parsed.confidence > 0 && parsed.confidence < 100);
    });
  });

  describe('E-Procurement QCBS Tender Evaluation', () => {
    it('correctly calculates 60/40 weighted scores and ranks bids', () => {
      const bids = [
        { vendorId: 'v1', vendorName: 'Apex Supplies', unitPrice: 1000, deliveryDays: 14, technicalScore: 90 },
        { vendorId: 'v2', vendorName: 'Best Build Co', unitPrice: 800, deliveryDays: 20, technicalScore: 70 },
        { vendorId: 'v3', vendorName: 'Crown Industrial', unitPrice: 1200, deliveryDays: 10, technicalScore: 95 }
      ];

      const res = evaluateTenderBids(bids);
      assert.equal(res.bids.length, 3);
      // Best Build Co has lowest price ($800) -> Financial score = (800/800)*60 = 60. Technical = 70*0.4 = 28 -> Composite = 88
      // Apex Supplies has price ($1000) -> Financial = (800/1000)*60 = 48. Technical = 90*0.4 = 36 -> Composite = 84
      // Crown Industrial has price ($1200) -> Financial = (800/1200)*60 = 40. Technical = 95*0.4 = 38 -> Composite = 78

      assert.equal(res.recommendedWinnerId, 'v2');
      assert.equal(res.bids[0].vendorId, 'v2');
      assert.equal(res.bids[0].compositeScore, 88);
      assert.equal(res.bids[1].vendorId, 'v1');
      assert.equal(res.bids[1].compositeScore, 84);
      assert.equal(res.bids[2].vendorId, 'v3');
      assert.equal(res.bids[2].compositeScore, 78);
    });
  });
});

