import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, LedgerEntry, FinancialAccount, resolveAccountForTender, buildSplitAccountPostings } from '../contexts/DataContext';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Plus, X, 
  Smartphone, Landmark, Wallet, ArrowRightLeft, Edit2, Trash2, RotateCcw, 
  Search, Filter, CheckCircle2, Building2, CreditCard, ArrowDownRight, Layers
} from 'lucide-react';
import BankReconcile from './BankReconcile';
import SupplierInvoiceMatch from './SupplierInvoiceMatch';
import { reconcileAccountBalances, round2, type TransactionLike, type FinancialAccountLike } from '@shared/lib/financialReconciliation';

const Cashbox: React.FC = () => {
  const { t, currencySymbol, formatMoney } = useSettings();
  const { 
    transactions, 
    financialAccounts, 
    addTransaction, 
    addFinancialAccount, 
    transferFunds, 
    deleteItem, 
    updateTransaction, 
    recalculateBalances 
  } = useData();
  
  // View State
  const [activeAccountId, setActiveAccountId] = useState<string>('all');
  const [mainTab, setMainTab] = useState<'accounts' | 'reconcile' | 'ap-match'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  
  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingTx, setEditingTx] = useState<LedgerEntry | null>(null);

  // Forms
  const [txForm, setTxForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Expense' as 'Income' | 'Expense',
    accountId: ''
  });

  const [accForm, setAccForm] = useState<Partial<FinancialAccount>>({
    name: '',
    type: 'Bank',
    balance: 0,
    accountNumber: '',
    bankName: ''
  });

  const [transferForm, setTransferForm] = useState({
    fromId: '',
    toId: '',
    amount: '',
    note: ''
  });

  // Reconciled Account Calculations using centralized financial reconciliation service
  const reconciliation = useMemo(() => {
    return reconcileAccountBalances(financialAccounts as any, transactions as any);
  }, [financialAccounts, transactions]);

  const { totalCash, totalBank, totalMobile, totalLiquidity } = reconciliation;

  // Selected account detail
  const activeAccount = useMemo(() => {
    if (activeAccountId === 'all') return null;
    return reconciliation.accounts.find(a => a.id === activeAccountId) || null;
  }, [activeAccountId, reconciliation]);

  // Filtered Money Movement Transactions
  const filteredTransactions = useMemo(() => {
    let data = transactions.filter(t => !t.isDeleted);

    // Include all money movement types: Sales, Purchases, Incomes, Expenses, Transfers, Salaries, Returns, Supplier Payments
    const validMovementTypes = [
      'Sale', 'Purchase', 'Income', 'Expense', 'Transfer', 
      'Salary', 'Supplier Payment', 'Sales Return', 'Purchase Return'
    ];

    data = data.filter(t => {
      if (!validMovementTypes.includes(t.type)) return false;
      // Exclude pure credit without any monetary movement
      if (t.paymentMethod === 'Due' && t.type !== 'Income' && t.type !== 'Expense') {
        return false;
      }
      return true;
    });

    // Account filtering
    if (activeAccountId !== 'all') {
      data = data.filter(t => {
        if (t.accountId === activeAccountId) return true;
        const splits = (t.details as any)?.paymentSplits as { method: string; amount: number; accountId?: string }[] | undefined;
        if (splits && Array.isArray(splits) && splits.length > 0) {
          const postings = buildSplitAccountPostings(splits, financialAccounts, t.accountId);
          return postings.some(p => p.accountId === activeAccountId);
        }
        if (!t.accountId) {
          const resolved = resolveAccountForTender(t.paymentMethod, financialAccounts);
          return resolved === activeAccountId;
        }
        return false;
      });
    }

    // Type filter
    if (txTypeFilter !== 'all') {
      data = data.filter(t => t.type === txTypeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter(t => 
        (t.entityName && t.entityName.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q))
      );
    }

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeAccountId, txTypeFilter, searchQuery, financialAccounts]);

  // Handlers
  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txForm.amount);
    if (!amount || amount <= 0 || !txForm.accountId) return;

    const account = financialAccounts.find(a => a.id === txForm.accountId);

    const newTx: LedgerEntry = {
      id: Date.now().toString(),
      date: txForm.date,
      entityName: txForm.description || 'Manual Entry',
      type: txForm.type,
      amount: amount,
      paymentMethod: account?.type === 'Bank' ? 'Bank' : account?.type === 'Mobile Wallet' ? 'Mobile' : 'Cash',
      accountId: txForm.accountId,
      details: { subtotal: amount, tax: 0, discount: 0, delivery: 0 }
    };

    addTransaction(newTx);
    setShowAddTxModal(false);
    setTxForm({ ...txForm, amount: '', description: '' });
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.name) return;
    
    addFinancialAccount({
      id: Date.now().toString(),
      name: accForm.name,
      type: accForm.type as any,
      balance: Number(accForm.balance) || 0,
      openingBalance: Number(accForm.balance) || 0,
      accountNumber: accForm.accountNumber,
      bankName: accForm.bankName
    });
    setShowAddAccountModal(false);
    setAccForm({ name: '', type: 'Bank', balance: 0, accountNumber: '', bankName: '' });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferForm.amount);
    if (!transferForm.fromId || !transferForm.toId || !amt || amt <= 0) return;
    if (transferForm.fromId === transferForm.toId) {
      alert("Cannot transfer to the same account");
      return;
    }

    transferFunds(transferForm.fromId, transferForm.toId, amt, transferForm.note);
    setShowTransferModal(false);
    setTransferForm({ fromId: '', toId: '', amount: '', note: '' });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.confirm("Move this transaction to Recycle Bin?")) {
      deleteItem('transaction', id);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx) {
      updateTransaction(editingTx.id, editingTx);
      setEditingTx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Module Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button 
            type="button" 
            onClick={() => setMainTab('accounts')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'accounts' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Accounts & Liquidity
          </button>
          <button 
            type="button" 
            onClick={() => setMainTab('reconcile')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'reconcile' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank Reconciliation
          </button>
          <button 
            type="button" 
            onClick={() => setMainTab('ap-match')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'ap-match' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AP Invoices
          </button>
        </div>

        {mainTab === 'accounts' && (
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => {
                if (window.confirm("This will synchronize all account balances with your ledger transactions. Continue?")) {
                  recalculateBalances();
                }
              }}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              title="Fix balance mismatches"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('Sync')}</span>
            </button>
            <button 
              onClick={() => setShowTransferModal(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('Transfer')}</span>
            </button>
            <button 
              onClick={() => setShowAddTxModal(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('Income')}/{t('Expense')}</span>
            </button>
            <button 
              onClick={() => setShowAddAccountModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>
        )}
      </div>

      {mainTab === 'reconcile' ? (
        <BankReconcile />
      ) : mainTab === 'ap-match' ? (
        <SupplierInvoiceMatch />
      ) : (
        <>
          {/* Liquidity KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Total Liquidity */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-2xl p-4 lg:p-5 text-white shadow-md shadow-indigo-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-wider text-indigo-100">
                  Total Liquidity
                </span>
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </span>
              </div>
              <h2 className="text-xl lg:text-3xl font-extrabold tracking-tight">{formatMoney(totalLiquidity)}</h2>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-200">
                <span>{financialAccounts.length} Active Accounts</span>
              </div>
            </div>

            {/* Cash in Hand */}
            <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cash In Hand
                </span>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">{formatMoney(totalCash)}</h2>
              <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span>Physical Cash Drawer</span>
              </div>
            </div>

            {/* Bank Balance */}
            <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bank Accounts
                </span>
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </span>
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">{formatMoney(totalBank)}</h2>
              <div className="mt-2 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <span>Direct Bank Balances</span>
              </div>
            </div>

            {/* Mobile Wallet */}
            <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mobile Wallets
                </span>
                <span className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </span>
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">{formatMoney(totalMobile)}</h2>
              <div className="mt-2 text-[11px] font-semibold text-pink-600 flex items-center gap-1">
                <span>bKash, Nagad, Rocket</span>
              </div>
            </div>
          </div>

          {/* Accounts & Transaction Movement Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Account Cards */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Financial Accounts</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {reconciliation.accounts.length} Total
                </span>
              </div>

              {/* All Accounts Selector */}
              <div 
                onClick={() => setActiveAccountId('all')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  activeAccountId === 'all' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-indigo-500/20' 
                    : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeAccountId === 'all' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">All Accounts</h4>
                      <p className={`text-[10px] ${activeAccountId === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Consolidated View
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm">{formatMoney(totalLiquidity)}</span>
                  </div>
                </div>
              </div>

              {/* Individual Accounts */}
              <div className="space-y-2.5">
                {reconciliation.accounts.map(acc => {
                  const isSelected = activeAccountId === acc.id;
                  const Icon = acc.type === 'Bank' ? Landmark : acc.type === 'Mobile Wallet' ? Smartphone : Wallet;
                  const iconColor = acc.type === 'Bank' ? 'text-blue-600 bg-blue-50' : acc.type === 'Mobile Wallet' ? 'text-pink-600 bg-pink-50' : 'text-emerald-600 bg-emerald-50';

                  return (
                    <div 
                      key={acc.id}
                      onClick={() => setActiveAccountId(acc.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/30 shadow-xs' 
                          : 'bg-white border-slate-200/80 hover:border-indigo-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight">{acc.name}</h4>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{acc.type}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-end pt-1 border-t border-slate-100/80">
                        <div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {acc.accountNumber ? `A/C: ${acc.accountNumber}` : 'Standard Account'}
                          </p>
                          {acc.openingBalance ? (
                            <p className="text-[9px] text-slate-400">
                              Opening: {formatMoney(acc.openingBalance)}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className={`font-extrabold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {formatMoney(acc.calculatedBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Transactions Ledger */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col min-h-[580px]">
              {/* Ledger Header & Search Controls */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/60 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>Cashflow & Ledger</span>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      {activeAccount ? activeAccount.name : 'All Accounts'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {filteredTransactions.length} transaction(s) recorded
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Type Filter */}
                  <select 
                    value={txTypeFilter}
                    onChange={e => setTxTypeFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Types</option>
                    <option value="Sale">Sale</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Salary">Salary</option>
                    <option value="Supplier Payment">Supplier Payment</option>
                    <option value="Sales Return">Sales Return</option>
                    <option value="Purchase Return">Purchase Return</option>
                  </select>

                  {/* Search box */}
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Search ledger..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[520px]">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Entity / Description</th>
                      <th className="text-center">Type</th>
                      <th>Method</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <p className="font-semibold text-sm">No transactions match your filter criteria.</p>
                          <p className="text-xs text-slate-400 mt-1">Try switching accounts or clearing search filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => {
                        const isInflow = ['Sale', 'Income', 'Purchase Return'].includes(tx.type) || (tx.type === 'Transfer' && tx.transferType === 'In');
                        const isOutflow = ['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(tx.type) || (tx.type === 'Transfer' && tx.transferType === 'Out');

                        const badgeClass = 
                          tx.type === 'Sale' ? 'badge-emerald' :
                          tx.type === 'Purchase' ? 'badge-slate' :
                          tx.type === 'Income' ? 'badge-emerald' :
                          tx.type === 'Expense' ? 'badge-rose' :
                          tx.type === 'Salary' ? 'badge-amber' :
                          tx.type === 'Supplier Payment' ? 'badge-indigo' :
                          tx.type === 'Sales Return' ? 'badge-rose' :
                          tx.type === 'Purchase Return' ? 'badge-emerald' :
                          'badge-slate';

                        const effectiveAmount = tx.amountPaid != null && tx.amountPaid > 0 && tx.type === 'Sale' 
                          ? tx.amountPaid 
                          : tx.amount;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/80">
                            <td className="whitespace-nowrap text-xs text-slate-500 font-medium">
                              {tx.date}
                            </td>
                            <td>
                              <div className="font-bold text-xs text-slate-800">{tx.entityName}</div>
                              {tx.reference && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.reference}</div>
                              )}
                            </td>
                            <td className="text-center">
                              <span className={`badge-modern ${badgeClass}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="text-xs text-slate-600 font-medium">
                              {tx.paymentMethod || 'Cash'}
                            </td>
                            <td className={`text-right font-extrabold text-xs whitespace-nowrap ${
                              isInflow ? 'text-emerald-600' : isOutflow ? 'text-rose-600' : 'text-slate-800'
                            }`}>
                              {isInflow ? '+ ' : isOutflow ? '- ' : ''}
                              {formatMoney(effectiveAmount)}
                            </td>
                            <td className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                <button 
                                  onClick={() => setEditingTx(tx)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(tx.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Move to Recycle Bin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Add Transaction Modal */}
          {showAddTxModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-sm">Record Income / Expense</h3>
                  <button onClick={() => setShowAddTxModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveTx} className="p-5 space-y-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setTxForm({...txForm, type: 'Income'})} 
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        txForm.type === 'Income' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      Income
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTxForm({...txForm, type: 'Expense'})} 
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        txForm.type === 'Expense' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      Expense
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Account</label>
                    <select 
                      value={txForm.accountId} 
                      onChange={e => setTxForm({...txForm, accountId: e.target.value})}
                      className="input-modern"
                      required
                    >
                      <option value="">Select Account...</option>
                      {financialAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">{t('Amount')}</label>
                    <input 
                      type="number" 
                      step="any"
                      value={txForm.amount} 
                      onChange={e => setTxForm({...txForm, amount: e.target.value})} 
                      className="input-modern" 
                      placeholder="0.00"
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">{t('Description')}</label>
                    <input 
                      type="text" 
                      value={txForm.description} 
                      onChange={e => setTxForm({...txForm, description: e.target.value})} 
                      className="input-modern" 
                      placeholder="e.g. Utility Bill, Capital Deposit" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">{t('Date')}</label>
                    <input 
                      type="date" 
                      value={txForm.date} 
                      onChange={e => setTxForm({...txForm, date: e.target.value})} 
                      className="input-modern" 
                      required 
                    />
                  </div>

                  <button className="w-full btn-primary-modern font-bold py-2.5">
                    {t('Save')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Edit Transaction Modal */}
          {editingTx && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-sm">Edit Transaction</h3>
                  <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
                <form onSubmit={handleUpdate} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Entity / Description</label>
                    <input 
                      type="text" 
                      value={editingTx.entityName}
                      onChange={e => setEditingTx({...editingTx, entityName: e.target.value})}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t('Amount')}</label>
                    <input 
                      type="number" 
                      step="any"
                      value={editingTx.amount}
                      onChange={e => setEditingTx({...editingTx, amount: parseFloat(e.target.value) || 0})}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t('Date')}</label>
                    <input 
                      type="date" 
                      value={editingTx.date}
                      onChange={e => setEditingTx({...editingTx, date: e.target.value})}
                      className="input-modern"
                    />
                  </div>
                  <button className="w-full btn-primary-modern font-bold py-2.5">
                    Update Transaction
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Add Account Modal */}
          {showAddAccountModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-sm">Add Financial Account</h3>
                  <button onClick={() => setShowAddAccountModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Account Name</label>
                    <input 
                      type="text" 
                      value={accForm.name} 
                      onChange={e => setAccForm({...accForm, name: e.target.value})} 
                      className="input-modern" 
                      placeholder="e.g. BRAC Bank Corporate" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Type</label>
                    <select 
                      value={accForm.type} 
                      onChange={e => setAccForm({...accForm, type: e.target.value as any})} 
                      className="input-modern"
                    >
                      <option value="Cash">Cash Drawer</option>
                      <option value="Bank">Bank Account</option>
                      <option value="Mobile Wallet">Mobile Wallet (bKash/Nagad)</option>
                    </select>
                  </div>
                  {accForm.type === 'Bank' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Account Number</label>
                      <input 
                        type="text" 
                        value={accForm.accountNumber} 
                        onChange={e => setAccForm({...accForm, accountNumber: e.target.value})} 
                        className="input-modern" 
                        placeholder="e.g. 150120345678"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Opening Balance</label>
                    <input 
                      type="number" 
                      step="any"
                      value={accForm.balance} 
                      onChange={e => setAccForm({...accForm, balance: parseFloat(e.target.value) || 0})} 
                      className="input-modern" 
                      placeholder="0.00"
                    />
                  </div>
                  <button className="w-full btn-primary-modern font-bold py-2.5">
                    Create Account
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Transfer Modal */}
          {showTransferModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-sm">Transfer Funds (Contra)</h3>
                  <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleTransfer} className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">From Account</label>
                    <select 
                      value={transferForm.fromId} 
                      onChange={e => setTransferForm({...transferForm, fromId: e.target.value})}
                      className="input-modern"
                      required
                    >
                      <option value="">Select Source Account...</option>
                      {financialAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-center">
                    <span className="p-1.5 rounded-full bg-slate-100 text-indigo-600">
                      <ArrowDownLeft className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">To Account</label>
                    <select 
                      value={transferForm.toId} 
                      onChange={e => setTransferForm({...transferForm, toId: e.target.value})}
                      className="input-modern"
                      required
                    >
                      <option value="">Select Destination Account...</option>
                      {financialAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">{t('Amount')}</label>
                    <input 
                      type="number" 
                      step="any"
                      value={transferForm.amount} 
                      onChange={e => setTransferForm({...transferForm, amount: e.target.value})} 
                      className="input-modern font-bold" 
                      placeholder="0.00"
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Note / Memo</label>
                    <input 
                      type="text" 
                      value={transferForm.note} 
                      onChange={e => setTransferForm({...transferForm, note: e.target.value})} 
                      className="input-modern" 
                      placeholder="Optional reference" 
                    />
                  </div>

                  <button className="w-full btn-primary-modern font-bold py-2.5">
                    Confirm Transfer
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Cashbox;
