
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShoppingCart, DollarSign, Package, Wallet, CreditCard, 
  Zap, ShoppingBag, BookOpen, ClipboardList, FileText, Users, Box, 
  Printer, Megaphone, Globe, 
  Trash2, Menu, X, Bot, Settings, UserCircle, Video, ShieldCheck, Search, 
  ArrowRightLeft, Store, Shield, Crown, LogOut, RotateCcw, Briefcase, 
  Factory, ChevronLeft, ChevronRight, Home, Grid, MoreHorizontal, MessageSquare, ChevronDown, Image, Sparkles, Filter, Calendar, WifiOff, Cloud, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, HeadphonesIcon, BarChart3, Lock
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getStaffSalesProgress, currentYearMonth } from '../lib/salesTargets';
import { useData } from '../contexts/DataContext';
import { policyFromSettings, statusFromDays, daysUntilExpiry, lotsFromProduct } from '../lib/fefoPolicy';
import TrialStatusBanner from '@shared/components/TrialStatusBanner';
import { 
  computeSalesMetrics, 
  computePurchaseMetrics, 
  computeExpenseAndIncome, 
  computeProfitAndLoss, 
  computeCumulativeDues, 
  reconcileAccountBalances,
  round2 
} from '@shared/lib/financialReconciliation';

const Dashboard: React.FC = () => {
  const { formatMoney, t, promoSlides, language } = useSettings();
  const { user, switchBusiness, hasFeature } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE' || String(user?.role || '').includes('EMPLOYEE');
  const { transactions, products, financialAccounts, staff, customers, suppliers } = useData(); 
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
  
  // Date Filtering State
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
      const timer = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
      }, 5000);
      return () => clearInterval(timer);
  }, [promoSlides]);

  // --- Reconciled Real-time Financial Calculations ---
  const stats = useMemo(() => {
      const now = new Date(selectedDate);

      // 1. Filter Transactions for Selected Mode (day, month, or year)
      const periodTransactions = transactions.filter(t => {
          if (t.isDeleted || !t.date) return false;
          const tDate = new Date(t.date);
          if (isNaN(tDate.getTime())) return false;
          
          if (filterMode === 'day') {
              return tDate.toISOString().split('T')[0] === selectedDate;
          } else if (filterMode === 'month') {
              return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
          } else {
              return tDate.getFullYear() === now.getFullYear();
          }
      });

      // 2. Centralized Period Financial Metrics
      const periodPurchases = computePurchaseMetrics(periodTransactions as any);
      const periodExpInc = computeExpenseAndIncome(periodTransactions as any, customers as any, suppliers as any);
      const periodPnl = computeProfitAndLoss(periodTransactions as any, products as any, customers as any, suppliers as any);

      // 3. Point-in-time Cumulative Receivables across all history (never period-truncated)
      const cumulative = computeCumulativeDues(transactions as any, customers as any, suppliers as any);

      // 4. Multi-store safe Account Reconciliations
      const recAccounts = reconcileAccountBalances(financialAccounts as any, transactions as any);

      // 5. Low Stock Items (active inventory only)
      const lowStockItems = products
          .filter(p => (!p.type || p.type !== 'Service') && !p.isDeleted)
          .filter(p => Number(p.stock) <= Number(p.minStockLevel ?? p.lowStockAlert ?? 5)).length;

      // 6. Customer count (real active records)
      const customerList = Array.isArray(customers) ? customers.filter(c => !c.isDeleted) : [];
      const newCustomersCount = customerList.length;

      return {
          sales: periodPnl.netSales,
          purchases: periodPurchases.netPurchases,
          totalDue: cumulative.totalCustomerReceivables, 
          netProfit: periodPnl.netProfit,
          dueCollection: periodExpInc.customerDueCollections,
          lowStockItems,
          cashBalance: recAccounts.totalCash,
          bankBalance: round2(recAccounts.totalBank + recAccounts.totalMobile),
          newCustomersCount,
          pendingOrders: transactions.filter(t => t.type === 'Sale' && (t as any).status === 'Pending').length || 0
      };
  }, [transactions, products, financialAccounts, customers, suppliers, selectedDate, filterMode]);

  const slide = promoSlides[currentSlide];
  const lastBackupTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  }, [selectedDate]);

  const StatCard = ({ title, amount, icon: Icon, colorTheme, onClick, isLocked, id, trend, trendVal }: any) => {
      const themeColors: any = {
          emerald: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/80', glow: 'from-emerald-500/10 to-teal-500/5' },
          blue: { bg: 'bg-blue-50 text-blue-600 border-blue-100/80', glow: 'from-blue-500/10 to-indigo-500/5' },
          orange: { bg: 'bg-amber-50 text-amber-600 border-amber-100/80', glow: 'from-amber-500/10 to-orange-500/5' },
          red: { bg: 'bg-rose-50 text-rose-600 border-rose-100/80', glow: 'from-rose-500/10 to-pink-500/5' },
          purple: { bg: 'bg-purple-50 text-purple-600 border-purple-100/80', glow: 'from-purple-500/10 to-violet-500/5' },
          cyan: { bg: 'bg-cyan-50 text-cyan-600 border-cyan-100/80', glow: 'from-cyan-500/10 to-sky-500/5' },
          indigo: { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100/80', glow: 'from-indigo-500/10 to-blue-500/5' },
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
              className={`group relative overflow-hidden bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/90 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                  isLocked ? 'cursor-not-allowed select-none opacity-90' : onClick ? 'cursor-pointer hover:border-indigo-200' : ''
              }`}
          >
              <div className={`pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.glow} blur-xl opacity-70 group-hover:opacity-100 transition-opacity`} />
              
              <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate mb-1">
                          {title}
                      </span>
                      <h2 className={`text-lg lg:text-2xl font-black text-slate-900 tracking-tight truncate ${isLocked ? 'blur-[3.5px] select-none opacity-70' : ''}`}>
                          {isLocked ? '৳ 99,999' : amount}
                      </h2>
                      {trendVal && !isLocked && (
                          <div className="flex items-center gap-1 mt-1.5">
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {trendVal}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">vs prev</span>
                          </div>
                      )}
                  </div>

                  <div className={`p-2.5 lg:p-3 rounded-xl border shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105 ${theme.bg}`}>
                      <Icon className="w-5 h-5" />
                  </div>
              </div>

              {isLocked && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] bg-white/90 px-2 py-0.5 rounded-full shadow-xs">Upgrade Plan</span>
                  </div>
              )}
          </div>
      );
  };

  const SalesChart = () => {
    // Last 7 days sales bars (no recharts dependency required)
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> {t('Sales') || 'Sales'} · 7d
          </h3>
        </div>
        <div className="flex items-end gap-2 h-36">
          {days.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">{d.total ? formatMoney(d.total) : ''}</span>
              <div
                className="w-full rounded-t-md bg-indigo-500/90 min-h-[4px] transition-all"
                style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }}
                title={`${d.label}: ${d.total}`}
              />
              <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

    const SalesPerformanceCard = () => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    
    // If owner, show top performer or team total vs team target
    // If employee, show personal target progress
    const isOwner = user?.role === 'Owner';
    const employeeStaff = !isOwner ? (staff || []).find(s => s && s.name === user?.name) : null;
    
    const target = isOwner 
        ? (staff || []).reduce((sum, s) => sum + (s && s.salesTarget || 0), 0)
        : (employeeStaff?.salesTarget || 0);

    const achieved = transactions
        .filter(t => t.type === 'Sale' && t.date?.startsWith(currentMonthPrefix) && (isOwner ? true : t.salesperson === user?.name))
        .reduce((sum, t) => sum + t.amount, 0);

    const percentage = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;

    if (target === 0 && !isOwner) return null;

    return (
        <div id="sales-target-card" className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm lg:text-base">{isOwner ? 'Team Sales Target' : 'My Sales Target'}</h3>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Current Month Progress</p>
                        </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest ${percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
                
                <div className="space-y-4">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-end bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Achieved</p>
                            <p className="text-base font-black text-slate-800">{formatMoney(achieved)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Target</p>
                            <p className="text-base font-black text-slate-400">{formatMoney(target)}</p>
                        </div>
                    </div>
                </div>
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
    <div className="space-y-6 lg:space-y-8 relative pb-24 lg:pb-12">
      {/* System Status Popups */}
      {backupStatus === 'success' && (
          <div className="fixed top-20 right-6 bg-white border border-emerald-100 p-4 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-right duration-500">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                  <Cloud className="w-5 h-5" />
              </div>
              <div>
                  <h4 className="text-sm font-bold text-slate-800">System Backup</h4>
                  <p className="text-xs text-slate-500">Data successfully synced.</p>
              </div>
              <button onClick={() => setBackupStatus('idle')} className="ml-2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      {showOfflinePopup && (
          <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
                  <div className="bg-red-600 p-8 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                          <WifiOff className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold">Offline Access Restricted</h2>
                      <p className="text-red-100 text-sm mt-2">Connection Required</p>
                  </div>
                  <div className="p-8 text-center space-y-6">
                      <div className="p-4 bg-orange-50 text-orange-800 rounded-xl text-sm border border-orange-100 text-left">
                          <p className="font-bold flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4" /> Subscription Notice
                          </p>
                          <p className="leading-relaxed">
                              You have been using the free version for more than 14 days. Offline access is now limited to premium users.
                          </p>
                      </div>
                      <button 
                          onClick={() => setShowOfflinePopup(false)}
                          className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                      >
                          I Understand
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header Section */}
      <div id="dashboard-header" className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Breadcrumbs */}
          <div className="flex-1">
              <h1 id="dashboard-title" className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-1.5">
                  {t('Dashboard')}
              </h1>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                  <span className="text-slate-400">Home</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-indigo-600 font-semibold">Dashboard</span>
              </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <button 
                  onClick={() => window.location.reload()} 
                  className="px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs"
              >
                  <RotateCcw className="w-4 h-4 text-slate-400" /> {t('Refresh')}
              </button>
              
              <div id="quick-create-btn" className="relative group">
                  <button className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs shadow-emerald-600/20">
                      <div className="bg-white/20 p-0.5 rounded">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      </div>
                      {t('Quick Create')}
                      <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-xl hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-1.5 space-y-0.5">
                          <button onClick={() => navigate('/sale')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md"><ShoppingBag className="w-4 h-4" /></div> New Sale
                          </button>
                          <button onClick={() => navigate('/purchase')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><ShoppingCart className="w-4 h-4" /></div> New Purchase
                          </button>
                          <button onClick={() => navigate('/products')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md"><Package className="w-4 h-4" /></div> Add Product
                          </button>
                          <div className="my-1 border-t border-slate-100"></div>
                          <button onClick={() => navigate('/due-ledger')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md"><BookOpen className="w-4 h-4" /></div> Due Ledger
                          </button>
                          <button onClick={() => navigate('/cashbox')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><Wallet className="w-4 h-4" /></div> Cash Box
                          </button>
                          <button onClick={() => navigate('/reports?tab=tax')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><BarChart3 className="w-4 h-4" /></div> Business Report
                          </button>
                          <button onClick={() => navigate('/support')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-3 rounded-lg transition-colors">
                              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md"><HeadphonesIcon className="w-4 h-4" /></div> Support
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Guided daily flows */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            className="text-left p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-xs transition-all group"
          >
            <span className="block text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{x.label}</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">{x.tip}</span>
          </button>
        ))}
      </div>


      {/* Team sales targets (current month) */}
      {(() => {
        const { year, month } = currentYearMonth();
        const rows = getStaffSalesProgress(staff || [], transactions, year, month).filter(r => r.target > 0).slice(0, 6);
        if (!rows.length) return null;
        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Team sales targets · {year}-{String(month).padStart(2, '0')}</h3>
              <button type="button" onClick={() => navigate('/employees')} className="text-xs font-bold text-indigo-600 hover:underline">View HR</button>
            </div>
            <div className="space-y-3">
              {rows.map(r => (
                <div key={r.staffId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{r.staffName}</span>
                    <span className={`font-bold ${r.status === 'achieved' ? 'text-emerald-600' : r.status === 'behind' ? 'text-amber-600' : 'text-slate-500'}`}>
                      {Math.round(r.percentage)}% · {formatMoney(r.totalSales)} / {formatMoney(r.target)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.status === 'achieved' ? 'bg-emerald-500' : r.status === 'behind' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          <StatCard 
            id="today-sales-card"
            title={filterMode === 'day' ? t("Today Sales") : `${filterMode === 'month' ? 'Monthly' : 'Yearly'} Sales`} 
            amount={formatMoney(stats.sales)} 
            icon={TrendingUp} 
            trend="up" 
            trendVal="12.5%" 
            colorTheme="emerald"
            onClick={() => navigate('/sale-ledger')}
          />
          <StatCard 
            title={filterMode === 'day' ? t("Today Profit") : `${filterMode === 'month' ? 'Monthly' : 'Yearly'} Profit`}
            amount={formatMoney(stats.netProfit)} 
            icon={Activity} 
            trend="up" 
            trendVal="8.2%" 
            colorTheme="emerald"
            onClick={() => navigate('/reports')}
          />
          <StatCard 
            title={t("Cash Balance")} 
            amount={formatMoney(stats.cashBalance)} 
            icon={Wallet} 
            trend="down" 
            trendVal="2.5%" 
            colorTheme="red"
            onClick={() => navigate('/cashbox')}
          />
          <StatCard 
            title={t("Bank Balance")} 
            amount={formatMoney(stats.bankBalance)} 
            icon={Store} 
            trend="up" 
            trendVal="5.3%" 
            colorTheme="blue"
            onClick={() => navigate('/cashbox')}
            isLocked={!user?.isPremium}
          />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          <StatCard 
            title={t("Due Collection")} 
            amount={formatMoney(stats.dueCollection)} 
            icon={CreditCard} 
            trend="up" 
            trendVal="10.4%" 
            colorTheme="orange"
            onClick={() => navigate('/due-ledger')}
          />
          <StatCard 
            title={t("Pending Orders")} 
            amount={stats.pendingOrders.toString()} 
            icon={Box} 
            trend="up" 
            trendVal="3" 
            colorTheme="purple"
            onClick={() => navigate('/sale-ledger')}
          />
          <StatCard 
            title={t("Low Stock Items")} 
            amount={stats.lowStockItems.toString()} 
            icon={AlertTriangle} 
            trend="down" 
            trendVal="2" 
            colorTheme="red"
            onClick={() => navigate('/stock')}
          />
          <StatCard 
            title={t("New Customers")} 
            amount={stats.newCustomersCount.toString()} 
            icon={Users} 
            trend="up" 
            trendVal={`${stats.newCustomersCount}`} 
            colorTheme="cyan"
            onClick={() => navigate('/customers')}
            isLocked={!user?.isPremium}
          />
      </div>

      {/* Trial package quotas */}
      {isEmployee && (
        <div className="mx-3 sm:mx-4 mt-3 mb-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 font-semibold">
          Staff mode — menu shows only modules allowed by your role permissions.
        </div>
      )}
      <TrialStatusBanner />

      {/* Lot / FEFO expiry strip */}
      {lotExpiryStats.attention > 0 && (
        <div className="w-full rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            {language === 'bn' ? 'মেয়াদোত্তীর্ণ / FEFO সতর্কতা' : 'Lot expiry attention'}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold sm:ml-auto">
            {lotExpiryStats.expired > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=expired')} className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 hover:ring-2 hover:ring-rose-300">
                {lotExpiryStats.expired} {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'expired'}
              </button>
            )}
            {lotExpiryStats.critical > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=critical')} className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 hover:ring-2 hover:ring-orange-300">
                {lotExpiryStats.critical} ≤{fefoCriticalDays}d
              </button>
            )}
            {lotExpiryStats.warning > 0 && (
              <button type="button" onClick={() => navigate('/lots?status=warning')} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 hover:ring-2 hover:ring-amber-300">
                {lotExpiryStats.warning} ≤{fefoWarnDays}d
              </button>
            )}
            <button type="button" onClick={() => navigate('/lots')} className="px-2.5 py-1 rounded-full bg-white text-slate-600 border border-slate-200 hover:border-slate-400">
              {language === 'bn' ? 'লট অনুসন্ধান →' : 'Open Lot Enquiry →'}
            </button>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mt-6 lg:mt-8">
          {/* Left Column: Quick Actions & Operations */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
              
              {SalesChart()}

              {/* Recent Transactions Preview */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center text-slate-800">
                      <h3 className="font-black text-lg lg:text-xl flex items-center gap-3">
                          <Activity className="w-5 h-5 text-indigo-500" /> {t('Recent Activity')}
                      </h3>
                      <button className="text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 transition-colors px-4 py-1.5 rounded-full shadow-sm">
                          {t('View All')}
                      </button>
                  </div>
                  <div className="divide-y divide-slate-100/50">
                      {transactions.slice(0, 5).map((t, i) => (
                          <div key={i} className="p-4 lg:px-8 lg:py-5 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'Sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {t.type === 'Sale' ? <ShoppingBag className="w-5 h-5"/> : <FileText className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-sm lg:text-base font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{t.type} - {t.entityName}</p>
                                  <p className="text-[10px] lg:text-xs font-medium text-slate-500 mt-0.5">{t.date} • {t.paymentMethod}</p>
                              </div>
                              <div className="text-right">
                                  <span className={`block text-sm lg:text-base font-black tracking-tight ${['Sale','Income'].includes(t.type) ? 'text-emerald-600' : 'text-slate-800'}`}>
                                      {['Sale','Income'].includes(t.type) ? '+' : '-'} {formatMoney(t.amount)}
                                  </span>
                                  <span className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">{t.type}</span>
                              </div>
                          </div>
                      ))}
                      {transactions.length === 0 && (
                          <div className="p-12 text-center text-slate-400">
                              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                  <FileText className="w-8 h-8" />
                              </div>
                              <p className="font-semibold text-sm">No recent transactions</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Right Column: Status & Extras */}
          <div className="space-y-6">
              
              {/* Sales Performance Tracking */}
              {SalesPerformanceCard()}

              {/* Subscription Status */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                              <Crown className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-sm">{t('Subscription')}</h3>
                              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">{user?.isPremium ? 'Active Plan' : 'Free Plan'}</p>
                          </div>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md uppercase tracking-wide">{user?.plan || (user?.isPremium ? 'Premium' : 'Free')}</span>
                  </div>
                  
                  <div className="space-y-4">
                      <p className="text-xs text-slate-500">{(user?.features || []).length} feature(s) unlocked on your plan</p>
                      <button 
                        onClick={() => navigate('/subscription')}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Crown className="w-4 h-4" /> {t('Manage Subscription')}
                      </button>
                  </div>
              </div>

              {/* Mini Quick Links */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-400 text-[10px] mb-4 uppercase tracking-widest">
                      {t('Shortcuts')}
                  </h3>
                  <div className="space-y-1">
                      <button onClick={() => navigate('/settings')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors flex items-center gap-3">
                              <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> {t('Settings')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
                      <button onClick={() => navigate('/employees')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors flex items-center gap-3">
                              <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> {t('Employees')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
                      <button onClick={() => navigate('/reports')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors flex items-center gap-3">
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
