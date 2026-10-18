import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useStores } from '../contexts/StoreContext';
import { Tags, Award, Ruler, Warehouse, Plus, Trash2, Star } from 'lucide-react';

const ProductAttributes: React.FC = () => {
  const { t } = useSettings();
  const {
    categories, addCategory, deleteCategory, addSubCategory, deleteSubCategory,
    brands, addBrand, deleteBrand,
    units, addUnit, deleteUnit,
    warehouses, addWarehouse, deleteWarehouse, updateWarehouse,
  } = useData();
  const { stores } = useStores();

  const [newCategory, setNewCategory] = useState('');
  const [subCatInputs, setSubCatInputs] = useState<Record<string, string>>({});
  const [newBrand, setNewBrand] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newWhName, setNewWhName] = useState('');
  const [newWhStore, setNewWhStore] = useState('');
  const [newWhAddress, setNewWhAddress] = useState('');

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">{t('Product Attributes')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage categories, brands, units, and warehouses used across your product catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Tags className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Categories')}</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (addCategory(newCategory), setNewCategory(''))}
              placeholder="e.g. Electronics, Grocery, Apparel"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => { addCategory(newCategory); setNewCategory(''); }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {categories.map(cat => (
              <div key={cat.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                  <button onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(cat.subCategories || []).map(sub => (
                    <span key={sub} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                      {sub}
                      <button onClick={() => deleteSubCategory(cat.id, sub)} className="text-slate-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={subCatInputs[cat.id] || ''}
                    onChange={e => setSubCatInputs({ ...subCatInputs, [cat.id]: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && subCatInputs[cat.id]?.trim()) {
                        addSubCategory(cat.id, subCatInputs[cat.id].trim());
                        setSubCatInputs({ ...subCatInputs, [cat.id]: '' });
                      }
                    }}
                    placeholder="Add sub-category"
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (subCatInputs[cat.id]?.trim()) {
                        addSubCategory(cat.id, subCatInputs[cat.id].trim());
                        setSubCatInputs({ ...subCatInputs, [cat.id]: '' });
                      }
                    }}
                    className="px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="p-4 text-sm text-slate-400 italic">No categories yet.</p>
            )}
          </div>
        </div>

        {/* Brands */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Brands')}</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={newBrand}
              onChange={e => setNewBrand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (addBrand(newBrand), setNewBrand(''))}
              placeholder="e.g. Samsung, Nestle"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => { addBrand(newBrand); setNewBrand(''); }} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {brands.map(b => (
              <li key={b.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-700">{b.name}</span>
                <button onClick={() => deleteBrand(b.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {brands.length === 0 && <li className="p-4 text-sm text-slate-400 italic">No brands yet.</li>}
          </ul>
        </div>

        {/* Units */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Units')}</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (addUnit(newUnit), setNewUnit(''))}
              placeholder="e.g. Pcs, Kg, Ltr"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => { addUnit(newUnit); setNewUnit(''); }} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {units.map(u => (
              <li key={u.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-700">{u.name}</span>
                <button onClick={() => deleteUnit(u.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {units.length === 0 && <li className="p-4 text-sm text-slate-400 italic">No units yet.</li>}
          </ul>
        </div>

        {/* Warehouses */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Warehouses')}</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              value={newWhName}
              onChange={e => setNewWhName(e.target.value)}
              placeholder="Warehouse name"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newWhStore}
              onChange={e => setNewWhStore(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any / All stores</option>
              {(stores || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              value={newWhAddress}
              onChange={e => setNewWhAddress(e.target.value)}
              placeholder="Address (optional)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                if (!newWhName.trim()) return;
                addWarehouse({ name: newWhName.trim(), storeId: newWhStore || undefined, address: newWhAddress || undefined });
                setNewWhName('');
                setNewWhStore('');
                setNewWhAddress('');
              }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Warehouse
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {warehouses.map(w => (
              <li key={w.id} className="px-4 py-3 flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{w.name}</span>
                    {w.isDefault && (
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {w.storeId ? (stores || []).find((s: any) => s.id === w.storeId)?.name || w.storeId : 'All stores'}
                    {w.address ? ` · ${w.address}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!w.isDefault && (
                    <button
                      onClick={() => {
                        warehouses.forEach(x => {
                          if (x.isDefault) updateWarehouse({ ...x, isDefault: false });
                        });
                        updateWarehouse({ ...w, isDefault: true });
                      }}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      Set default
                    </button>
                  )}
                  <button onClick={() => deleteWarehouse(w.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {warehouses.length === 0 && <li className="p-4 text-sm text-slate-400 italic">No warehouses yet — products can still use store-level stock.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductAttributes;
