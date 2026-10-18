import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, RefreshCw, Search,
  Calendar, CheckCircle2, Clock, AlertTriangle,
  RotateCcw, FileText, ChevronRight, Eye, Plus, X,
  Layers, ArrowUpRight, ShieldCheck, AlertCircle, XCircle
} from 'lucide-react';
import { authFetch as defaultAuthFetch } from '../../lib/apiClient';

type Props = {
  commissionRate?: number;
  paymentForm?: any;
  revenueSummary?: any;
  setCommissionRate?: (val: number) => void;
  setPaymentForm?: (val: any) => void;
  showToast?: (msg: string, type?: string) => void;
  authFetch?: any;
  currencySymbol?: string;
};

export const AdminRevenueCenterTab: React.FC<Props> = ({
  commissionRate = 0,
  revenueSummary: initialSummary,
  setCommissionRate,
  showToast: propShowToast,
  authFetch = defaultAuthFetch,
  currencySymbol = '৳',
}) => {
  // Live state from backend
  const [summary, setSummary] = useState<any>(initialSummary || null);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'month' | 'year'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals state
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordForm, setRecordForm] = useState({
    businessId: '',
    businessName: '',
    amount: '',
    plan: 'Nexus Pro',
    billingCycle: 'monthly',
    method: 'bKash Merchant',
    paymentReference: '',
    invoiceNumber: '',
    note: '',
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (propShowToast) {
      propShowToast(message, type);
    } else {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    }
  }, [propShowToast]);

  // Load summary and payments
  const fetchRevenueData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Fetch Summary
      const summaryRes = await authFetch('/api/admin/revenue/summary').catch(() => null);
      if (summaryRes && summaryRes.ok) {
        const sumData = await summaryRes.json();
        setSummary(sumData);
      }

      // 2. Build query string for payments
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '100');

      const paymentsRes = await authFetch(`/api/admin/revenue/payments?${params.toString()}`).catch(() => null);
      if (paymentsRes && paymentsRes.ok) {
        const payData = await paymentsRes.json();
        setPayments(Array.isArray(payData.payments) ? payData.payments : []);
        setTotalCount(payData.totalCount || payData.payments?.length || 0);
      }
    } catch (err: any) {
      console.error('Failed to load revenue data:', err);
      showNotification('Failed to load revenue information', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authFetch, statusFilter, planFilter, typeFilter, startDate, endDate, search, showNotification]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRevenueData(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRevenueData]);

  // Quick Date presets
  const handleDatePreset = (preset: 'all' | 'today' | 'month' | 'year') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'year') {
      const firstYearDay = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setStartDate(firstYearDay);
      setEndDate(todayStr);
    }
  };

  // Execute Refund
  const handleExecuteRefund = async () => {
    if (!refundTarget) return;
    setIsRefunding(true);
    try {
      const res = await authFetch(`/api/admin/revenue/payments/${refundTarget.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason || 'Refund requested by administrator' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to refund payment');
      }

      showNotification(`Payment refunded successfully for ${refundTarget.businessName || 'client'}.`, 'success');
      setRefundTarget(null);
      setRefundReason('');
      await fetchRevenueData(true);
    } catch (err: any) {
      showNotification(err.message || 'Refund failed', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  // Record Manual Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.businessId || !recordForm.amount) {
      showNotification('Business ID and Amount are required', 'error');
      return;
    }

    setIsRecording(true);
    try {
      const res = await authFetch('/api/admin/revenue/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recordForm,
          amount: Number(recordForm.amount),
          currency: currencySymbol === '৳' ? 'BDT' : 'USD',
          type: 'subscription',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to record payment');
      }

      showNotification('Payment recorded and synced successfully.', 'success');
      setRecordModalOpen(false);
      setRecordForm({
        businessId: '',
        businessName: '',
        amount: '',
        plan: 'Nexus Pro',
        billingCycle: 'monthly',
        method: 'bKash Merchant',
        paymentReference: '',
        invoiceNumber: '',
        note: '',
      });
      await fetchRevenueData(true);
    } catch (err: any) {
      showNotification(err.message || 'Payment recording failed', 'error');
    } finally {
      setIsRecording(false);
    }
  };

  // Summary Metrics calculations
  const s = summary || {
    totalRevenue: 0,
    totalGrossRevenue: 0,
    totalRefunded: 0,
    netRevenue: 0,
    subscriptionRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    todayRevenue: 0,
    paymentCount: 0,
    refundCount: 0,
    byPlan: {},
    byMethod: {},
    monthly: [],
    yearly: [],
  };

  const netRevenue = Number(s.netRevenue ?? (Number(s.totalRevenue || 0) - Number(s.totalRefunded || 0)));
  const subscriptionRevenue = Number(s.subscriptionRevenue || 0);
  const byPlanEntries = useMemo(() => Object.entries(s.byPlan || {}), [s.byPlan]);
  const monthlyList = Array.isArray(s.monthly) ? s.monthly : [];
  const byMethodEntries = useMemo(() => Object.entries(s.byMethod || {}), [s.byMethod]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
          {toast.type === 'info' && <Clock className="w-4 h-4 text-indigo-600" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                SaaS Revenue & Billing Center
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time verified subscription cash flow, payment records, and financial analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchRevenueData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Refresh revenue data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-slate-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Manual Payment</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Gross Revenue</p>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {currencySymbol}
            {Number(s.totalGrossRevenue || s.totalRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{s.paymentCount || 0} completed transaction(s)</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200/80 shadow-sm relative overflow-hidden group transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] uppercase font-black tracking-wider text-emerald-700">Net Recognized</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            {currencySymbol}
            {Number(netRevenue).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Gross minus all issued refunds</span>
          </div>
        </div>

        {/* Subscription Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] uppercase font-black tracking-wider text-indigo-500">Subscription Plans</p>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {currencySymbol}
            {Number(subscriptionRevenue).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>
              {s.totalGrossRevenue > 0
                ? `${Math.round((subscriptionRevenue / s.totalGrossRevenue) * 100)}% of total revenue`
                : '100% of revenue'}
            </span>
          </div>
        </div>

        {/* Month Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">This Month</p>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">
            {currencySymbol}
            {Number(s.monthRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Today: {currencySymbol}{Number(s.todayRevenue || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Total Refunded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] uppercase font-black tracking-wider text-rose-500">Total Refunded</p>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {currencySymbol}
            {Number(s.totalRefunded || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>{s.refundCount || 0} refund transaction(s)</span>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown: By Plan & Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Plan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" /> Revenue by Subscription Plan
              </h3>
              <p className="text-xs text-slate-400">Total earnings categorized across active plan tiers</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {byPlanEntries.length} Active Plans
            </span>
          </div>

          {byPlanEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No plan revenue records recorded yet.
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {byPlanEntries.map(([planName, data]: [string, any]) => {
                const amount = typeof data === 'object' ? Number(data.amount || 0) : Number(data || 0);
                const count = typeof data === 'object' ? Number(data.count || 0) : 1;
                const percentage = s.totalGrossRevenue > 0 ? Math.round((amount / s.totalGrossRevenue) * 100) : 0;

                return (
                  <div key={planName} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800 flex items-center gap-2">
                        <span>{planName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">({count} client{count !== 1 ? 's' : ''})</span>
                      </span>
                      <span className="text-slate-900">
                        {currencySymbol}{amount.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods & Monthly Summary */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Payment Methods
            </h3>
            <p className="text-xs text-slate-400 mb-4">Volume processed per payment channel</p>

            {byMethodEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No payment method records.</p>
            ) : (
              <div className="space-y-3">
                {byMethodEntries.map(([method, amount]: [string, any]) => (
                  <div key={method} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-600">{method}</span>
                    <span className="font-bold text-slate-900">
                      {currencySymbol}{Number(amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend Snapshot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Recent Monthly Performance
            </h3>
            <p className="text-xs text-slate-400 mb-4">Last 3 months revenue snapshot</p>

            {monthlyList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No monthly trend available.</p>
            ) : (
              <div className="space-y-2.5">
                {monthlyList.slice(-3).reverse().map((m: any) => (
                  <div key={m.month} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">{m.month}</span>
                    <span className="font-bold text-slate-900">
                      {currencySymbol}{Number(m.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History & Payments Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Verified Payment Records
              </h3>
              <p className="text-xs text-slate-400">
                Audited transaction ledger for all subscription and template earnings ({totalCount} total)
              </p>
            </div>

            {/* Date Presets */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
              {(['all', 'today', 'month', 'year'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleDatePreset(preset)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                    datePreset === preset
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {preset === 'all' ? 'All Time' : preset === 'month' ? 'This Month' : preset === 'year' ? 'This Year' : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search business, invoice, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid / Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Plans</option>
                <option value="Nexus Pro">Nexus Pro</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Pro">Pro</option>
                <option value="Basic">Basic Starter</option>
              </select>
            </div>

            {/* Revenue Source / Type */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Revenue Sources</option>
                <option value="subscription">Subscriptions</option>
                <option value="template">Invoice Templates</option>
                <option value="manual">Manual Adjustments</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('all');
                  setStartDate(e.target.value);
                }}
                className="w-full text-[11px] px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('all');
                  setEndDate(e.target.value);
                }}
                className="w-full text-[11px] px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                title="End Date"
              />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Date / Invoice</th>
                <th className="px-4 py-3">Business Client</th>
                <th className="px-4 py-3">Plan / Source</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>Loading verified revenue records...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No payment records match the selected filters.
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => {
                  const isPaid = String(p.status || '').toLowerCase() === 'paid' || String(p.status || '').toLowerCase() === 'completed';
                  const isRef = String(p.status || '').toLowerCase() === 'refunded';
                  const isFail = String(p.status || '').toLowerCase() === 'failed';
                  const isPend = String(p.status || '').toLowerCase() === 'pending' || String(p.status || '').toLowerCase() === 'pendingverification';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date / Invoice */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">
                          {p.createdAt ? p.createdAt.slice(0, 10) : '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.invoiceNumber || p.id.slice(0, 10)}
                        </div>
                      </td>

                      {/* Business Client */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {p.businessName || p.businessId || '—'}
                        </div>
                        {p.businessId && p.businessId !== p.businessName && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                            ID: {p.businessId}
                          </div>
                        )}
                      </td>

                      {/* Plan / Source */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-indigo-600">
                          {p.plan || 'Subscription'}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                            {p.billingCycle || 'monthly'}
                          </span>
                          <span className="text-[9px] text-slate-400 capitalize">
                            · {p.type || 'subscription'}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <div className={`font-black text-sm ${isRef ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {p.currency === 'BDT' ? '৳' : p.currency === 'USD' ? '$' : currencySymbol}
                          {Number(p.amount || 0).toLocaleString()}
                        </div>
                        {isRef && (
                          <div className="text-[10px] text-rose-600 font-bold">
                            Refunded
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {p.paymentMethod || p.method || 'Online'}
                        </div>
                        {p.paymentReference && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {p.paymentReference}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md inline-flex items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRef
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isFail
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isRef && <RotateCcw className="w-3 h-3 text-rose-600" />}
                          {isFail && <XCircle className="w-3 h-3 text-slate-500" />}
                          {isPend && <Clock className="w-3 h-3 text-amber-600" />}
                          {p.status || 'Paid'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundTarget(p);
                                setRefundReason('');
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                              title="Issue Refund"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Commission Setting */}
      {setCommissionRate && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Platform Commission Fee (%)</h4>
            <p className="text-xs text-slate-400">Configured baseline rate applied across marketplace transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="w-24 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-center bg-slate-50"
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
            />
            <span className="text-xs font-bold text-slate-500">%</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRANSACTION DETAILS                                     */}
      {/* ============================================================== */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Transaction Details</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedTransaction.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Business / Shop:</span>
                <span className="font-bold text-slate-900">{selectedTransaction.businessName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Business ID:</span>
                <span className="font-mono text-slate-700">{selectedTransaction.businessId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTransaction.invoiceNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Plan:</span>
                <span className="font-bold text-indigo-600">{selectedTransaction.plan} ({selectedTransaction.billingCycle || 'monthly'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue Source:</span>
                <span className="font-bold capitalize text-slate-800">{selectedTransaction.type || 'subscription'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-bold text-slate-800">{selectedTransaction.paymentMethod || selectedTransaction.method || 'Online'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Reference:</span>
                <span className="font-mono text-slate-700">{selectedTransaction.paymentReference || '—'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Total Amount:</span>
                <span className="text-lg font-black text-slate-900">
                  {selectedTransaction.currency === 'BDT' ? '৳' : '$'}
                  {Number(selectedTransaction.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700">{selectedTransaction.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded At:</span>
                <span className="text-slate-700">{selectedTransaction.createdAt || '—'}</span>
              </div>
              {selectedTransaction.note && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Note:</span>
                  <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                    {selectedTransaction.note}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REFUND TRANSACTION                                      */}
      {/* ============================================================== */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="font-black text-slate-900 text-base">Confirm Payment Refund</h3>
            <p className="text-xs text-slate-500 mt-1">
              You are issuing a refund for{' '}
              <span className="font-bold text-slate-800">{refundTarget.businessName || refundTarget.businessId}</span>{' '}
              amounting to{' '}
              <span className="font-bold text-rose-600">
                {refundTarget.currency === 'BDT' ? '৳' : '$'}{Number(refundTarget.amount || 0).toLocaleString()}
              </span>.
              This will deduct from recognized net revenue and trigger audit signals.
            </p>

            <div className="my-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Refund *</label>
              <textarea
                rows={2}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Plan downgrade adjustment or accidental double charge"
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRefunding || !refundReason.trim()}
                onClick={handleExecuteRefund}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20 disabled:opacity-50"
              >
                {isRefunding ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECORD MANUAL PAYMENT                                   */}
      {/* ============================================================== */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Record Offline / Manual Payment</h3>
                  <p className="text-[10px] text-slate-400">Directly record a bank transfer or cash collection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. shop-123 or biz ID"
                    value={recordForm.businessId}
                    onChange={(e) => setRecordForm({ ...recordForm, businessId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Super Shop"
                    value={recordForm.businessName}
                    onChange={(e) => setRecordForm({ ...recordForm, businessName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount ({currencySymbol}) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2499"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Tier</label>
                  <select
                    value={recordForm.plan}
                    onChange={(e) => setRecordForm({ ...recordForm, plan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="Nexus Pro">Nexus Pro</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Pro">Pro</option>
                    <option value="Basic Starter">Basic Starter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={recordForm.billingCycle}
                    onChange={(e) => setRecordForm({ ...recordForm, billingCycle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={recordForm.method}
                    onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="bKash Merchant">bKash Merchant</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer / Wire</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash Offline Collection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference / Trx ID</label>
                  <input
                    type="text"
                    placeholder="e.g. TRX-88992"
                    value={recordForm.paymentReference}
                    onChange={(e) => setRecordForm({ ...recordForm, paymentReference: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={recordForm.invoiceNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified by bank counter voucher"
                  value={recordForm.note}
                  onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecording}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md shadow-slate-900/20 flex items-center justify-center gap-1.5"
                >
                  {isRecording ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenueCenterTab;
