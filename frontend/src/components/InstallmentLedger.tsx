import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, Installment, LedgerEntry } from '../contexts/DataContext';
import { collectDueReminders } from '../lib/dueReminders';
import { CalendarClock, CheckCircle2, AlertTriangle, Search, Phone } from 'lucide-react';

interface FlatInstallment extends Installment {
  saleId: string;
  entityName: string;
  entityMobile?: string;
  saleDate: string;
}

const InstallmentLedger: React.FC = () => {
  const { t, formatMoney } = useSettings();
  const { transactions, updateTransaction, addTransaction, financialAccounts } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Overdue' | 'Paid'>('All');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openDues = useMemo(() => collectDueReminders(transactions, { graceDays: 0 }).filter(i => i.kind === 'open_due' && i.daysOverdue >= 0), [transactions]);


  // Flatten every installment across every Sale into one list, computing
  // Overdue on the fly (a schedule created as 'Pending' becomes overdue
  // once its due date passes, without needing a separate write).
  const allInstallments: FlatInstallment[] = useMemo(() => {
    const rows: FlatInstallment[] = [];
    transactions.forEach(sale => {
      if (sale.type !== 'Sale' || !sale.installments?.length) return;
      sale.installments.forEach(inst => {
        const isOverdue = inst.status === 'Pending' && new Date(inst.dueDate) < today;
        rows.push({
          ...inst,
          status: isOverdue ? 'Overdue' : inst.status,
          saleId: sale.id,
          entityName: sale.entityName,
          entityMobile: sale.entityMobile,
          saleDate: sale.date,
        });
      });
    });
    return rows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [transactions]);

  const filtered = allInstallments.filter(i => {
    const matchesSearch = i.entityName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summary = useMemo(() => ({
    pendingTotal: allInstallments.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0),
    overdueTotal: allInstallments.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0),
    overdueCount: allInstallments.filter(i => i.status === 'Overdue').length,
  }), [allInstallments]);

  // Marking an installment paid updates the real installments[] array on
  // its parent Sale transaction (via updateTransaction - already
  // backend-synced) and records the collection as a real Income entry so
  // it shows up in cash flow / financial account balance too.
  const markPaid = (inst: FlatInstallment) => {
    const sale = transactions.find(t => t.id === inst.saleId);
    if (!sale?.installments) return;

    const updatedInstallments = sale.installments.map(i =>
      i.id === inst.id ? { ...i, status: 'Paid' as const, paidDate: new Date().toISOString() } : i
    );
    updateTransaction(inst.saleId, { installments: updatedInstallments });

    const defaultAccount = financialAccounts.find(a => a.isDefault) || financialAccounts[0];
    addTransaction({
      id: `income-installment-${inst.id}`,
      date: new Date().toISOString(),
      entityId: sale.entityId,
      entityName: sale.entityName,
      entityMobile: sale.entityMobile,
      type: 'Income',
      amount: inst.amount,
      paymentMethod: 'Cash',
      accountId: defaultAccount?.id,
      reference: `Installment collected for sale ${inst.saleId}`,
    } as LedgerEntry);
  };

  const statusStyles: Record<string, string> = {
    Pending: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-red-100 text-red-700',
    Paid: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-indigo-600" /> {t('Installments')}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Every installment schedule created at checkout, in one place — collect payments as they come due.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600"><CalendarClock className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Pending (not yet due)</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(summary.pendingTotal)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Overdue ({summary.overdueCount})</p>
            <p className="text-lg font-bold text-red-600">{formatMoney(summary.overdueTotal)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No installments match this filter.</td></tr>
            ) : filtered.map(inst => (
              <tr key={inst.id} className={inst.status === 'Overdue' ? 'bg-red-50/40' : ''}>
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-800 block">{inst.entityName}</span>
                  {inst.entityMobile && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{inst.entityMobile}</span>}
                </td>
                <td className="px-6 py-4 text-slate-600">{new Date(inst.dueDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-800">{formatMoney(inst.amount)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyles[inst.status]}`}>{inst.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {inst.status !== 'Paid' && (
                    <button onClick={() => markPaid(inst)} className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  )}
                  {inst.status === 'Paid' && inst.paidDate && (
                    <span className="text-xs text-slate-400">Paid {new Date(inst.paidDate).toLocaleDateString()}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openDues.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
          <div className="px-4 py-3 border-b bg-amber-50">
            <h3 className="text-sm font-bold text-amber-900">Open due (no installment schedule)</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {openDues.slice(0, 30).map(d => (
              <div key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{d.customerName}</p>
                  <p className="text-xs text-slate-500">{d.label} · Sale {d.saleId}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-amber-700">{formatMoney(d.amount)}</p>
                  <p className="text-[10px] text-slate-400">{d.daysOverdue}d since sale</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallmentLedger;
