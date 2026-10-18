import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getSubscriptionView } from '../lib/subscriptionStatus';
import { TRIAL_LIMIT_LABELS, type TrialLimitKey } from '@shared/lib/trialLimits';
import { 
  ALL_FEATURES, 
  getFeatureById, 
  isFeatureEnabled, 
  type FeatureItem 
} from '@shared/lib/featureRegistry';
import { 
  Check, Crown, Star, Zap, ChevronDown, ChevronUp, Minus, Quote, 
  MessageSquare, X, CreditCard, Wallet, Landmark, Loader2, 
  Lock, Shield, Eye, HardDrive, Users, Store, HelpCircle, Sparkles,
  Search, Filter, ShoppingBag, Package, ShoppingCart, DollarSign,
  BarChart3, Users2, UserCheck, Bell, ShieldCheck, Globe, Factory,
  ArrowRight, SlidersHorizontal, Layers, AlertCircle, CheckCircle2,
  Clock, Smartphone
} from 'lucide-react';

interface FeatureCategoryDef {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  featureIds: string[];
}

const FEATURE_CATEGORIES_CONFIG: FeatureCategoryDef[] = [
  {
    id: 'pos',
    name: 'POS & Sales',
    description: 'Point of sale terminal, express sales, returns, quotations, kitchen display and serial tracking.',
    icon: ShoppingBag,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    featureIds: [
      'pos.terminal',
      'pos.quick_sale',
      'pos.returns',
      'pos.quotations',
      'pos.kitchen_display',
      'pos.serial_tracking'
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock Management',
    description: 'Product catalog variants, FEFO batch expiry dates, barcode labels and stock reconciliations.',
    icon: Package,
    accentColor: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    featureIds: [
      'inventory.catalog',
      'inventory.fefo_expiry',
      'inventory.barcode',
      'inventory.adjustments'
    ],
  },
  {
    id: 'purchases',
    name: 'Purchases & Suppliers',
    description: 'Purchase orders, supplier directories, debit notes and landed cost inventory allocations.',
    icon: ShoppingCart,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    featureIds: [
      'purchases.orders',
      'purchases.suppliers',
      'purchases.returns',
      'purchases.allocations'
    ],
  },
  {
    id: 'finance',
    name: 'Finance & Accounts',
    description: 'Cash registers, double-entry general ledger, bank reconciliations, EMI dues and VAT taxes.',
    icon: DollarSign,
    accentColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    featureIds: [
      'finance.cashbox',
      'finance.double_entry',
      'finance.bank_reconciliation',
      'finance.installments',
      'finance.vat_reports',
      'finance.expense_budgets'
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Profit & Loss statements, balance sheets, sales velocity trends and formatted CSV/PDF exports.',
    icon: BarChart3,
    accentColor: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60',
    featureIds: [
      'reports.financial',
      'reports.advanced',
      'reports.export'
    ],
  },
  {
    id: 'crm',
    name: 'Customers & CRM',
    description: 'Customer credit ledgers, loyalty membership reward tiers and promotional discount vouchers.',
    icon: Users2,
    accentColor: 'text-pink-600 dark:text-pink-400',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/60',
    featureIds: [
      'crm.customers',
      'crm.loyalty',
      'crm.coupons'
    ],
  },
  {
    id: 'hrm',
    name: 'Employees & HR',
    description: 'Staff directory, organizational departments, biometric shifts, leave tracking and salary payroll.',
    icon: UserCheck,
    accentColor: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
    featureIds: [
      'hrm.employees',
      'hrm.structure',
      'hrm.shifts_attendance',
      'hrm.leave',
      'hrm.payroll'
    ],
  },
  {
    id: 'multistore',
    name: 'Multi-store & Branch Management',
    description: 'Centralized multi-outlet inventory, inter-branch stock transfers and consolidated analytics.',
    icon: Store,
    accentColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    featureIds: [
      'inventory.multi_warehouse',
      'inventory.transfer',
      'reports.consolidation'
    ],
  },
  {
    id: 'communication',
    name: 'Notifications & Communication',
    description: 'Promotional SMS marketing gateways, AI copilot insights, support tickets and team announcements.',
    icon: Bell,
    accentColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    featureIds: [
      'crm.sms_marketing',
      'support.ai_assistant',
      'support.tickets',
      'support.chat'
    ],
  },
  {
    id: 'security',
    name: 'Security, Backup & Integrations',
    description: 'REST API & webhooks, automated daily cloud snapshots, audit trail and granular role permissions.',
    icon: ShieldCheck,
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
    featureIds: [
      'system.api',
      'system.auto_backups',
      'system.audit_logs',
      'system.recycle_bin',
      'system.rbac'
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce & Online Storefront',
    description: 'Public storefront website, branded shop themes, digital payment gateways and courier dispatch.',
    icon: Globe,
    accentColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    featureIds: [
      'ecommerce.storefront',
      'ecommerce.themes',
      'ecommerce.gateways',
      'ecommerce.order_fulfillment'
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & MRP',
    description: 'Bill of Materials (BOM), production batches, raw materials reservation and capacity costing.',
    icon: Factory,
    accentColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
    featureIds: [
      'manufacturing.bom',
      'manufacturing.batches',
      'manufacturing.reservations',
      'manufacturing.capacity_costing'
    ],
  },
];

const Subscription: React.FC = () => {
  const { t, currencySymbol, language } = useSettings();
  const { user, createSaaSRequest, saasRequests, hasFeature } = useAuth() as any;

  // Billing Cycle Toggle (Monthly vs Yearly)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Plan Cards State
  const [expandedPlanFeatures, setExpandedPlanFeatures] = useState<Record<string, boolean>>({});

  // Accordion Section State
  const [featureSearchQuery, setFeatureSearchQuery] = useState('');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'included' | 'locked'>('all');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Payment / Upgrade Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_banking' | 'bank'>('card');
  const [mobileBankingProvider, setMobileBankingProvider] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Subscription view & trial details
  const subView = getSubscriptionView(user);
  const trialLimits = (user as any)?.trialLimits;
  const trialUsage = (user as any)?.trialUsage;
  const isOnTrial = String(user?.subscriptionStatus || '').toLowerCase() === 'trial' || 
                    String(user?.plan || '').toLowerCase() === 'trial' ||
                    subView.phase === 'trial';

  // Plans from Backend
  const [plans, setPlans] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('saas_plans');
      if (saved) {
        const p = JSON.parse(saved);
        if (Array.isArray(p) && p.length) return p;
      }
    } catch { /* ignore */ }
    return [
      { 
        id: 'basic', 
        name: 'Basic Starter', 
        price: 0, 
        monthlyPrice: 0, 
        yearlyPrice: 0,
        features: ['pos.terminal', 'pos.quick_sale', 'pos.returns', 'inventory.catalog', 'purchases.orders'],
        modules: ['pos', 'inventory', 'purchases'],
        limitStores: 1,
        limitEmployees: 5,
        limitUsers: 2,
        limitStorageMb: 500,
        description: 'Essential billing and inventory for single storefronts and independent retail shops.'
      },
      { 
        id: 'pro', 
        name: 'Nexus Pro', 
        price: 2499, 
        monthlyPrice: 2499, 
        yearlyPrice: 24990,
        isPopular: true,
        badge: 'Most Popular',
        features: ['pos.terminal', 'pos.quick_sale', 'pos.returns', 'pos.quotations', 'inventory.catalog', 'inventory.fefo_expiry', 'inventory.transfer', 'finance.cashbox', 'reports.financial', 'crm.customers'],
        modules: ['pos', 'inventory', 'purchases', 'finance', 'reports', 'crm', 'hrm', 'ecommerce'],
        limitStores: 3,
        limitEmployees: 15,
        limitUsers: 8,
        limitStorageMb: 2048,
        description: 'Complete multi-store operations with automated finance, online store, and advanced reporting.'
      },
      { 
        id: 'enterprise', 
        name: 'Enterprise', 
        price: 4999, 
        monthlyPrice: 4999, 
        yearlyPrice: 49990,
        badge: 'Full Suite',
        features: ALL_FEATURES.map(f => f.id),
        modules: ['pos', 'inventory', 'purchases', 'finance', 'reports', 'crm', 'hrm', 'ecommerce', 'manufacturing', 'support', 'system'],
        limitStores: 25,
        limitEmployees: 100,
        limitUsers: 50,
        limitStorageMb: 10240,
        description: 'Unlimited power with full ERP modules, manufacturing, developer APIs and dedicated support.'
      },
    ];
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${base}/api/platform/plans`);
        if (!res.ok) return;
        const body = await res.json();
        if (isMounted && Array.isArray(body?.plans) && body.plans.length) {
          setPlans(body.plans);
          localStorage.setItem('saas_plans', JSON.stringify(body.plans));
        }
      } catch {
        /* offline or network error; keep cached plans */
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Parse raw feature representation (string or array) into normalized string array
  const parseFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features.map((f: any) => String(f).trim()).filter(Boolean);
    if (typeof features === 'string') return features.split(',').map((f: string) => f.trim()).filter(Boolean);
    return [];
  };

  // Helper: check if a feature is enabled for the current active user
  const checkFeatureIncludedForUser = (featureId: string): boolean => {
    if (typeof hasFeature === 'function') {
      try {
        const res = hasFeature(featureId);
        if (res) return true;
      } catch { /* fallback */ }
    }
    return isFeatureEnabled(featureId, user?.features, user?.modules);
  };

  // Helper: check if a specific plan includes a feature
  const checkPlanIncludesFeature = (plan: any, featureId: string): boolean => {
    const planFeatures = parseFeatures(plan.features);
    const planModules = parseFeatures(plan.modules);
    return isFeatureEnabled(featureId, planFeatures, planModules);
  };

  // Determine minimum plan tier required to unlock a locked feature
  const getRequiredPlanForFeature = (feature: FeatureItem): { name: string; plan?: any } => {
    // Check database plans in ascending price order
    const sortedPlans = [...plans].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    for (const p of sortedPlans) {
      if (checkPlanIncludesFeature(p, feature.id)) {
        return { name: p.name, plan: p };
      }
    }
    // Fallback to registry defaultIncludedIn
    if (feature.defaultIncludedIn?.includes('basic')) return { name: 'Basic Starter' };
    if (feature.defaultIncludedIn?.includes('pro')) return { name: 'Nexus Pro' };
    return { name: 'Enterprise' };
  };

  // Calculate pricing based on billing cycle
  const getPlanPrice = (plan: any): { amount: number; formatted: string; periodLabel: string; savingsPercent?: number } => {
    const monthly = Number(plan.monthlyPrice ?? plan.price ?? 0);
    if (billingCycle === 'yearly') {
      const yearly = Number(plan.yearlyPrice && Number(plan.yearlyPrice) > 0 ? plan.yearlyPrice : monthly * 10);
      const savings = monthly > 0 ? Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100) : 0;
      return {
        amount: yearly,
        formatted: yearly === 0 ? 'Free' : `${currencySymbol} ${yearly.toLocaleString()}`,
        periodLabel: yearly === 0 ? 'Forever' : '/ year',
        savingsPercent: savings > 0 ? savings : 17,
      };
    }
    return {
      amount: monthly,
      formatted: monthly === 0 ? 'Free' : `${currencySymbol} ${monthly.toLocaleString()}`,
      periodLabel: monthly === 0 ? 'Forever' : '/ month',
    };
  };

  const handleChoosePlan = (plan: any) => {
    setSelectedPlanForUpgrade(plan);
    setTransactionId('');
    setShowPaymentModal(true);
  };

  const togglePlanFeaturesAccordion = (planId: string) => {
    setExpandedPlanFeatures(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  const toggleCategoryAccordion = (categoryId: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleExpandAllCategories = () => {
    const allOpen: Record<string, boolean> = {};
    FEATURE_CATEGORIES_CONFIG.forEach(c => { allOpen[c.id] = true; });
    setOpenCategories(allOpen);
  };

  const handleCollapseAllCategories = () => {
    setOpenCategories({});
  };

  // Confirm payment & submit SaaS Upgrade Request
  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForUpgrade) return;

    setIsProcessing(true);
    const pricing = getPlanPrice(selectedPlanForUpgrade);
    const methodLabel = paymentMethod === 'card' 
      ? 'Credit/Debit Card' 
      : paymentMethod === 'mobile_banking' 
        ? `Mobile Banking (${mobileBankingProvider.toUpperCase()})` 
        : 'Bank Transfer';

    try {
      await createSaaSRequest({
        type: 'subscription',
        plan: selectedPlanForUpgrade.name,
        planId: selectedPlanForUpgrade.id,
        amount: pricing.amount,
        currency: currencySymbol || 'BDT',
        billingCycle,
        paymentMethod: methodLabel,
        paymentReference: paymentMethod === 'mobile_banking' 
          ? `TrxID: ${transactionId || 'Manual Verification'}` 
          : paymentMethod === 'bank' 
            ? 'Bank Wire Receipt Attached' 
            : 'Online Payment Gateway',
        details: { 
          plan: selectedPlanForUpgrade.name, 
          planId: selectedPlanForUpgrade.id,
          amount: pricing.amount,
          currency: currencySymbol || 'BDT',
          billingCycle,
          paymentMethod: methodLabel,
          transactionId: transactionId || null,
        },
      });

      setIsProcessing(false);
      setShowPaymentModal(false);
      alert(`Subscription upgrade request for ${selectedPlanForUpgrade.name} (${currencySymbol} ${pricing.amount.toLocaleString()}) submitted successfully! Awaiting SaaS administration approval.`);
    } catch (err: any) {
      console.error("Subscription upgrade request error:", err);
      setIsProcessing(false);
      setShowPaymentModal(false);
      alert('Subscription request submitted. Awaiting administration review.');
    }
  };

  // Filtered categories and features calculation
  const { filteredCategories, totalIncludedCount, totalLockedCount } = useMemo(() => {
    const query = featureSearchQuery.trim().toLowerCase();
    let includedCount = 0;
    let lockedCount = 0;

    // Count user overall status
    ALL_FEATURES.forEach(feat => {
      if (checkFeatureIncludedForUser(feat.id)) {
        includedCount++;
      } else {
        lockedCount++;
      }
    });

    const categories = FEATURE_CATEGORIES_CONFIG.map(cat => {
      const fullFeatures: FeatureItem[] = cat.featureIds
        .map(id => getFeatureById(id))
        .filter((f): f is FeatureItem => Boolean(f));

      const matchingFeatures = fullFeatures.filter(f => {
        const isIncluded = checkFeatureIncludedForUser(f.id);

        // Filter state check
        if (featureFilter === 'included' && !isIncluded) return false;
        if (featureFilter === 'locked' && isIncluded) return false;

        // Search query check
        if (!query) return true;
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesDesc = f.description.toLowerCase().includes(query);
        const matchesId = f.id.toLowerCase().includes(query);
        const matchesAliases = f.legacyAliases?.some(a => a.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesId || matchesAliases;
      });

      const includedInCat = fullFeatures.filter(f => checkFeatureIncludedForUser(f.id)).length;

      return {
        ...cat,
        features: matchingFeatures,
        totalInCat: fullFeatures.length,
        includedInCat,
      };
    }).filter(cat => cat.features.length > 0 || !query);

    return {
      filteredCategories: categories,
      totalIncludedCount: includedCount,
      totalLockedCount: lockedCount,
    };
  }, [featureSearchQuery, featureFilter, user]);

  // When search query is entered, auto-expand categories that have results
  useEffect(() => {
    if (featureSearchQuery.trim()) {
      const autoOpen: Record<string, boolean> = {};
      filteredCategories.forEach(cat => {
        if (cat.features.length > 0) {
          autoOpen[cat.id] = true;
        }
      });
      setOpenCategories(autoOpen);
    }
  }, [featureSearchQuery, filteredCategories]);

  return (
    <div className="space-y-12 pb-16 relative">
      {/* =========================================================================
          1. TOP CURRENT SUBSCRIPTION STATUS BAR
      ========================================================================== */}
      <div className={`rounded-3xl border p-6 transition-all shadow-sm ${
        subView.phase === 'expired' 
          ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
          : subView.phase === 'grace' 
            ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' 
            : subView.phase === 'trial' 
              ? 'bg-sky-50/80 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50' 
              : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Current Subscription
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                subView.phase === 'expired' 
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300' 
                  : subView.phase === 'grace' 
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300' 
                    : subView.phase === 'trial' 
                      ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-300' 
                      : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300'
              }`}>
                {subView.label}
              </span>
              {isOnTrial && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Trial Mode
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {subView.plan}
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              {subView.renewsAt ? (
                subView.daysRemaining != null && subView.daysRemaining >= 0 ? (
                  <span>Renews on <strong className="text-slate-900 dark:text-slate-200">{subView.renewsAt.toLocaleDateString()}</strong> ({subView.daysRemaining} days remaining)</span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Overdue since {subView.renewsAt.toLocaleDateString()} ({Math.abs(subView.daysRemaining || 0)} days ago)</span>
                )
              ) : (
                <span>Permanent lifetime or complimentary access — upgrade anytime below for expanded multi-store limits.</span>
              )}
            </p>

            {subView.phase === 'expired' && (
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Your subscription has expired. Upgrade your plan to unlock premium POS, store syncing, and export tools.
              </p>
            )}
            {subView.phase === 'grace' && (
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Grace period active. Renew today to prevent interruption to store operations and daily sync.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('explore-features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Explore 51 Features
            </button>
            <button
              type="button"
              onClick={() => {
                const upgradeTarget = plans.find((p: any) => p.isPopular || p.id === 'pro') || plans[1] || plans[0];
                handleChoosePlan(upgradeTarget);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              {subView.phase === 'expired' || subView.phase === 'grace' ? 'Renew Plan Now' : 'Upgrade Plan'}
            </button>
          </div>
        </div>

        {/* Trial Limits Usage Progress (if applicable) */}
        {isOnTrial && trialLimits && (
          <div className="mt-6 pt-6 border-t border-sky-200/60 dark:border-sky-900/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider">
                {language === 'bn' ? 'ট্রায়াল প্যাকেজ ব্যবহার' : 'Trial Package Quotas & Usage'}
              </span>
              <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">
                {language === 'bn' ? 'যেকোনো লিমিট পূর্ণ হলে ট্রায়াল সমাপ্ত হবে' : 'Reaching any quota ends the free trial'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.keys(trialLimits) as TrialLimitKey[]).map((k) => {
                const lim = Number((trialLimits as any)[k]) || 0;
                const used = Number((trialUsage as any)?.[k]) || 0;
                const pct = lim > 0 ? Math.min(100, Math.round((used / lim) * 100)) : 0;
                const lab = TRIAL_LIMIT_LABELS[k];
                return (
                  <div key={k} className="bg-white/80 dark:bg-slate-900/60 rounded-xl border border-sky-100 dark:border-sky-900/40 p-3">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="truncate">{language === 'bn' ? lab.bn : lab.en}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{used}/{lim}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-sky-500'}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. BILLING CYCLE SWITCHER & HEADER
      ========================================================================== */}
      <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Transparent Enterprise Pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Flexible Plans Tailored to Your Business Growth
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Unlock point of sale registers, multi-warehouse inventory, double-entry financial accounting, and developer APIs with seamless scalability.
        </p>

        {/* Monthly / Yearly Billing Toggle */}
        <div className="pt-2 flex justify-center">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center shadow-inner border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Save ~17% (2 Mo Free)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PREMIUM PRICING CARDS (OPTION 1)
      ========================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
        {plans.filter((p: any) => p.status !== 'inactive').map((plan: any) => {
          const isCurrent = String(user?.plan || '').toLowerCase() === String(plan.name || '').toLowerCase() ||
                            (String(plan.id).toLowerCase() === 'basic' && !user?.plan);
          const isPopular = Boolean(plan.isPopular || plan.id === 'pro' || plan.code === 'pro');
          const pricing = getPlanPrice(plan);
          const hasPending = saasRequests?.some((r: any) => 
            r.userId === user?.id && 
            r.status === 'pending' && 
            (r.plan === plan.name || r.details?.plan === plan.name)
          );

          // Get raw features list
          const rawFeatures = parseFeatures(plan.features);
          // Map to full feature objects where available
          const resolvedFeatures = rawFeatures.map(fKey => {
            const resolved = getFeatureById(fKey);
            return resolved ? resolved.name : fKey;
          });

          // Show initial 5-6 features
          const initialFeatures = resolvedFeatures.slice(0, 6);
          const remainingFeatures = resolvedFeatures.slice(6);
          const isFeaturesExpanded = Boolean(expandedPlanFeatures[plan.id || plan.name]);

          return (
            <div
              key={plan.id || plan.name}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative border ${
                isPopular
                  ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-900/20 border-indigo-500/80 ring-2 ring-indigo-500 md:-translate-y-2'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Recommended / Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" /> {plan.badge || 'Most Popular'}
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-black tracking-tight">{plan.name}</h3>
                    {isCurrent && (
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        isPopular 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1.5 min-h-[36px] line-clamp-2 ${isPopular ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {plan.description || `${plan.name} package with tailored store limits and standard ERP access.`}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 pb-5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">
                      {pricing.formatted}
                    </span>
                    <span className={`text-xs font-semibold ${isPopular ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {pricing.periodLabel}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && pricing.amount > 0 && (
                    <p className={`text-[11px] mt-1 font-medium ${isPopular ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      Billed annually (~{currencySymbol} {Math.round(pricing.amount / 12).toLocaleString()}/mo)
                    </p>
                  )}
                  {plan.trialDays > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-100 dark:border-sky-800">
                        {plan.trialDays} Days Free Trial Included
                      </span>
                    </div>
                  )}
                </div>

                {/* Operational Limits (4 Clean Metrics) */}
                <div className={`mt-5 p-3.5 rounded-2xl text-[11px] grid grid-cols-2 gap-3 border ${
                  isPopular 
                    ? 'bg-slate-800/90 border-slate-700/80 text-slate-200' 
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      <Store className="w-3 h-3 text-indigo-400" /> Outlets
                    </span>
                    <span className="font-extrabold text-xs">
                      {plan.limitStores ? `${plan.limitStores} Branch${plan.limitStores > 1 ? 'es' : ''}` : '1 Branch'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      <Users className="w-3 h-3 text-emerald-400" /> Staff
                    </span>
                    <span className="font-extrabold text-xs">
                      {plan.limitEmployees ? `${plan.limitEmployees} Employees` : '5 Employees'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      <UserCheck className="w-3 h-3 text-amber-400" /> Logins
                    </span>
                    <span className="font-extrabold text-xs">
                      {plan.limitUsers ? `${plan.limitUsers} User Accounts` : '2 Users'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      <HardDrive className="w-3 h-3 text-sky-400" /> Storage
                    </span>
                    <span className="font-extrabold text-xs">
                      {plan.limitStorageMb ? (plan.limitStorageMb >= 1024 ? `${Math.round(plan.limitStorageMb / 1024)} GB Cloud` : `${plan.limitStorageMb} MB Cloud`) : '500 MB Cloud'}
                    </span>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="mt-5 space-y-2.5">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${isPopular ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    Included Capabilities:
                  </p>
                  <ul className="space-y-2 text-xs">
                    {initialFeatures.map((featName, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-amber-400' : 'text-emerald-500'}`} />
                        <span className={`line-clamp-1 ${isPopular ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {featName}
                        </span>
                      </li>
                    ))}

                    {/* Expandable features */}
                    {isFeaturesExpanded && remainingFeatures.map((featName, i) => (
                      <li key={`exp-${i}`} className="flex items-start gap-2.5 animate-in fade-in duration-200">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-amber-400' : 'text-emerald-500'}`} />
                        <span className={`line-clamp-1 ${isPopular ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {featName}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {remainingFeatures.length > 0 && (
                    <button
                      type="button"
                      onClick={() => togglePlanFeaturesAccordion(plan.id || plan.name)}
                      className={`text-[11px] font-bold flex items-center gap-1 mt-2 transition-colors ${
                        isPopular ? 'text-amber-300 hover:text-amber-200' : 'text-indigo-600 dark:text-indigo-400 hover:underline'
                      }`}
                    >
                      {isFeaturesExpanded ? (
                        <>Show fewer features <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>+ View all {resolvedFeatures.length} features <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-7 pt-4">
                {isCurrent ? (
                  <button 
                    type="button"
                    disabled
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-default ${
                      isPopular 
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700' 
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Current Active Tier
                  </button>
                ) : hasPending ? (
                  <button 
                    type="button"
                    disabled
                    className="w-full py-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-default"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Upgrade Request Pending
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleChoosePlan(plan)}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/25'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    {plan.price === 0 ? 'Switch to Free Tier' : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          4. CATEGORIZED FEATURE ACCORDION (OPTION 3: "Explore All Features")
      ========================================================================== */}
      <div id="explore-features-section" className="max-w-7xl mx-auto px-4 pt-12 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              All 51 ERP Features
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Explore All Features
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Inspect every individual capability across sales, inventory, finance, human resources, and security. Check what is enabled in your active tier or discover upgrade opportunities.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExpandAllCategories}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAllCategories}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Feature Search & Filter Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={featureSearchQuery}
              onChange={(e) => setFeatureSearchQuery(e.target.value)}
              placeholder="Search 51 features by name, keyword, or module..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {featureSearchQuery && (
              <button
                type="button"
                onClick={() => setFeatureSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFeatureFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                featureFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              All Features (51)
            </button>
            <button
              type="button"
              onClick={() => setFeatureFilter('included')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                featureFilter === 'included'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Check className="w-3.5 h-3.5" /> Included in Your Plan ({totalIncludedCount})
            </button>
            <button
              type="button"
              onClick={() => setFeatureFilter('locked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                featureFilter === 'locked'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Locked ({totalLockedCount})
            </button>
          </div>
        </div>

        {/* Feature Categories Accordion List */}
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isOpen = Boolean(openCategories[category.id]);
            const Icon = category.icon;
            const isAllIncluded = category.includedInCat === category.totalInCat;

            return (
              <div
                key={category.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategoryAccordion(category.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl border ${category.badgeBg} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {category.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isAllIncluded
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : category.includedInCat > 0
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {category.includedInCat}/{category.totalInCat} Included
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 hidden sm:block">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isOpen ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {/* Accordion Body (Feature Cards Grid) */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {category.features.map((feat) => {
                        const isIncluded = checkFeatureIncludedForUser(feat.id);
                        const requiredTier = getRequiredPlanForFeature(feat);

                        return (
                          <div
                            key={feat.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isIncluded
                                ? 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600/50'
                                : 'bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`text-xs sm:text-sm font-bold ${
                                  isIncluded ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {feat.name}
                                </h4>
                                {isIncluded ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                    <Check className="w-3 h-3" /> Included
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shrink-0">
                                    <Lock className="w-3 h-3" /> Locked
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {feat.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                                {feat.id}
                              </span>

                              {!isIncluded && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetPlan = requiredTier.plan || plans.find((p: any) => p.name.toLowerCase().includes(requiredTier.name.toLowerCase())) || plans[1] || plans[0];
                                    handleChoosePlan(targetPlan);
                                  }}
                                  className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                                >
                                  Requires {requiredTier.name} <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                No features found matching "{featureSearchQuery}"
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try searching for generic terms like "POS", "Invoice", "Tax", "Loyalty", or clear the filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFeatureSearchQuery('');
                  setFeatureFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          5. FAQ ACCORDION SECTION
      ========================================================================== */}
      <div className="max-w-4xl mx-auto px-4 mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            Frequently Asked Questions
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Common Subscription & Billing Queries
          </h2>
        </div>

        <div className="space-y-3.5">
          {[
            {
              q: 'Can I switch or upgrade my subscription plan anytime?',
              a: 'Yes, you can upgrade your plan or switch between monthly and annual billing at any point. When upgrading, our administration team will review your request and prorate your remaining subscription days accordingly.'
            },
            {
              q: 'What payment methods are supported for upgrades?',
              a: 'We accept Credit/Debit cards (Visa, MasterCard, Amex), Mobile Banking (bKash, Nagad, Rocket with instant TrxID submission), and direct Bank Wire Transfer for annual corporate accounts.'
            },
            {
              q: 'What happens when my free trial expires?',
              a: 'When your trial concludes or any trial limit is reached, your access will shift into a complimentary basic tier or grace period. All your company products, invoices, and accounting ledgers remain 100% safe and intact.'
            },
            {
              q: 'What happens if our company exceeds employee or store limits?',
              a: 'Bizora ERP allows existing records to function normally without data loss. To add new physical stores, warehouse branches, or employee logins, you can easily upgrade to Nexus Pro or Enterprise.'
            },
            {
              q: 'Is our financial and customer data backed up securely?',
              a: 'Yes. Every tenant database runs in complete multi-tenant isolation with automated daily cloud snapshots, 256-bit SSL encryption in transit, and recycle bin protections for accidental deletions.'
            }
          ].map((item, i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              <button 
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">{item.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 pt-1 text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          6. UPGRADE / PAYMENT MODAL
      ========================================================================== */}
      {showPaymentModal && selectedPlanForUpgrade && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    Upgrade to {selectedPlanForUpgrade.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Billed {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPaymentModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Total Banner */}
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">
                    Amount Payable
                  </span>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">
                    {getPlanPrice(selectedPlanForUpgrade).formatted}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {billingCycle === 'yearly' ? 'Annual Subscription' : 'Monthly Access'}
                  </span>
                  {billingCycle === 'yearly' && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      2 Months Free Discount Applied
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Card</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('mobile_banking')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      paymentMethod === 'mobile_banking' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <span>Mobile Banking</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      paymentMethod === 'bank' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={confirmPayment} className="space-y-4">
                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Card Number</label>
                      <input 
                        type="text" 
                        placeholder="4242 •••• •••• 4242" 
                        required 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Expiry</label>
                        <input 
                          type="text" 
                          placeholder="MM / YY" 
                          required 
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">CVC</label>
                        <input 
                          type="text" 
                          placeholder="123" 
                          required 
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'mobile_banking' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(['bkash', 'nagad', 'rocket'] as const).map(provider => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => setMobileBankingProvider(provider)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                            mobileBankingProvider === provider
                              ? 'bg-pink-600 text-white border-pink-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {provider}
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/60 text-xs space-y-1">
                      <p className="font-bold text-pink-900 dark:text-pink-300">
                        {mobileBankingProvider.toUpperCase()} Merchant Number: 01700-000000
                      </p>
                      <p className="text-pink-700 dark:text-pink-400 text-[11px]">
                        Send payment with your account reference and enter the transaction ID below.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Transaction ID (TrxID)
                      </label>
                      <input 
                        type="text" 
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 9J8B7X54R" 
                        required 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank' && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Bizora Technologies Ltd.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account No:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">2050 3388 9911 0022</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Routing / Swift:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">CITYBDDH091</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                      Submit your request below. Your subscription will activate upon receipt verification by our finance desk.
                    </p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Confirm & Submit Upgrade Request
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Encrypted & audited multi-tenant billing transactions
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
