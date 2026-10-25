import React, { useState, useMemo, useEffect } from 'react';
import { buildVatSummary, vatSummaryToCsv } from '@shared/lib/vatReport';
import { 
  filterTransactionsByDate,
  computeSalesMetrics,
  computePurchaseMetrics,
  computeExpenseAndIncome,
  computeProfitAndLoss,
  computeCumulativeDues,
  getTransactionCogs,
  round2,
  type TransactionLike,
  type ProductLike,
  type EntityLike
} from '@shared/lib/financialReconciliation';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useData, LedgerEntry } from '../contexts/DataContext';
import { 
  BarChart2, Calendar, TrendingUp, TrendingDown, DollarSign, Download, 
  PieChart, Users, ShoppingBag, FileText, Scale, Landmark, Tag, 
  LineChart, Lightbulb, ArrowUpRight, ArrowDownRight, Layers, ArrowRightLeft,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, Building2
} from 'lucide-react';
import { 
  SalesTrendChart, ExpenseBreakdownChart, TopProductsChart, CustomerGrowthChart 
} from './AnalyticsCharts';
import { useNavigate, useSearchParams } from 'react-router-dom';

const BusinessReports: React.FC = () => {
  const { t, currencySymbol, formatMoney, language } = useSettings();
  const { hasFeature, user } = useAuth();
  const { transactions, financialAccounts, products, suppliers, staff, customers, journalEntries, journalTrialBalance } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab && ['overview', 'tax', 'financial', 'profit', 'performance', 'trends', 'insights', 'accounting'].includes(queryTab)) 
    ? (queryTab as any) 
    : 'overview';
      
  const [activeReport, setActiveReport] = useState<'overview' | 'tax' | 'financial' | 'profit' | 'performance' | 'trends' | 'insights' | 'accounting'>(initialTab);
  
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && ['overview', 'tax', 'financial', 'profit', 'performance', 'trends', 'insights', 'accounting'].includes(currentTab)) {
      setActiveReport(currentTab as any);
    }
  }, [searchParams]);

  const [filterType, setFilterType] = useState<'today' | 'this_week' | 'month' | '3months' | 'year' | 'lifetime' | 'custom'>('month');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  // Filter Transactions with accurate 00:00:00 to 23:59:59.999 boundaries
  const filteredTransactions = useMemo(() => {
    return filterTransactionsByDate(transactions as any, {
      filterType,
      customStart: customDate.start,
      customEnd: customDate.end
    });
  }, [transactions, filterType, customDate]);

  const businessTaxRate = useMemo(() => {
    const b = user?.businesses?.find((x: any) => x && x.name === user.businessName) || user?.businesses?.[0];
    return Number(b?.settings?.taxRate) || 0;
  }, [user]);

  const vatSummary = useMemo(
    () => buildVatSummary(filteredTransactions as any),
    [filteredTransactions]
  );

  // Centralized Financial Calculations for the selected period
  const salesMetrics = useMemo(() => {
    return computeSalesMetrics(filteredTransactions as any);
  }, [filteredTransactions]);

  const purchaseMetrics = useMemo(() => {
    return computePurchaseMetrics(filteredTransactions as any);
  }, [filteredTransactions]);

  const expIncMetrics = useMemo(() => {
    return computeExpenseAndIncome(filteredTransactions as any, customers as any, suppliers as any);
  }, [filteredTransactions, customers, suppliers]);

  const pnlSummary = useMemo(() => {
    return computeProfitAndLoss(filteredTransactions as any, products as any, customers as any, suppliers as any);
  }, [filteredTransactions, products, customers, suppliers]);

  // Point-in-time Cumulative Dues across ALL historical non-deleted transactions
  const cumulativeDues = useMemo(() => {
    return computeCumulativeDues(transactions as any, customers as any, suppliers as any);
  }, [transactions, customers, suppliers]);

  // Financial Statement Metrics (Balance Sheet)
  const financialStatement = useMemo(() => {
    // Assets
    const cashBank = financialAccounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
    const inventoryVal = products
      .filter(p => !p.isDeleted)
      .reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.purchasePrice) || 0)), 0);
    
    // Balance Sheet Accounts Receivable is cumulative outstanding customer dues across all history
    const accountsReceivable = cumulativeDues.totalCustomerReceivables;
    
    // Liabilities
    const accountsPayable = cumulativeDues.totalSupplierPayables;
    // Unredeemed store credit is a liability until spent
    const storeCreditLiability = customers
      .filter((c) => !c.isDeleted)
      .reduce((s, c) => s + (Number(c.walletBalance) || 0), 0);
    
    const storeCreditHolders = customers
      .filter((c) => !c.isDeleted && (Number(c.walletBalance) || 0) > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        balance: Number(c.walletBalance) || 0,
      }))
      .sort((a, b) => b.balance - a.balance);

    // Equity
    const totalAssets = round2(cashBank + inventoryVal + accountsReceivable);
    const totalLiabilities = round2(accountsPayable + storeCreditLiability);
    const equity = round2(totalAssets - totalLiabilities);

    return {
      cashBank: round2(cashBank),
      inventoryVal: round2(inventoryVal),
      accountsReceivable,
      accountsPayable,
      storeCreditLiability: round2(storeCreditLiability),
      storeCreditHolders,
      totalAssets,
      totalLiabilities,
      equity,
    };
  }, [financialAccounts, products, cumulativeDues, customers]);

  const exportStoreCreditCsv = () => {
    const rows = financialStatement.storeCreditHolders;
    const esc = (v: any) => {
      const s = v === undefined || v === null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      ['CustomerId', 'Name', 'WalletBalance'].join(','),
      ...rows.map((h) => [esc(h.id), esc(h.name), esc(h.balance.toFixed(2))].join(',')),
      ['', 'TOTAL', esc(financialStatement.storeCreditLiability.toFixed(2))].join(','),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-credit-liability-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trial Balance: Prefer posted double-entry journal when entries exist; else derive from reconciled ops data
  const trialBalance = useMemo(() => {
    const fromJournal = journalEntries?.length
      ? (typeof journalTrialBalance === 'function' ? journalTrialBalance() : [])
      : [];
    if (fromJournal.length > 0) {
      const rows = fromJournal.map((r: any) => ({
        account: `${r.code} ${r.name}`,
        debit: r.debit,
        credit: r.credit,
      }));
      const totalDebits = rows.reduce((s: number, r: any) => s + r.debit, 0);
      const totalCredits = rows.reduce((s: number, r: any) => s + r.credit, 0);
      return { rows, totalDebits: round2(totalDebits), totalCredits: round2(totalCredits), source: 'journal' as const };
    }
    
    const rows = [
      { account: 'Cash & Bank Equivalents', debit: financialStatement.cashBank, credit: 0 },
      { account: 'Accounts Receivable', debit: financialStatement.accountsReceivable, credit: 0 },
      { account: 'Merchandise Inventory', debit: financialStatement.inventoryVal, credit: 0 },
      { account: 'Cost of Goods Sold (COGS)', debit: pnlSummary.cogs, credit: 0 },
      { account: 'Operating Expenses', debit: expIncMetrics.operatingExpenses, credit: 0 },
      { account: 'Accounts Payable', debit: 0, credit: financialStatement.accountsPayable },
      { account: 'Store Credit Liability', debit: 0, credit: financialStatement.storeCreditLiability },
      { account: 'Sales Revenue (Net)', debit: 0, credit: pnlSummary.netSales },
      { account: 'Non-Operating Other Income', debit: 0, credit: expIncMetrics.nonOperatingIncome },
    ];
    const totalDebits = rows.reduce((sum, r) => sum + r.debit, 0);
    const knownCredits = rows.reduce((sum, r) => sum + r.credit, 0);
    const retainedEarningsPlug = round2(totalDebits - knownCredits);
    rows.push({ account: "Retained Earnings / Owner's Equity", debit: 0, credit: retainedEarningsPlug });
    const totalCredits = round2(knownCredits + retainedEarningsPlug);
    return { rows, totalDebits: round2(totalDebits), totalCredits, source: 'derived' as const };
  }, [financialStatement, pnlSummary, expIncMetrics, journalEntries, journalTrialBalance]);

  // Product Profitability Analysis
  const productPerformance = useMemo(() => {
    const stats: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'Sale' && t.items) {
        t.items.forEach(item => {
          const prod = (products || []).find((p: any) => p.id === item.productId);
          const unitCost = (item as any).costPrice != null && Number.isFinite(Number((item as any).costPrice))
            ? Number((item as any).costPrice)
            : (prod && Number(prod.purchasePrice) > 0 ? Number(prod.purchasePrice) : 0);
          
          if (!stats[item.productId || item.name]) {
            stats[item.productId || item.name] = { 
              name: item.name || 'Unknown Item', 
              qty: 0, 
              revenue: 0, 
              cost: 0 
            };
          }
          
          stats[item.productId || item.name].qty += Number(item.qty) || 0;
          stats[item.productId || item.name].revenue += ((Number(item.qty) || 0) * (Number(item.price) || 0));
          stats[item.productId || item.name].cost += ((Number(item.qty) || 0) * unitCost);
        });
      }
    });

    return Object.values(stats).map(s => {
      const profit = round2(s.revenue - s.cost);
      const margin = s.revenue > 0 ? round2((profit / s.revenue) * 100) : 0;
      return {
        ...s,
        revenue: round2(s.revenue),
        cost: round2(s.cost),
        profit,
        margin
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [filteredTransactions, products]);

  // Best of Lists
  const getBest = (type: 'Customer' | 'Supplier' | 'Salesman') => {
    const counts: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (type === 'Customer' && t.type === 'Sale') {
        counts[t.entityName] = (counts[t.entityName] || 0) + t.amount;
      }
      if (type === 'Supplier' && t.type === 'Purchase') {
        counts[t.entityName] = (counts[t.entityName] || 0) + t.amount;
      }
      if (type === 'Salesman' && t.type === 'Sale') {
        const salesman = t.salesperson || t.createdBy;
        if (salesman) {
          counts[salesman] = (counts[salesman] || 0) + t.amount;
        }
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0] : ['None', 0];
  };

  const bestCustomer = getBest('Customer');
  const bestSupplier = getBest('Supplier');
  const bestSalesman = getBest('Salesman');

  // Chart Data Preparation
  const salesTrendData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'Sale' && !t.isDeleted && t.date) {
        const dStr = t.date.split('T')[0];
        data[dStr] = (data[dStr] || 0) + t.amount;
      }
    });
    
    return Object.entries(data)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, amount]) => ({ date, amount: round2(amount) }));
  }, [filteredTransactions]);

  const expenseBreakdownData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if ((t.type === 'Expense' || t.type === 'Salary') && !t.isDeleted) {
        const category = t.reference || t.entityName || (t.type === 'Salary' ? 'Payroll' : 'General'); 
        data[category] = (data[category] || 0) + t.amount;
      }
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value: round2(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTransactions]);

  const topProductsData = useMemo(() => {
    return productPerformance
      .slice(0, 10)
      .map(p => ({ name: p.name, value: p.revenue }));
  }, [productPerformance]);

  const customerGrowthData = useMemo(() => {
    const customerStartDates: Record<string, string> = {};
    
    transactions.forEach(t => {
      if (t.type === 'Sale' && t.entityId && !customerStartDates[t.entityId] && t.date) {
        customerStartDates[t.entityId] = t.date.split('T')[0];
      }
    });

    const growth: Record<string, { new: number, total: number }> = {};
    let runningTotal = 0;

    const allDates = Array.from(new Set(Object.values(customerStartDates))).sort();
    
    allDates.forEach(date => {
      const newCount = Object.values(customerStartDates).filter(d => d === date).length;
      runningTotal += newCount;
      growth[date] = { new: newCount, total: runningTotal };
    });

    return Object.entries(growth)
      .map(([date, val]) => ({ date, newCustomers: val.new, totalCustomers: val.total }));
  }, [transactions]);

  // Genuine previous-period comparison
  const previousPeriodSales = useMemo(() => {
    if (filterType === 'lifetime') return null;
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (filterType === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (filterType === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      startDate = new Date(startOfThisWeek);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(startOfThisWeek);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (filterType === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filterType === '3months') {
      endDate = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59, 999);
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1, 0, 0, 0, 0);
    } else if (filterType === 'year') {
      startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (filterType === 'custom' && customDate.start && customDate.end) {
      const curStart = new Date(customDate.start);
      const curEnd = new Date(customDate.end);
      if (isNaN(curStart.getTime()) || isNaN(curEnd.getTime())) return null;
      const lengthMs = curEnd.getTime() - curStart.getTime();
      endDate = new Date(curStart.getTime() - 1);
      startDate = new Date(curStart.getTime() - lengthMs);
    } else {
      return null;
    }

    const sTime = startDate.getTime();
    const eTime = endDate.getTime();

    return transactions
      .filter(t => {
        if (t.isDeleted || !t.date || t.type !== 'Sale') return false;
        const tDate = new Date(t.date).getTime();
        return !isNaN(tDate) && tDate >= sTime && tDate <= eTime;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions, filterType, customDate]);

  const insights = useMemo(() => {
    const list: { type: 'positive' | 'negative' | 'neutral', text: string }[] = [];
    
    const currentSales = pnlSummary.netSales;
    if (previousPeriodSales === null) {
      list.push({ 
        type: 'neutral', 
        text: `Net sales in this period: ${formatMoney(currentSales)}. Select a specific range (e.g. This Month or Year) to compare against earlier periods.` 
      });
    } else if (previousPeriodSales === 0) {
      list.push({ 
        type: 'neutral', 
        text: `No sales recorded in the comparison period. Sales for current period stand at ${formatMoney(currentSales)}.` 
      });
    } else {
      const growth = ((currentSales - previousPeriodSales) / previousPeriodSales) * 100;
      if (growth > 0) list.push({ type: 'positive', text: `Net sales increased by ${growth.toFixed(1)}% compared to the prior period.` });
      else if (growth < 0) list.push({ type: 'negative', text: `Net sales decreased by ${Math.abs(growth).toFixed(1)}% compared to the prior period.` });
      else list.push({ type: 'neutral', text: `Sales remained flat compared to the prior period.` });
    }

    // Margin Analysis
    const avgMargin = productPerformance.length > 0
      ? productPerformance.reduce((acc, p) => acc + p.margin, 0) / productPerformance.length
      : 0;
    if (avgMargin < 15 && productPerformance.length > 0) {
      list.push({ type: 'negative', text: `Average product margin is low (${avgMargin.toFixed(1)}%). Consider reviewing supplier pricing and markups.` });
    } else if (avgMargin >= 15) {
      list.push({ type: 'positive', text: `Average gross product margin is healthy at ${avgMargin.toFixed(1)}%.` });
    }

    // Dead Stock Check
    const activeSoldProducts = new Set(productPerformance.map(p => p.name));
    const deadStockCount = products.filter(p => !p.isDeleted && Number(p.stock) > 0 && !activeSoldProducts.has(p.name)).length;
    if (deadStockCount > 0) {
      list.push({ type: 'neutral', text: `${deadStockCount} stocked product(s) had zero sales during this reporting window.` });
    }

    return list;
  }, [pnlSummary, productPerformance, products, previousPeriodSales, formatMoney]);

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Entity', 'Amount', 'Payment Method', 'Reference'];
    const rows = filteredTransactions.map(t => [
      t.date || '', t.type, t.entityName, t.amount, t.paymentMethod || '', t.reference || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bizora_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-5 rounded-2xl shadow-2xs border border-slate-200/80 gap-4 w-full min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-2xs">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{t('Business Report')}</h1>
            <p className="text-xs text-slate-500 font-medium">Reconciled Financial Health, Profit & Loss & Compliance</p>
          </div>
        </div>
        
        {/* Module Sub-Tabs */}
        <div className="w-full md:w-auto max-w-full min-w-0 overflow-hidden">
          <div className="flex bg-slate-100/90 p-1 rounded-xl overflow-x-auto flex-nowrap gap-1 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'trends', label: 'Trends & Growth' },
              { id: 'profit', label: 'Product Margins' },
              { id: 'financial', label: 'Financials' },
              { id: 'tax', label: 'Tax & VAT' },
              { id: 'performance', label: 'Performance' },
              { id: 'insights', label: 'Insights' },
              { id: 'accounting', label: 'Trial Balance' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'trends' && !hasFeature('Advanced Analytics')) {
                    alert('Please upgrade your plan to access Trends & Growth.');
                    return;
                  }
                  if (tab.id === 'tax' && !hasFeature('Automated Tax Reports')) {
                    alert('Please upgrade your plan to access Tax & VAT.');
                    return;
                  }
                  setActiveReport(tab.id as any);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  activeReport === tab.id 
                    ? 'bg-white shadow-xs text-indigo-600' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Filters & Export Toolbar */}
      <div className="flex flex-wrap gap-2.5 justify-between items-center bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          <span>Export CSV</span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: '3months', label: '3 Months' },
            { id: 'year', label: 'This Year' },
            { id: 'lifetime', label: 'All Time' },
            { id: 'custom', label: 'Custom' }
          ].map(f => (
            <button 
              key={f.id} 
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === f.id 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filterType === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-4 items-center justify-end animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Start:</label>
            <input 
              type="date" 
              className="input-modern py-1 text-xs" 
              value={customDate.start}
              onChange={e => setCustomDate({...customDate, start: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">End:</label>
            <input 
              type="date" 
              className="input-modern py-1 text-xs" 
              value={customDate.end}
              onChange={e => setCustomDate({...customDate, end: e.target.value})} 
            />
          </div>
        </div>
      )}

      {/* --- OVERVIEW TAB --- */}
      {activeReport === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div 
              onClick={() => navigate('/sale-ledger')}
              className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                  Net Sales
                </p>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">
                {formatMoney(pnlSummary.netSales)}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Cash: {formatMoney(salesMetrics.cashSales)} · Due: {formatMoney(salesMetrics.creditSales)}
              </p>
            </div>

            <div 
              onClick={() => navigate('/expense-ledger')}
              className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-600 transition-colors">
                  Operating Expenses
                </p>
                <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatMoney(expIncMetrics.operatingExpenses)}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Salaries: {formatMoney(expIncMetrics.salaryExpenses)}
              </p>
            </div>

            <div 
              onClick={() => navigate('/due-ledger')}
              className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                  Accounts Receivable
                </p>
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-amber-600 tracking-tight">
                {formatMoney(financialStatement.accountsReceivable)}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {cumulativeDues.customerCountWithDue} customer(s) with balance
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-2xl p-4 lg:p-5 text-white shadow-md shadow-indigo-500/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-indigo-200 text-[11px] font-black uppercase tracking-wider">
                  Net Profit
                </p>
                <span className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-black tracking-tight">
                {formatMoney(pnlSummary.netProfit)}
              </h3>
              <p className="text-[11px] text-indigo-200 font-medium mt-1">
                Margin: {pnlSummary.netMarginPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Capital & Cashflow Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 p-5 lg:p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Capital & Liquidity Health</span>
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Liquid Balances (Cash & Bank)</span>
                  <span className="font-extrabold text-slate-800">{formatMoney(financialStatement.cashBank)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Supplier Due (Accounts Payable)</span>
                  <span className="font-extrabold text-rose-600">{formatMoney(financialStatement.accountsPayable)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Supplier Payments Made in Period</span>
                  <span className="font-extrabold text-slate-800">{formatMoney(expIncMetrics.supplierPayments)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600 font-medium">Total Inventory Asset Valuation</span>
                  <span className="font-extrabold text-emerald-600">{formatMoney(financialStatement.inventoryVal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 p-5 lg:p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-500" />
                <span>Performance Highlights</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Customer</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{bestCustomer[0]}</p>
                    <p className="text-xs text-emerald-600 font-semibold">Volume: {formatMoney(Number(bestCustomer[1]))}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Supplier</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{bestSupplier[0]}</p>
                    <p className="text-xs text-blue-600 font-semibold">Volume: {formatMoney(Number(bestSupplier[1]))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FINANCIAL STATEMENTS TAB (BALANCE SHEET & P&L) --- */}
      {activeReport === 'financial' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
              <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>Balance Sheet</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Point-In-Time Cumulative
                </span>
              </div>
              
              <div className="p-5 lg:p-6 space-y-6">
                {/* Assets */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-3 border-b border-emerald-100 pb-1.5 flex items-center justify-between">
                    <span>Assets</span>
                    <span className="text-[10px] font-normal text-slate-400">Current & Fixed</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cash & Bank Equivalents</span>
                      <span className="font-mono font-bold text-slate-800">{formatMoney(financialStatement.cashBank)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Inventory Valuation (Stock)</span>
                      <span className="font-mono font-bold text-slate-800">{formatMoney(financialStatement.inventoryVal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Accounts Receivable (Total Customer Dues)</span>
                      <span className="font-mono font-bold text-slate-800">{formatMoney(financialStatement.accountsReceivable)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold border-t border-slate-100 pt-2.5 mt-2">
                      <span className="text-slate-900">Total Assets</span>
                      <span className="text-emerald-600 font-mono text-base">{formatMoney(financialStatement.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div>
                  <h4 className="text-xs font-bold text-rose-700 uppercase mb-3 border-b border-rose-100 pb-1.5 flex items-center justify-between">
                    <span>Liabilities</span>
                    <span className="text-[10px] font-normal text-slate-400">Current Obligations</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Accounts Payable (Supplier Dues)</span>
                      <span className="font-mono font-bold text-slate-800">{formatMoney(financialStatement.accountsPayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Customer Store Credit Liability</span>
                      <span className="font-mono font-bold text-amber-700">{formatMoney(financialStatement.storeCreditLiability)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold border-t border-slate-100 pt-2.5 mt-2">
                      <span className="text-slate-900">Total Liabilities</span>
                      <span className="text-rose-600 font-mono text-base">{formatMoney(financialStatement.totalLiabilities)}</span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">Owner's Equity</span>
                      <p className="text-[10px] text-slate-500">Total Assets minus Total Liabilities</p>
                    </div>
                    <span className="font-black text-indigo-700 text-lg font-mono">
                      {formatMoney(financialStatement.equity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Statement / P&L */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
              <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-orange-600" />
                  <span>Income Statement (P&L)</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Selected Period
                </span>
              </div>

              <div className="p-5 lg:p-6 space-y-6 text-sm">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-100 pb-1.5">
                    Trading Revenue
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Gross Sales</span>
                      <span className="font-mono">{formatMoney(pnlSummary.grossSales)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Sales Returns / Refunds</span>
                      <span className="font-mono text-rose-500">-{formatMoney(pnlSummary.salesReturns)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-100 pt-1.5 text-slate-800">
                      <span>Net Sales</span>
                      <span className="font-mono">{formatMoney(pnlSummary.netSales)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cost of Goods Sold (COGS)</span>
                      <span className="font-mono text-rose-500">-{formatMoney(pnlSummary.cogs)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-indigo-700 border-t border-slate-100 pt-2">
                      <span>Gross Profit</span>
                      <span className="font-mono text-base">{formatMoney(pnlSummary.grossProfit)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-100 pb-1.5">
                    Operating Overhead
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Operating Expenses</span>
                      <span className="font-mono text-rose-600">-{formatMoney(expIncMetrics.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-100 pt-1.5 text-slate-800">
                      <span>Operating Profit</span>
                      <span className="font-mono">{formatMoney(pnlSummary.operatingProfit)}</span>
                    </div>
                    {expIncMetrics.nonOperatingIncome > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Non-Operating Other Income</span>
                        <span className="font-mono">+{formatMoney(expIncMetrics.nonOperatingIncome)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-emerald-900 text-base">Net Profit</span>
                    <p className="text-[10px] text-emerald-700">Net Margin: {pnlSummary.netMarginPercent.toFixed(1)}%</p>
                  </div>
                  <span className="font-black text-emerald-700 text-xl font-mono">
                    {formatMoney(pnlSummary.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRODUCT MARGINS TAB --- */}
      {activeReport === 'profit' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Product Profitability Analysis</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Real margin per product calculated from unit sale price vs cost</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Period Profit</p>
                <p className="text-lg font-black text-emerald-600 font-mono">
                  {formatMoney(productPerformance.reduce((acc, p) => acc + p.profit, 0))}
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th className="text-center">Units Sold</th>
                    <th className="text-right">Total Revenue</th>
                    <th className="text-right">Total Cost</th>
                    <th className="text-right">Gross Profit</th>
                    <th className="text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {productPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No sales transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    productPerformance.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="font-bold text-xs text-slate-800">{p.name}</td>
                        <td className="text-center font-bold text-xs">{p.qty}</td>
                        <td className="text-right text-xs font-mono text-slate-700">{formatMoney(p.revenue)}</td>
                        <td className="text-right text-xs font-mono text-slate-500">{formatMoney(p.cost)}</td>
                        <td className={`text-right text-xs font-mono font-extrabold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatMoney(p.profit)}
                        </td>
                        <td className="text-right">
                          <span className={`badge-modern ${p.margin >= 25 ? 'badge-emerald' : p.margin > 10 ? 'badge-amber' : 'badge-rose'}`}>
                            {p.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAX & VAT TAB --- */}
      {activeReport === 'tax' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>{language === 'bn' ? 'VAT ও ট্যাক্স রিপোর্ট' : 'VAT & Tax Compliance Summary'}</span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Default Business Tax Rate: {businessTaxRate}% · Period: {filterType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {language === 'bn' ? 'নেট প্রদেয় ট্যাক্স' : 'Net Tax Payable'}
              </p>
              <p className={`text-2xl font-black font-mono ${vatSummary.netPayable > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatMoney(vatSummary.netPayable)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="font-bold text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">
                Output VAT (Collected on Sales)
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Taxable Sales (Net)</span>
                  <span className="font-mono font-bold text-slate-800">{formatMoney(vatSummary.taxableSales)}</span>
                </div>
                <div className="flex justify-between bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
                  <span className="text-indigo-900 font-bold">Net Output VAT</span>
                  <span className="font-mono font-black text-indigo-700">{formatMoney(vatSummary.netOutputTax)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="font-bold text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">
                Input VAT (Paid on Purchases)
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Taxable Purchases (Net)</span>
                  <span className="font-mono font-bold text-slate-800">{formatMoney(vatSummary.taxablePurchases)}</span>
                </div>
                <div className="flex justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                  <span className="text-emerald-900 font-bold">Net Input VAT</span>
                  <span className="font-mono font-black text-emerald-700">{formatMoney(vatSummary.netInputTax)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TRENDS & CHARTS TAB --- */}
      {activeReport === 'trends' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Sales Trend
              </h3>
              <SalesTrendChart data={salesTrendData} />
            </div>
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" /> Customer Growth
              </h3>
              <CustomerGrowthChart data={customerGrowthData} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" /> Top Products by Revenue
              </h3>
              <TopProductsChart data={topProductsData} />
            </div>
            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-500" /> Expense Breakdown
              </h3>
              <ExpenseBreakdownChart data={expenseBreakdownData} />
            </div>
          </div>
        </div>
      )}

      {/* --- INSIGHTS TAB --- */}
      {activeReport === 'insights' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl p-6 lg:p-8 text-white shadow-md">
            <h2 className="text-xl font-extrabold mb-1.5 flex items-center gap-2.5">
              <Lightbulb className="w-6 h-6 text-amber-300" />
              <span>Smart Business Insights</span>
            </h2>
            <p className="text-indigo-200 text-xs">
              Data-backed financial observations computed directly from your real sales and ledger movements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl border shadow-2xs flex items-start gap-3.5 ${
                  insight.type === 'positive' ? 'bg-emerald-50/70 border-emerald-100' : 
                  insight.type === 'negative' ? 'bg-rose-50/70 border-rose-100' : 
                  'bg-white border-slate-200/80'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  insight.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : 
                  insight.type === 'negative' ? 'bg-rose-100 text-rose-600' : 
                  'bg-slate-100 text-slate-600'
                }`}>
                  {insight.type === 'positive' ? <ArrowUpRight className="w-5 h-5" /> : 
                   insight.type === 'negative' ? <ArrowDownRight className="w-5 h-5" /> : 
                   <TrendingUp className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`font-bold text-sm mb-1 ${
                    insight.type === 'positive' ? 'text-emerald-900' : 
                    insight.type === 'negative' ? 'text-rose-900' : 
                    'text-slate-800'
                  }`}>
                    {insight.type === 'positive' ? 'Positive Performance' : 
                     insight.type === 'negative' ? 'Attention Recommended' : 
                     'Operational Note'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PERFORMANCE TAB --- */}
      {activeReport === 'performance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{t('Salesperson Performance & Commission')}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>{t('Name')}</th>
                      <th className="text-right">{t('Sales')}</th>
                      <th className="text-right">{t('Target')}</th>
                      <th className="text-right">{t('Commission')}</th>
                      <th>{t('Progress')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(member => {
                      const memberSales = filteredTransactions
                        .filter(t => t.type === 'Sale' && (t.salesperson === member.name || t.createdBy === member.id))
                        .reduce((sum, t) => sum + t.amount, 0);
                      const commission = memberSales * (member.commissionRate || 0) / 100;
                      const progress = member.salesTarget ? (memberSales / member.salesTarget) * 100 : 0;
                      
                      return (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                {member?.name?.charAt(0) || 'M'}
                              </div>
                              <span className="text-xs font-bold text-slate-800">{member?.name || ''}</span>
                            </div>
                          </td>
                          <td className="text-right text-xs font-mono font-bold text-slate-800">{formatMoney(memberSales)}</td>
                          <td className="text-right text-xs font-mono text-slate-500">{formatMoney(member.salesTarget || 0)}</td>
                          <td className="text-right text-xs font-mono font-bold text-emerald-600">{formatMoney(commission)}</td>
                          <td>
                            <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">{Math.round(progress)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>{t('Sales Ranking')}</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  filteredTransactions
                    .filter(t => t.type === 'Sale')
                    .reduce((acc, t) => {
                      const key = t.salesperson || t.createdBy || 'Unknown';
                      acc[key] = (acc[key] || 0) + t.amount;
                      return acc;
                    }, {} as Record<string, number>)
                )
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([name, amount], idx) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        #{idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">{formatMoney(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TRIAL BALANCE TAB --- */}
      {activeReport === 'accounting' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
            <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Reconciled Trial Balance</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                Balanced Books
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th className="text-right">Debit Balance</th>
                    <th className="text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows.map(row => (
                    <tr key={row.account} className="hover:bg-slate-50/80">
                      <td className="font-bold text-xs text-slate-700">{row.account}</td>
                      <td className="text-right font-mono text-xs font-bold text-slate-800">
                        {row.debit > 0 ? formatMoney(row.debit) : '—'}
                      </td>
                      <td className="text-right font-mono text-xs font-bold text-slate-800">
                        {row.credit > 0 ? formatMoney(row.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td className="text-xs font-extrabold text-slate-900">Total</td>
                    <td className="text-right font-mono text-xs font-extrabold text-indigo-700">
                      {formatMoney(trialBalance.totalDebits)}
                    </td>
                    <td className="text-right font-mono text-xs font-extrabold text-indigo-700">
                      {formatMoney(trialBalance.totalCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessReports;
