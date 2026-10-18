/**
 * Bizora ERP - Centralized Financial Reconciliation & Math Service
 * 
 * Provides decimal-accurate, audit-safe financial math across all ERP modules:
 * - Sales, Returns, Discounts, Taxes
 * - Purchases, Supplier Returns, Payments
 * - Operating Expenses vs Supplier Payable Settlements
 * - Due Collections vs Non-Operating / Other Income
 * - Accurate COGS and Profit/Loss (Gross, Operating, Net)
 * - Cumulative Receivables and Payables (point-in-time Balance Sheet figures)
 * - Store-aware Multi-Tender Account Reconciliations
 * 
 * Strict Rule: Zero fictitious mock data or hardcoded percentages (e.g. 30% fallbacks).
 */

export interface TransactionLike {
  id: string;
  date?: string;
  type: string;
  amount: number;
  paymentMethod?: string;
  amountPaid?: number;
  dueAmount?: number;
  previousDue?: number;
  accountId?: string;
  storeId?: string;
  entityId?: string;
  entityName?: string;
  reference?: string;
  isDeleted?: boolean;
  profit?: number;
  cost?: number;
  cogs?: number;
  items?: {
    productId?: string;
    name?: string;
    qty?: number;
    price?: number;
    costPrice?: number;
    subtotal?: number;
  }[];
  details?: {
    subtotal?: number;
    tax?: number;
    discount?: number;
    delivery?: number;
    cost?: number;
    paymentSplits?: { method: string; amount: number; accountId?: string }[];
  };
  transferType?: 'In' | 'Out';
}

export interface ProductLike {
  id: string;
  name?: string;
  purchasePrice?: number;
  salePrice?: number;
  stock?: number;
  isDeleted?: boolean;
}

export interface EntityLike {
  id: string;
  name: string;
  type: 'Customer' | 'Supplier';
  walletBalance?: number;
  openingBalance?: number;
  currentDue?: number;
  isDeleted?: boolean;
}

export interface FinancialAccountLike {
  id: string;
  storeId?: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Mobile Wallet';
  balance: number;
  openingBalance?: number;
  accountNumber?: string;
  bankName?: string;
  isDefault?: boolean;
}

export interface DateFilterOptions {
  filterType?: 'today' | 'yesterday' | 'this_week' | 'month' | '3months' | 'year' | 'lifetime' | 'custom';
  customStart?: string;
  customEnd?: string;
  referenceDate?: Date;
}

export function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Computes exact start and end boundaries for a given date filter preset.
 * Ensures start is at 00:00:00.000 and end is at 23:59:59.999 local time.
 */
export function getDateFilterBounds(options: DateFilterOptions): { startDate: Date; endDate: Date } {
  const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const filterType = options.filterType || 'month';

  let start = new Date(0); // Epoch
  let end = new Date(now);

  if (filterType === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterType === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
    end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
  } else if (filterType === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterType === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterType === '3months') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterType === 'year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (filterType === 'custom' && options.customStart) {
    const sParts = options.customStart.split('-');
    if (sParts.length === 3) {
      start = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]), 0, 0, 0, 0);
    } else {
      start = new Date(options.customStart);
      start.setHours(0, 0, 0, 0);
    }
    if (options.customEnd) {
      const eParts = options.customEnd.split('-');
      if (eParts.length === 3) {
        end = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]), 23, 59, 59, 999);
      } else {
        end = new Date(options.customEnd);
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
  } else if (filterType === 'lifetime') {
    start = new Date(0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
}

/**
 * Filters transactions by date bounds and deletion status.
 */
export function filterTransactionsByDate<T extends TransactionLike>(
  transactions: T[],
  options: DateFilterOptions
): T[] {
  const { startDate, endDate } = getDateFilterBounds(options);
  const sTime = startDate.getTime();
  const eTime = endDate.getTime();

  return transactions.filter(t => {
    if (t.isDeleted || !t.date) return false;
    const tTime = new Date(t.date).getTime();
    if (isNaN(tTime)) return false;
    return tTime >= sTime && tTime <= eTime;
  });
}

/**
 * Calculates COGS for a single transaction without ever inventing numbers or using hardcoded % fallbacks.
 */
export function getTransactionCogs(tx: TransactionLike, products: ProductLike[] = []): number {
  if (tx.cogs != null && Number.isFinite(Number(tx.cogs))) {
    return Math.max(0, round2(Number(tx.cogs)));
  }
  if (tx.cost != null && Number.isFinite(Number(tx.cost))) {
    return Math.max(0, round2(Number(tx.cost)));
  }
  if (tx.profit != null && Number.isFinite(Number(tx.profit))) {
    return Math.max(0, round2(tx.amount - Number(tx.profit)));
  }
  if (tx.details?.cost != null && Number.isFinite(Number(tx.details.cost))) {
    return Math.max(0, round2(Number(tx.details.cost)));
  }
  if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
    let itemCogs = 0;
    for (const item of tx.items) {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = item.costPrice != null && Number.isFinite(Number(item.costPrice))
        ? Number(item.costPrice)
        : (prod && Number(prod.purchasePrice) > 0 ? Number(prod.purchasePrice) : 0);
      itemCogs += unitCost * (Number(item.qty) || 0);
    }
    return round2(itemCogs);
  }
  return 0;
}

export interface SalesMetrics {
  grossSales: number;
  salesReturns: number;
  netSales: number;
  cashSales: number;
  creditSales: number;
  taxesCollected: number;
  discountsGiven: number;
  deliveryCharges: number;
  salesCount: number;
  returnsCount: number;
}

export function computeSalesMetrics(transactions: TransactionLike[]): SalesMetrics {
  let grossSales = 0;
  let salesReturns = 0;
  let cashSales = 0;
  let creditSales = 0;
  let taxesCollected = 0;
  let discountsGiven = 0;
  let deliveryCharges = 0;
  let salesCount = 0;
  let returnsCount = 0;

  for (const t of transactions) {
    if (t.isDeleted) continue;
    const tax = Number(t.details?.tax) || 0;
    const discount = Number(t.details?.discount) || 0;
    const delivery = Number(t.details?.delivery) || 0;

    if (t.type === 'Sale') {
      salesCount++;
      grossSales += t.amount;
      taxesCollected += tax;
      discountsGiven += discount;
      deliveryCharges += delivery;

      if (t.paymentMethod === 'Due') {
        creditSales += t.amount;
      } else if (t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment') {
        const paid = Number(t.amountPaid) || 0;
        const due = t.dueAmount != null ? Number(t.dueAmount) : Math.max(0, t.amount - paid);
        cashSales += paid;
        creditSales += due;
      } else {
        cashSales += t.amount;
      }
    } else if (t.type === 'Sales Return') {
      returnsCount++;
      salesReturns += t.amount;
      taxesCollected -= tax;

      // Sales return reduces either cash returned or customer due
      if (['Cash', 'Bank', 'Mobile', 'Card', 'Partial'].includes(t.paymentMethod || '')) {
        cashSales -= t.amount;
      } else {
        creditSales -= t.amount;
      }
    }
  }

  const netSales = round2(grossSales - salesReturns);

  return {
    grossSales: round2(grossSales),
    salesReturns: round2(salesReturns),
    netSales,
    cashSales: round2(cashSales),
    creditSales: round2(creditSales),
    taxesCollected: round2(taxesCollected),
    discountsGiven: round2(discountsGiven),
    deliveryCharges: round2(deliveryCharges),
    salesCount,
    returnsCount,
  };
}

export interface PurchaseMetrics {
  grossPurchases: number;
  purchaseReturns: number;
  netPurchases: number;
  cashPurchases: number;
  creditPurchases: number;
  purchaseTaxPaid: number;
  purchaseCount: number;
  returnsCount: number;
}

export function computePurchaseMetrics(transactions: TransactionLike[]): PurchaseMetrics {
  let grossPurchases = 0;
  let purchaseReturns = 0;
  let cashPurchases = 0;
  let creditPurchases = 0;
  let purchaseTaxPaid = 0;
  let purchaseCount = 0;
  let returnsCount = 0;

  for (const t of transactions) {
    if (t.isDeleted) continue;
    const tax = Number(t.details?.tax) || 0;

    if (t.type === 'Purchase') {
      purchaseCount++;
      grossPurchases += t.amount;
      purchaseTaxPaid += tax;

      if (t.paymentMethod === 'Due') {
        creditPurchases += t.amount;
      } else if (t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment') {
        const paid = Number(t.amountPaid) || 0;
        const due = t.dueAmount != null ? Number(t.dueAmount) : Math.max(0, t.amount - paid);
        cashPurchases += paid;
        creditPurchases += due;
      } else {
        cashPurchases += t.amount;
      }
    } else if (t.type === 'Purchase Return') {
      returnsCount++;
      purchaseReturns += t.amount;
      purchaseTaxPaid -= tax;

      if (['Cash', 'Bank', 'Mobile', 'Card', 'Partial'].includes(t.paymentMethod || '')) {
        cashPurchases -= t.amount;
      } else {
        creditPurchases -= t.amount;
      }
    }
  }

  return {
    grossPurchases: round2(grossPurchases),
    purchaseReturns: round2(purchaseReturns),
    netPurchases: round2(grossPurchases - purchaseReturns),
    cashPurchases: round2(cashPurchases),
    creditPurchases: round2(creditPurchases),
    purchaseTaxPaid: round2(purchaseTaxPaid),
    purchaseCount,
    returnsCount,
  };
}

export interface ExpenseAndIncomeMetrics {
  operatingExpenses: number;
  salaryExpenses: number;
  supplierPayments: number;
  customerDueCollections: number;
  nonOperatingIncome: number;
}

export function computeExpenseAndIncome(
  transactions: TransactionLike[],
  customers: EntityLike[] = [],
  suppliers: EntityLike[] = []
): ExpenseAndIncomeMetrics {
  let operatingExpenses = 0;
  let salaryExpenses = 0;
  let supplierPayments = 0;
  let customerDueCollections = 0;
  let nonOperatingIncome = 0;

  const customerNameSet = new Set(
    customers.filter(c => !c.isDeleted).map(c => c.name.trim().toLowerCase())
  );
  const supplierNameSet = new Set(
    suppliers.filter(s => !s.isDeleted).map(s => s.name.trim().toLowerCase())
  );

  for (const t of transactions) {
    if (t.isDeleted) continue;
    const entityName = (t.entityName || '').trim().toLowerCase();
    const isKnownSupplier = supplierNameSet.has(entityName);
    const isKnownCustomer = customerNameSet.has(entityName);

    if (t.type === 'Expense') {
      // If payment is made specifically to a supplier against due, it is a liability settlement
      if (isKnownSupplier) {
        supplierPayments += t.amount;
      } else {
        operatingExpenses += t.amount;
      }
    } else if (t.type === 'Salary') {
      salaryExpenses += t.amount;
      operatingExpenses += t.amount;
    } else if (t.type === 'Supplier Payment') {
      supplierPayments += t.amount;
    } else if (t.type === 'Income') {
      // Differentiate customer collections from non-operating / owner capital income
      if (isKnownCustomer || (t.reference && t.reference.toLowerCase().includes('due'))) {
        customerDueCollections += t.amount;
      } else {
        nonOperatingIncome += t.amount;
      }
    }
  }

  return {
    operatingExpenses: round2(operatingExpenses),
    salaryExpenses: round2(salaryExpenses),
    supplierPayments: round2(supplierPayments),
    customerDueCollections: round2(customerDueCollections),
    nonOperatingIncome: round2(nonOperatingIncome),
  };
}

export interface ProfitAndLossSummary {
  grossSales: number;
  salesReturns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  operatingProfit: number;
  nonOperatingIncome: number;
  netProfit: number;
  netMarginPercent: number;
}

export function computeProfitAndLoss(
  transactions: TransactionLike[],
  products: ProductLike[] = [],
  customers: EntityLike[] = [],
  suppliers: EntityLike[] = []
): ProfitAndLossSummary {
  const sales = computeSalesMetrics(transactions);
  const expInc = computeExpenseAndIncome(transactions, customers, suppliers);

  let cogs = 0;
  for (const t of transactions) {
    if (t.isDeleted) continue;
    if (t.type === 'Sale') {
      cogs += getTransactionCogs(t, products);
    } else if (t.type === 'Sales Return') {
      cogs -= getTransactionCogs(t, products);
    }
  }

  cogs = round2(Math.max(0, cogs));
  const grossProfit = round2(sales.netSales - cogs);
  const grossMarginPercent = sales.netSales > 0 ? round2((grossProfit / sales.netSales) * 100) : 0;
  const operatingProfit = round2(grossProfit - expInc.operatingExpenses);
  const netProfit = round2(operatingProfit + expInc.nonOperatingIncome);
  const netMarginPercent = sales.netSales > 0 ? round2((netProfit / sales.netSales) * 100) : 0;

  return {
    grossSales: sales.grossSales,
    salesReturns: sales.salesReturns,
    netSales: sales.netSales,
    cogs,
    grossProfit,
    grossMarginPercent,
    operatingExpenses: expInc.operatingExpenses,
    operatingProfit,
    nonOperatingIncome: expInc.nonOperatingIncome,
    netProfit,
    netMarginPercent,
  };
}

export interface CumulativeDuesSummary {
  totalCustomerReceivables: number;
  totalSupplierPayables: number;
  customerCountWithDue: number;
  supplierCountWithDue: number;
  customerBalances: Record<string, number>;
  supplierBalances: Record<string, number>;
}

/**
 * Computes exact cumulative receivables and payables across all historical transactions.
 * Never distorted by period date filter windows.
 */
export function computeCumulativeDues(
  allTransactions: TransactionLike[],
  customers: EntityLike[] = [],
  suppliers: EntityLike[] = []
): CumulativeDuesSummary {
  const customerBalances: Record<string, number> = {};
  const supplierBalances: Record<string, number> = {};

  // Initialize from entity opening balance if present
  for (const c of customers) {
    if (c.isDeleted) continue;
    if (c.openingBalance) {
      customerBalances[c.name] = (customerBalances[c.name] || 0) + Number(c.openingBalance);
    }
  }

  for (const s of suppliers) {
    if (s.isDeleted) continue;
    if (s.openingBalance) {
      supplierBalances[s.name] = (supplierBalances[s.name] || 0) + Number(s.openingBalance);
    }
  }

  const customerNameSet = new Set(
    customers.filter(c => !c.isDeleted).map(c => c.name.trim().toLowerCase())
  );
  const supplierNameSet = new Set(
    suppliers.filter(s => !s.isDeleted).map(s => s.name.trim().toLowerCase())
  );

  for (const t of allTransactions) {
    if (t.isDeleted) continue;
    const name = (t.entityName || '').trim();
    if (!name) continue;
    const lowerName = name.toLowerCase();

    // Customer Receivables Flow
    if (t.type === 'Sale') {
      if (t.paymentMethod === 'Due') {
        customerBalances[name] = (customerBalances[name] || 0) + t.amount;
      } else if ((t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment') && t.dueAmount) {
        customerBalances[name] = (customerBalances[name] || 0) + Number(t.dueAmount);
      }
    } else if (t.type === 'Due') {
      customerBalances[name] = (customerBalances[name] || 0) + t.amount;
    } else if (t.type === 'Sales Return') {
      // Returns reduce customer balance unless refunded in cash
      if (!['Cash', 'Bank', 'Mobile', 'Card'].includes(t.paymentMethod || '')) {
        customerBalances[name] = (customerBalances[name] || 0) - t.amount;
      }
    } else if (t.type === 'Income') {
      // Due collections reduce customer balance
      if (customerNameSet.has(lowerName) || (t.reference && t.reference.toLowerCase().includes('due'))) {
        customerBalances[name] = (customerBalances[name] || 0) - t.amount;
      }
    }

    // Supplier Payables Flow
    if (t.type === 'Purchase') {
      if (t.paymentMethod === 'Due') {
        supplierBalances[name] = (supplierBalances[name] || 0) + t.amount;
      } else if ((t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment') && t.dueAmount) {
        supplierBalances[name] = (supplierBalances[name] || 0) + Number(t.dueAmount);
      }
    } else if (t.type === 'Purchase Return') {
      if (!['Cash', 'Bank', 'Mobile', 'Card'].includes(t.paymentMethod || '')) {
        supplierBalances[name] = (supplierBalances[name] || 0) - t.amount;
      }
    } else if (t.type === 'Supplier Payment') {
      supplierBalances[name] = (supplierBalances[name] || 0) - t.amount;
    } else if (t.type === 'Expense' && supplierNameSet.has(lowerName)) {
      if (t.paymentMethod === 'Due') {
        supplierBalances[name] = (supplierBalances[name] || 0) + t.amount;
      } else {
        supplierBalances[name] = (supplierBalances[name] || 0) - t.amount;
      }
    }
  }

  let totalCustomerReceivables = 0;
  let customerCountWithDue = 0;
  for (const bal of Object.values(customerBalances)) {
    if (bal > 0.009) {
      totalCustomerReceivables += bal;
      customerCountWithDue++;
    }
  }

  let totalSupplierPayables = 0;
  let supplierCountWithDue = 0;
  for (const bal of Object.values(supplierBalances)) {
    if (bal > 0.009) {
      totalSupplierPayables += bal;
      supplierCountWithDue++;
    }
  }

  return {
    totalCustomerReceivables: round2(totalCustomerReceivables),
    totalSupplierPayables: round2(totalSupplierPayables),
    customerCountWithDue,
    supplierCountWithDue,
    customerBalances,
    supplierBalances,
  };
}

export interface ReconciledAccountState extends FinancialAccountLike {
  netInflow: number;
  netOutflow: number;
  calculatedBalance: number;
  transactionCount: number;
}

export interface AccountsReconciliationSummary {
  accounts: ReconciledAccountState[];
  totalCash: number;
  totalBank: number;
  totalMobile: number;
  totalLiquidity: number;
}

/**
 * Multi-store safe account balance reconciliation.
 * Resolves split tenders, direct accountId, and fallback tenders.
 */
export function reconcileAccountBalances(
  accounts: FinancialAccountLike[],
  allTransactions: TransactionLike[],
  options?: { storeScope?: string }
): AccountsReconciliationSummary {
  const resolvedAccounts: ReconciledAccountState[] = accounts.map(account => {
    let inflow = 0;
    let outflow = 0;
    let count = 0;

    for (const tx of allTransactions) {
      if (tx.isDeleted) continue;

      // Multi-store safety:
      // If account has an explicit storeId, only transactions from that store affect it.
      // If account has no storeId, it is a business-wide account (e.g. primary corporate bank).
      if (account.storeId && tx.storeId && tx.storeId !== account.storeId) {
        continue;
      }

      // Check payment splits first
      const splits = tx.details?.paymentSplits;
      if (splits && Array.isArray(splits) && splits.length > 0) {
        for (const split of splits) {
          if (split.method === 'Due' || split.method === 'Installment') continue;

          // Target account matching
          const matchesAccount = split.accountId
            ? split.accountId === account.id
            : resolveAccountForMethod(split.method, accounts) === account.id;

          if (matchesAccount) {
            count++;
            const sign = getTransactionSign(tx.type, tx.transferType);
            if (sign > 0) inflow += split.amount;
            else if (sign < 0) outflow += split.amount;
          }
        }
      } else {
        // Direct single tender
        if (tx.paymentMethod === 'Due' || tx.paymentMethod === 'Installment') continue;

        const targetAccId = tx.accountId || resolveAccountForMethod(tx.paymentMethod, accounts);
        if (targetAccId === account.id) {
          const sign = getTransactionSign(tx.type, tx.transferType);
          if (sign !== 0) {
            count++;
            const effectiveAmount = tx.amountPaid != null && tx.amountPaid > 0 ? tx.amountPaid : tx.amount;
            if (sign > 0) inflow += effectiveAmount;
            else if (sign < 0) outflow += effectiveAmount;
          }
        }
      }
    }

    const calculatedBalance = round2((account.openingBalance || 0) + inflow - outflow);

    return {
      ...account,
      netInflow: round2(inflow),
      netOutflow: round2(outflow),
      calculatedBalance,
      transactionCount: count,
    };
  });

  // If a storeScope filter was requested for the view, filter the returned accounts
  const visibleAccounts = options?.storeScope && options.storeScope !== 'ALL'
    ? resolvedAccounts.filter(a => !a.storeId || a.storeId === options.storeScope)
    : resolvedAccounts;

  const totalCash = round2(visibleAccounts.filter(a => a.type === 'Cash').reduce((s, a) => s + a.calculatedBalance, 0));
  const totalBank = round2(visibleAccounts.filter(a => a.type === 'Bank').reduce((s, a) => s + a.calculatedBalance, 0));
  const totalMobile = round2(visibleAccounts.filter(a => a.type === 'Mobile Wallet').reduce((s, a) => s + a.calculatedBalance, 0));

  return {
    accounts: resolvedAccounts,
    totalCash,
    totalBank,
    totalMobile,
    totalLiquidity: round2(totalCash + totalBank + totalMobile),
  };
}

function getTransactionSign(type: string, transferType?: 'In' | 'Out'): number {
  if (['Sale', 'Income', 'Purchase Return'].includes(type)) return 1;
  if (['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(type)) return -1;
  if (type === 'Transfer') return transferType === 'In' ? 1 : -1;
  return 0;
}

function resolveAccountForMethod(method?: string, accounts: FinancialAccountLike[] = []): string | undefined {
  if (!method) return accounts.find(a => a.type === 'Cash')?.id;
  const lower = method.toLowerCase();
  if (lower.includes('bank') || lower.includes('card') || lower.includes('online')) {
    return accounts.find(a => a.type === 'Bank')?.id || accounts[0]?.id;
  }
  if (lower.includes('mobile') || lower.includes('wallet') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('rocket')) {
    return accounts.find(a => a.type === 'Mobile Wallet')?.id || accounts[0]?.id;
  }
  return accounts.find(a => a.type === 'Cash')?.id || accounts[0]?.id;
}

