import React, { useMemo, useState } from 'react';
import {
  Search,
  Store,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
  LogIn,
  Users,
  Building2,
  CheckCircle,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { SubscriptionHealthBadge } from './SubscriptionHealthBadge';

type Props = {
  searchTerm?: string;
  setSearchTerm?: (v: string) => void;
  visibleUsers?: any[];
  currencySymbol?: string;
  getUserTotalBusiness?: (u: any) => number;
  isSuperAdmin?: boolean;
  handleEditClick?: (u: any) => void;
  handleDeleteUser?: (id: string) => void;
  handleForceSync?: (u: any) => void;
  handleViewTransactions?: (u: any) => void;
  impersonateUser?: (u: any) => void;
  onRefresh?: () => void;
};

/** SaaS Admin — Business Management */
export const AdminBusinessesTab: React.FC<Props> = ({
  searchTerm: searchTermProp,
  setSearchTerm: setSearchTermProp,
  visibleUsers = [],
  currencySymbol = '৳',
  getUserTotalBusiness,
  isSuperAdmin = false,
  handleEditClick,
  handleDeleteUser,
  handleForceSync,
  handleViewTransactions,
  impersonateUser,
  onRefresh,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Suspended' | 'Trial'>('ALL');

  const searchTerm = searchTermProp !== undefined ? searchTermProp : localSearch;
  const setSearchTerm = setSearchTermProp || setLocalSearch;

  const list = Array.isArray(visibleUsers) ? visibleUsers : [];

  const filtered = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    return list.filter((u) => {
      const status = String(u.status || u.accountStatus || 'Active');
      if (statusFilter === 'Trial') {
        if (!(u.plan === 'Trial' || u.isTrial || status.toLowerCase().includes('trial'))) return false;
      } else if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        u.id,
        u.businessName,
        u.name,
        u.email,
        u.mobile,
        u.phone,
        u.plan,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const active = list.filter((u) => (u.status || u.accountStatus) === 'Active').length;
    const suspended = list.filter((u) => (u.status || u.accountStatus) === 'Suspended').length;
    const trial = list.filter((u) => u.plan === 'Trial' || u.isTrial).length;
    return { total: list.length, active, suspended, trial };
  }, [list]);

  const gmv = (u: any) => {
    if (typeof getUserTotalBusiness === 'function') {
      try {
        return Number(getUserTotalBusiness(u) || 0);
      } catch {
        /* fall through */
      }
    }
    return Number(u.totalSell || u.lifetimeSales || 0);
  };

  const statusBadge = (u: any) => {
    const s = String(u.status || u.accountStatus || 'Active');
    if (s === 'Active')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    if (s === 'Suspended')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" /> Suspended
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <Ban className="w-3 h-3" /> {s}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" /> Businesses
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All registered shops · limits · subscription health
          </p>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Total shops</p>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Active</p>
          <p className="text-2xl font-black text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Suspended</p>
          <p className="text-2xl font-black text-amber-600">{stats.suspended}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Trial</p>
          <p className="text-2xl font-black text-indigo-600">{stats.trial}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shop name, mobile, email, ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['ALL', 'Active', 'Suspended', 'Trial'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                statusFilter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-center">Plan / expiry</th>
                <th className="px-4 py-3 text-center">Staff</th>
                <th className="px-4 py-3 text-center">Branches</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Store className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-500">
                      {list.length === 0 ? 'No businesses loaded yet' : 'No match for filters'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {list.length === 0
                        ? 'Sync from backend or wait for registered shops'
                        : 'Try clearing search or status filter'}
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id || u.mobile || u.email} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800 truncate max-w-[180px]">
                      {u.businessName || u.name || 'Unnamed shop'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                      {u.id || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 text-xs truncate max-w-[160px]">{u.email || '—'}</p>
                    <p className="text-[11px] text-slate-500">{u.mobile || u.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          u.plan === 'Enterprise'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : u.plan === 'Pro'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.plan || 'Free'}
                      </span>
                      {u.expiry ? <SubscriptionHealthBadge expiry={String(u.expiry)} /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                      <Users className="w-3 h-3 text-slate-400" />
                      {u.employeeCount ?? 0}/{u.employeeLimit ?? 3}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {u.branchCount ?? 1}/{u.branchLimit ?? 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600 tabular-nums">
                    {currencySymbol}
                    {gmv(u).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(u)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {impersonateUser && (
                        <button
                          type="button"
                          title="Login as shop"
                          onClick={() => impersonateUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {handleViewTransactions && (
                        <button
                          type="button"
                          title="View activity"
                          onClick={() => handleViewTransactions(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {handleForceSync && (
                        <button
                          type="button"
                          title="Force sync"
                          onClick={() => handleForceSync(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSuperAdmin && handleEditClick && (
                        <button
                          type="button"
                          title="Edit limits"
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSuperAdmin && handleDeleteUser && (
                        <button
                          type="button"
                          title="Remove shop"
                          onClick={() => {
                            if (window.confirm(`Remove shop “${u.businessName || u.id}”?`)) {
                              handleDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
          Showing {filtered.length} of {list.length} shops
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessesTab;
