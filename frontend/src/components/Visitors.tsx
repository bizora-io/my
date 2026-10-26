import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { UserCheck, Plus, RefreshCw, LogIn, LogOut, ShieldCheck, Clock, Users } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface VisitorRecord {
  id: string;
  visitorName: string;
  phone: string;
  company?: string;
  hostEmployeeName?: string;
  purpose: string;
  badgeNumber?: string;
  status: 'REGISTERED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
}

export const Visitors: React.FC = () => {
  const { t } = useSettings();
  const { employees } = useData();
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'onsite'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [hostEmployeeName, setHostEmployeeName] = useState('');
  const [purpose, setPurpose] = useState('Meeting');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'onsite' ? '/api/visitors/on-site' : '/api/visitors';
      const res = await authFetch(endpoint);
      if (res.ok) setVisitors(await res.json());
    } catch (e) {
      console.warn('Failed to load visitors', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !phone) return;
    try {
      const res = await authFetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName,
          phone,
          company,
          hostEmployeeName,
          purpose,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setVisitorName('');
        setPhone('');
        setCompany('');
        loadData();
      }
    } catch (e) {
      console.warn('Register visitor failed', e);
    }
  };

  const handleCheckIn = async (id: string) => {
    const badgeNumber = prompt(t('Enter badge / pass number (or leave blank for auto):')) || undefined;
    try {
      const res = await authFetch(`/api/visitors/${id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNumber }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Check-in failed', e);
    }
  };

  const handleCheckOut = async (id: string) => {
    if (!confirm(t('Check out this visitor?'))) return;
    try {
      const res = await authFetch(`/api/visitors/${id}/check-out`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Check-out failed', e);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            {t('Visitor & Gatepass Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Pre-register guests, issue badge passes, track live on-site building presence, and maintain audit logs.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Register Visitor')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'all'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('All Visitor Records')}
        </button>
        <button
          onClick={() => setActiveTab('onsite')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'onsite'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {t('Currently On-Site')}
        </button>
      </div>

      {/* Visitors Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('Visitor')}</th>
                <th className="p-4">{t('Company')}</th>
                <th className="p-4">{t('Host Employee')}</th>
                <th className="p-4">{t('Purpose')}</th>
                <th className="p-4">{t('Badge #')}</th>
                <th className="p-4">{t('Check-in / Out')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t('No visitor records found.')}
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div>{v.visitorName}</div>
                      <div className="text-xs text-slate-400 font-normal">{v.phone}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                      {v.company || '—'}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {v.hostEmployeeName || 'Front Desk'}
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                      {v.purpose}
                    </td>
                    <td className="p-4">
                      {v.badgeNumber ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold">
                          {v.badgeNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                      {v.checkedInAt ? new Date(v.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {v.checkedOutAt && ` - ${new Date(v.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          v.status === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : v.status === 'CHECKED_OUT'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}
                      >
                        {v.status === 'CHECKED_IN' ? 'On-Site' : v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      {v.status === 'REGISTERED' && (
                        <button
                          onClick={() => handleCheckIn(v.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          {t('Check-in')}
                        </button>
                      )}
                      {v.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleCheckOut(v.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t('Check-out')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              {t('Register New Visitor')}
            </h2>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Visitor Full Name')} *
                </label>
                <input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Phone Number')} *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Company / Org')}
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Host Employee')}
                </label>
                <select
                  value={hostEmployeeName}
                  onChange={(e) => setHostEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="Front Desk">Front Desk / General</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name} ({e.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Purpose of Visit')}
                </label>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Sales pitch, Interview, Delivery"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                  {t('Register Pass')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;

