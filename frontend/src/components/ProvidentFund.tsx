import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { PiggyBank, Plus, RefreshCw, DollarSign, UserCheck, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface ContributionLine {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  date: string;
}

interface PFAccount {
  id: string;
  employeeId: string;
  employeeName: string;
  designation?: string;
  department?: string;
  basicSalary: number;
  employeeContributionRate: number;
  employerContributionRate: number;
  totalEmployeeContributed: number;
  totalEmployerContributed: number;
  totalBalance: number;
  status: 'ACTIVE' | 'SETTLED';
  contributions?: ContributionLine[];
}

export const ProvidentFund: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const { employees } = useData();
  const [accounts, setAccounts] = useState<PFAccount[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [contributeAccount, setContributeAccount] = useState<PFAccount | null>(null);
  const [settleAccount, setSettleAccount] = useState<PFAccount | null>(null);

  // Enroll form
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [basicSalary, setBasicSalary] = useState<number>(30000);
  const [empRate, setEmpRate] = useState<number>(10);
  const [compRate, setCompRate] = useState<number>(10);

  // Contribution form
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // Settle form
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [settleRemarks, setSettleRemarks] = useState('Resignation settlement');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/pf');
      if (res.ok) setAccounts(await res.json());
    } catch (e) {
      console.warn('Failed to load PF accounts', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) return;
    try {
      const res = await authFetch('/api/pf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          employeeName: emp.name,
          designation: emp.designation,
          department: emp.department,
          basicSalary,
          employeeContributionRate: empRate,
          employerContributionRate: compRate,
        }),
      });
      if (res.ok) {
        setShowEnrollModal(false);
        setSelectedEmpId('');
        loadData();
      }
    } catch (e) {
      console.warn('Enroll PF failed', e);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeAccount) return;
    try {
      const res = await authFetch(`/api/pf/${contributeAccount.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        setContributeAccount(null);
        loadData();
      }
    } catch (e) {
      console.warn('Record contribution failed', e);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleAccount) return;
    try {
      const res = await authFetch(`/api/pf/${settleAccount.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestAmount,
          remarks: settleRemarks,
        }),
      });
      if (res.ok) {
        setSettleAccount(null);
        loadData();
      }
    } catch (e) {
      console.warn('Settle PF failed', e);
    }
  };

  const totalFundBalance = accounts.reduce((s, a) => s + (a.totalBalance || 0), 0);
  const totalCompanyContributed = accounts.reduce((s, a) => s + (a.totalEmployerContributed || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            {t('Provident Fund (PF) Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Track employee & employer monthly contributions, accumulated interest, remittances, and settlements.')}
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
            onClick={() => setShowEnrollModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Enroll Employee')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Fund Assets')}
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalFundBalance)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Company Total Contribution')}
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalCompanyContributed)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Active PF Accounts')}
          </span>
          <span className="text-2xl font-bold text-slate-800 dark:text-white">
            {accounts.filter((a) => a.status === 'ACTIVE').length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('Employee')}</th>
                <th className="p-4">{t('Basic Salary')}</th>
                <th className="p-4">{t('Rates (Emp / Co)')}</th>
                <th className="p-4">{t('Employee Contrib.')}</th>
                <th className="p-4">{t('Employer Contrib.')}</th>
                <th className="p-4">{t('Total Balance')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t('No Provident Fund accounts enrolled yet.')}
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div>{acc.employeeName}</div>
                      <div className="text-xs text-slate-400">{acc.designation || acc.department || 'Staff'}</div>
                    </td>
                    <td className="p-4 font-semibold whitespace-nowrap">
                      {formatCurrency(acc.basicSalary)}
                    </td>
                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                      {acc.employeeContributionRate}% / {acc.employerContributionRate}%
                    </td>
                    <td className="p-4 font-medium whitespace-nowrap">
                      {formatCurrency(acc.totalEmployeeContributed)}
                    </td>
                    <td className="p-4 font-medium whitespace-nowrap">
                      {formatCurrency(acc.totalEmployerContributed)}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(acc.totalBalance)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          acc.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      {acc.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => setContributeAccount(acc)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                          >
                            + {t('Contribute')}
                          </button>
                          <button
                            onClick={() => setSettleAccount(acc)}
                            className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs font-medium"
                          >
                            {t('Settle')}
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

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              {t('Enroll Employee in Provident Fund')}
            </h2>
            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Select Employee')} *
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                >
                  <option value="">{t('Choose employee...')}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Basic Salary (Tk)')} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Employee Rate (%)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={empRate}
                    onChange={(e) => setEmpRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Company Rate (%)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={compRate}
                    onChange={(e) => setCompRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowEnrollModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                  {t('Enroll Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Monthly PF Contribution')}: {contributeAccount.employeeName}
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div>Basic Salary: {formatCurrency(contributeAccount.basicSalary)}</div>
              <div>Employee ({contributeAccount.employeeContributionRate}%): {formatCurrency((contributeAccount.basicSalary * contributeAccount.employeeContributionRate) / 100)}</div>
              <div>Company Match ({contributeAccount.employerContributionRate}%): {formatCurrency((contributeAccount.basicSalary * contributeAccount.employerContributionRate) / 100)}</div>
            </div>
            <form onSubmit={handleContribute} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Month')}</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                      <option key={m} value={m}>Month {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Year')}</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setContributeAccount(null)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                  {t('Post Contribution')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Final Settlement')}: {settleAccount.employeeName}
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div>Accumulated Employee Balance: {formatCurrency(settleAccount.totalEmployeeContributed)}</div>
              <div>Accumulated Employer Balance: {formatCurrency(settleAccount.totalEmployerContributed)}</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Principal Balance: {formatCurrency(settleAccount.totalBalance)}
              </div>
            </div>
            <form onSubmit={handleSettle} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Accrued Interest Payout')} (Tk)
                </label>
                <input
                  type="number"
                  min="0"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Remarks')}</label>
                <input
                  value={settleRemarks}
                  onChange={(e) => setSettleRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSettleAccount(null)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold">
                  {t('Complete Settlement Payout')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvidentFund;

