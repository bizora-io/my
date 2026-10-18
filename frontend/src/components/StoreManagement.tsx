
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useStores, Store } from '../contexts/StoreContext';
import { Store as StoreIcon, Plus, Edit2, Trash2, MapPin, X, Save, CheckCircle } from 'lucide-react';

const StoreManagement: React.FC = () => {
  const { t } = useSettings();
  const { hasFeature } = useAuth();
  const { stores, activeStore, switchStore, addStore, updateStore, deleteStore } = useStores();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', phone: '' });

  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingStore(null);
    setFormData({ name: '', location: '', phone: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormData({ name: store.name, location: store.location, phone: store.phone || '' });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setStoreToDelete(id);
  };

  const confirmDelete = () => {
    if (storeToDelete) {
      deleteStore(storeToDelete);
      setStoreToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      updateStore(editingStore.id, formData);
    } else {
      addStore(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <StoreIcon className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('Store Management')}</h1>
                <p className="text-slate-500 text-sm">{t('Add, edit, or remove business locations')}</p>
            </div>
        </div>
        <button 
            onClick={() => {
                if (hasFeature('Unlimited Stores')) {
                    openAddModal();
                } else {
                    alert('Please upgrade your plan to add more stores.');
                }
            }}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-sm"
        >
            <Plus className="w-4 h-4" />
            {t('Add Store')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => (
            <div key={store.id} className={`bg-white p-6 rounded-xl shadow-sm border group hover:shadow-md transition-shadow relative ${activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}>
                {activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id && (
                    <div className="absolute top-2 right-2 text-indigo-600">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                )}
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <StoreIcon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => openEditModal(store)}
                            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
                            title={t('Edit Store')}
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                if (stores.length <= 1) {
                                    alert(t('You must have at least one store.'));
                                } else {
                                    handleDelete(store.id);
                                }
                            }}
                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title={t('Delete Store')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">{store.name}</h3>
                <div className="space-y-1">
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{store.location || 'No location set'}</span>
                    </div>
                    {store.phone && (
                        <div className="text-xs text-slate-400 pl-6">
                            {t('Phone Number')}: {store.phone}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => switchStore(store.id)}
                        disabled={activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white'}`}
                    >
                        {activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id ? t('Active Store') : t('Switch to this Store')}
                    </button>
                </div>
            </div>
        ))}
        
        {stores.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <StoreIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t('No stores found')}</p>
                <button 
                    onClick={() => {
                        if (hasFeature('Unlimited Stores')) {
                            openAddModal();
                        } else {
                            alert('Please upgrade your plan to add more stores.');
                        }
                    }}
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                >
                    {t('Add Store')}
                </button>
            </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingStore ? t('Edit Store') : t('Add Store')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Store Name')}</label>
                        <input 
                            type="text" 
                            required
                            value={formData.name ?? ''}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={t('Store Name')}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Location')}</label>
                        <input 
                            type="text" 
                            required
                            value={formData.location ?? ''}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={t('Location')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Phone Number')}</label>
                        <input 
                            type="text" 
                            value={formData.phone ?? ''}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={t('Phone Number')}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                        >
                            {t('Cancel')}
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex justify-center items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {t('Save Store')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t('Confirm Deletion')}</h3>
                    <button onClick={() => setStoreToDelete(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-slate-600">{t('Are you sure you want to delete this store?')}</p>
                    <div className="flex gap-3 pt-6">
                        <button onClick={() => setStoreToDelete(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">{t('Cancel')}</button>
                        <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">{t('Delete')}</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default StoreManagement;
