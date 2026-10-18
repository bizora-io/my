import React, { useState, useMemo, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getCategoryBudgetStatuses, wouldExceedBudget, spentInCategoryMonth } from '../lib/expenseBudgets';
import { getOpenCustomerSales, allocateReceiptFifo } from '../lib/customerPaymentAllocation';
import { useData, LedgerEntry, Entity, ExpenseCategory } from '../contexts/DataContext';
import { ClipboardList, FileText, BookOpen, DollarSign, Filter, Search, ChevronRight, ArrowLeft, Download, Plus, MinusCircle, Wallet, X, Calendar, UserPlus, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, CheckCircle, Eye, Settings, Briefcase, RefreshCw, Split, Grid, LayoutGrid, List as ListIcon, User, Layers, Building, Truck, Zap, Megaphone, Hammer, ShoppingBag, PieChart, TrendingUp, MoreHorizontal, ShoppingCart, Edit2, Trash2 } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';

interface LedgerProps {
    title: string;
    icon: any;
    color: string;
    data: LedgerEntry[];
    typeFilter?: string; // Optional filter to restrict by type
}

// --- Shared Edit Modal ---
const EditTransactionModal: React.FC<{ 
    transaction: LedgerEntry; 
    onClose: () => void; 
    onSave: (id: string, data: Partial<LedgerEntry>) => void; 
}> = ({ transaction, onClose, onSave }) => {
    const { t } = useSettings();
    const [formData, setFormData] = useState({
        date: transaction.date || '',
        amount: transaction.amount || 0,
        reference: transaction.reference || '',
        entityName: transaction.entityName || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(transaction.id, {
            date: formData.date,
            amount: Number(formData.amount),
            reference: formData.reference,
            entityName: formData.entityName
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">Edit Transaction</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entity Name</label>
                        <input 
                            type="text" 
                            value={formData.entityName ?? ''}
                            onChange={e => setFormData({...formData, entityName: e.target.value})}
                            className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input 
                            type="date" 
                            value={formData.date ?? ''}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                        <input 
                            type="number" 
                            value={formData.amount ?? ''}
                            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                            className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {transaction.items && transaction.items.length > 0 && (
                            <p className="text-[10px] text-orange-600 mt-1">Warning: Changing amount here overrides item totals.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / Note</label>
                        <input 
                            type="text" 
                            value={formData.reference ?? ''}
                            onChange={e => setFormData({...formData, reference: e.target.value})}
                            className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- 1. Entity-Centric Ledger (For Due/Accounts Receivable/Payable) ---
const EntityLedgerView: React.FC<LedgerProps> = ({ title, icon: Icon, color, data, typeFilter }) => {
    const { t, formatMoney, currencySymbol } = useSettings();
    const { deleteItem, addTransaction, addEntity, customers, suppliers, updateTransaction, transactions } = useData();
    const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInvoice, setShowInvoice] = useState<LedgerEntry | null>(null);

    // Edit/Delete State
    const [editingTx, setEditingTx] = useState<LedgerEntry | null>(null);

    // Transaction Modal State
    const [showTxModal, setShowTxModal] = useState(false);
    const [txMode, setTxMode] = useState<'increase' | 'decrease'>('increase');
    
    // Manual Entry State
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualMobile, setManualMobile] = useState('');
    const [manualType, setManualType] = useState<'Receivable' | 'Payable'>('Receivable');
    const [suggestions, setSuggestions] = useState<Entity[]>([]);

    const [txAmount, setTxAmount] = useState('');
    const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
    const [txNote, setTxNote] = useState('');

    // 1. Filter Data First
    const filteredData = useMemo(() => {
        return data.filter(t => !t.isDeleted && (!typeFilter || t.type === typeFilter));
    }, [data, typeFilter]);

    // Helper to get signed amount for balance calculation
    const getSignedAmount = (tx: LedgerEntry) => {
        let amount = tx.amount;
        if ((tx.paymentMethod === 'Partial' || tx.paymentMethod === 'Installment') && tx.dueAmount !== undefined) {
            amount = tx.dueAmount;
        }
        
        // Expense logic:
        // If it's an unpaid expense (Due), it increases Payable (-amount)
        // If it's a payment to a supplier (Cash/Bank), it decreases Payable (+amount)
        if (tx.type === 'Expense') {
            return tx.paymentMethod === 'Due' ? -amount : amount;
        }

        if (['Sale', 'Due', 'Purchase Return'].includes(tx.type)) {
            return amount;
        }
        return -amount;
    };

    // 2. Calculate Top-Level Totals (Receivable vs Payable)
    const { totalReceivable, totalPayable, balance } = useMemo(() => {
        let netReceivable = 0;
        let netPayable = 0;
        const entityBalances: Record<string, number> = {};

        filteredData.forEach(tx => {
            const amount = getSignedAmount(tx);
            entityBalances[tx.entityName] = (entityBalances[tx.entityName] || 0) + amount;
        });

        Object.values(entityBalances).forEach(bal => {
            if (bal > 0) netReceivable += bal;
            else netPayable += Math.abs(bal); // Convert negative balance to positive magnitude for display
        });

        return { 
            totalReceivable: netReceivable, 
            totalPayable: netPayable, 
            balance: netReceivable - netPayable 
        };
    }, [filteredData]);

    // 3. Group by Entity for Summary View
    const groupedEntities = useMemo(() => {
        const groups: Record<string, { name: string, balance: number, count: number, lastDate: string }> = {};
        
        filteredData.forEach(tx => {
            if (!groups[tx.entityName]) {
                groups[tx.entityName] = { name: tx.entityName, balance: 0, count: 0, lastDate: tx.date };
            }
            groups[tx.entityName].balance += getSignedAmount(tx);
            groups[tx.entityName].count += 1;
            if (tx.date > groups[tx.entityName].lastDate) groups[tx.entityName].lastDate = tx.date;
        });

        return Object.values(groups).filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [filteredData, searchTerm]);

    // 4. Detail View Data with Debit/Credit/Balance Calculation
    const entityLedger = useMemo(() => {
        if (!selectedEntity) return [];
        
        const txs = filteredData.filter(tx => tx.entityName === selectedEntity);
        // Sort Ascending by Date for calculation
        const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;

        const processedTxs = sortedTxs.map(tx => {
            let debit = 0;
            let credit = 0;

            // Use dueAmount for partial/installment payments in the Due Ledger
            let effectiveAmount = tx.amount;
            if ((tx.paymentMethod === 'Partial' || tx.paymentMethod === 'Installment') && tx.dueAmount !== undefined) {
                effectiveAmount = tx.dueAmount;
            }

            if (tx.type === 'Expense') {
                // If it's an unpaid expense (Due), it increases Payable (Credit in this context)
                if (tx.paymentMethod === 'Due') {
                    credit = effectiveAmount;
                    runningBalance -= effectiveAmount;
                } else {
                    // Payment to supplier (Cash/Bank) decreases Payable (increases balance)
                    debit = effectiveAmount;
                    runningBalance += effectiveAmount;
                }
            } else if (['Sale', 'Due', 'Purchase Return'].includes(tx.type)) {
                debit = effectiveAmount;
                runningBalance += effectiveAmount;
            } else {
                credit = effectiveAmount;
                runningBalance -= effectiveAmount;
            }

            return {
                ...tx,
                debit,
                credit,
                balance: runningBalance
            };
        });

        // Reverse for display (Newest First)
        return processedTxs.reverse();
    }, [filteredData, selectedEntity]);

    // 5. Current Entity Balance Info
    const entityBalanceInfo = useMemo(() => {
        if (!entityLedger.length) return { balance: 0, type: 'Settled' };
        const currentBalance = entityLedger[0].balance;
        return {
            balance: currentBalance,
            type: currentBalance > 0 ? 'Receivable (To Get)' : currentBalance < 0 ? 'Payable (To Give)' : 'Settled'
        };
    }, [entityLedger]);

    const openManualAddModal = (type: 'Receivable' | 'Payable' = 'Receivable') => {
        setIsManualEntry(true);
        setManualName('');
        setManualMobile('');
        setManualType(type);
        setTxAmount('');
        setTxNote('');
        setSuggestions([]);
        setShowTxModal(true);
    };

    const handleNameChange = (val: string) => {
        setManualName(val);
        if (val.trim()) {
            const allEntities = [...customers, ...suppliers];
            const matches = allEntities.filter(e => 
                !e.isDeleted && 
                (e.name.toLowerCase().includes(val.toLowerCase()) || e.mobile?.includes(val))
            ).slice(0, 5);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    };

    const selectEntity = (entity: Entity) => {
        setManualName(entity.name);
        setManualMobile(entity.mobile || '');
        setSuggestions([]);
    };

    const handleAddTx = () => {
        if (!txAmount) return;
        const val = parseFloat(txAmount);
        if (isNaN(val) || val <= 0) return;

        let finalEntityName = selectedEntity;
        
        if (isManualEntry) {
            if (!manualName.trim()) {
                alert("Please enter a Name");
                return;
            }
            finalEntityName = manualName.trim();
            
            const allEntities = [...customers, ...suppliers];
            const existingEntity = allEntities.find(e => e.name.toLowerCase() === finalEntityName!.toLowerCase());
            
            if (!existingEntity) {
                addEntity({
                    id: Date.now().toString(),
                    name: finalEntityName!,
                    mobile: manualMobile,
                    type: manualType === 'Receivable' ? 'Customer' : 'Supplier'
                });
            }
        }

        if (!finalEntityName) return;

        let type: LedgerEntry['type'] = 'Due';
        let method: LedgerEntry['paymentMethod'] = 'Due';

        if (isManualEntry) {
            if (manualType === 'Receivable') {
                type = 'Due'; 
            } else {
                type = 'Purchase'; 
            }
        } else {
            if (txMode === 'increase') {
                type = entityBalanceInfo.balance >= 0 ? 'Sale' : 'Purchase';
                method = 'Due';
            } else {
                type = entityBalanceInfo.balance >= 0 ? 'Income' : 'Expense';
                method = 'Cash';
            }
        }

        if (isManualEntry && manualType === 'Receivable') type = 'Due'; 
        if (isManualEntry && manualType === 'Payable') type = 'Purchase'; 

        // When collecting receivable (Income / Cash decrease of AR), allocate FIFO to open sales
        let receiptAllocations: { saleId: string; amount: number }[] = [];
        if (type === 'Income' && !isManualEntry) {
            const cust = customers.find(c => c.name === finalEntityName) || { name: finalEntityName! };
            const open = getOpenCustomerSales(transactions, cust);
            receiptAllocations = allocateReceiptFifo(open, val);
            receiptAllocations.forEach(line => {
                const sale = transactions.find(tx => tx.id === line.saleId);
                if (!sale) return;
                const prevDue = Number(sale.dueAmount) || Math.max(0, Number(sale.amount) - (Number(sale.amountPaid) || 0));
                const newDue = Math.max(0, Math.round((prevDue - line.amount) * 100) / 100);
                const newPaid = Math.round(((Number(sale.amountPaid) || 0) + line.amount) * 100) / 100;
                // Pay installments FIFO if present
                let installments = sale.installments;
                if (installments?.length) {
                    let left = line.amount;
                    installments = installments.map(inst => {
                        if (left <= 0.009 || inst.status === 'Paid') return inst;
                        const take = Math.min(Number(inst.amount) || 0, left);
                        left -= take;
                        if (take >= (Number(inst.amount) || 0) - 0.009) {
                            return { ...inst, status: 'Paid' as const, paidDate: txDate };
                        }
                        return inst;
                    });
                }
                updateTransaction(line.saleId, {
                    dueAmount: newDue,
                    amountPaid: newPaid,
                    installments,
                    paymentMethod: newDue <= 0.009 && sale.paymentMethod === 'Due' ? 'Cash' : sale.paymentMethod,
                } as any);
            });
        }

        addTransaction({
            id: Date.now().toString(),
            date: txDate,
            entityName: finalEntityName!,
            type: type,
            amount: val,
            paymentMethod: method,
            reference: txNote || (isManualEntry ? (manualType === 'Receivable' ? 'Manual Due' : 'Advance/Payable') : 'Manual Entry'),
            details: { subtotal: val, tax: 0, discount: 0, delivery: 0, allocations: receiptAllocations } as any,
        });

        setShowTxModal(false);
        setTxAmount('');
        setTxNote('');
        setIsManualEntry(false);
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (window.confirm("Are you sure you want to move this transaction to Recycle Bin?")) {
            deleteItem('transaction', id);
        }
    };

    const handleUpdate = (id: string, data: Partial<LedgerEntry>) => {
        updateTransaction(id, data);
    };

    if (showInvoice) {
        return <InvoiceTemplate data={showInvoice} onClose={() => setShowInvoice(null)} />;
    }

    return (
        <div className="space-y-6">
            {editingTx && (
                <EditTransactionModal 
                    transaction={editingTx} 
                    onClose={() => setEditingTx(null)} 
                    onSave={handleUpdate}
                />
            )}

            {/* Header Area */}
            {viewMode === 'summary' && (
                <>
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800">{t(title)}</h1>
                        </div>
                        <button 
                            onClick={() => {
                                const csvContent = "data:text/csv;charset=utf-8," 
                                    + "Entity,Balance\n"
                                    + groupedEntities.map(e => `"${e.name}",${e.balance}`).join("\n");
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `${title.replace(/\s+/g, '_')}_Summary.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                            <p className="text-emerald-600 font-bold text-xs uppercase mb-1">Receivable (To Get)</p>
                            <h3 className="text-3xl font-bold text-emerald-600">{formatMoney(totalReceivable)}</h3>
                        </div>
                        <div className="bg-red-50 border border-red-100 p-5 rounded-xl">
                            <p className="text-red-600 font-bold text-xs uppercase mb-1">Payable (To Give)</p>
                            <h3 className="text-3xl font-bold text-red-500">{formatMoney(totalPayable)}</h3>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                            <p className="text-indigo-600 font-bold text-xs uppercase mb-1">Net Balance</p>
                            <h3 className="text-3xl font-bold text-indigo-600">{formatMoney(balance)}</h3>
                        </div>
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {viewMode === 'summary' ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-white items-center">
                            <div className="relative flex-1 w-full bg-slate-100 rounded-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search name..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-3 bg-transparent border-none text-sm focus:ring-0 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => openManualAddModal('Receivable')}
                                    className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <ArrowDownLeft className="w-4 h-4" /> Receivable (I Get)
                                </button>
                                <button 
                                    onClick={() => openManualAddModal('Payable')}
                                    className="flex-1 md:flex-none bg-red-600 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Payable (I Give)
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {groupedEntities.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">No records found</div>
                            ) : (
                                groupedEntities.map((entity, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => { setSelectedEntity(entity?.name || ''); setViewMode('detail'); }}
                                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                {entity?.name?.charAt(0) || 'E'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{entity?.name || ''}</h4>
                                                <p className="text-xs text-slate-500">{entity.count} Transactions • Last: {entity.lastDate}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold text-lg ${entity.balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                                                {formatMoney(Math.abs(entity.balance))} {entity.balance < 0 ? '(Cr)' : ''}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-6 bg-white">
                            <div className="mb-4">
                                <button onClick={() => { setViewMode('summary'); setSelectedEntity(null); }} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                                    <ArrowLeft className="w-4 h-4" /> Back to list
                                </button>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedEntity}</h2>
                                        <p className={`text-sm font-medium mt-1 ${entityBalanceInfo.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {entityBalanceInfo.type}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Current Balance</p>
                                        <p className={`text-4xl font-bold ${entityBalanceInfo.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatMoney(Math.abs(entityBalanceInfo.balance))}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button 
                                        onClick={() => { setIsManualEntry(false); setTxMode('increase'); setShowTxModal(true); }}
                                        className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all"
                                    >
                                        <Plus className="w-5 h-5 text-indigo-600" />
                                        Add New Due
                                    </button>
                                    <button 
                                        onClick={() => { setIsManualEntry(false); setTxMode('decrease'); setShowTxModal(true); }}
                                        className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all"
                                    >
                                        <Wallet className="w-5 h-5" />
                                        Record Payment
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 text-sm">Transaction History</h3>
                                <button 
                                    onClick={() => {
                                        const csvContent = "data:text/csv;charset=utf-8," 
                                            + "Date,Type,Amount,Payment Method,Reference\n"
                                            + entityLedger.map(t => `${t.date},${t.type},${t.amount},${t.paymentMethod},"${t.reference || ''}"`).join("\n");
                                        const encodedUri = encodeURI(csvContent);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", encodedUri);
                                        link.setAttribute("download", `${selectedEntity.replace(/\s+/g, '_')}_History.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                >
                                    <Download className="w-4 h-4"/> CSV
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Ref</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4 text-right">Debit (+)</th>
                                            <th className="px-6 py-4 text-right">Credit (-)</th>
                                            <th className="px-6 py-4 text-right">Balance</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {entityLedger.map(tx => (
                                            <tr key={tx.id} onClick={() => setShowInvoice(tx)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">{tx.date}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[100px]">{tx.reference || tx.id.slice(-6)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        ['Sale', 'Due'].includes(tx.type) ? 'bg-indigo-100 text-indigo-700' :
                                                        ['Purchase', 'Expense'].includes(tx.type) ? 'bg-red-100 text-red-700' :
                                                        'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                    {tx.debit > 0 ? formatMoney(tx.debit) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                    {tx.credit > 0 ? formatMoney(tx.credit) : '-'}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${tx.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatMoney(Math.abs(tx.balance))} {tx.balance >= 0 ? 'Dr' : 'Cr'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setShowInvoice(tx); }} 
                                                            className="text-indigo-600 hover:underline text-xs font-medium"
                                                        >
                                                            View
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTx(tx); }} 
                                                            className="text-slate-400 hover:text-indigo-600 p-2 rounded hover:bg-indigo-50"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDelete(tx.id, e)} 
                                                            className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Ledger Modals reused from top */}
            {showTxModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    {/* ... (Existing Modal Logic) ... */}
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">
                                {isManualEntry 
                                    ? (manualType === 'Receivable' ? 'Add Receivable (Due)' : 'Add Payable (Advance)') 
                                    : (txMode === 'increase' ? 'Add New Due' : 'Record Payment')}
                            </h3>
                            <button onClick={() => setShowTxModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {isManualEntry && (
                                <>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                                        <input 
                                            type="text" 
                                            value={manualName}
                                            onChange={e => handleNameChange(e.target.value)}
                                            onFocus={() => manualName && handleNameChange(manualName)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Customer/Supplier Name"
                                        />
                                        {suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 z-50 max-h-40 overflow-y-auto">
                                                {suggestions.map((s, i) => (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => selectEntity(s)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-slate-700">{s.name}</span>
                                                            <span className="text-xs text-slate-400 block">{s.mobile}</span>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.type==='Customer' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>{s.type}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={manualMobile}
                                            onChange={e => setManualMobile(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Phone Number"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="date" 
                                        value={txDate}
                                        onChange={e => setTxDate(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note (Optional)</label>
                                <input 
                                    type="text" 
                                    value={txNote}
                                    onChange={e => setTxNote(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="Reference or details"
                                />
                            </div>
                            {txMode === 'decrease' && !isManualEntry && selectedEntity && (() => {
                                const open = getOpenCustomerSales(transactions, { name: selectedEntity });
                                if (!open.length) return null;
                                const preview = allocateReceiptFifo(open, parseFloat(txAmount) || 0);
                                return (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Open sales (FIFO allocation)</p>
                                        {open.slice(0, 8).map(s => {
                                            const a = preview.find(p => p.saleId === s.id)?.amount || 0;
                                            return (
                                                <div key={s.id} className="flex justify-between text-xs gap-2">
                                                    <span className="truncate text-slate-600">{s.reference || s.id} · due {formatMoney(s.dueAmount)}</span>
                                                    <span className="font-bold text-emerald-700 shrink-0">{a > 0 ? formatMoney(a) : '—'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                            <button 
                                onClick={handleAddTx}
                                className={`w-full py-3 text-white rounded-lg font-bold shadow-md transition-all ${
                                    isManualEntry 
                                        ? (manualType === 'Receivable' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')
                                        : (txMode === 'increase' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700')
                                }`}
                            >
                                Confirm Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Custom Donut Chart Component ---
const DonutChart: React.FC<{ data: { label: string, value: number, color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let currentAngle = 0;

    if (total === 0) {
        return (
            <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-4 border-slate-100"></div>
                <span className="absolute text-xs text-slate-300">No Data</span>
            </div>
        );
    }

    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {data.map((item, idx) => {
                    const percentage = item.value / total;
                    const angle = percentage * 360;
                    const strokeDasharray = `${angle} ${360 - angle}`;
                    const r = 15.9155;
                    const cx = 50;
                    const cy = 50;
                    
                    const segment = (
                        <circle
                            key={idx}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="5" // Thicker stroke
                            strokeDasharray={`${(percentage * 100)} 100`}
                            strokeDashoffset={-currentAngle}
                            pathLength="100"
                        />
                    );
                    currentAngle += percentage * 100;
                    return segment;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-medium">TOTAL</span>
            </div>
        </div>
    );
};

// --- 2. Expense Ledger Manager (Enhanced Grid View) ---
const ExpenseManager: React.FC = () => {
    const { t, formatMoney, currencySymbol } = useSettings();
    const { transactions, expenseCategories, addTransaction, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, staff, deleteItem, updateTransaction } = useData();
    
    // View State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'year' | 'all'>('month');
    
    // Edit/Delete State
    const [editingTx, setEditingTx] = useState<LedgerEntry | null>(null);

    // Modal & Form States
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    
    // Form Inputs
    const [formAmount, setFormAmount] = useState('');
    const [formTax, setFormTax] = useState('');
    const [formPayee, setFormPayee] = useState('');
    const [formNote, setFormNote] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAdvance, setIsAdvance] = useState(false); // For Salary Advance
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryBudget, setNewCategoryBudget] = useState('');

    // Colors for chart
    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'];

    // Icon helper
    const getCategoryIcon = (name: string, className: string = "w-5 h-5") => {
        const lower = name.toLowerCase();
        if (lower.includes('rent')) return <Building className={className} />;
        if (lower.includes('salary')) return <User className={className} />;
        if (lower.includes('utilities') || lower.includes('bill')) return <Zap className={className} />;
        if (lower.includes('transport')) return <Truck className={className} />;
        if (lower.includes('marketing')) return <Megaphone className={className} />;
        if (lower.includes('repair')) return <Hammer className={className} />;
        if (lower.includes('office')) return <Briefcase className={className} />;
        if (lower.includes('tax')) return <FileText className={className} />;
        if (lower.includes('purchase')) return <ShoppingBag className={className} />;
        return <Layers className={className} />;
    };

    // --- Derived Data ---
    
    // Filter transactions based on selection and time
    const filteredExpenses = useMemo(() => {
        const now = new Date();
        return transactions.filter(t => {
            if (t.isDeleted || t.type !== 'Expense') return false;
            
            // Category Filter
            if (selectedCategory && t.category !== selectedCategory) return false;

            // Time Filter
            const txDate = new Date(t.date);
            if (timeFilter === 'today') return txDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
            if (timeFilter === 'month') return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'year') return txDate.getFullYear() === now.getFullYear();
            
            return true;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedCategory, timeFilter]);

    // Calculate totals for each category for the grid & chart
    const budgetStatuses = useMemo(() => {
        const now = new Date();
        return getCategoryBudgetStatuses(expenseCategories, transactions, now.getFullYear(), now.getMonth() + 1);
    }, [expenseCategories, transactions]);

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        let total = 0;
        
        // We need stats for ALL categories based on time filter, not just selectedCategory filter
        const relevantTxs = transactions.filter(t => {
            if (t.isDeleted || t.type !== 'Expense') return false;
            const now = new Date();
            const txDate = new Date(t.date);
            if (timeFilter === 'today') return txDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
            if (timeFilter === 'month') return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'year') return txDate.getFullYear() === now.getFullYear();
            return true;
        });

        relevantTxs.forEach(t => {
            if (t.category) {
                stats[t.category] = (stats[t.category] || 0) + t.amount;
                total += t.amount;
            }
        });
        return { stats, total };
    }, [transactions, timeFilter]);

    const chartData = useMemo(() => {
        return expenseCategories.map((cat, idx) => ({
            label: cat.name,
            value: categoryStats.stats[cat.name] || 0,
            color: CHART_COLORS[idx % CHART_COLORS.length]
        })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
    }, [categoryStats, expenseCategories]);

    const currentTotalDisplay = categoryStats.total;

    // --- Actions ---

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        addExpenseCategory(newCategoryName, parseFloat(newCategoryBudget) || 0);
        setNewCategoryName(''); setNewCategoryBudget('');
    };

    const handleSaveExpense = () => {
        if (!formAmount || !selectedCategory) return;
        {
            const amount = parseFloat(formAmount);
            const now = new Date();
            const check = wouldExceedBudget(selectedCategory, amount, expenseCategories, transactions, now.getFullYear(), now.getMonth() + 1);
            if (check.exceeds && !confirm(`Over budget for ${selectedCategory}? Budget ${check.budget}, spent ${check.spent}, projected ${check.projected}. Continue?`)) return;
        }

        
        let referenceText = formNote;
        if (isAdvance) referenceText += " (Advance)"; // Tag for Payroll

        const taxAmt = Math.max(0, parseFloat(formTax) || 0);
        const netAmt = parseFloat(formAmount);
        const gross = Math.round((netAmt + taxAmt) * 100) / 100;
        addTransaction({
            id: Date.now().toString(),
            date: formDate,
            type: 'Expense',
            entityName: formPayee || 'General',
            category: selectedCategory,
            amount: gross,
            paymentMethod: 'Cash',
            reference: referenceText,
            details: { subtotal: netAmt, tax: taxAmt, discount: 0, delivery: 0 }
        });

        // Reset
        setFormAmount('');
        setFormTax('');
        setFormPayee('');
        setFormNote('');
        setIsAdvance(false);
        setShowAddExpenseModal(false);
    };

    const openAddExpense = () => {
        setShowAddExpenseModal(true);
        setFormPayee('');
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (window.confirm("Move this expense to recycle bin?")) {
            deleteItem('transaction', id);
        }
    };

    const handleUpdate = (id: string, data: Partial<LedgerEntry>) => {
        updateTransaction(id, data);
    };

    // Helper to calculate percentage
    const getPercentage = (amount: number) => {
        if (categoryStats.total === 0) return 0;
        return Math.round((amount / categoryStats.total) * 100);
    };

    return (
        <div className="space-y-8">
            {editingTx && (
                <EditTransactionModal 
                    transaction={editingTx} 
                    onClose={() => setEditingTx(null)} 
                    onSave={handleUpdate}
                />
            )}

            {/* Header Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-emerald-600" /> Expense Ledger
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Track spending by category</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['today', 'month', 'year', 'all'].map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeFilter(tf as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${timeFilter === tf ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowCategoryModal(true)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm"
                    >
                        <Settings className="w-4 h-4" /> Manage Categories
                    </button>
                </div>

                {/* Hero Stats & Chart */}
                <div className="mt-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Expense</p>
                            <h2 className="text-4xl font-bold">{formatMoney(currentTotalDisplay)}</h2>
                            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-400/10 px-3 py-1 rounded-full w-fit">
                                <TrendingUp className="w-4 h-4" /> 
                                {categoryStats.total > 0 ? 'Tracking Active' : 'No Expenses'}
                            </div>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                            <DollarSign className="w-32 h-32" />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full md:w-auto min-w-[300px]">
                        <DonutChart data={chartData} />
                        <div className="flex-1 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Top Categories</p>
                            {chartData.slice(0, 3).map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                        <span className="text-slate-700 font-medium">{d.label}</span>
                                    </div>
                                    <span className="text-slate-500">{getPercentage(d.value)}%</span>
                                </div>
                            ))}
                            {chartData.length > 3 && (
                                <p className="text-[10px] text-slate-400 italic text-right">+ {chartData.length - 3} more</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            
            {/* Monthly budgets */}
            {budgetStatuses.some(b => b.budget > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">This month budgets</p>
                    {budgetStatuses.filter(b => b.budget > 0).map(b => (
                        <div key={b.categoryId}>
                            <div className="flex justify-between text-xs mb-0.5">
                                <span className="font-semibold text-slate-700">{b.categoryName}</span>
                                <span className={`font-bold ${b.status === 'over' ? 'text-red-600' : b.status === 'warning' ? 'text-amber-600' : 'text-slate-500'}`}>
                                    {formatMoney(b.spent)} / {formatMoney(b.budget)}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${b.status === 'over' ? 'bg-red-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, b.percentage)}%` }} />
                            </div>
                            <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] text-slate-400">{b.status === 'over' ? 'Over budget' : `Left ${formatMoney(Math.max(0, b.remaining))}`}</span>
                                <button type="button" className="text-[10px] text-indigo-600 font-bold" onClick={() => {
                                    const val = prompt(`Monthly budget for ${b.categoryName}`, String(b.budget));
                                    if (val != null) updateExpenseCategory(b.categoryId, { monthlyBudget: parseFloat(val) || 0 });
                                }}>Edit</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {expenseCategories.map((cat, idx) => {
                    const amount = categoryStats.stats[cat.name] || 0;
                    const percent = getPercentage(amount);
                    const color = CHART_COLORS[idx % CHART_COLORS.length];
                    
                    return (
                        <div 
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat.name); }}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200 cursor-pointer transition-all flex flex-col justify-between group h-28 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-12 h-12 bg-slate-50 rounded-bl-full -mr-3 -mt-3 transition-colors group-hover:bg-emerald-50"></div>
                            
                            <div className="relative z-10 flex justify-between items-start">
                                <div className={`p-2 rounded-lg text-white shadow-sm transition-transform group-hover:scale-110`} style={{ backgroundColor: color }}>
                                    {getCategoryIcon(cat.name, "w-4 h-4")}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400">{percent}%</span>
                                </div>
                            </div>
                            
                            <div className="relative z-10 mt-auto">
                                <h3 className="font-bold text-slate-700 text-[10px] leading-tight mb-0.5 group-hover:text-emerald-700 transition-colors truncate">{cat.name}</h3>
                                <p className="text-xs font-bold text-slate-900 truncate">{formatMoney(amount)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedCategory && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    {getCategoryIcon(selectedCategory, "w-5 h-5")}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedCategory}</h2>
                                    <p className="text-sm text-slate-500">
                                        Total: <span className="font-bold text-emerald-600">{formatMoney(categoryStats.stats[selectedCategory] || 0)}</span>
                                        <span className="mx-2">•</span>
                                        {timeFilter === 'all' ? 'All Time' : timeFilter === 'today' ? 'Today' : `This ${timeFilter}`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCategory(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto overflow-x-auto bg-white p-0">
                            {filteredExpenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>No expenses found for this period.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Payee / Detail</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredExpenses.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{tx.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800 block">{tx.entityName}</span>
                                                    <span className="text-xs text-slate-400">{tx.reference}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                    {formatMoney(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTx(tx); }} 
                                                            className="text-slate-400 hover:text-indigo-600 p-2 rounded hover:bg-indigo-50"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDelete(tx.id, e)} 
                                                            className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={openAddExpense}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                            >
                                <Plus className="w-5 h-5" /> Add New Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showAddExpenseModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-800">Add {selectedCategory} Expense</h3>
                            <button onClick={() => setShowAddExpenseModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Payee / Recipient</label>
                                {selectedCategory === 'Salary' ? (
                                    <select 
                                        value={formPayee}
                                        onChange={e => setFormPayee(e.target.value)}
                                        className="w-full border p-3 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="">Select Employee...</option>
                                        {staff.filter(s => s.status === 'Active').map(s => (
                                            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        value={formPayee}
                                        onChange={e => setFormPayee(e.target.value)}
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. Electric Office"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Amount (net)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        value={formAmount}
                                        onChange={e => setFormAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">VAT / Tax (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        value={formTax}
                                        onChange={e => setFormTax(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Included in VAT report as input tax when &gt; 0</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Details</label>
                                <input 
                                    type="text" 
                                    value={formNote}
                                    onChange={e => setFormNote(e.target.value)}
                                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Reference or Note"
                                />
                            </div>

                            {selectedCategory === 'Salary' && (
                                <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100 cursor-pointer" onClick={() => setIsAdvance(!isAdvance)}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAdvance ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-300'}`}>
                                        {isAdvance && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className="text-sm font-bold text-indigo-800 select-none">Mark as Advance Payment</span>
                                </div>
                            )}

                            <button 
                                onClick={handleSaveExpense}
                                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-transform active:scale-95"
                            >
                                Confirm Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Manager Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Manage Categories</h3>
                            <button onClick={() => setShowCategoryModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-4 max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                            {expenseCategories.map(cat => (
                                <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="text-slate-400 group-hover:text-emerald-500 transition-colors">
                                            {getCategoryIcon(cat.name, "w-4 h-4")}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                                    </div>
                                    {!cat.isDefault && (
                                        <button onClick={() => deleteExpenseCategory(cat.id)} className="text-red-300 hover:text-red-50 p-1.5 hover:bg-red-50 rounded-lg transition-all">
                                            <X className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-2">
                            <input 
                                type="text" 
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="New Category Name"
                            />
                           <input
                                type="number"
                                min={0}
                                value={newCategoryBudget}
                                onChange={e => setNewCategoryBudget(e.target.value)}
                                placeholder="Monthly budget (0 = none)"
                                className="w-full border p-2 rounded-lg text-sm mt-2"
                           />
                            <button onClick={handleAddCategory} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 3. Transaction List Ledger (For Sales/Purchase History) ---
const TransactionLedger: React.FC<LedgerProps> = ({ title, icon: Icon, color, data, typeFilter }) => {
    const { t, formatMoney } = useSettings();
    const { deleteItem, updateTransaction } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [editingTx, setEditingTx] = useState<LedgerEntry | null>(null);

    // Filtering logic including isDeleted check
    const filtered = data.filter(tx => {
        if (tx.isDeleted) return false;
        // Apply type filter if provided
        if (typeFilter && tx.type !== typeFilter) return false;
        
        const matchesSearch = tx.entityName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (tx.reference && tx.reference.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDate = dateFilter ? tx.date === dateFilter : true;
        return matchesSearch && matchesDate;
    });

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (window.confirm("Move this transaction to recycle bin?")) {
            deleteItem('transaction', id);
        }
    };

    const handleUpdate = (id: string, data: Partial<LedgerEntry>) => {
        updateTransaction(id, data);
    };

    return (
        <div className="space-y-6">
            {editingTx && (
                <EditTransactionModal 
                    transaction={editingTx} 
                    onClose={() => setEditingTx(null)} 
                    onSave={handleUpdate}
                />
            )}

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{t(title)}</h1>
                        <p className="text-sm text-slate-500">{filtered.length} records found</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200 cursor-pointer">
                        <Plus className="w-4 h-4" />
                        Bulk Import
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        const text = event.target?.result as string;
                                        // Simple mock parsing
                                        const lines = text.split('\n').slice(1); // skip header
                                        alert(`Parsed ${lines.length} rows from CSV. (Mock Import)`);
                                    };
                                    reader.readAsText(file);
                                }
                            }} 
                        />
                    </label>
                    <button 
                        onClick={() => {
                            const csvContent = "data:text/csv;charset=utf-8," 
                                + "Date,Entity,Type,Amount,Payment Method,Reference\n"
                                + filtered.map(t => `${t.date},"${t.entityName}",${t.type},${t.amount},${t.paymentMethod},"${t.reference || ''}"`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `${title.replace(/\s+/g, '_')}_Export.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <input 
                    type="date" 
                    value={dateFilter} 
                    onChange={e => setDateFilter(e.target.value)} 
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Entity</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-right">Payment</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No records found.</td></tr>
                        ) : (
                            filtered.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{tx.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-800">{tx.entityName}</span>
                                        {tx.reference && <div className="text-xs text-slate-400">{tx.reference}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{tx.type}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">{formatMoney(tx.amount)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.paymentMethod === 'Due' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {tx.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTx(tx); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(tx.id, e)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Exports
export const PurchaseLedger: React.FC = () => {
    const { transactions } = useData();
    const data = transactions.filter(t => ['Purchase', 'Purchase Return'].includes(t.type));
    return <TransactionLedger title="Purchase Ledger" icon={ShoppingCart} color="text-blue-600" data={data} />;
};

export const SaleLedger: React.FC = () => {
    const { transactions } = useData();
    const data = transactions.filter(t => ['Sale', 'Sales Return'].includes(t.type));
    return <TransactionLedger title="Sale Ledger" icon={ShoppingBag} color="text-indigo-600" data={data} />;
};

export const DueLedger: React.FC = () => {
    const { transactions, suppliers } = useData();
    
    // Updated logic to filter out cash expenses (operating costs) from Due Ledger
    const dueData = useMemo(() => {
        const supplierNames = new Set(suppliers.map(s => s.name));
        return transactions.filter(t => {
            if (t.isDeleted) return false;

            // Always include manual Due adjustments
            if (t.type === 'Due') return true;

            // Include Returns (they adjust balance)
            if (['Sales Return', 'Purchase Return'].includes(t.type)) return true;

            // Include Income (Collections)
            if (t.type === 'Income') return true;

            // For Sales and Purchases, ONLY include if payment is Due, Partial, or Installment
            if (['Sale', 'Purchase'].includes(t.type)) {
                return ['Due', 'Partial', 'Installment'].includes(t.paymentMethod);
            }

            // For Expenses:
            // Include if it's an unpaid expense (Accounts Payable)
            // OR if it's a payment to a supplier (entityName matches a supplier)
            if (t.type === 'Expense') {
                return t.paymentMethod === 'Due' || supplierNames.has(t.entityName);
            }

            return false;
        });
    }, [transactions, suppliers]);

    return <EntityLedgerView title="Due Ledger" icon={BookOpen} color="text-orange-600" data={dueData} />;
};

export const ExpenseLedger: React.FC = () => {
    return <ExpenseManager />;
};