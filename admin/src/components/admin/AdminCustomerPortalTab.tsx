import React, { useState, useMemo } from 'react';
import {
  Users, Search, RefreshCw, CheckCircle, Shield, Store, AlertCircle, Phone, Mail
} from 'lucide-react';

type Props = {
  customerPortalAccounts: any[];
  setCustomerPortalAccounts: (accounts: any[]) => void;
  showToast: (msg: string, type?: string) => void;
  refreshCustomers?: () => void;
};

export const AdminCustomerPortalTab: React.FC<Props> = ({
  customerPortalAccounts = [],
  setCustomerPortalAccounts,
  showToast,
  refreshCustomers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshCustomers) {
        await refreshCustomers();
      }
      showToast('Customer directory refreshed from database', 'success');
    } catch {
      showToast('Failed to refresh customers', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Distinct businesses list
  const businesses = useMemo(() => {
    const set = new Set<string>();
    customerPortalAccounts.forEach(c => {
      if (c.businessName) set.add(c.businessName);
    });
    return Array.from(set);
  }, [customerPortalAccounts]);

  // Filtered accounts
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerPortalAccounts.filter(cust => {
      if (selectedBusiness !== 'ALL' && cust.businessName !== selectedBusiness) return false;
      if (!q) return true;
      const hay = [cust.id, cust.name, cust.phone, cust.mobile, cust.email, cust.businessName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customerPortalAccounts, searchQuery, selectedBusiness]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Customer Registry & Directory
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Cross-tenant view of registered customers across all active business shops.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync & Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Total Customers</p>
          <p className="text-2xl font-black text-slate-800">{customerPortalAccounts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Filtered</p>
          <p className="text-2xl font-black text-indigo-600">{filtered.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black uppercase text-slate-400">Connected Shops</p>
          <p className="text-2xl font-black text-slate-800">{businesses.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Search & Business Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, mobile, email, shop..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {businesses.length > 0 && (
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            >
              <option value="ALL">All Shops ({businesses.length})</option>
              {businesses.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase">
              <tr>
                <th className="px-5 py-3">Customer ID</th>
                <th className="px-5 py-3">Customer Name</th>
                <th className="px-5 py-3">Tenant Shop</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Current Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cust => (
                <tr key={`${cust.businessId || 'biz'}-${cust.id}`} className="hover:bg-slate-50 text-slate-700">
                  <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 text-xs">
                    {cust.id}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{cust.name}</p>
                    {cust.email && <p className="text-[11px] text-slate-400">{cust.email}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Store className="w-3 h-3 text-indigo-500" />
                      {cust.businessName || 'Main Store'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-xs">{cust.phone || cust.mobile || '—'}</p>
                    <p className="text-[10px] text-slate-400">{cust.loginLogs || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-rose-600">
                    {Number(cust.currentDue || 0) > 0 ? `৳ ${Number(cust.currentDue).toLocaleString()}` : '৳ 0'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      cust.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {cust.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = cust.status === 'Active' ? 'Suspended' : 'Active';
                        const updated = customerPortalAccounts.map(c => 
                          (c.id === cust.id && c.businessId === cust.businessId) ? { ...c, status: newStatus } : c
                        );
                        setCustomerPortalAccounts(updated);
                        showToast(`Status updated to ${newStatus} for ${cust.name}`, 'success');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition"
                    >
                      {cust.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 p-6">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No customers found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchQuery ? `No records match "${searchQuery}".` : 'Customers registered by Shop Owners will appear here automatically.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerPortalTab;
