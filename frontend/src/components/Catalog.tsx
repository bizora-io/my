import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Tags, Award, Ruler, Plus, Trash2, Search, RefreshCw, FolderPlus } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  subCategories?: string[];
  _count?: { products: number };
}

interface BrandItem {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  _count?: { products: number };
}

export const Catalog: React.FC = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'units'>('categories');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [subCatInput, setSubCatInput] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [unitName, setUnitName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        authFetch('/api/catalog/categories'),
        authFetch('/api/catalog/brands'),
        authFetch('/api/catalog/units'),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (brandRes.ok) setBrands(await brandRes.json());
      if (unitRes.ok) setUnits(await unitRes.json());
    } catch (e) {
      console.warn('Load catalog failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const res = await authFetch('/api/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName.trim(), description: catDesc.trim() }),
      });
      if (res.ok) {
        setCatName('');
        setCatDesc('');
        loadData();
      }
    } catch (e) {
      console.warn('Add category failed', e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this category?'))) return;
    try {
      const res = await authFetch(`/api/catalog/categories/${id}?force=true`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Delete category failed', e);
    }
  };

  const handleAddSubCategory = async (cat: CategoryItem) => {
    if (!subCatInput.trim()) return;
    const existing = cat.subCategories || [];
    if (existing.includes(subCatInput.trim())) return;
    const nextSubs = [...existing, subCatInput.trim()];
    try {
      const res = await authFetch(`/api/catalog/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subCategories: nextSubs }),
      });
      if (res.ok) {
        setSubCatInput('');
        setSelectedCatId(null);
        loadData();
      }
    } catch (e) {
      console.warn('Add subcategory failed', e);
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      const res = await authFetch('/api/catalog/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName.trim(), description: brandDesc.trim() }),
      });
      if (res.ok) {
        setBrandName('');
        setBrandDesc('');
        loadData();
      }
    } catch (e) {
      console.warn('Add brand failed', e);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this brand?'))) return;
    try {
      const res = await authFetch(`/api/catalog/brands/${id}?force=true`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Delete brand failed', e);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUnits = units.filter((u) =>
    u.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Tags className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('Catalog Master')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Manage product categories, brands, sub-categories, and measurement units across stores.')}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Tags className="w-4 h-4" />
          {t('Categories')} ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'brands'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Award className="w-4 h-4" />
          {t('Brands')} ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'units'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Ruler className="w-4 h-4" />
          {t('Units')} ({units.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search catalog...')}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              {t('Add New Category')}
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {t('Category Name')} *
                </label>
                <input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Electronics, Grocery"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {t('Description (Optional)')}
                </label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {t('Create Category')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
                {t('No categories found.')}
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white text-base">
                        {cat.name}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {cat._count?.products ?? 0} {t('products')}
                      </span>
                      {cat.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
                        className="px-2.5 py-1 text-xs border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 font-medium"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        {t('Sub-category')}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title={t('Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-categories chips */}
                  {cat.subCategories && cat.subCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {cat.subCategories.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inline sub-category form */}
                  {selectedCatId === cat.id && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <input
                        value={subCatInput}
                        onChange={(e) => setSubCatInput(e.target.value)}
                        placeholder={t('New sub-category name...')}
                        className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => handleAddSubCategory(cat)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                      >
                        {t('Add')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Brands */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              {t('Add New Brand')}
            </h3>
            <form onSubmit={handleAddBrand} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {t('Brand Name')} *
                </label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Samsung, Unilever, Nestlé"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {t('Description (Optional)')}
                </label>
                <textarea
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Short notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {t('Create Brand')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {filteredBrands.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
                {t('No brands found.')}
              </div>
            ) : (
              filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white text-base">
                      {brand.name}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {brand._count?.products ?? 0} {t('products')}
                    </span>
                    {brand.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {brand.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title={t('Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Units */}
      {activeTab === 'units' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">
            {t('Measurement Units in Use')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Standard units combined automatically from default metrics and your product catalog.')}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {filteredUnits.map((unit, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold uppercase tracking-wider"
              >
                {unit}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;

