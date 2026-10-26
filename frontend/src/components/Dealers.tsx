import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { Award, Plus, RefreshCw, Trophy, Target, TrendingUp, DollarSign } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface DealerTarget {
  id: string;
  dealerId?: string;
  dealerName: string;
  year: number;
  month: number;
  targetAmount: number;
  achievedAmount: number;
  achievementPercent: number;
  commissionRate: number;
  earnedCommission: number;
  status: 'IN_PROGRESS' | 'MET' | 'EXCEEDED' | 'UNMET';
}

export const Dealers: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const { customers } = useData();
  const [targets, setTargets] = useState<DealerTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [dealerName, setDealerName] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(100000);
  const [commissionRate, setCommissionRate] = useState<number>(2.5);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/dealers/targets?year=${year}&month=${month}`);
      if (res.ok) setTargets(await res.json());
    } catch (e) {
      console.warn('Failed to load dealer targets', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDealerSelect = (cId: string) => {
    setDealerId(cId);
    const c = customers.find((cust) => cust.id === cId);
    if (c) setDealerName(c.name);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || targetAmount <= 0) return;
    try {
      const res = await authFetch('/api/dealers/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: dealerId || undefined,
          dealerName,
          year,
          month,
          targetAmount,
          commissionRate,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setDealerName('');
        setDealerId('');
        loadData();
      }
    } catch (e) {
      console.warn('Save dealer target failed', e);
    }
  };

  const handleRefreshTarget = async (tRecord: DealerTarget) => {
    try {
      const res = await authFetch('/api/dealers/targets/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: tRecord.dealerId,
          dealerName: tRecord.dealerName,
          year: tRecord.year,
          month: tRecord.month,
        }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Refresh target failed', e);
    }
  };

  const totalTarget = targets.reduce((s, t) => s + (t.targetAmount || 0), 0);
  const totalAchieved = targets.reduce((s, t) => s + (t.achievedAmount || 0), 0);
  const totalCommission = targets.reduce((s, t) => s + (t.earnedCommission || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            {t('Dealer Targets & Commission System')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Set monthly sales quotas for distributor partners, track real-time achievement, and calculate commissions.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selectors */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-800 dark:text-white font-semibold"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
              <option key={m} value={m}>Month {m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-800 dark:text-white font-semibold"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Set Target')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Month Target')}
          </span>
          <span className="text-2xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(totalTarget)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Month Achieved')}
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalAchieved)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Earned Commission')}
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalCommission)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('Rank & Dealer')}</th>
                <th className="p-4">{t('Target (Tk)')}</th>
                <th className="p-4">{t('Achieved (Tk)')}</th>
                <th className="p-4">{t('Achievement')}</th>
                <th className="p-4">{t('Commission Rate')}</th>
                <th className="p-4">{t('Earned Commission')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Recalculate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t('No dealer targets configured for this month.')}
                  </td>
                </tr>
              ) : (
                targets.map((tgt, idx) => (
                  <tr key={tgt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${idx === 0 ? 'bg-amber-400 text-amber-950 font-extrabold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <span>{tgt.dealerName}</span>
                    </td>
                    <td className="p-4 font-semibold whitespace-nowrap">
                      {formatCurrency(tgt.targetAmount)}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(tgt.achievedAmount)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tgt.achievementPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, tgt.achievementPercent)}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs">{tgt.achievementPercent}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {tgt.commissionRate}%
                    </td>
                    <td className="p-4 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {formatCurrency(tgt.earnedCommission)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          tgt.status === 'EXCEEDED' || tgt.status === 'MET'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {tgt.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRefreshTarget(tgt)}
                        title="Recalculate achieved sales from ledger"
                        className="p-1.5 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Target Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              {t('Set Monthly Dealer Target')}
            </h2>
            <form onSubmit={handleSaveTarget} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Select Dealer (Customer)')}
                </label>
                <select
                  value={dealerId}
                  onChange={(e) => handleDealerSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">{t('Or enter custom dealer name below...')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Dealer / Partner Name')} *
                </label>
                <input
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  placeholder="e.g. Apex Traders"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Target Quota (Tk)')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Commission Rate (%)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold">
                  {t('Save Target')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers;

