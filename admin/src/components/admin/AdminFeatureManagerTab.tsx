import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShoppingBag,
  Package,
  ShoppingCart,
  Wallet,
  BarChart2,
  Users,
  Briefcase,
  Store,
  Megaphone,
  Database,
  Sliders,
  Filter,
} from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  ALL_FEATURES,
  TOTAL_FEATURES_COUNT,
  type FeatureCategory,
  type FeatureItem,
} from '@shared/lib/featureRegistry';

type Props = {
  globalFeatures?: Record<string, boolean> | any;
  setGlobalFeatures?: (v: any) => void;
  showToast?: (msg: string, type?: string) => void;
};

const CATEGORY_ICON_MAP: Record<string, any> = {
  pos: ShoppingBag,
  inventory: Package,
  purchase: ShoppingCart,
  accounts: Wallet,
  reports: BarChart2,
  crm: Users,
  hr: Briefcase,
  multistore: Store,
  marketing: Megaphone,
  manufacturing: Sliders,
  security: Database,
};

export const AdminFeatureManagerTab: React.FC<Props> = ({
  globalFeatures,
  setGlobalFeatures,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Initialize features dictionary with all 51 features enabled by default if not set
  const features: Record<string, boolean> = useMemo(() => {
    const base: Record<string, boolean> = {};
    ALL_FEATURES.forEach((f) => {
      base[f.id] = true;
    });
    if (globalFeatures && typeof globalFeatures === 'object') {
      return { ...base, ...globalFeatures };
    }
    return base;
  }, [globalFeatures]);

  const toggle = (featureId: string, featureName: string) => {
    const nextVal = !features[featureId];
    const next = { ...features, [featureId]: nextVal };
    setGlobalFeatures?.(next);
    showToast?.(`${featureName}: ${nextVal ? 'Enabled' : 'Disabled'}`);
  };

  const toggleCategory = (catId: string, enable: boolean) => {
    const cat = FEATURE_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    const next = { ...features };
    cat.features.forEach((f) => {
      next[f.id] = enable;
    });
    setGlobalFeatures?.(next);
    showToast?.(`${cat.name}: All features ${enable ? 'Enabled' : 'Disabled'}`);
  };

  // Filtered categories and features
  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return FEATURE_CATEGORIES.map((cat) => {
      if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
        return null;
      }
      const matchingFeatures = cat.features.filter((f) => {
        if (!query) return true;
        return (
          f.name.toLowerCase().includes(query) ||
          f.id.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
        );
      });
      if (matchingFeatures.length === 0) return null;
      return {
        ...cat,
        features: matchingFeatures,
      };
    }).filter(Boolean) as FeatureCategory[];
  }, [searchTerm, selectedCategory]);

  const totalActive = useMemo(() => {
    return Object.values(features).filter(Boolean).length;
  }, [features]);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">Platform Feature Catalog & Controls</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Global catalog of all {TOTAL_FEATURES_COUNT} enterprise features across 11 modules. Toggle features to enable or disable them system-wide for tenant subscription packages.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Active Features</p>
              <p className="text-lg font-black text-white leading-none">
                {totalActive} <span className="text-xs font-normal text-slate-400">/ {TOTAL_FEATURES_COUNT}</span>
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search all 51 features by name, key, or capability..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Modules ({TOTAL_FEATURES_COUNT})
          </button>
          {FEATURE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({cat.features.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Groups */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No matching features found</h3>
            <p className="text-xs text-slate-400 mt-1">Try refining your search query or switching categories.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat.id] || Shield;
            const categoryActiveCount = cat.features.filter((f) => features[f.id]).length;

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Category Header */}
                <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {categoryActiveCount} / {cat.features.length} Enabled
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{cat.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id, true)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id, false)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Feature Items List */}
                <div className="divide-y divide-slate-100">
                  {cat.features.map((feature) => {
                    const isEnabled = !!features[feature.id];
                    return (
                      <div
                        key={feature.id}
                        className={`flex items-center justify-between p-4 gap-4 transition-colors ${
                          isEnabled ? 'hover:bg-slate-50/60' : 'bg-slate-50/40 hover:bg-slate-100/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-800">{feature.name}</span>
                            <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {feature.id}
                            </code>
                            {feature.defaultIncludedIn?.includes('basic') ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Starter Standard
                              </span>
                            ) : feature.defaultIncludedIn?.includes('pro') ? (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                Professional
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                Enterprise Exclusive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          <span
                            className={`text-[11px] font-bold hidden sm:inline-block ${
                              isEnabled ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {isEnabled ? 'Active' : 'Locked'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggle(feature.id, feature.name)}
                            className={`relative w-12 h-6.5 rounded-full transition-colors focus:outline-none ${
                              isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            aria-label={`Toggle ${feature.name}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminFeatureManagerTab;
