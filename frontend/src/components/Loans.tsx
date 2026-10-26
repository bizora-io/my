import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Landmark, Plus, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle2, Calendar, DollarSign } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface Installment {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalDue: number;
  status: 'PENDING' | 'PAID';
}

interface LoanRecord {
  id: string;
  partyName: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  principal: number;
  interestRate: number;
  tenureMonths: number;
  outstanding: number;
  currency: string;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  startDate: string;
  endDate: string;
  schedule: Installment[];
  notes?: string;
}

export const Loans: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<LoanRecord | null>(null);

  // Create form
  const [partyName, setPartyName] = useState('');
  const [loanType, setLoanType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [principal, setPrincipal] = useState<number>(50000);
  const [interestRate, setInterestRate] = useState<number>(9);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/loans');
      if (res.ok) setLoans(await res.json());
    } catch (e) {
      console.warn('Failed to load loans', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName || principal <= 0) return;
    try {
      const res = await authFetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyName,
          type: loanType,
          principal,
          interestRate,
          tenureMonths,
          startDate,
          notes,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setPartyName('');
        setPrincipal(50000);
        loadData();
      }
    } catch (e) {
      console.warn('Create loan failed', e);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || paymentAmount <= 0) return;
    try {
      const res = await authFetch(`/api/loans/${selectedLoan.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
        }),
      });
      if (res.ok) {
        setSelectedLoan(null);
        setPaymentAmount(0);
        loadData();
      }
    } catch (e) {
      console.warn('Record loan payment failed', e);
    }
  };

  const totalPayableOutstanding = loans
    .filter((l) => l.type === 'PAYABLE' && l.status === 'ACTIVE')
    .reduce((s, l) => s + (l.outstanding || 0), 0);

  const totalReceivableOutstanding = loans
    .filter((l) => l.type === 'RECEIVABLE' && l.status === 'ACTIVE')
    .reduce((s, l) => s + (l.outstanding || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            {t('Loans & Borrowing Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Manage corporate loans, borrowings, and credit lines with automated amortization schedules and ledger sync.')}
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
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Record New Loan')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              {t('Total Outstanding Debt (Payable)')}
            </span>
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalPayableOutstanding)}
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              {t('Total Lent Out (Receivable)')}
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalReceivableOutstanding)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('Party / Lender')}</th>
                <th className="p-4">{t('Type')}</th>
                <th className="p-4">{t('Principal')}</th>
                <th className="p-4">{t('Interest Rate')}</th>
                <th className="p-4">{t('Tenure')}</th>
                <th className="p-4">{t('Outstanding')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {t('No loans recorded.')}
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {loan.partyName}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          loan.type === 'RECEIVABLE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {loan.type === 'RECEIVABLE' ? 'Lent Out' : 'Borrowed'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold whitespace-nowrap">
                      {formatCurrency(loan.principal)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {loan.interestRate}% p.a.
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                      {loan.tenureMonths} {t('months')}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(loan.outstanding)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          loan.status === 'ACTIVE'
                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setShowScheduleModal(loan)}
                        className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs font-medium"
                      >
                        {t('Schedule')}
                      </button>
                      {loan.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setSelectedLoan(loan); setPaymentAmount(loan.schedule?.[0]?.totalDue || 0); }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold"
                        >
                          {t('Pay')}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-600" />
                {t('Record Loan Transaction')}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Lender / Borrower Name')} *
                </label>
                <input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. BRAC Bank, John Doe"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Loan Direction')}
                  </label>
                  <select
                    value={loanType}
                    onChange={(e: any) => setLoanType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  >
                    <option value="PAYABLE">We Borrowed (Payable)</option>
                    <option value="RECEIVABLE">We Lent Out (Receivable)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Principal Amount')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Annual Interest Rate (%)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Tenure (Months)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Disbursement Date')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t('Save Loan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Record Repayment')}: {selectedLoan.partyName}
            </h2>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Payment Amount')} (Outstanding: {formatCurrency(selectedLoan.outstanding)})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedLoan.outstanding}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Payment Method')}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="bKash / Mobile Banking">bKash / Mobile Banking</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t('Confirm Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('Amortization Schedule')}: {showScheduleModal.partyName}
              </h2>
              <button onClick={() => setShowScheduleModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 uppercase">
                    <th className="py-2">#</th>
                    <th className="py-2">{t('Due Date')}</th>
                    <th className="py-2">{t('Principal')}</th>
                    <th className="py-2">{t('Interest')}</th>
                    <th className="py-2">{t('Total Due')}</th>
                    <th className="py-2 text-right">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(showScheduleModal.schedule || []).map((ins) => (
                    <tr key={ins.installmentNo}>
                      <td className="py-2.5 font-bold">{ins.installmentNo}</td>
                      <td className="py-2.5">{ins.dueDate}</td>
                      <td className="py-2.5">{formatCurrency(ins.principal)}</td>
                      <td className="py-2.5">{formatCurrency(ins.interest)}</td>
                      <td className="py-2.5 font-semibold">{formatCurrency(ins.totalDue)}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ins.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ins.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;

