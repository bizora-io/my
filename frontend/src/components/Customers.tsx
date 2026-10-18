import React, { useState, useMemo } from 'react';
import { appendWalletHistory, applyWalletDelta } from '@shared/lib/walletHistory';
import { useData, Entity, CustomerGroup, LedgerEntry } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
    Search, Plus, Filter, Download, Upload, MoreHorizontal, 
    User, Phone, Mail, MapPin, Tag, Calendar, DollarSign, 
    Star, Trash2, Edit, X, Check, ChevronRight, Users, 
    MessageSquare, Clock, CreditCard, Gift, ShoppingBag, Activity, FileText
} from 'lucide-react';

const Customers: React.FC = () => {
    const { customers, customerGroups, transactions, addEntity, updateEntity, deleteItem, addCustomerGroup, updateCustomerGroup, deleteCustomerGroup, logAction, supportTickets, feedbacks, addSupportTicket, updateSupportTicket } = useData();
    const { t, currencySymbol } = useSettings();
    
    const [activeTab, setActiveTab] = useState<'list' | 'groups' | 'tickets' | 'feedback'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Entity | null>(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState<Entity | null>(null);
    const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
    const [walletAdjustNote, setWalletAdjustNote] = useState('');


    // --- Derived Data ---
    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  c.mobile?.includes(searchTerm) || 
                                  c.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGroup = filterGroup === 'All' || c.groups?.includes(filterGroup);
            return matchesSearch && matchesGroup && !c.isDeleted;
        });
    }, [customers, searchTerm, filterGroup]);

    // --- Handlers ---
    const exportCustomerStatement = (customer: Entity) => {
        const txs = transactions.filter(
            (tx) =>
                !tx.isDeleted &&
                (tx.entityId === customer.id ||
                    (customer.mobile && tx.entityMobile === customer.mobile) ||
                    tx.entityName === customer.name)
        );
        const sales = txs.filter((tx) => tx.type === 'Sale');
        const returns = txs.filter((tx) => tx.type === 'Sales Return');
        const esc = (v: any) => {
            const s = v === undefined || v === null ? '' : String(v);
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const lines: string[] = [];
        lines.push('Customer Statement');
        lines.push(`Name,${esc(customer.name)}`);
        lines.push(`Mobile,${esc(customer.mobile || '')}`);
        lines.push(`Current Due,${esc((Number(customer.currentDue) || 0).toFixed(2))}`);
        lines.push(`Store Credit,${esc((Number(customer.walletBalance) || 0).toFixed(2))}`);
        lines.push(`Loyalty Points,${esc(customer.loyaltyPoints || 0)}`);
        lines.push('');
        lines.push('Date,Type,Reference,Amount,Paid,Due,Notes');
        [...txs]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 100)
            .forEach((tx) => {
                lines.push(
                    [
                        esc(String(tx.date || '').slice(0, 10)),
                        esc(tx.type),
                        esc(tx.reference || tx.id),
                        esc(Number(tx.amount || 0).toFixed(2)),
                        esc(Number(tx.amountPaid || 0).toFixed(2)),
                        esc(Number(tx.dueAmount || 0).toFixed(2)),
                        esc(tx.notes || ''),
                    ].join(',')
                );
            });
        lines.push('');
        lines.push('Wallet History');
        lines.push('Date,Amount,Balance,Note,Source');
        const hist = Array.isArray((customer as any).walletHistory) ? (customer as any).walletHistory : [];
        hist.forEach((h: any) => {
            lines.push(
                [
                    esc(String(h.date || '').slice(0, 10)),
                    esc(Number(h.amount || 0).toFixed(2)),
                    esc(Number(h.balance || 0).toFixed(2)),
                    esc(h.note || ''),
                    esc(h.source || ''),
                ].join(',')
            );
        });
        lines.push('');
        lines.push(`Sales count,${sales.length}`);
        lines.push(`Returns count,${returns.length}`);
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customer-statement-${(customer.name || customer.id).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleWalletAdjust = (direction: 'credit' | 'debit') => {

        if (!viewingCustomer) return;
        const amt = Math.round((parseFloat(walletAdjustAmount) || 0) * 100) / 100;
        if (amt <= 0) {
            alert('Enter a positive amount');
            return;
        }
        const current = Number(viewingCustomer.walletBalance) || 0;
        const delta = direction === 'credit' ? amt : -amt;
        const next = applyWalletDelta(current, delta);
        const note = walletAdjustNote.trim() || (direction === 'credit' ? 'Manual top-up' : 'Manual debit');
        const history = appendWalletHistory((viewingCustomer as any).walletHistory, {
            amount: delta,
            balance: next,
            note,
            source: 'manual',
        });
        updateEntity(viewingCustomer.id, {
            walletBalance: next,
            walletHistory: history as any,
        } as any);
        setViewingCustomer({
            ...viewingCustomer,
            walletBalance: next,
            walletHistory: history,
        } as any);
        setWalletAdjustAmount('');
        setWalletAdjustNote('');
        logAction?.(`Wallet ${direction}: ${amt} for ${viewingCustomer.name}`);
    };

    const handleSaveCustomer = (e: React.FormEvent) => {

        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        
        const customerData: Partial<Entity> = {
            name: formData.get('name') as string,
            mobile: formData.get('mobile') as string,
            email: formData.get('email') as string,
            address: formData.get('address') as string,
            birthday: formData.get('birthday') as string,
            groups: formData.getAll('groups') as string[],
            notes: formData.get('notes') as string,
            type: 'Customer',
            status: formData.get('status') as any || 'Active',
            creditLimit: formData.get('creditLimit') ? parseFloat(formData.get('creditLimit') as string) : 0,
        };

        if (editingCustomer) {
            updateEntity(editingCustomer.id, customerData);
            logAction('CRM', 'Update Customer', `Updated ${customerData.name}`);
        } else {
            addEntity({ ...customerData, id: Date.now().toString() } as Entity);
            logAction('CRM', 'Add Customer', `Added ${customerData.name}`);
        }
        setShowAddModal(false);
        setEditingCustomer(null);
    };

    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const groupData: CustomerGroup = {
            id: editingGroup ? editingGroup.id : Date.now().toString(),
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            color: formData.get('color') as string,
        };

        if (editingGroup) {
            updateCustomerGroup(editingGroup.id, groupData);
        } else {
            addCustomerGroup(groupData);
        }
        setShowGroupModal(false);
        setEditingGroup(null);
    };

    const handleSaveTicket = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const ticketData = {
            id: Date.now().toString(),
            customerId: formData.get('customerId') as string,
            subject: formData.get('subject') as string,
            description: formData.get('description') as string,
            status: 'Open' as const,
            priority: formData.get('priority') as any,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        addSupportTicket(ticketData);
        setShowTicketModal(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Customers')}</h1>
                    <p className="text-slate-500 text-sm">Manage customer profiles, groups, and loyalty.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => { setEditingCustomer(null); setShowAddModal(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Customer')}
                    </button>
                    <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <Upload className="w-4 h-4" /> {t('Import')}
                    </button>
                    <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4" /> {t('Export')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Users className="w-4 h-4" /> {t('Customer List')}
                </button>
                <button 
                    onClick={() => setActiveTab('groups')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'groups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag className="w-4 h-4" /> {t('Groups & Segments')}
                </button>
                <button 
                    onClick={() => setActiveTab('tickets')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tickets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <MessageSquare className="w-4 h-4" /> {t('Support Tickets')}
                </button>
                <button 
                    onClick={() => setActiveTab('feedback')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'feedback' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Star className="w-4 h-4" /> {t('Feedback')}
                </button>
            </div>

            {/* --- CUSTOMER LIST TAB --- */}
            {activeTab === 'list' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex-1 relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, mobile, or email..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <select 
                                value={filterGroup}
                                onChange={e => setFilterGroup(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="All">All Groups</option>
                                {customerGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Group</th>
                                        <th className="px-6 py-4 text-right">Wallet</th>
                                        <th className="px-6 py-4 text-center">Loyalty</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCustomers.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">No customers found.</td></tr>
                                    ) : (
                                        filteredCustomers.map(customer => (
                                            <tr key={customer.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setViewingCustomer(customer)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                                            {customer?.name?.charAt(0) || 'C'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{customer.name}</p>
                                                            <p className="text-xs text-slate-500">ID: {customer.id.slice(-6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 text-slate-600">
                                                        {customer.mobile && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {customer.mobile}</span>}
                                                        {customer.email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {customer.email}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {customer.groups?.map(groupId => {
                                                            const group = customerGroups.find(g => g.id === groupId);
                                                            return group ? (
                                                                <span key={groupId} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: group.color }}>
                                                                    {group.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                        {(!customer.groups || customer.groups.length === 0) && <span className="text-slate-400 text-xs">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                    {currencySymbol}{customer.walletBalance?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                                                        <Star className="w-3 h-3 fill-amber-500" /> {customer.loyaltyPoints || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                                                        customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                                                        customer.status === 'Inactive' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {customer.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => { setEditingCustomer(customer); setShowAddModal(true); }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteItem('entity', customer.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                </div>
            )}

            {/* --- GROUPS TAB --- */}
            {activeTab === 'groups' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Customer Groups</h3>
                        <button 
                            onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Group
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {customerGroups.map(group => (
                            <div key={group.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: group.color }}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg text-slate-800">{group.name}</h4>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => deleteCustomerGroup(group.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">{group.description || 'No description'}</p>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                    <Users className="w-3 h-3" />
                                    {customers.filter(c => c.groups?.includes(group.id)).length} Customers
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TICKETS TAB --- */}
            {activeTab === 'tickets' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Support Tickets</h3>
                        <button 
                            onClick={() => setShowTicketModal(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Ticket
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Ticket ID</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {supportTickets.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No tickets found.</td></tr>
                                ) : (
                                    supportTickets.map(ticket => {
                                        const customer = customers.find(c => c.id === ticket.customerId);
                                        return (
                                            <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">#{ticket.id.slice(-6)}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800">{customer?.name || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-slate-600">{ticket.subject}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                        ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {ticket.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        ticket.status === 'Open' ? 'bg-emerald-100 text-emerald-700' :
                                                        ticket.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {ticket.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- FEEDBACK TAB --- */}
            {activeTab === 'feedback' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {feedbacks.map(fb => {
                            const customer = customers.find(c => c.id === fb.customerId);
                            return (
                                <div key={fb.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                                {customer?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{customer?.name || 'Anonymous'}</h4>
                                                <div className="flex text-amber-400 text-xs">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < fb.rating ? 'fill-current' : 'text-slate-200'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(fb.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm italic">"{fb.comment}"</p>
                                </div>
                            );
                        })}
                        {feedbacks.length === 0 && (
                            <div className="col-span-2 p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                                No feedback received yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ADD TICKET MODAL --- */}
            {showTicketModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Create Support Ticket</h3>
                            <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer *</label>
                                <select name="customerId" required className="w-full border p-2 rounded-lg bg-white">
                                    <option value="">Select Customer</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject *</label>
                                <input name="subject" required className="w-full border p-2 rounded-lg" placeholder="Issue summary..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                                <select name="priority" className="w-full border p-2 rounded-lg bg-white">
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea name="description" required className="w-full border p-2 rounded-lg h-24 resize-none" placeholder="Detailed description..." />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                Create Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- CUSTOMER DETAILS MODAL --- */}
            {viewingCustomer && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-end p-0 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-200">
                                    {viewingCustomer?.name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{viewingCustomer?.name || ''}</h2>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm mt-1">
                                        {viewingCustomer.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {viewingCustomer.mobile}</span>}
                                        {viewingCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {viewingCustomer.email}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewingCustomer(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-white">
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Spent</p>
                                <p className="text-lg font-bold text-slate-800">{currencySymbol}{transactions.filter(t => t.partyId === viewingCustomer.id).reduce((sum, t) => sum + t.totalAmount, 0).toFixed(0)}</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Orders</p>
                                <p className="text-lg font-bold text-slate-800">{transactions.filter(t => t.partyId === viewingCustomer.id).length}</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
                                <p className="text-xs text-emerald-600 uppercase font-bold mb-1">Wallet</p>
                                <p className="text-lg font-bold text-emerald-700">{currencySymbol}{(Number(viewingCustomer.walletBalance) || 0).toFixed(2)}</p>
                            </div>

                        {/* Store credit adjust */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adjust store credit</p>
                              <button
                                type="button"
                                onClick={() => viewingCustomer && exportCustomerStatement(viewingCustomer)}
                                className="text-[10px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Statement CSV
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 items-end">
                                <div className="flex-1 min-w-[100px]">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Amount</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={walletAdjustAmount}
                                        onChange={(e) => setWalletAdjustAmount(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex-[2] min-w-[140px]">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Note</label>
                                    <input
                                        type="text"
                                        value={walletAdjustNote}
                                        onChange={(e) => setWalletAdjustNote(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        placeholder="Top-up / correction"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleWalletAdjust('credit')}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700"
                                >
                                    + Credit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleWalletAdjust('debit')}
                                    className="px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-800"
                                >
                                    − Debit
                                </button>
                            </div>
                            {Array.isArray((viewingCustomer as any).walletHistory) && (viewingCustomer as any).walletHistory.length > 0 && (
                                <div className="max-h-32 overflow-y-auto text-xs space-y-1 pt-1">
                                    {((viewingCustomer as any).walletHistory as any[]).slice(0, 8).map((h: any) => (
                                        <div key={h.id} className="flex justify-between gap-2 text-slate-600">
                                            <span className="truncate">{(h.date || '').toString().slice(0, 10)} · {h.note || '—'}</span>
                                            <span className={`font-bold shrink-0 ${Number(h.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {Number(h.amount) >= 0 ? '+' : ''}{Number(h.amount).toFixed(2)} → {Number(h.balance).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Points</p>
                                <p className="text-lg font-bold text-amber-500">{viewingCustomer.loyaltyPoints || 0}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Groups */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-indigo-500" /> Groups & Segments
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {viewingCustomer.groups?.map(groupId => {
                                        const group = customerGroups.find(g => g.id === groupId);
                                        return group ? (
                                            <span key={groupId} className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: group.color }}>
                                                {group.name}
                                            </span>
                                        ) : null;
                                    })}
                                    {(!viewingCustomer.groups || viewingCustomer.groups.length === 0) && <p className="text-sm text-slate-400 italic">No groups assigned.</p>}
                                </div>
                            </div>

                            {/* Recent Activity / History */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Recent History
                                </h4>
                                <div className="space-y-3">
                                    {transactions
                                        .filter(t => t.partyId === viewingCustomer.id)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 5)
                                        .map(t => (
                                            <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-full text-indigo-600 shadow-sm">
                                                        <ShoppingBag className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">Order #{t.id.slice(-6)}</p>
                                                        <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-bold text-slate-800">{currencySymbol}{t.totalAmount}</span>
                                            </div>
                                        ))
                                    }
                                    {transactions.filter(t => t.partyId === viewingCustomer.id).length === 0 && (
                                        <p className="text-sm text-slate-400 italic">No purchase history found.</p>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-500" /> Internal Notes
                                </h4>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm">
                                    {viewingCustomer.notes || "No notes added for this customer."}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <button 
                                onClick={() => {
                                    setEditingCustomer(viewingCustomer);
                                    setShowAddModal(true);
                                    // Keep viewingCustomer open or close it? Let's keep it open behind or close it.
                                    // Better to close viewing to avoid stacking modals weirdly, or handle z-index.
                                    // For simplicity, let's close viewing.
                                    setViewingCustomer(null);
                                }}
                                className="text-indigo-600 font-bold text-sm hover:underline"
                            >
                                Edit Profile
                            </button>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50">
                                    Send Message
                                </button>
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                                    New Sale
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD/EDIT CUSTOMER MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                                    <input name="name" defaultValue={editingCustomer?.name} required className="w-full border p-2 rounded-lg" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile *</label>
                                    <input name="mobile" defaultValue={editingCustomer?.mobile} required className="w-full border p-2 rounded-lg" placeholder="017..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input name="email" type="email" defaultValue={editingCustomer?.email} className="w-full border p-2 rounded-lg" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Birthday</label>
                                    <input name="birthday" type="date" defaultValue={editingCustomer?.birthday} className="w-full border p-2 rounded-lg" />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                                <textarea name="address" defaultValue={editingCustomer?.address} className="w-full border p-2 rounded-lg h-20 resize-none" placeholder="Full address..." />
                                <div className="mt-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credit limit (0 = unlimited)</label>
                                    <input name="creditLimit" type="number" min={0} step="0.01" defaultValue={editingCustomer?.creditLimit ?? 0} className="w-full border p-2 rounded-lg" placeholder="0" />
                                </div>
                            </div>

                            {/* Groups & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Groups</label>
                                    <select name="groups" multiple className="w-full border p-2 rounded-lg h-24" defaultValue={editingCustomer?.groups || []}>
                                        {customerGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                    <select name="status" defaultValue={editingCustomer?.status || 'Active'} className="w-full border p-2 rounded-lg">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Lead">Lead</option>
                                        <option value="Prospect">Prospect</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Notes</label>
                                <textarea name="notes" defaultValue={editingCustomer?.notes} className="w-full border p-2 rounded-lg h-20 resize-none" placeholder="Preferences, important info..." />
                            </div>
                        </form>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
                            <button onClick={(e) => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                                {editingCustomer ? 'Update Customer' : 'Save Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD/EDIT GROUP MODAL --- */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{editingGroup ? 'Edit Group' : 'New Group'}</h3>
                            <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Name *</label>
                                <input name="name" defaultValue={editingGroup?.name} required className="w-full border p-2 rounded-lg" placeholder="e.g. VIP" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                                <input name="color" type="color" defaultValue={editingGroup?.color || '#6366f1'} className="w-full h-10 p-1 rounded-lg cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea name="description" defaultValue={editingGroup?.description} className="w-full border p-2 rounded-lg h-20 resize-none" placeholder="Group details..." />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                {editingGroup ? 'Update Group' : 'Create Group'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
