import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { Trash2, RotateCcw, Package, User, FileText } from 'lucide-react';

const RecycleBin: React.FC = () => {
    const { t } = useSettings();
    const { products, customers, suppliers, transactions, restoreItem } = useData();
    const [activeTab, setActiveTab] = useState<'products' | 'entities' | 'transactions'>('transactions');

    const deletedProducts = products.filter(p => p.isDeleted);
    const deletedEntities = [...customers, ...suppliers].filter(e => e.isDeleted);
    const deletedTransactions = transactions.filter(t => t.isDeleted);

    const handleRestore = (type: 'product' | 'entity' | 'transaction', id: string) => {
        if (confirm("Restore this item?")) {
            restoreItem(type, id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                    <Trash2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Recycle Bin')}</h1>
                    <p className="text-slate-500 text-sm">View and restore deleted items</p>
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`}>Transactions ({deletedTransactions.length})</button>
                <button onClick={() => setActiveTab('products')} className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`}>Products ({deletedProducts.length})</button>
                <button onClick={() => setActiveTab('entities')} className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'entities' ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`}>People ({deletedEntities.length})</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Item Detail</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeTab === 'transactions' && deletedTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{t.entityName}</div>
                                        <div className="text-xs text-slate-500">Amount: {t.amount} | Date: {t.date}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.type}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRestore('transaction', t.id)} className="text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded flex items-center gap-1 ml-auto">
                                            <RotateCcw className="w-4 h-4" /> Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'products' && deletedProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                                    <td className="px-6 py-4"><span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">{p.category}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRestore('product', p.id)} className="text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded flex items-center gap-1 ml-auto">
                                            <RotateCcw className="w-4 h-4" /> Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'entities' && deletedEntities.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{e.name} ({e.mobile})</td>
                                    <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{e.type}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRestore('entity', e.id)} className="text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded flex items-center gap-1 ml-auto">
                                            <RotateCcw className="w-4 h-4" /> Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {((activeTab === 'transactions' && deletedTransactions.length === 0) ||
                              (activeTab === 'products' && deletedProducts.length === 0) ||
                              (activeTab === 'entities' && deletedEntities.length === 0)) && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Bin is empty</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RecycleBin;
