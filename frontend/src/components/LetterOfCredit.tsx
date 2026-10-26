import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { FileSpreadsheet, Plus, RefreshCw, CheckCircle2, AlertCircle, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface LCRecord {
  id: string;
  lcNumber: string;
  bankName: string;
  branch?: string;
  supplierName?: string;
  amount: number;
  currency: string;
  marginPercent: number;
  marginAmount: number;
  utilizedAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'OPENED' | 'AMENDED' | 'UTILIZED' | 'CLOSED';
  issuingDate: string;
  expiryDate: string;
  notes?: string;
}

export const LetterOfCredit: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [lcs, setLcs] = useState<LCRecord[]>([]);
  const [expiring, setExpiring] = useState<LCRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedLc, setSelectedLc] = useState<LCRecord | null>(null);
  const [utilizeAmount, setUtilizeAmount] = useState<number>(0);

  // Form states
  const [lcNumber, setLcNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState<number>(100000);
  const [currency, setCurrency] = useState('BDT');
  const [marginPercent, setMarginPercent] = useState<number>(10);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, expRes] = await Promise.all([
        authFetch('/api/lc'),
        authFetch('/api/lc/expiring'),
      ]);
      if (listRes.ok) setLcs(await listRes.json());
      if (expRes.ok) setExpiring(await expRes.json());
    } catch (e) {
      console.warn('Failed to load LCs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcNumber || !bankName || amount <= 0) return;
    try {
      const res = await authFetch('/api/lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lcNumber,
          bankName,
          branch,
          supplierName,
          amount,
          currency,
          marginPercent,
          expiryDate,
          notes,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setLcNumber('');
        setBankName('');
        setSupplierName('');
        loadData();
      }
    } catch (e) {
      console.warn('Create LC failed', e);
    }
  };

  const handleOpen = async (id: string) => {
    if (!confirm(t('Open this Letter of Credit?'))) return;
    try {
      const res = await authFetch(`/api/lc/${id}/open`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Open LC failed', e);
    }
  };

  const handleUtilize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLc || utilizeAmount <= 0) return;
    try {
      const res = await authFetch(`/api/lc/${selectedLc.id}/utilize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: utilizeAmount }),
      });
      if (res.ok) {
        setSelectedLc(null);
        setUtilizeAmount(0);
        loadData();
      }
    } catch (e) {
      console.warn('Utilize LC failed', e);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm(t('Close this LC and release remaining margins?'))) return;
    try {
      const res = await authFetch(`/api/lc/${id}/close`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Close LC failed', e);
    }
  };

  const totalExposure = lcs
    .filter((l) => ['OPENED', 'AMENDED'].includes(l.status))
    .reduce((s, l) => s + (l.remainingAmount || 0), 0);

  const totalUtilized = lcs.reduce((s, l) => s + (l.utilizedAmount || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('Letter of Credit (L/C) Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Track import/export L/Cs, bank margin liens, utilization progress, and expiry milestones.')}
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
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Open New L/C')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Active Exposure (Remaining)')}
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalExposure)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Utilized')}
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalUtilized)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Expiring within 30 Days')}
          </span>
          <span className={`text-2xl font-bold ${expiring.length > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>
            {expiring.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('L/C Number')}</th>
                <th className="p-4">{t('Bank & Branch')}</th>
                <th className="p-4">{t('Beneficiary / Supplier')}</th>
                <th className="p-4">{t('Amount & Currency')}</th>
                <th className="p-4">{t('Utilized')}</th>
                <th className="p-4">{t('Expiry Date')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {lcs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t('No Letters of Credit recorded.')}
                  </td>
                </tr>
              ) : (
                lcs.map((lc) => (
                  <tr key={lc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {lc.lcNumber}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{lc.bankName}</div>
                      {lc.branch && <div className="text-xs text-slate-400">{lc.branch}</div>}
                    </td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                      {lc.supplierName || '—'}
                    </td>
                    <td className="p-4 font-semibold whitespace-nowrap">
                      {formatCurrency(lc.amount)} <span className="text-xs text-slate-400">{lc.currency}</span>
                      <div className="text-xs text-slate-400">
                        {t('Margin')}: {formatCurrency(lc.marginAmount)} ({lc.marginPercent}%)
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(lc.utilizedAmount || 0)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t('Rem')}: {formatCurrency(lc.remainingAmount || 0)}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                      {lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          lc.status === 'OPENED' || lc.status === 'AMENDED'
                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                            : lc.status === 'UTILIZED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : lc.status === 'CLOSED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {lc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      {lc.status === 'DRAFT' && (
                        <button
                          onClick={() => handleOpen(lc.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                        >
                          {t('Open')}
                        </button>
                      )}
                      {(lc.status === 'OPENED' || lc.status === 'AMENDED') && (
                        <>
                          <button
                            onClick={() => { setSelectedLc(lc); setUtilizeAmount(lc.remainingAmount); }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                          >
                            {t('Utilize')}
                          </button>
                          <button
                            onClick={() => handleClose(lc.id)}
                            className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs"
                          >
                            {t('Close')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                {t('Open New Letter of Credit')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('L/C Number')} *
                  </label>
                  <input
                    value={lcNumber}
                    onChange={(e) => setLcNumber(e.target.value)}
                    placeholder="e.g. LC-2026-904"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Bank Name')} *
                  </label>
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Eastern Bank Ltd"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Supplier / Beneficiary')}
                  </label>
                  <input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Beneficiary firm"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Branch Name')}
                  </label>
                  <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Principal Branch"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Amount')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Currency')}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  >
                    <option value="BDT">BDT</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Margin Percent (%)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t('Create L/C')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Utilize Modal */}
      {selectedLc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Utilize L/C')}: {selectedLc.lcNumber}
            </h2>
            <form onSubmit={handleUtilize} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Amount to Utilize')} (Max: {formatCurrency(selectedLc.remainingAmount)})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedLc.remainingAmount}
                  value={utilizeAmount}
                  onChange={(e) => setUtilizeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLc(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t('Confirm Utilization')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterOfCredit;

