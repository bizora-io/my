import React from 'react';
import { Star, TrendingUp, Users, Activity, Download, RefreshCw } from 'lucide-react';
import AdminReadinessPanel from './AdminReadinessPanel';

type Props = {
  authFetch?: any;
  readinessFilter?: any;
  readinessOpen?: boolean;
  readinessReport?: any;
  serverDashboardStats?: any;
  setEditingUser?: any;
  setReadinessFilter?: any;
  setReadinessOpen?: any;
  setReadinessReport?: any;
  setServerDashboardStats?: any;
  setShowEditModal?: any;
  showToast?: (msg: string, type?: string) => void;
};

/**
 * SaaS Analytics Center — churn, signups, NRR from server dashboard stats.
 */
export const AdminAnalyticsCenterTab: React.FC<Props> = ({
  authFetch,
  readinessFilter = 'all',
  readinessOpen,
  readinessReport,
  serverDashboardStats,
  setReadinessFilter,
  setReadinessOpen,
  setReadinessReport,
  setServerDashboardStats,
  showToast,
}) => {
  const s = serverDashboardStats || {};
  const logoChurn = Number(s.logoChurnRate ?? 0);
  const revenueChurn = Number(s.revenueChurnRate ?? 0);
  const nrr = s.nrr ?? s.nrrRate ?? null;
  const paying = s.payingCustomers ?? 0;
  const atRisk = s.atRiskCount ?? 0;
  const churned = s.churnedCount ?? 0;
  const cohorts = Array.isArray(s.cohorts) ? s.cohorts : [];
  const recentSignups = Array.isArray(s.recentSignups) ? s.recentSignups : [];
  const planCounts = s.planCounts || {};

  const reload = async () => {
    if (!authFetch) return;
    try {
      const res = await authFetch('/api/admin/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        setServerDashboardStats?.(data);
        showToast?.('Analytics refreshed');
      } else {
        showToast?.('Failed to refresh analytics', 'error');
      }
    } catch {
      showToast?.('Failed to refresh analytics', 'error');
    }
  };

  const loadReadiness = async () => {
    if (!authFetch) return;
    try {
      const res = await authFetch('/api/admin/readiness');
      if (res.ok) {
        const data = await res.json();
        setReadinessReport?.(data);
        setReadinessOpen?.(true);
        setReadinessFilter?.('all');
      } else {
        showToast?.('Readiness check failed', 'error');
      }
    } catch {
      showToast?.('Readiness check failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Analytics Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Churn, retention, signups & plan mix from live server metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadReadiness}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            Prod readiness
          </button>
          <button
            type="button"
            onClick={reload}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Logo churn</p>
          <p className="text-2xl font-black text-rose-600">{(logoChurn * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Revenue churn</p>
          <p className="text-2xl font-black text-amber-600">{(revenueChurn * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">NRR</p>
          <p className="text-2xl font-black text-emerald-600">
            {nrr != null ? `${(Number(nrr) * (Number(nrr) <= 2 ? 100 : 1)).toFixed(0)}%` : '—'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Paying customers</p>
          <p className="text-2xl font-black text-slate-800">{paying}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">At risk</p>
          <p className="text-2xl font-black text-amber-700">{atRisk}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Churned</p>
          <p className="text-2xl font-black text-slate-800">{churned}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm col-span-2">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Plan mix</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(planCounts).length === 0 && (
              <span className="text-xs text-slate-400">No plan data yet</span>
            )}
            {Object.entries(planCounts).map(([plan, count]) => (
              <span
                key={plan}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {plan}: {String(count)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-500" /> Recent signups
          </h3>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {recentSignups.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No recent signups in payload</p>
            )}
            {recentSignups.slice(0, 12).map((u: any, i: number) => (
              <div key={u.id || u.email || i} className="py-2.5 flex justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{u.businessName || u.name || u.email || 'Shop'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.email || u.mobile || ''}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 shrink-0">{u.plan || u.createdAt || ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Cohorts
          </h3>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {cohorts.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No cohort rows yet</p>
            )}
            {cohorts.slice(0, 12).map((c: any, i: number) => (
              <div key={c.month || c.id || i} className="py-2.5 flex justify-between text-sm">
                <span className="font-bold text-slate-700">{c.month || c.label || `Cohort ${i + 1}`}</span>
                <span className="text-xs font-black text-indigo-600">
                  {c.retention != null
                    ? `${(Number(c.retention) * (Number(c.retention) <= 2 ? 100 : 1)).toFixed(0)}%`
                    : c.count ?? c.size ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {readinessOpen && readinessReport && setReadinessOpen && setReadinessFilter && (
        <AdminReadinessPanel
          report={readinessReport}
          filter={readinessFilter}
          onFilterChange={setReadinessFilter}
          onClose={() => setReadinessOpen(false)}
          showToast={showToast || (() => {})}
        />
      )}
    </div>
  );
};

export default AdminAnalyticsCenterTab;
