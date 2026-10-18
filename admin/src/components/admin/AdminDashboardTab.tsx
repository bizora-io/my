import React from 'react';
import {
  Activity, TrendingUp, Users, Store, Crown, DollarSign, AlertTriangle, CheckCircle,
  Ticket, RefreshCw, Server,
} from 'lucide-react';

type Props = {
  totalRevenue?: any;
  activeSubs?: any;
  estimatedMRR?: any;
  estimatedARR?: any;
  payingCustomers?: any;
  arpu?: any;
  logoChurnRate?: any;
  revenueChurnRate?: any;
  atRiskCount?: any;
  atRiskMRR?: any;
  churnedCount?: any;
  totalNetworkSell?: any;
  totalNetworkBuy?: any;
  totalUniqueOwners?: any;
  totalAdditionalBranches?: any;
  totalNetworkBusiness?: any;
  totalNetworkDue?: any;
  saasTickets?: any;
  showToast?: any;
  simulatedRole?: any;
  user?: any;
  visibleUsers?: any;
  setActiveTab?: (tab: string) => void;
  setSelectedSupportTicket?: (t: any) => void;
  [key: string]: any;
};

/** SaaS Admin — stable dashboard (safe defaults, no crash on empty data) */
export const AdminDashboardTab: React.FC<Props> = (props) => {
  const {
    totalRevenue = 0,
    activeSubs = 0,
    estimatedMRR = 0,
    estimatedARR = 0,
    payingCustomers = 0,
    arpu = 0,
    logoChurnRate = 0,
    revenueChurnRate = 0,
    atRiskCount = 0,
    atRiskMRR = 0,
    churnedCount = 0,
    totalNetworkSell = 0,
    totalNetworkBuy = 0,
    totalUniqueOwners = 0,
    totalAdditionalBranches = 0,
    totalNetworkBusiness = 0,
    totalNetworkDue = 0,
    saasTickets = [],
    simulatedRole = 'SUPER_ADMIN',
    visibleUsers = [],
    setActiveTab,
    setSelectedSupportTicket,
  } = props;

  const users = Array.isArray(visibleUsers) ? visibleUsers : [];
  const tickets = Array.isArray(saasTickets) ? saasTickets : [];
  const openTickets = tickets.filter((t: any) => t?.status === 'Open' || t?.status === 'open');

  const pct = (n: number) => `${(Number(n) * (Number(n) <= 2 ? 100 : 1)).toFixed(1)}%`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Platform overview</h2>
          <p className="text-xs text-slate-500">
            Role view: <span className="font-bold text-indigo-600">{simulatedRole}</span>
            {' · '}
            {users.length} shops in scope
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab?.('analytics-center')}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5" /> Full analytics
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Shops" value={users.length} icon={Store} />
        <Stat label="Active subs" value={activeSubs} icon={CheckCircle} tone="emerald" />
        <Stat label="Est. MRR" value={`$${Number(estimatedMRR).toLocaleString()}`} icon={DollarSign} tone="indigo" />
        <Stat label="Est. ARR" value={`$${Number(estimatedARR).toLocaleString()}`} icon={TrendingUp} tone="indigo" />
        <Stat label="Paying" value={payingCustomers} icon={Users} />
        <Stat label="ARPU" value={`$${Number(arpu).toFixed(2)}`} icon={Crown} />
        <Stat label="Logo churn" value={pct(logoChurnRate)} icon={AlertTriangle} tone="rose" />
        <Stat label="Rev. churn" value={pct(revenueChurnRate)} icon={AlertTriangle} tone="amber" />
        <Stat label="At risk" value={atRiskCount} sub={`MRR $${Number(atRiskMRR).toLocaleString()}`} tone="amber" />
        <Stat label="Churned" value={churnedCount} />
        <Stat label="Network sell" value={Number(totalNetworkSell).toLocaleString()} />
        <Stat label="Network buy" value={Number(totalNetworkBuy).toLocaleString()} />
        <Stat label="Unique owners" value={totalUniqueOwners} />
        <Stat label="Extra branches" value={totalAdditionalBranches} />
        <Stat label="Network GMV" value={Number(totalNetworkBusiness).toLocaleString()} tone="emerald" />
        <Stat label="Network due" value={Number(totalNetworkDue).toLocaleString()} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-500" /> Recent shops
          </h3>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {users.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No businesses loaded yet</p>
            )}
            {users.slice(0, 8).map((u: any) => (
              <div key={u.id || u.mobile} className="py-2.5 flex justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{u.businessName || u.name || 'Shop'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.email || u.mobile}</p>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">{u.plan || u.status || ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-rose-500" /> Open tickets
            </h3>
            <button
              type="button"
              className="text-[10px] font-bold text-indigo-600"
              onClick={() => setActiveTab?.('support')}
            >
              Support desk →
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {openTickets.length === 0 && (
              <div className="p-6 text-center bg-slate-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">All caught up</p>
              </div>
            )}
            {openTickets.slice(0, 5).map((t: any) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab?.('support');
                  setSelectedSupportTicket?.(t);
                }}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
              >
                <p className="text-sm font-bold text-slate-800 truncate">{t.subject || t.title || t.id}</p>
                <p className="text-[10px] text-slate-400">{t.businessName || t.status}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Server className="w-4 h-4 text-indigo-300" />
          Ops shortcuts
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['businesses', 'Businesses'],
            ['subscriptions', 'Subscriptions'],
            ['analytics-center', 'Analytics'],
            ['monitoring-center', 'Monitoring'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab?.(id)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: any;
  tone?: string;
}) {
  const tones: Record<string, { text: string; bg: string; glow: string }> = {
    slate: { text: 'text-slate-800', bg: 'bg-slate-100 text-slate-600', glow: 'from-slate-500/5 to-slate-500/0' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-600', glow: 'from-indigo-500/10 to-blue-500/5' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', glow: 'from-emerald-500/10 to-teal-500/5' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50 text-rose-600', glow: 'from-rose-500/10 to-red-500/5' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50 text-amber-600', glow: 'from-amber-500/10 to-orange-500/5' },
  };
  const theme = tones[tone] || tones.slate;

  return (
    <div className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-gradient-to-br ${theme.glow} blur-lg opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="relative z-10 flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {Icon ? (
          <div className={`p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${theme.bg}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        ) : null}
      </div>
      <p className={`relative z-10 text-xl font-black tracking-tight ${theme.text}`}>{value}</p>
      {sub ? <p className="relative z-10 text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p> : null}
    </div>
  );
}

export default AdminDashboardTab;
