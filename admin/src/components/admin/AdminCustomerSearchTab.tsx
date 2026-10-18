import React from 'react';
import {
  Search,
  Users,
  Phone,
  MapPin,
  Mail,
  Store,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';

type Props = {
  handleCustomerSearch?: (phone: string) => void;
  searchPhone?: string;
  setSearchPhone?: (v: string) => void;
  searchResult?: any | null;
  hasSearched?: boolean;
  currencySymbol?: string;
  user?: any;
};

/** SaaS Admin — Global customer registry search by phone */
export const AdminCustomerSearchTab: React.FC<Props> = ({
  handleCustomerSearch,
  searchPhone = '',
  setSearchPhone,
  searchResult = null,
  hasSearched = false,
  currencySymbol = '৳',
}) => {
  const onSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleCustomerSearch?.(searchPhone);
  };

  const profile = searchResult?.profile;
  const businesses = Array.isArray(searchResult?.businesses)
    ? searchResult.businesses
    : Array.isArray(searchResult?.connectedBusinesses)
      ? searchResult.connectedBusinesses
      : [];
  const transactions = Array.isArray(searchResult?.transactions) ? searchResult.transactions : [];
  const totalSales = searchResult?.totalSales ?? searchResult?.totalSalesAcrossAll ?? 0;
  const totalPaid = searchResult?.totalPaid ?? searchResult?.totalPaidAcrossAll ?? 0;
  const totalDue = searchResult?.totalDue ?? searchResult?.totalDueAcrossAll ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Global registry</p>
        <h2 className="text-2xl font-black mt-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400" /> Customer search
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-xl">
          Find a customer across all tenant shops by mobile number. Shows linked businesses, dues and recent activity.
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="tel"
            value={searchPhone}
            onChange={(e) => setSearchPhone?.(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" /> Search
        </button>
      </form>

      {hasSearched && !searchResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-800">No customer found</p>
          <p className="text-xs text-amber-700 mt-1">Try another mobile number</p>
        </div>
      )}

      {searchResult && profile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3">Profile</h3>
              <p className="text-lg font-black text-slate-900">{profile.name || '—'}</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {profile.mobile || '—'}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {profile.email || '—'}
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  <span>{profile.address || '—'}</span>
                </li>
              </ul>
              {profile.group && (
                <span className="inline-block mt-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {profile.group}
                </span>
              )}
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <Stat
                label="Total sales"
                value={`${currencySymbol}${Number(totalSales).toLocaleString()}`}
                icon={TrendingUp}
                tone="emerald"
              />
              <Stat
                label="Total paid"
                value={`${currencySymbol}${Number(totalPaid).toLocaleString()}`}
                icon={TrendingUp}
                tone="indigo"
              />
              <Stat
                label="Outstanding due"
                value={`${currencySymbol}${Number(totalDue).toLocaleString()}`}
                icon={AlertCircle}
                tone="rose"
              />
              <Stat
                label="Linked shops"
                value={businesses.length}
                icon={Store}
                tone="slate"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800">Connected businesses</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {businesses.length === 0 && (
                <p className="text-xs text-slate-400 p-6 text-center">No shop links</p>
              )}
              {businesses.map((b: any, i: number) => (
                <div key={b.id || i} className="px-4 py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-800">{b.businessName || b.name || 'Shop'}</p>
                    <p className="text-[10px] text-slate-400">{b.id}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-rose-600">
                      Due {currencySymbol}
                      {Number(b.due || 0).toLocaleString()}
                    </p>
                    <p className="text-slate-500">
                      Spent {currencySymbol}
                      {Number(b.spent || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Recent transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[640px]">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Shop</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No transactions recorded
                      </td>
                    </tr>
                  )}
                  {transactions.slice(0, 50).map((tx: any, idx: number) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{tx.date || '—'}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs">
                        {tx.businessName || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {tx.type || 'Sale'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                        {currencySymbol}
                        {Number(tx.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-rose-600 tabular-nums">
                        {currencySymbol}
                        {Number(tx.dueAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!hasSearched && (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Enter a mobile number to search</p>
          <p className="text-xs text-slate-400 mt-1">Cross-tenant customer lookup</p>
        </div>
      )}
    </div>
  );
};

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  tone: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    slate: 'text-slate-800',
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
        <Icon className="w-3.5 h-3.5 text-slate-300" />
      </div>
      <p className={`text-xl font-black ${tones[tone] || tones.slate}`}>{value}</p>
    </div>
  );
}

export default AdminCustomerSearchTab;
