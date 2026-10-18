import React, { useMemo, useState } from 'react';
import { Package, Search, Phone, Mail, Store } from 'lucide-react';

type Props = {
  visibleUsers?: any[];
  currencySymbol?: string;
};

/**
 * SaaS Admin — aggregate supplier snapshot from tenant shops (local keys).
 */
export const AdminSuppliersTab: React.FC<Props> = ({
  visibleUsers = [],
  currencySymbol = '৳',
}) => {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const out: any[] = [];
    const shops = Array.isArray(visibleUsers) ? visibleUsers : [];
    shops.forEach((u) => {
      let list: any[] = [];
      try {
        const raw = localStorage.getItem(`nexus_suppliers_${u.id}`);
        if (raw) list = JSON.parse(raw);
      } catch {
        list = [];
      }
      if (!Array.isArray(list) || list.length === 0) return;
      list.forEach((s) => {
        out.push({
          ...s,
          shopId: u.id,
          shopName: u.businessName || u.name || u.id,
        });
      });
    });
    return out;
  }, [visibleUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) =>
      [s.name, s.mobile, s.phone, s.email, s.shopName, s.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" /> Suppliers
        </h2>
        <p className="text-xs text-slate-300 mt-1">Suppliers linked to tenant shops (device registry)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Total records</p>
          <p className="text-2xl font-black text-slate-800">{rows.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Shops scanned</p>
          <p className="text-2xl font-black text-emerald-600">{(visibleUsers || []).length}</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier or shop…"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-xs">
                    {rows.length === 0
                      ? 'No supplier data found for loaded shops'
                      : 'No match for search'}
                  </td>
                </tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id || `${s.shopId}-${i}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{s.name || '—'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{s.id || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {s.mobile || s.phone || '—'}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Mail className="w-3 h-3" />
                      {s.email || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <Store className="w-3 h-3 text-slate-400" />
                      {s.shopName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-600 tabular-nums">
                    {currencySymbol}
                    {Number(s.due || s.balance || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
          Showing {filtered.length} of {rows.length}
        </div>
      </div>
    </div>
  );
};

export default AdminSuppliersTab;
