import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, Entity, LedgerEntry } from '../contexts/DataContext';
import { 
  Users, Truck, Search, Phone, MapPin, User, Building2, BookOpen, 
  Clock, Gift, X, DollarSign, Plus, Edit2, Trash2, Mail, AlertCircle 
} from 'lucide-react';

const CustomerDetailModal: React.FC<{ entity: Entity, onClose: () => void, transactions: LedgerEntry[], updateEntity: any, onEdit: (entity: Entity) => void }> = ({ entity, onClose, transactions, updateEntity, onEdit }) => {
    const { t, formatMoney } = useSettings();
    const [reminder, setReminder] = useState(entity.reminderDate || '');

    const handleSetReminder = () => {
        updateEntity(entity.id, { reminderDate: reminder });
        alert("Reminder set successfully!");
    };

    const customerTx = transactions.filter(t => t.entityName === entity.name && !t.isDeleted);
    const totalSpent = customerTx.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0);
    const totalDue = customerTx.filter(t => t.type === 'Sale' && t.paymentMethod === 'Due').reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {entity.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{entity.name}</h2>
                            <p className="text-sm text-slate-500 flex items-center gap-2"><Phone className="w-3 h-3"/> {entity.mobile}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin className="w-3 h-3"/> {entity.address || 'No Address'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onEdit(entity)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 mb-6">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                            <Gift className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                            <p className="text-xs font-bold text-slate-500 uppercase">Loyalty Points</p>
                            <p className="text-2xl font-bold text-orange-600">{entity.loyaltyPoints || 0}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                            <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Spent</p>
                            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalSpent)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                            <BookOpen className="w-6 h-6 text-red-500 mx-auto mb-1" />
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Due</p>
                            <p className="text-2xl font-bold text-red-600">{formatMoney(totalDue)}</p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Contact Details</p>
                            <div className="space-y-2">
                                <p className="text-sm flex items-center gap-2 text-slate-700"><Mail className="w-4 h-4 text-slate-400" /> {entity.email || 'No email'}</p>
                                <p className="text-sm flex items-center gap-2 text-slate-700"><Building2 className="w-4 h-4 text-slate-400" /> {entity.company || 'No company'}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Set Due Reminder</p>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="datetime-local" 
                                    value={reminder}
                                    onChange={e => setReminder(e.target.value)}
                                    className="border rounded p-1.5 text-sm flex-1"
                                />
                                <button onClick={handleSetReminder} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Set</button>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <h3 className="font-bold text-slate-800 mb-3">Transaction History</h3>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Ref</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {customerTx.map(t => (
                                    <tr key={t.id}>
                                        <td className="px-4 py-3">{t.date}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === 'Sale' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>{t.type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{t.id.slice(-6)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{formatMoney(t.amount)}</td>
                                    </tr>
                                ))}
                                {customerTx.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Communication: React.FC = () => {
    const { t, formatMoney } = useSettings();
    const { customers, suppliers, transactions, updateEntity, addEntity, deleteItem } = useData();
    const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
    const [duplicateEntity, setDuplicateEntity] = useState<Entity | null>(null);

    const data = activeTab === 'customers' ? customers : suppliers;
    const activeData = data.filter(d => !d.isDeleted);
    
    const filteredData = activeData.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (d.mobile && d.mobile.includes(searchTerm))
    );

    const handleSaveEntity = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const mobile = formData.get('mobile') as string;
        
        // Check for duplicate mobile number (if not editing the same entity)
        if (mobile) {
            const existing = (activeTab === 'customers' ? customers : suppliers).find(
                ent => ent.mobile === mobile && (!editingEntity || ent.id !== editingEntity.id) && !ent.isDeleted
            );
            
            if (existing) {
                setDuplicateEntity(existing);
                return;
            }
        }

        const entityData = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            mobile: mobile,
            company: formData.get('company') as string,
            address: formData.get('address') as string,
            type: activeTab === 'customers' ? 'Customer' : 'Supplier' as any,
        };

        if (editingEntity) {
            updateEntity(editingEntity.id, entityData);
        } else {
            addEntity({
                id: Date.now().toString(),
                ...entityData
            });
        }
        
        setIsAddModalOpen(false);
        setEditingEntity(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${activeTab === 'customers' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'} transition-colors`}>
                        {activeTab === 'customers' ? <Users className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{t('Communication')}</h1>
                        <p className="text-slate-500 text-sm">Manage your {activeTab === 'customers' ? 'customers' : 'suppliers'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                        activeTab === 'customers' 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'
                    }`}
                >
                    <Plus className="w-5 h-5" />
                    {activeTab === 'customers' ? t('Add Customer') : t('Add Supplier')}
                </button>
            </div>

            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`flex-1 md:flex-none px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'customers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <User className="w-4 h-4" /> {t('Customers')} 
                    <span className="ml-1 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">{customers.filter(c => !c.isDeleted).length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex-1 md:flex-none px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 className="w-4 h-4" /> {t('Suppliers')}
                    <span className="ml-1 bg-orange-100 text-orange-700 py-0.5 px-2 rounded-full text-xs">{suppliers.filter(s => !s.isDeleted).length}</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'customers' ? t('Search customers...') : t('Search suppliers...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredData.length > 0 ? (
                        filteredData.map((entity, index) => (
                            <div key={index} onClick={() => setSelectedEntity(entity)} className="p-5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all hover:shadow-md group cursor-pointer relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm ${activeTab === 'customers' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                                        {entity.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate">{entity.name}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${activeTab === 'customers' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {activeTab === 'customers' ? 'Customer' : 'Supplier'}
                                            </span>
                                            {entity.loyaltyPoints ? (
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-yellow-50 text-yellow-600 flex items-center gap-1">
                                                    <Gift className="w-3 h-3" /> {entity.loyaltyPoints} pts
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600 border-t border-slate-50 pt-3">
                                    {entity.mobile ? (
                                        <div className="flex items-center gap-2.5">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium">{entity.mobile}</span>
                                        </div>
                                    ) : null}
                                    {entity.address ? (
                                        <div className="flex items-start gap-2.5">
                                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <span className="line-clamp-2">{entity.address}</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingEntity(entity); setIsAddModalOpen(true); }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm border border-slate-100 transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm('Delete this contact?')) deleteItem('entity', entity.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm border border-slate-100 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                {activeTab === 'customers' ? <Users className="w-8 h-8 opacity-20" /> : <Truck className="w-8 h-8 opacity-20" />}
                            </div>
                            <p className="font-medium text-slate-500">No {activeTab} found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingEntity ? (activeTab === 'customers' ? t('Edit Customer') : t('Edit Supplier')) : (activeTab === 'customers' ? t('Add Customer') : t('Add Supplier'))}
                            </h2>
                            <button 
                                onClick={() => { setIsAddModalOpen(false); setEditingEntity(null); }}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEntity} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('Full Name')} *</label>
                                    <input 
                                        name="name"
                                        required
                                        defaultValue={editingEntity?.name}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('Phone Number')}</label>
                                    <input 
                                        name="mobile"
                                        defaultValue={editingEntity?.mobile}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. +8801..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('Email Address')}</label>
                                <input 
                                    name="email"
                                    type="email"
                                    defaultValue={editingEntity?.email}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. john@example.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('Company Name')}</label>
                                <input 
                                    name="company"
                                    defaultValue={editingEntity?.company}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('Address')}</label>
                                <textarea 
                                    name="address"
                                    defaultValue={editingEntity?.address}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                    placeholder="e.g. Dhaka, Bangladesh"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => { setIsAddModalOpen(false); setEditingEntity(null); }}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    {t('Cancel')}
                                </button>
                                <button 
                                    type="submit"
                                    className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors shadow-lg ${
                                        activeTab === 'customers' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
                                    }`}
                                >
                                    {editingEntity ? t('Update') : t('Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Duplicate Warning Modal */}
            {duplicateEntity && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Duplicate Number Found</h2>
                            <p className="text-slate-500 text-sm mb-6">
                                An account with the number <span className="font-bold text-slate-700">{duplicateEntity.mobile}</span> already exists.
                            </p>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left mb-6">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Existing Account Details</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {duplicateEntity.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{duplicateEntity.name}</p>
                                        <p className="text-xs text-slate-500">{duplicateEntity.company || 'Individual'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => {
                                        setDuplicateEntity(null);
                                        setSelectedEntity(duplicateEntity);
                                        setIsAddModalOpen(false);
                                    }}
                                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    View Existing Account
                                </button>
                                <button 
                                    onClick={() => setDuplicateEntity(null)}
                                    className="w-full py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedEntity && (
                <CustomerDetailModal 
                    entity={selectedEntity} 
                    onClose={() => setSelectedEntity(null)} 
                    transactions={transactions}
                    updateEntity={updateEntity}
                    onEdit={(ent) => { setSelectedEntity(null); setEditingEntity(ent); setIsAddModalOpen(true); }}
                />
            )}
        </div>
    );
};

export default Communication;
