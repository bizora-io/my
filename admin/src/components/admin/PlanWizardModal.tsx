import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown, X, Check, ChevronRight, ChevronLeft, Search, Sparkles,
  Zap, Shield, Building, Rocket, Layers, Store, Users, Package,
  AlertCircle, CheckCircle2, DollarSign, Calendar, Sliders, Eye,
  ShoppingCart, Wallet, Factory, Globe, Megaphone, HeadphonesIcon,
  BarChart2, HelpCircle
} from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  ALL_FEATURES,
  TOTAL_FEATURES_COUNT,
  getRecommendedFeaturesForPlan,
  type FeatureItem,
  type FeatureCategory
} from '@shared/lib/featureRegistry';

interface PlanWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlan: any | null;
  onSave: (planData: any) => Promise<void>;
  currencySymbol?: string;
  actionLoading?: boolean;
}

const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'violet', name: 'Purple', bg: 'bg-purple-600', ring: 'ring-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'sky', name: 'Sky Blue', bg: 'bg-sky-600', ring: 'ring-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-600', ring: 'ring-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-600', ring: 'ring-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const ICON_OPTIONS = [
  { id: 'Crown', icon: Crown, label: 'Crown' },
  { id: 'Zap', icon: Zap, label: 'Flash' },
  { id: 'Sparkles', icon: Sparkles, label: 'Sparkle' },
  { id: 'Shield', icon: Shield, label: 'Shield' },
  { id: 'Building', icon: Building, label: 'Enterprise' },
  { id: 'Rocket', icon: Rocket, label: 'Rocket' },
];

export const PlanWizardModal: React.FC<PlanWizardModalProps> = ({
  isOpen,
  onClose,
  editingPlan,
  onSave,
  currencySymbol = '৳',
  actionLoading = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    badge: '',
    description: '',
    color: 'indigo',
    icon: 'Crown',
    price: 999,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'BDT',
    interval: 'month',
    trialDays: 0,
    renewalGraceDays: 7,
    status: 'active' as 'active' | 'draft' | 'archived',
    isPopular: false,
    features: [] as string[],
    modules: ['pos', 'inventory', 'reports'] as string[],
    limitStores: 1,
    limitUsers: 5,
    limitEmployees: 10,
    limitProducts: 500,
    limitInvoices: 1000,
    limitWarehouses: 1,
    limitStorageMb: 1024,
  });

  // Feature Search & Category Filter
  const [featureSearch, setFeatureSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  // Reset or Populate on Open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFeatureSearch('');
      setSelectedCategoryTab('all');

      if (editingPlan) {
        const mPrice = Number(editingPlan.monthlyPrice ?? editingPlan.price) || 0;
        const yPrice = Number(editingPlan.yearlyPrice ?? (mPrice > 0 ? mPrice * 10 : 0)) || 0;
        
        let initialFeatures: string[] = [];
        if (Array.isArray(editingPlan.features)) {
          initialFeatures = [...editingPlan.features];
        } else if (typeof editingPlan.features === 'string') {
          initialFeatures = editingPlan.features.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean);
        }

        setFormData({
          id: editingPlan.id || '',
          name: editingPlan.name || '',
          code: editingPlan.code || editingPlan.id || '',
          badge: editingPlan.badge || (editingPlan.isPopular ? 'Popular' : ''),
          description: editingPlan.description || '',
          color: editingPlan.color || 'indigo',
          icon: editingPlan.icon || 'Crown',
          price: mPrice,
          monthlyPrice: mPrice,
          yearlyPrice: yPrice,
          currency: editingPlan.currency || 'BDT',
          interval: editingPlan.interval || 'month',
          trialDays: Number(editingPlan.trialDays ?? 0),
          renewalGraceDays: Number(editingPlan.renewalGraceDays ?? 7),
          status: editingPlan.status === 'draft' ? 'draft' : editingPlan.status === 'inactive' ? 'archived' : 'active',
          isPopular: Boolean(editingPlan.isPopular),
          features: initialFeatures.length > 0 ? initialFeatures : getRecommendedFeaturesForPlan('pro'),
          modules: Array.isArray(editingPlan.modules) ? [...editingPlan.modules] : ['pos', 'inventory', 'reports'],
          limitStores: Number(editingPlan.limitStores ?? 1),
          limitUsers: Number(editingPlan.limitUsers ?? 5),
          limitEmployees: Number(editingPlan.limitEmployees ?? 10),
          limitProducts: Number(editingPlan.limitProducts ?? 500),
          limitInvoices: Number(editingPlan.limitInvoices ?? 1000),
          limitWarehouses: Number(editingPlan.limitWarehouses ?? 1),
          limitStorageMb: Number(editingPlan.limitStorageMb ?? 1024),
        });
      } else {
        // New Package Defaults
        setFormData({
          id: '',
          name: '',
          code: '',
          badge: '',
          description: '',
          color: 'indigo',
          icon: 'Crown',
          price: 999,
          monthlyPrice: 999,
          yearlyPrice: 9990,
          currency: 'BDT',
          interval: 'month',
          trialDays: 0,
          renewalGraceDays: 7,
          status: 'active',
          isPopular: false,
          features: getRecommendedFeaturesForPlan('pro'),
          modules: ['pos', 'inventory', 'reports'],
          limitStores: 1,
          limitUsers: 5,
          limitEmployees: 10,
          limitProducts: 500,
          limitInvoices: 1000,
          limitWarehouses: 1,
          limitStorageMb: 1024,
        });
      }
    }
  }, [isOpen, editingPlan]);

  // Handle auto-calculating code / slug from name
  const handleNameChange = (newName: string) => {
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setFormData((prev) => ({
      ...prev,
      name: newName,
      code: prev.code ? prev.code : slug,
    }));
  };

  // Feature Toggle Handlers
  const toggleFeature = (featureId: string) => {
    setFormData((prev) => {
      const exists = prev.features.includes(featureId);
      const nextFeatures = exists
        ? prev.features.filter((id) => id !== featureId)
        : [...prev.features, featureId];

      // Auto sync parent module in modules array
      const featObj = ALL_FEATURES.find((f) => f.id === featureId);
      let nextModules = [...prev.modules];
      if (featObj) {
        const cat = featObj.category;
        const hasOtherFeatsInCat = nextFeatures.some((fId) => {
          const item = ALL_FEATURES.find((f) => f.id === fId);
          return item && item.category === cat;
        });
        if (hasOtherFeatsInCat && !nextModules.includes(cat)) {
          nextModules.push(cat);
        } else if (!hasOtherFeatsInCat && nextModules.includes(cat)) {
          nextModules = nextModules.filter((m) => m !== cat);
        }
      }

      return {
        ...prev,
        features: nextFeatures,
        modules: nextModules,
      };
    });
  };

  const selectAllFeatures = () => {
    const allIds = ALL_FEATURES.map((f) => f.id);
    const allCats = FEATURE_CATEGORIES.map((c) => c.id);
    setFormData((prev) => ({ ...prev, features: allIds, modules: allCats }));
  };

  const deselectAllFeatures = () => {
    setFormData((prev) => ({ ...prev, features: [], modules: [] }));
  };

  const applyPreset = (preset: 'basic' | 'pro' | 'enterprise') => {
    const ids = getRecommendedFeaturesForPlan(preset);
    const cats = Array.from(new Set(ids.map((id) => ALL_FEATURES.find((f) => f.id === id)?.category).filter(Boolean))) as string[];
    setFormData((prev) => ({
      ...prev,
      features: ids,
      modules: cats,
    }));
  };

  const toggleCategoryAll = (catId: string) => {
    const catFeats = ALL_FEATURES.filter((f) => f.category === catId).map((f) => f.id);
    const allEnabled = catFeats.every((id) => formData.features.includes(id));

    setFormData((prev) => {
      let nextFeats: string[];
      let nextMods: string[];

      if (allEnabled) {
        nextFeats = prev.features.filter((id) => !catFeats.includes(id));
        nextMods = prev.modules.filter((m) => m !== catId);
      } else {
        nextFeats = Array.from(new Set([...prev.features, ...catFeats]));
        nextMods = Array.from(new Set([...prev.modules, catId]));
      }

      return {
        ...prev,
        features: nextFeats,
        modules: nextMods,
      };
    });
  };

  // Auto-calculate yearly discount (10 months price = 2 months free)
  const applyYearlyTwoMonthsFree = () => {
    const calculated = formData.price > 0 ? formData.price * 10 : 0;
    setFormData((prev) => ({ ...prev, yearlyPrice: calculated }));
  };

  // Filter features based on search and category
  const filteredCategories = useMemo(() => {
    const query = featureSearch.trim().toLowerCase();

    return FEATURE_CATEGORIES.filter((cat) => {
      if (selectedCategoryTab !== 'all' && cat.id !== selectedCategoryTab) return false;
      return true;
    }).map((cat) => {
      const filteredFeats = cat.features.filter((f) => {
        if (!query) return true;
        return (
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.id.toLowerCase().includes(query)
        );
      });
      return {
        ...cat,
        features: filteredFeats,
      };
    }).filter((cat) => cat.features.length > 0);
  }, [featureSearch, selectedCategoryTab]);

  // Validation
  const isStep1Valid = formData.name.trim().length > 0;
  const isStep3Valid = formData.price >= 0 && formData.yearlyPrice >= 0;

  const handleSubmit = async (publishStatus?: 'active' | 'draft') => {
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      status: publishStatus || formData.status,
      price: Number(formData.price) || 0,
      monthlyPrice: Number(formData.price) || 0,
      yearlyPrice: Number(formData.yearlyPrice) || 0,
    };

    await onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                {editingPlan ? `Edit Package: ${editingPlan.name}` : 'New Subscription Package Wizard'}
              </h3>
              <p className="text-xs text-indigo-200/80">Configure package entitlements, granular features, pricing & quotas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { num: 1, title: 'Basic Information', icon: Sparkles },
            { num: 2, title: 'Feature Registry', icon: Layers, badge: `${formData.features.length}/${TOTAL_FEATURES_COUNT}` },
            { num: 3, title: 'Pricing & Quotas', icon: DollarSign },
            { num: 4, title: 'Review & Publish', icon: CheckCircle2 },
          ].map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            const Icon = s.icon;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num === 1 || (s.num > 1 && isStep1Valid)) {
                    setStep(s.num as any);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isCurrent ? 'bg-white text-indigo-600' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span>{s.title}</span>
                {s.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {s.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (STEP CONTENT) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
          
          {/* ============================================================== */}
          {/* STEP 1: BASIC INFORMATION                                      */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Package Identity & Branding
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Package Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Nexus Pro Retail"
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Package Slug / Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. nexus-pro-retail"
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-mono text-slate-700 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Badge / Highlight Tag</label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                      placeholder="e.g. Most Popular, Best Value, Starter"
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-medium text-slate-700 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none transition-all"
                    >
                      <option value="active">Active (Visible to Clients)</option>
                      <option value="draft">Draft (Hidden from Clients)</option>
                      <option value="archived">Archived / Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Short Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief summary of who this package is designed for..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-slate-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Theme Color & Icon Selection */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Visual Theme & Icon
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Accent Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.id })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          formData.color === c.id
                            ? `${c.ring} ring-2 border-transparent bg-slate-900 text-white`
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${c.bg}`} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Card Icon</label>
                  <div className="flex flex-wrap gap-2.5">
                    {ICON_OPTIONS.map((i) => {
                      const IconComp = i.icon;
                      const isSel = formData.icon === i.id;
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: i.id })}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            isSel
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span>{i.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                    <span>Highlight as "Featured / Most Popular" Package</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: FEATURE REGISTRY & SELECTION                           */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              
              {/* Feature Action Bar: Search, Presets, Select All */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-10">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    placeholder="Search features (e.g. FEFO, Quick Sale, Payroll, API)..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-slate-800 outline-none focus:border-indigo-500"
                  />
                  {featureSearch && (
                    <button
                      type="button"
                      onClick={() => setFeatureSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('basic')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                  >
                    Starter
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('pro')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold"
                  >
                    Pro Retail
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('enterprise')}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold"
                  >
                    Enterprise Suite
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={selectAllFeatures}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllFeatures}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-rose-600 text-[11px] font-bold"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Categories ({TOTAL_FEATURES_COUNT})
                </button>
                {FEATURE_CATEGORIES.map((cat) => {
                  const enabledInCat = cat.features.filter((f) => formData.features.includes(f.id)).length;
                  const isSel = selectedCategoryTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryTab(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat.name.split('&')[0].trim()}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {enabledInCat}/{cat.features.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Categorized Features Grid */}
              <div className="space-y-4">
                {filteredCategories.map((cat) => {
                  const totalInCat = cat.features.length;
                  const enabledInCat = cat.features.filter((f) => formData.features.includes(f.id)).length;
                  const allCatEnabled = enabledInCat === totalInCat;

                  return (
                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                      {/* Category Header */}
                      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-xs text-slate-800">{cat.name}</h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {enabledInCat} of {totalInCat} enabled
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategoryAll(cat.id)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          {allCatEnabled ? 'Deselect Category' : 'Enable All in Category'}
                        </button>
                      </div>

                      {/* Feature Items */}
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {cat.features.map((feat) => {
                          const isEnabled = formData.features.includes(feat.id);
                          return (
                            <div
                              key={feat.id}
                              onClick={() => toggleFeature(feat.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                isEnabled
                                  ? 'bg-indigo-50/40 border-indigo-200/90 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isEnabled ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className={`text-xs font-bold ${isEnabled ? 'text-indigo-950' : 'text-slate-800'}`}>
                                    {feat.name}
                                  </p>
                                  <span className="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-500">
                                    {feat.id}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {feat.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Floating Bottom Count */}
              <div className="p-3 bg-indigo-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>
                    {formData.features.length} of {TOTAL_FEATURES_COUNT} total application features enabled ({Math.round((formData.features.length / TOTAL_FEATURES_COUNT) * 100)}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-3 py-1 bg-white text-indigo-950 rounded-xl font-black text-xs hover:bg-indigo-50"
                >
                  Continue to Pricing →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: PRICING & LIMITS                                       */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-200">
              
              {/* Pricing Matrix */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    Subscription Pricing & Billing Cycles
                  </h4>
                  <button
                    type="button"
                    onClick={applyYearlyTwoMonthsFree}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto 2 Months Free (Yearly)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Monthly Price ({formData.currency}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({ ...formData, price: val, monthlyPrice: val });
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Yearly Price ({formData.currency}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.yearlyPrice}
                      onChange={(e) => setFormData({ ...formData, yearlyPrice: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none"
                    >
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Free Trial Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                      placeholder="0 (no trial)"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Leave 0 to require upfront subscription payment.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Renewal Grace Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.renewalGraceDays}
                      onChange={(e) => setFormData({ ...formData, renewalGraceDays: Number(e.target.value) })}
                      placeholder="7"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Days after due date before feature lockout occurs.</p>
                  </div>
                </div>
              </div>

              {/* Resource Quotas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Resource Limits & Quotas
                </h4>
                <p className="text-xs text-slate-500">
                  Configure maximum allowance for this package tier. Enter 0 or 999 for unlimited.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Branches / Stores</label>
                    <input
                      type="number"
                      value={formData.limitStores}
                      onChange={(e) => setFormData({ ...formData, limitStores: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Staff / Employees</label>
                    <input
                      type="number"
                      value={formData.limitEmployees}
                      onChange={(e) => setFormData({ ...formData, limitEmployees: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max User Logins</label>
                    <input
                      type="number"
                      value={formData.limitUsers}
                      onChange={(e) => setFormData({ ...formData, limitUsers: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Products in Catalog</label>
                    <input
                      type="number"
                      value={formData.limitProducts}
                      onChange={(e) => setFormData({ ...formData, limitProducts: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Invoices / Month</label>
                    <input
                      type="number"
                      value={formData.limitInvoices}
                      onChange={(e) => setFormData({ ...formData, limitInvoices: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Physical Warehouses</label>
                    <input
                      type="number"
                      value={formData.limitWarehouses}
                      onChange={(e) => setFormData({ ...formData, limitWarehouses: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Cloud Storage Limit (MB)</label>
                    <input
                      type="number"
                      value={formData.limitStorageMb}
                      onChange={(e) => setFormData({ ...formData, limitStorageMb: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: REVIEW & PUBLISH                                       */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-200">
              
              {/* Plan Card Preview */}
              <div className="bg-white rounded-3xl p-6 border-2 border-indigo-500/80 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                        <Crown className="w-5 h-5" />
                      </span>
                      <h4 className="text-xl font-black text-slate-900">{formData.name || 'Untitled Package'}</h4>
                      {formData.badge && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                          {formData.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {formData.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                      formData.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : formData.status === 'draft'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {formData.status}
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Billing</span>
                    <p className="text-2xl font-black text-slate-900">
                      {formData.currency} {Number(formData.price).toLocaleString()}
                      <span className="text-xs font-semibold text-slate-400 font-sans ml-1">/mo</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yearly Billing (12 mo)</span>
                    <p className="text-2xl font-black text-indigo-700">
                      {formData.currency} {Number(formData.yearlyPrice).toLocaleString()}
                      <span className="text-xs font-semibold text-slate-400 font-sans ml-1">/yr</span>
                    </p>
                    {formData.price * 12 > formData.yearlyPrice && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        Saves {formData.currency} {(formData.price * 12 - formData.yearlyPrice).toLocaleString()} per year
                      </span>
                    )}
                  </div>
                </div>

                {/* Quotas Grid */}
                <div className="mb-5">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Package Quotas</h5>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Stores</span>
                      <strong className="text-slate-800">{formData.limitStores} branch(es)</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Users</span>
                      <strong className="text-slate-800">{formData.limitUsers} user(s)</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Employees</span>
                      <strong className="text-slate-800">{formData.limitEmployees} staff</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Products</span>
                      <strong className="text-slate-800">{formData.limitProducts} items</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Invoices / mo</span>
                      <strong className="text-slate-800">{formData.limitInvoices} bills</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Warehouses</span>
                      <strong className="text-slate-800">{formData.limitWarehouses} locations</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                      <span className="text-[10px] text-slate-400 block">Storage</span>
                      <strong className="text-slate-800">{formData.limitStorageMb} MB Cloud Storage</strong>
                    </div>
                  </div>
                </div>

                {/* Features Summary */}
                <div>
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Included Features ({formData.features.length} enabled)
                  </h5>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {formData.features.map((fId) => {
                      const feat = ALL_FEATURES.find((f) => f.id === fId);
                      return (
                        <span
                          key={fId}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded-lg"
                        >
                          <Check className="w-3 h-3 text-indigo-600" />
                          <span>{feat?.name || fId}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Validation Warning if empty */}
              {formData.features.length === 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-xs font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Warning: No features are currently enabled for this package. Clients on this plan will have all modules locked.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                disabled={step === 1 && !isStep1Valid}
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleSubmit('draft')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !isStep1Valid}
                  onClick={() => handleSubmit('active')}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Publish Plan'}</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

