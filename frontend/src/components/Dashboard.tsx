import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShoppingCart, Package, Wallet, CreditCard, 
  ShoppingBag, BookOpen, FileText, Users, Box, 
  Settings, Crown, RotateCcw, X,
  ChevronRight, ChevronDown, Sparkles, Filter, Calendar, WifiOff, Cloud, 
  AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, HeadphonesIcon, 
  BarChart3, Lock, Globe, Check, ArrowRight
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getStaffSalesProgress, currentYearMonth } from '../lib/salesTargets';
import { useData } from '../contexts/DataContext';
import { policyFromSettings, statusFromDays, daysUntilExpiry, lotsFromProduct } from '../lib/fefoPolicy';
import TrialStatusBanner from '@shared/components/TrialStatusBanner';
import { 
  computePurchaseMetrics, 
  computeExpenseAndIncome, 
  computeProfitAndLoss, 
  computeCumulativeDues, 
  reconcileAccountBalances,
  round2 
} from '@shared/lib/financialReconciliation';

export type DashboardRange = 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'prevMonth' | 'custom';

interface DateRangeResult {
  currentStart: Date;
  currentEnd: Date;
  priorStart: Date;
  priorEnd: Date;
  label: string;
}

const resolveDashboardDateRange = (
  range: DashboardRange, 
  customStartStr?: string, 
  customEndStr?: string
): DateRangeResult => {
  const now = new Date();
  const startOf = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
  const endOf = (d: Date) => { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; };

  let currentStart = startOf(now);
  let currentEnd = endOf(now);
  let priorStart = startOf(now);
  let priorEnd = endOf(now);
  let label = 'Today';

  if (range === 'today') {
    currentStart = startOf(now);
    currentEnd = endOf(now);
    const y = new Date(now); y.setDate(y.getDate() - 1);
    priorStart = startOf(y);
    priorEnd = endOf(y);
    label = 'Today';
  } else if (range === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    currentStart = startOf(y);
    currentEnd = endOf(y);
    const dayBefore = new Date(y); dayBefore.setDate(dayBefore.getDate() - 1);
    priorStart = startOf(dayBefore);
    priorEnd = endOf(dayBefore);
    label = 'Yesterday';
  } else if (range === '7d') {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    currentStart = startOf(s);
    currentEnd = endOf(now);
    const ps = new Date(s); ps.setDate(ps.getDate() - 7);
    const pe = new Date(s); pe.setDate(pe.getDate() - 1);
    priorStart = startOf(ps);
    priorEnd = endOf(pe);
    label = 'Last 7 Days';
  } else if (range === '30d') {
    const s = new Date(now); s.setDate(s.getDate() - 29);
    currentStart = startOf(s);
    currentEnd = endOf(now);
    const ps = new Date(s); ps.setDate(ps.getDate() - 30);
    const pe = new Date(s); pe.setDate(pe.getDate() - 1);
    priorStart = startOf(ps);
    priorEnd = endOf(pe);
    label = 'Last 30 Days';
  } else if (range === 'thisMonth') {
    currentStart = startOf(new Date(now.getFullYear(), now.getMonth(), 1));
    currentEnd = endOf(now);
    const pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const daysInCurrent = now.getDate();
    const pmEnd = new Date(now.getFullYear(), now.getMonth() - 1, daysInCurrent);
    priorStart = startOf(pmStart);
    priorEnd = endOf(pmEnd);
    label = 'This Month';
  } else if (range === 'prevMonth') {
    currentStart = startOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    currentEnd = endOf(new Date(now.getFullYear(), now.getMonth(), 0));
    priorStart = startOf(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    priorEnd = endOf(new Date(now.getFullYear(), now.getMonth() - 1, 0));
    label = 'Previous Month';
  } else if (range === 'custom' && customStartStr && customEndStr) {
    const cs = new Date(customStartStr);
    const ce = new Date(customEndStr);
    if (!isNaN(cs.getTime()) && !isNaN(ce.getTime())) {
      if (cs <= ce) {
        currentStart = startOf(cs);
        currentEnd = endOf(ce);
      } else {
        currentStart = startOf(ce);
        currentEnd = endOf(cs);
      }
      const dur = currentEnd.getTime() - currentStart.getTime();
      priorEnd = new Date(currentStart.getTime() - 1);
      priorStart = new Date(priorEnd.getTime() - dur);
      label = `${currentStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${currentEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
  }

  return { currentStart, currentEnd, priorStart, priorEnd, label };
};

const calculateTrend = (curr: number, prev: number) => {
  if (prev === 0) {
    if (curr === 0) return { trend: 'up' as const, val: '0.0%' };
    return { trend: 'up' as const, val: '+100%' };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const isUp = pct >= 0;
  return {
    trend: isUp ? ('up' as const) : ('down' as const),
    val: `${isUp ? '+' : ''}${pct.toFixed(1)}%`
  };
};

const Dashboard: React.FC = () => {
  const { formatMoney, t, promoSlides, language } = useSettings();
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE' || String(user?.role || '').includes('EMPLOYEE');
  const { transactions, products, financialAccounts, staff, customers, suppliers, onlineOrders } = useData(); 
  const navigate = useNavigate();

  // Date Filtering State
  const [rangeMode, setRangeMode] = useState<DashboardRange>('today');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // Offline/Backup Status
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success'>('idle');
  const [showOfflinePopup, setShowOfflinePopup] = useState(false);

  useEffect(() => {
    const handleConnectionChange = () => {
      if (navigator.onLine) {
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 4000);
        setShowOfflinePopup(false);
      } else {
        checkOfflineStatus();
      }
    };

    const checkOfflineStatus = () => {
      if (user && !user.isPremium) {
        const initDate = new Date(user.initialLoginDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - initDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 14) {
          setShowOfflinePopup(true);
        }
      }
    };

    if (navigator.onLine) {
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 4000);
    } else {
      checkOfflineStatus();
    }

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, [user]);

  // Resolved Date Boundaries
  const dateRange = useMemo(() => {
    return resolveDashboardDateRange(rangeMode, customStart, customEnd);
  }, [rangeMode, customStart, customEnd]);

  // Filter transactions into Current and Prior intervals for comparative metrics
  const { currentPeriodTx, priorPeriodTx } = useMemo(() => {
    const { currentStart, currentEnd, priorStart, priorEnd } = dateRange;

    const currentPeriodTx = transactions.filter(t => {
      if (t.isDeleted || !t.date) return false;
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d >= currentStart && d <= currentEnd;
    });

    const priorPeriodTx = transactions.filter(t => {
      if (t.isDeleted || !t.date) return false;
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d >= priorStart && d <= priorEnd;
    });

    return { currentPeriodTx, priorPeriodTx };
  }, [transactions, dateRange]);

  // Comprehensive Reconciled Real-Time Financial & Operational KPIs
  const stats = useMemo(() => {
    // Current period calculations
    const curPurchases = computePurchaseMetrics(currentPeriodTx as any);
    const curExpInc = computeExpenseAndIncome(currentPeriodTx as any, customers as any, suppliers as any);
    const curPnl = computeProfitAndLoss(currentPeriodTx as any, products as any, customers as any, suppliers as any);

    // Prior period calculations for genuine comparative trends
    const priorPurchases = computePurchaseMetrics(priorPeriodTx as any);
    const priorPnl = computeProfitAndLoss(priorPeriodTx as any, products as any, customers as any, suppliers as any);

    // Cumulative dues across all ledger history
    const cumulative = computeCumulativeDues(transactions as any, customers as any, suppliers as any);

    // Account balances (Cash & Bank)
    const recAccounts = reconcileAccountBalances(financialAccounts as any, transactions as any);

    // Inventory Stock Value Calculation
    let totalStockQty = 0;
    let totalStockCostValue = 0;
    let totalStockRetailValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      if ((p as any).isDeleted || p.type === 'Service') return;
      const stock = Math.max(0, Number(p.stock) || 0);
      const buyPrice = Number(p.buyPrice ?? p.costPrice ?? 0);
      const salePrice = Number(p.salePrice ?? 0);
      const minStock = Number(p.minStockLevel ?? (p as any).lowStockAlert ?? 5);

      totalStockQty += stock;
      totalStockCostValue += stock * buyPrice;
      totalStockRetailValue += stock * salePrice;

      if (stock <= minStock) {
        lowStockCount += 1;
      }
    });

    // Online Store Orders Statistics
    const ordersList = Array.isArray(onlineOrders) ? onlineOrders.filter((o: any) => !o.isDeleted) : [];
    const onlineOrdersCount = ordersList.length;
    const onlineOrdersPending = ordersList.filter((o: any) => o.status === 'Pending').length;
    const onlineOrdersRevenue = round2(
      ordersList
        .filter((o: any) => o.status !== 'Cancelled')
        .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
    );

    // Active customer count
    const activeCustomers = Array.isArray(customers) ? customers.filter(c => !c.isDeleted).length : 0;

    // Trends vs prior period
    const salesTrend = calculateTrend(curPnl.netSales, priorPnl.netSales);
    const profitTrend = calculateTrend(curPnl.netProfit, priorPnl.netProfit);
    const purchaseTrend = calculateTrend(curPurchases.netPurchases, priorPurchases.netPurchases);

    return {
      sales: curPnl.netSales,
      salesTrend,
      netProfit: curPnl.netProfit,
      profitTrend,
      purchases: curPurchases.netPurchases,
      purchaseTrend,
      totalDue: cumulative.totalCustomerReceivables,
      dueCollection: curExpInc.customerDueCollections,
      cashBalance: recAccounts.totalCash,
      bankBalance: round2(recAccounts.totalBank + recAccounts.totalMobile),
      stockQty: totalStockQty,
      stockCostValue: round2(totalStockCostValue),
      stockRetailValue: round2(totalStockRetailValue),
      lowStockItems: lowStockCount,
      onlineOrdersCount,
      onlineOrdersPending,
      onlineOrdersRevenue,
      activeCustomers,
      pendingPosSales: transactions.filter(t => t.type === 'Sale' && (t as any).status === 'Pending').length || 0,
    };
  }, [currentPeriodTx, priorPeriodTx, transactions, products, financialAccounts, customers, suppliers, onlineOrders]);

  // Unified Modern KPI Card Component (Phase 5)
  const StatCard = ({ 
    title, 
    amount, 
    subtitle,
    icon: Icon, 
    colorTheme, 
    onClick, 
    isLocked, 
    id, 
    trend, 
    trendVal,
    badgeText
  }: any) => {
    const themeColors: any = {
      emerald: {
        icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/60',
        glow: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-transparent',
      },
      blue: {
        icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-800/60',
        glow: 'from-blue-500/10 to-indigo-500/5 dark:from-blue-500/20 dark:to-transparent',
      },
      indigo: {
        icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/60',
        glow: 'from-indigo-500/10 to-blue-500/5 dark:from-indigo-500/20 dark:to-transparent',
      },
      amber: {
        icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-800/60',
        glow: 'from-amber-500/10 to-orange-500/5 dark:from-amber-500/20 dark:to-transparent',
      },
      rose: {
        icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-100 dark:border-rose-800/60',
        glow: 'from-rose-500/10 to-pink-500/5 dark:from-rose-500/20 dark:to-transparent',
      },
      purple: {
        icon: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-100 dark:border-purple-800/60',
        glow: 'from-purple-500/10 to-violet-500/5 dark:from-purple-500/20 dark:to-transparent',
      },
      cyan: {
        icon: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800/60',
        glow: 'from-cyan-500/10 to-sky-500/5 dark:from-cyan-500/20 dark:to-transparent',
      },
    };

    const theme = themeColors[colorTheme] || themeColors.indigo;

    const handleCardClick = (e: React.MouseEvent) => {
      if (isLocked) {
        e.preventDefault();
        e.stopPropagation();
        alert(`The metric "${title}" is locked under your current plan. Please upgrade your subscription to unlock it!`);
        navigate('/subscription');
        return;
      }
      if (onClick) onClick(e);
    };

    return (
      <div 
        id={id}
        onClick={handleCardClick}
        className={`group relative overflow-hidden bg-white dark:bg-slate-900 p-4 lg:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md dark:hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 flex flex-col justify-between ${
          isLocked ? 'cursor-not-allowed select-none opacity-90' : onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600' : ''
        }`}
      >
        <div className={`pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.glow} blur-xl opacity-70 group-hover:opacity-100 transition-opacity`} />
        
        <div>
          <div className="flex items-start justify-between gap-2.5 relative z-10 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
              {title}
            </span>

            <div className={`p-2 lg:p-2.5 rounded-xl border shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-110 ${theme.icon}`}>
              <Icon className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
            </div>
          </div>

          <h2 className={`text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate ${isLocked ? 'blur-[3.5px] select-none opacity-70' : ''}`}>
            {isLocked ? '৳ 99,999' : amount}
          </h2>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
              {subtitle}
            </span>
          )}

          {trendVal && !isLocked && (
            <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md text-[10px] ml-auto ${
              trend === 'up' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60' 
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendVal}
            </span>
          )}

          {badgeText && !trendVal && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/60 ml-auto">
              {badgeText}
            </span>
          )}
        </div>

        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] bg-white/90 dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-xs">Upgrade Plan</span>
          </div>
        )}
      </div>
    );
  };

  // Sales Trend Chart Component
  const SalesChart = () => {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = (transactions || [])
        .filter((t: any) => !t.isDeleted && t.type === 'Sale' && String(t.date || '').slice(0, 10) === key)
        .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), total });
    }
    const max = Math.max(...days.map((x) => x.total), 1);
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('Sales Performance')} · 7d
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {formatMoney(days.reduce((a, b) => a + b.total, 0))} Total
          </span>
        </div>
        <div className="flex items-end gap-2.5 h-40 pt-4">
          {days.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-full group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {d.total ? formatMoney(d.total) : ''}
              </span>
              <div
                className="w-full rounded-t-lg bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 min-h-[6px] transition-all duration-300 shadow-2xs"
                style={{ height: `${Math.max(6, (d.total / max) * 100)}%` }}
                title={`${d.label}: ${d.total}`}
              />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const fefoPolicy = useMemo(() => {
    const b = user?.businesses?.find((x: any) => x && x.name === user.businessName) || user?.businesses?.[0];
    return policyFromSettings((b as any)?.settings);
  }, [user]);
  const fefoWarnDays = fefoPolicy.warnDays;
  const fefoCriticalDays = fefoPolicy.criticalDays;

  const lotExpiryStats = useMemo(() => {
    let expired = 0, critical = 0, warning = 0, lots = 0;
    for (const p of products) {
      if ((p as any).isDeleted || (p as any).type === 'Service') continue;
      for (const lot of lotsFromProduct(p as any)) {
        lots += 1;
        const days = daysUntilExpiry(lot.expiryDate);
        const st = statusFromDays(days, fefoPolicy);
        if (st === 'expired') expired += 1;
        else if (st === 'critical') critical += 1;
        else if (st === 'warning') warning += 1;
      }
    }
    return { expired, critical, warning, lots, attention: expired + critical + warning };
  }, [products, fefoPolicy]);

  return (
    <div className="space-y-6 lg:space-y-8 relative pb-24 lg:pb-12 text-slate-800 dark:text-slate-100">
      {/* System Status Popups */}
      {backupStatus === 'success' && (
        <div className="fixed top-20 right-6 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-right duration-500">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">System Backup</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Data successfully synced.</p>
          </div>
          <button onClick={() => setBackupStatus('idle')} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showOfflinePopup && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="bg-red-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <WifiOff className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Offline Access Restricted</h2>
              <p className="text-red-100 text-sm mt-2">Connection Required</p>
            </div>
            <div className="p-8 text-center space-y-6">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 rounded-xl text-sm border border-orange-100 dark:border-orange-800 text-left">
                <p className="font-bold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Subscription Notice
                </p>
                <p className="leading-relaxed">
                  You have been using the free version for more than 14 days. Offline access is now limited to premium users.
                </p>
              </div>
              <button 
                onClick={() => setShowOfflinePopup(false)}
                className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-slate-900/10"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div id="dashboard-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Breadcrumbs */}
        <div className="flex-1">
          <h1 id="dashboard-title" className="text-2xl lg:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-1.5">
            {t('Dashboard')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1.5">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Dashboard</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => window.location.reload()} 
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-400 dark:text-slate-500" /> {t('Refresh')}
          </button>
          
          <div id="quick-create-btn" className="relative group">
            <button className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs shadow-emerald-600/20">
              <div className="bg-white/20 p-0.5 rounded">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              {t('Quick Create')}
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-1.5 space-y-0.5">
                <button onClick={() => navigate('/sale')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-md"><ShoppingBag className="w-4 h-4" /></div> New Sale
                </button>
                <button onClick={() => navigate('/purchase')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-md"><ShoppingCart className="w-4 h-4" /></div> New Purchase
                </button>
                <button onClick={() => navigate('/products')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-md"><Package className="w-4 h-4" /></div> Add Product
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                <button onClick={() => navigate('/due-ledger')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-950/60 text-orange-600 rounded-md"><BookOpen className="w-4 h-4" /></div> Due Ledger
                </button>
                <button onClick={() => navigate('/cashbox')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-md"><Wallet className="w-4 h-4" /></div> Cash Box
                </button>
                <button onClick={() => navigate('/reports?tab=tax')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-md"><BarChart3 className="w-4 h-4" /></div> Business Report
                </button>
                <button onClick={() => navigate('/support')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-md"><HeadphonesIcon className="w-4 h-4" /></div> Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PHASE 4: DATE RANGE SELECTOR BAR --- */}
      <div className="bg-white dark:bg-slate-900 p-3 lg:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('Timeframe')}:
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {dateRange.label}
          </span>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'today', label: t('Today') },
            { id: 'yesterday', label: t('Yesterday') },
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: 'thisMonth', label: t('This Month') },
            { id: 'prevMonth', label: t('Previous Month') },
            { id: 'custom', label: t('Custom') },
          ].map((pill) => {
            const isActive = rangeMode === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setRangeMode(pill.id as DashboardRange);
                  if (pill.id === 'custom') setShowCustomPicker(true);
                  else setShowCustomPicker(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker Dropdown */}
      {showCustomPicker && (
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Start Date:</label>
            <input 
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">End Date:</label>
            <input 
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Guided daily flows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(language === 'bn' ? [
          { to: '/sale', label: '১. বিক্রি', tip: 'POS · FEFO · সিরিয়াল' },
          { to: '/purchase', label: '২. ক্রয়', tip: 'স্টক · লট · SN' },
          { to: '/stock', label: '৩. স্টক', tip: 'লট · সিরিয়াল · টেক' },
          { to: '/journal', label: '৪. জার্নাল', tip: 'হিসাব · P&L' },
        ] : [
          { to: '/sale', label: '1. Sell', tip: 'POS · FEFO · serials' },
          { to: '/purchase', label: '2. Buy', tip: 'Stock · lots · SN' },
          { to: '/stock', label: '3. Stock', tip: 'Lots · serials · take' },
          { to: '/journal', label: '4. Journal', tip: 'Books · P&L' },
        ]).map((x) => (
          <button
            key={x.to}
            type="button"
            onClick={() => navigate(x.to)}
            className="text-left p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all group"
          >
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{x.label}</span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{x.tip}</span>
          </button>
        ))}
      </div>

      {/* --- PHASE 5: UNIFIED 8 KPI CARDS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {/* 1. Net Sales */}
        <StatCard 
          id="kpi-sales-card"
          title={`${dateRange.label} Sales`} 
          amount={formatMoney(stats.sales)} 
          subtitle="Net revenue"
          icon={TrendingUp} 
          trend={stats.salesTrend.trend} 
          trendVal={stats.salesTrend.val} 
          colorTheme="emerald"
          onClick={() => navigate('/sale-ledger')}
        />

        {/* 2. Net Profit */}
        <StatCard 
          id="kpi-profit-card"
          title={`${dateRange.label} Profit`}
          amount={formatMoney(stats.netProfit)} 
          subtitle="Net earnings"
          icon={Activity} 
          trend={stats.profitTrend.trend} 
          trendVal={stats.profitTrend.val} 
          colorTheme="indigo"
          onClick={() => navigate('/reports')}
        />

        {/* 3. Cash & Bank Balances */}
        <StatCard 
          id="kpi-cash-bank-card"
          title={t("Cash & Bank")} 
          amount={formatMoney(stats.cashBalance + stats.bankBalance)} 
          subtitle={`Cash: ${formatMoney(stats.cashBalance)} | Bank: ${formatMoney(stats.bankBalance)}`}
          icon={Wallet} 
          badgeText="Liquid Funds"
          colorTheme="blue"
          onClick={() => navigate('/cashbox')}
        />

        {/* 4. Stock Inventory Value */}
        <StatCard 
          id="kpi-stock-value-card"
          title={t("Stock Value")} 
          amount={formatMoney(stats.stockRetailValue)} 
          subtitle={`${stats.stockQty} items in inventory`}
          icon={Package} 
          badgeText="Inventory"
          colorTheme="amber"
          onClick={() => navigate('/stock')}
        />

        {/* 5. Net Purchases */}
        <StatCard 
          id="kpi-purchases-card"
          title={`${dateRange.label} Purchases`} 
          amount={formatMoney(stats.purchases)} 
          subtitle="Procurement total"
          icon={ShoppingCart} 
          trend={stats.purchaseTrend.trend} 
          trendVal={stats.purchaseTrend.val} 
          colorTheme="purple"
          onClick={() => navigate('/purchase')}
        />

        {/* 6. Outstanding Customer Dues */}
        <StatCard 
          id="kpi-dues-card"
          title={t("Customer Dues")} 
          amount={formatMoney(stats.totalDue)} 
          subtitle={stats.dueCollection > 0 ? `Collected: ${formatMoney(stats.dueCollection)}` : 'Ledger Receivables'}
          icon={CreditCard} 
          badgeText="Receivables"
          colorTheme="rose"
          onClick={() => navigate('/due-ledger')}
        />

        {/* 7. Online Store Orders */}
        <StatCard 
          id="kpi-online-orders-card"
          title={t("Online Orders")} 
          amount={stats.onlineOrdersCount.toString()} 
          subtitle={`${formatMoney(stats.onlineOrdersRevenue)} online sales`}
          icon={Globe} 
          badgeText={stats.onlineOrdersPending > 0 ? `${stats.onlineOrdersPending} pending` : 'Storefront'}
          colorTheme="cyan"
          onClick={() => navigate('/online-shop')}
        />

        {/* 8. Low Stock Items */}
        <StatCard 
          id="kpi-low-stock-card"
          title={t("Low Stock Alert")} 
          amount={stats.lowStockItems.toString()} 
          subtitle={stats.lowStockItems > 0 ? 'Action required' : 'Stock healthy'}
          icon={AlertTriangle} 
          badgeText={stats.lowStockItems > 0 ? 'Restock' : 'Normal'}
          colorTheme={stats.lowStockItems > 0 ? 'rose' : 'emerald'}
          onClick={() => navigate('/stock')}
        />
      </div>

      {/* Staff mode notification */}
      {isEmployee && (
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2.5 text-xs text-indigo-900 dark:text-indigo-300 font-semibold">
          Staff mode — menu shows only modules allowed by your role permissions.
        </div>
      )}

      {/* Trial package quotas */}
      <TrialStatusBanner />

      {/* Lot / FEFO expiry strip */}
      {lotExpiryStats.attention > 0 && (
        <div className="w-full rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            {language === 'bn' ? 'মেয়াদোত্তীর্ণ / FEFO সতর্কতা' : 'Lot expiry attention'}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold sm:ml-auto">
            {lotExpiryStats.expired > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=expired')} className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 hover:ring-2 hover:ring-rose-300">
                {lotExpiryStats.expired} {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'expired'}
              </button>
            )}
            {lotExpiryStats.critical > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=critical')} className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 hover:ring-2 hover:ring-orange-300">
                {lotExpiryStats.critical} ≤{fefoCriticalDays}d
              </button>
            )}
            {lotExpiryStats.warning > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=warning')} className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:ring-2 hover:ring-amber-300">
                {lotExpiryStats.warning} ≤{fefoWarnDays}d
              </button>
            )}
            <button type="button" onClick={() => navigate('/lots')} className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400">
              {language === 'bn' ? 'লট অনুসন্ধান →' : 'Open Lot Enquiry →'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Quick Actions & Operations */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          {SalesChart()}

          {/* Recent Transactions Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-800 dark:text-slate-100">
              <h3 className="font-black text-base lg:text-lg flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-indigo-500" /> {t('Recent Activity')}
              </h3>
              <button 
                onClick={() => navigate('/sale-ledger')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 border border-indigo-200 dark:border-indigo-800 transition-colors px-3.5 py-1 rounded-full shadow-xs"
              >
                {t('View All')}
              </button>
            </div>
            <div className="divide-y divide-slate-100/60 dark:divide-slate-800">
              {transactions.slice(0, 6).map((tItem, i) => (
                <div key={i} className="p-4 lg:px-6 lg:py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tItem.type === 'Sale' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tItem.type === 'Sale' ? <ShoppingBag className="w-5 h-5"/> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tItem.type} - {tItem.entityName || 'General'}
                    </p>
                    <p className="text-[10px] lg:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {tItem.date} • {tItem.paymentMethod || 'Cash'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`block text-sm lg:text-base font-black tracking-tight ${
                      ['Sale','Income'].includes(tItem.type) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {['Sale','Income'].includes(tItem.type) ? '+' : '-'} {formatMoney(tItem.amount)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">{tItem.type}</span>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300 dark:text-slate-600">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="font-semibold text-sm">No recent transactions recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Extras */}
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t('Subscription')}</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">{user?.isPremium ? 'Active Plan' : 'Free Plan'}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-md uppercase tracking-wide border border-amber-200 dark:border-amber-800">
                {user?.plan || (user?.isPremium ? 'Premium' : 'Free')}
              </span>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{(user?.features || []).length} ERP feature modules active</p>
              <button 
                onClick={() => navigate('/subscription')}
                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Crown className="w-4 h-4" /> {t('Manage Subscription')}
              </button>
            </div>
          </div>

          {/* Shortcuts Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-400 dark:text-slate-500 text-[10px] mb-4 uppercase tracking-widest">
              {t('Shortcuts')}
            </h3>
            <div className="space-y-1">
              <button onClick={() => navigate('/settings')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> {t('Settings')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
              <button onClick={() => navigate('/employees')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> {t('Employees')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
              <button onClick={() => navigate('/reports')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> {t('Reports & Tax')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
