/**
 * Bizora Enterprise Modules Core Logic
 * 
 * Provides pure business logic, calculations, and validators for:
 * 1. Catalog & Product categorization
 * 2. Wastage & Stock damage loss reconciliation
 * 3. Letter of Credit tracking & margin calculations
 * 4. Loan amortization & installment schedules
 * 5. Hotel room occupancy & folio revenue calculations
 * 6. Provident Fund monthly contributions & retirement settlement
 * 7. E-procurement weighted tender evaluation
 * 8. Dealer quota tracking & tiered commission calculation
 * 9. Document AI receipt text heuristics parser
 */

export interface LoanScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  balanceRemaining: number;
}

export interface LoanAmortizationResult {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  installmentAmount: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: LoanScheduleItem[];
}

/**
 * Calculates standard equal monthly installment (EMI) amortization schedule.
 */
export function calculateLoanAmortization(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  startDateStr: string = new Date().toISOString()
): LoanAmortizationResult {
  if (principal <= 0 || tenureMonths <= 0) {
    throw new Error('Principal and tenure must be positive numbers');
  }

  const monthlyRate = annualRatePercent > 0 ? (annualRatePercent / 100) / 12 : 0;
  let monthlyEmi = 0;

  if (monthlyRate === 0) {
    monthlyEmi = principal / tenureMonths;
  } else {
    monthlyEmi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  monthlyEmi = Math.round(monthlyEmi * 100) / 100;

  let balance = principal;
  const schedule: LoanScheduleItem[] = [];
  const baseDate = new Date(startDateStr);
  let totalInterest = 0;

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = Math.round((balance * monthlyRate) * 100) / 100;
    let principalPart = Math.round((monthlyEmi - interest) * 100) / 100;

    if (i === tenureMonths || principalPart > balance) {
      principalPart = balance;
    }

    balance = Math.max(0, Math.round((balance - principalPart) * 100) / 100);
    totalInterest = Math.round((totalInterest + interest) * 100) / 100;

    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principalAmount: principalPart,
      interestAmount: interest,
      totalAmount: Math.round((principalPart + interest) * 100) / 100,
      balanceRemaining: balance
    });
  }

  const totalRepayment = Math.round((principal + totalInterest) * 100) / 100;

  return {
    principal,
    annualRate: annualRatePercent,
    tenureMonths,
    installmentAmount: monthlyEmi,
    totalInterest,
    totalRepayment,
    schedule
  };
}

export interface PfContributionResult {
  basicSalary: number;
  employeeDeduction: number;
  employerMatch: number;
  totalMonthlyDeposit: number;
}

export interface PfSettlementResult {
  totalEmployeeContributed: number;
  eligibleEmployerContributed: number;
  interestEarned: number;
  finalSettlementAmount: number;
  vestingPercentage: number;
}

/**
 * Calculates monthly PF deduction and matching deposit.
 */
export function calculateMonthlyPfContribution(
  basicSalary: number,
  employeeRatePercent: number = 10,
  employerRatePercent: number = 10
): PfContributionResult {
  if (basicSalary <= 0) {
    return { basicSalary: 0, employeeDeduction: 0, employerMatch: 0, totalMonthlyDeposit: 0 };
  }
  const employeeDeduction = Math.round((basicSalary * (employeeRatePercent / 100)) * 100) / 100;
  const employerMatch = Math.round((basicSalary * (employerRatePercent / 100)) * 100) / 100;
  return {
    basicSalary,
    employeeDeduction,
    employerMatch,
    totalMonthlyDeposit: Math.round((employeeDeduction + employerMatch) * 100) / 100
  };
}

/**
 * Calculates final PF settlement payout based on vesting policy.
 * Standard statutory vesting:
 * - < 1 year: 0% employer match
 * - 1-2 years: 50% employer match
 * - 3+ years: 100% employer match
 */
export function calculatePfSettlement(
  totalEmployeeContributed: number,
  totalEmployerContributed: number,
  interestEarned: number,
  serviceYears: number
): PfSettlementResult {
  let vestingPercentage = 0;
  if (serviceYears >= 3) {
    vestingPercentage = 1.0;
  } else if (serviceYears >= 1) {
    vestingPercentage = 0.5;
  } else {
    vestingPercentage = 0.0;
  }

  const eligibleEmployerContributed = Math.round(totalEmployerContributed * vestingPercentage * 100) / 100;
  const finalSettlementAmount = Math.round((totalEmployeeContributed + eligibleEmployerContributed + interestEarned) * 100) / 100;

  return {
    totalEmployeeContributed,
    eligibleEmployerContributed,
    interestEarned,
    finalSettlementAmount,
    vestingPercentage: vestingPercentage * 100
  };
}

export interface WastageItemInput {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'SPILLAGE' | 'THEFT' | 'OTHER';
}

export interface WastageSummaryResult {
  totalItems: number;
  totalQuantity: number;
  totalCostLoss: number;
  breakdownByReason: Record<string, { count: number; loss: number }>;
}

/**
 * Calculates wastage loss metrics and validates stock deduction counts.
 */
export function summarizeWastage(items: WastageItemInput[]): WastageSummaryResult {
  let totalQuantity = 0;
  let totalCostLoss = 0;
  const breakdown: Record<string, { count: number; loss: number }> = {};

  for (const item of items) {
    if (item.quantity <= 0 || isNaN(item.quantity)) {
      throw new Error(`Invalid wastage quantity for item ${item.productName}`);
    }
    const loss = Math.round((item.quantity * item.costPrice) * 100) / 100;
    totalQuantity += item.quantity;
    totalCostLoss = Math.round((totalCostLoss + loss) * 100) / 100;

    if (!breakdown[item.reason]) {
      breakdown[item.reason] = { count: 0, loss: 0 };
    }
    breakdown[item.reason].count += item.quantity;
    breakdown[item.reason].loss = Math.round((breakdown[item.reason].loss + loss) * 100) / 100;
  }

  return {
    totalItems: items.length,
    totalQuantity,
    totalCostLoss,
    breakdownByReason: breakdown
  };
}

export interface DealerPerformanceResult {
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  tier: 'BELOW_TARGET' | 'BRONZE' | 'SILVER' | 'GOLD';
  commissionRate: number;
  commissionPayable: number;
}

/**
 * Calculates dealer sales target achievement and tiered commission payout.
 */
export function calculateDealerAchievement(
  targetAmount: number,
  salesTotal: number
): DealerPerformanceResult {
  if (targetAmount <= 0) {
    return {
      targetAmount: 0,
      achievedAmount: salesTotal,
      achievementPercent: 100,
      tier: 'GOLD',
      commissionRate: 5,
      commissionPayable: Math.round((salesTotal * 0.05) * 100) / 100
    };
  }

  const percent = Math.round((salesTotal / targetAmount) * 10000) / 100;
  let tier: 'BELOW_TARGET' | 'BRONZE' | 'SILVER' | 'GOLD' = 'BELOW_TARGET';
  let commissionRate = 0;

  if (percent >= 120) {
    tier = 'GOLD';
    commissionRate = 5;
  } else if (percent >= 100) {
    tier = 'SILVER';
    commissionRate = 3;
  } else if (percent >= 80) {
    tier = 'BRONZE';
    commissionRate = 1;
  } else {
    tier = 'BELOW_TARGET';
    commissionRate = 0;
  }

  const commissionPayable = Math.round((salesTotal * (commissionRate / 100)) * 100) / 100;

  return {
    targetAmount,
    achievedAmount: salesTotal,
    achievementPercent: percent,
    tier,
    commissionRate,
    commissionPayable
  };
}

export interface ParsedDocumentData {
  vendorName?: string;
  invoiceNumber?: string;
  date?: string;
  taxAmount?: number;
  totalAmount?: number;
  confidence: number;
}

/**
 * Heuristic parser for OCR receipts and scanned bills.
 */
export function parseReceiptText(text: string): ParsedDocumentData {
  if (!text || typeof text !== 'string') {
    return { confidence: 0 };
  }

  let totalAmount: number | undefined;
  let invoiceNumber: string | undefined;
  let date: string | undefined;
  let taxAmount: number | undefined;
  let vendorName: string | undefined;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Line 1 or 2 is typically the vendor
  if (lines.length > 0 && lines[0].length < 60 && !/(invoice|receipt|date|total|bill)/i.test(lines[0])) {
    vendorName = lines[0];
  }

  // Invoice / Receipt number patterns
  for (const line of lines) {
    const invLineMatch = line.match(/(?:inv(?:oice)?|bill|receipt|ref)(?:[^\S\r\n]*(?:no\.?|#|:|-))+[^\S\r\n]*([a-z0-9\-_/]{3,25})/i);
    if (invLineMatch) {
      invoiceNumber = invLineMatch[1].trim();
      break;
    }
  }
  if (!invoiceNumber) {
    for (const line of lines) {
      const invFallback = line.match(/(?:inv(?:oice)?|bill|receipt|ref)[^\S\r\n]+#?([a-z0-9\-_/]{3,25})/i);
      if (invFallback && !/(?:total|tax|vat|bill\s+to|invoice\s+date)/i.test(line)) {
        invoiceNumber = invFallback[1].trim();
        break;
      }
    }
  }

  // Date pattern: YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY
  const dateMatch = text.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
  if (dateMatch) {
    date = dateMatch[1];
  }

  // Tax/VAT pattern (supports VAT (15%): 600.00 or Tax: 50)
  const taxMatch = text.match(/(?:vat|tax|gst)(?:[^\S\r\n]*\([^)]*\))?[^\S\r\n:]*[:\s-]*[^\S\r\n]*(?:tk\.?|\$|bdt)?[^\S\r\n]*([\d,]+\.?\d*)/i);
  if (taxMatch) {
    const raw = taxMatch[1].replace(/,/g, '');
    const num = parseFloat(raw);
    if (!isNaN(num)) taxAmount = num;
  }

  // Total pattern: prefer bottom-up discovery so Grand Total / final Total takes precedence over subtotal
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/sub\s*total/i.test(line)) continue;
    const match = line.match(/(?:grand\s*total|net\s*(?:total|amount)|total\s*(?:due|payable|amount)?|\btotal\b)[^0-9\n]*([\d,]+\.?\d*)/i);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num)) {
        totalAmount = num;
        break;
      }
    }
  }

  let fieldsFound = 0;
  if (vendorName) fieldsFound++;
  if (invoiceNumber) fieldsFound++;
  if (date) fieldsFound++;
  if (totalAmount !== undefined) fieldsFound++;

  const confidence = Math.round((fieldsFound / 4) * 100);

  return {
    vendorName,
    invoiceNumber,
    date,
    taxAmount,
    totalAmount,
    confidence
  };
}

export interface TenderBidInput {
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  deliveryDays: number;
  technicalScore: number; // 0 - 100
}

export interface TenderEvaluationResult {
  bids: Array<TenderBidInput & { financialScore: number; compositeScore: number; rank: number }>;
  recommendedWinnerId: string;
}

/**
 * Evaluates e-procurement tender bids using standard 60/40 QCBS (Quality & Cost Based Selection).
 * Financial Score (60%): (Lowest Price / Bidder Price) * 60
 * Technical Score (40%): (Bidder Technical Score / 100) * 40
 */
export function evaluateTenderBids(bids: TenderBidInput[]): TenderEvaluationResult {
  if (bids.length === 0) {
    return { bids: [], recommendedWinnerId: '' };
  }

  const validBids = bids.filter(b => b.unitPrice > 0 && b.technicalScore >= 0);
  if (validBids.length === 0) {
    return { bids: [], recommendedWinnerId: '' };
  }

  const lowestPrice = Math.min(...validBids.map(b => b.unitPrice));

  const scored = validBids.map(bid => {
    const financialScore = Math.round(((lowestPrice / bid.unitPrice) * 60) * 100) / 100;
    const technicalScorePart = Math.round(((bid.technicalScore / 100) * 40) * 100) / 100;
    const compositeScore = Math.round((financialScore + technicalScorePart) * 100) / 100;
    return {
      ...bid,
      financialScore,
      compositeScore,
      rank: 0
    };
  });

  // Sort descending by composite score
  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  scored.forEach((b, idx) => {
    b.rank = idx + 1;
  });

  return {
    bids: scored,
    recommendedWinnerId: scored[0].vendorId
  };
}
