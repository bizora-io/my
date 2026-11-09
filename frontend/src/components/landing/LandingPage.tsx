import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { CoreFeaturesSection, FeatureTabId } from './CoreFeaturesSection';
import { ProductPreviewSection } from './ProductPreviewSection';
import { IndustrySolutionsSection } from './IndustrySolutionsSection';
import { WorkflowSection } from './WorkflowSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { ContactSection } from './ContactSection';
import { FooterSection } from './FooterSection';
import { ScrollToTop } from './ScrollToTop';

import { PlanDetailsModal } from './PlanDetailsModal';
import { LegalModal, LegalDocType } from '../legal/LegalModal';
import CookieBanner from '../legal/CookieBanner';
import { SEOHead } from '../common/SEOHead';
import { getPortalUrl, PortalType } from '../../lib/domainRouter';
import { apiFetch } from '../../lib/apiClient';

interface LandingPageProps {
  onNavigatePortal?: (portal: PortalType) => void;
}

export const FALLBACK_PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    badge: 'Free Trial',
    price: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'BDT',
    features: [
      'pos.terminal',
      'pos.quick_sale',
      'inventory.catalog',
      'finance.cashbox',
      'reports.basic_sales',
    ],
    modules: ['pos', 'inventory', 'reports'],
    interval: '14 days',
    limitStores: 1,
    limitUsers: 2,
    limitEmployees: 3,
    limitProducts: 50,
    limitInvoices: 100,
    limitWarehouses: 1,
    limitStorageMb: 256,
    status: 'active',
    isPopular: false,
    trialDays: 14,
    description: 'Ideal for evaluating Bizora ERP risk-free with zero commitment.',
  },
  {
    id: 'basic',
    name: 'Basic',
    badge: 'Starter',
    price: 999,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'BDT',
    features: [
      'pos.terminal',
      'pos.quick_sale',
      'pos.returns',
      'inventory.catalog',
      'inventory.barcode_labels',
      'finance.cashbox',
      'finance.expenses',
      'reports.basic_sales',
    ],
    modules: ['pos', 'inventory', 'reports'],
    interval: 'month',
    limitStores: 1,
    limitUsers: 5,
    limitEmployees: 10,
    limitProducts: 1000,
    limitInvoices: 2500,
    limitWarehouses: 1,
    limitStorageMb: 1024,
    status: 'active',
    isPopular: false,
    trialDays: 0,
    description: 'Designed for single retail stores, grocery shops, and small boutiques.',
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most Popular',
    price: 2499,
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    currency: 'BDT',
    features: [
      'pos.terminal',
      'pos.quick_sale',
      'inventory.batch_tracking',
      'inventory.serial_tracking',
      'purchases.orders',
      'finance.cashbox',
      'finance.journal',
      'hrm.employees',
      'hrm.payroll',
      'ecommerce.storefront',
      'ecommerce.courier_integration',
      'ai.assistant',
      'reports.tax_vat',
    ],
    modules: ['pos', 'inventory', 'hrm', 'ecommerce', 'reports'],
    interval: 'month',
    limitStores: 5,
    limitUsers: 25,
    limitEmployees: 50,
    limitProducts: 10000,
    limitInvoices: 25000,
    limitWarehouses: 5,
    limitStorageMb: 5120,
    status: 'active',
    isPopular: true,
    trialDays: 14,
    description: 'Best for growing retail chains, wholesale distribution, and multi-staff shops.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Enterprise',
    price: 4999,
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    currency: 'BDT',
    features: [
      'pos.terminal',
      'pos.kitchen_display',
      'inventory.batch_tracking',
      'inventory.multi_warehouse',
      'purchases.orders',
      'manufacturing.bom',
      'manufacturing.production_orders',
      'finance.journal',
      'hrm.employees',
      'multi_branch.consolidation',
      'security.audit_logs',
      'api.access',
      'ecommerce.custom_domain',
      'ai.assistant',
    ],
    modules: ['pos', 'inventory', 'hrm', 'accounting', 'manufacturing', 'ecommerce', 'multi_branch', 'api', 'reports'],
    interval: 'month',
    limitStores: 99,
    limitUsers: 999,
    limitEmployees: 500,
    limitProducts: 100000,
    limitInvoices: 500000,
    limitWarehouses: 99,
    limitStorageMb: 20480,
    status: 'active',
    isPopular: false,
    trialDays: 0,
    description: 'For large retail chains, manufacturing enterprises, and franchised networks.',
  },
];

/** Authoritative helper to format numeric resource limits */
export const formatPlanLimit = (plan: any, prop: string, isBn: boolean, unit = ''): string => {
  const val = plan?.[prop];
  if (val === undefined || val === null || val === -1 || val >= 99999) {
    return isBn ? 'আনলিমিটেড' : 'Unlimited';
  }
  if (val === 0) return isBn ? 'নেই' : 'None';
  return isBn ? `${val.toLocaleString('bn-BD')} ${unit}`.trim() : `${val.toLocaleString()} ${unit}`.trim();
};

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigatePortal }) => {
  // Theme System (Light Mode vs Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('bizora_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {}
    return 'dark';
  });

  const [isBn, setIsBn] = useState<boolean>(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<FeatureTabId>('pos');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('retail');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
  const [isPlansLoading, setIsPlansLoading] = useState<boolean>(true);

  // Modals state
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<any | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('privacy');

  // Load language preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bizora_lang');
      if (saved === 'bn') setIsBn(true);
    } catch {}
  }, []);

  const toggleLanguage = () => {
    setIsBn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bizora_lang', next ? 'bn' : 'en');
      } catch {}
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('bizora_theme', next);
      } catch {}
      return next;
    });
  };

  // Open legal modal with target document
  const openLegalModal = (doc: LegalDocType, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveLegalTab(doc);
    setLegalModalOpen(true);
  };

  // Listen to hash changes for deep linking
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase().replace('#/', '#');
      if (hash === '#privacy') {
        setActiveLegalTab('privacy');
        setLegalModalOpen(true);
      } else if (hash === '#terms') {
        setActiveLegalTab('terms');
        setLegalModalOpen(true);
      } else if (hash === '#cookies') {
        setActiveLegalTab('cookies');
        setLegalModalOpen(true);
      } else if (hash === '#refunds') {
        setActiveLegalTab('refunds');
        setLegalModalOpen(true);
      } else if (hash === '#security') {
        setActiveLegalTab('security');
        setLegalModalOpen(true);
      } else if (hash === '#deletion') {
        setActiveLegalTab('deletion');
        setLegalModalOpen(true);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch real-time public subscription packages
  const fetchPublicPlans = async (silent = false) => {
    if (!silent) setIsPlansLoading(true);
    try {
      const res = await apiFetch('/api/platform/public-plans');
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body?.plans) && body.plans.length > 0) {
          setPlans(body.plans);
        }
      }
    } catch (e) {
      console.warn('Using fallback subscription packages:', e);
    } finally {
      if (!silent) setIsPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPlans();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchPublicPlans(true);
    };
    const onFocus = () => fetchPublicPlans(true);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Portal routing handler
  const handlePortalClick = (
    portal: PortalType,
    e: React.MouseEvent,
    params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }
  ) => {
    if (params) {
      try {
        localStorage.setItem('bizora_selected_plan_params', JSON.stringify(params));
      } catch {}
    }
    if (onNavigatePortal) {
      e.preventDefault();
      onNavigatePortal(portal);
    } else {
      let url = getPortalUrl(portal);
      if (params) {
        const q = new URLSearchParams(params as Record<string, string>).toString();
        url = url.includes('?') ? `${url}&${q}` : `${url}?${q}`;
      }
      if (url.startsWith('#')) {
        window.location.hash = url.replace('#', '');
      } else {
        window.location.href = url;
      }
    }
  };

  const handleSelectPlan = (plan: any) => {
    const params = {
      plan: plan.id,
      billing: billingCycle,
      mode: 'register' as const,
    };
    const dummyEvent = { preventDefault: () => {} } as React.MouseEvent;
    handlePortalClick('shop', dummyEvent, params);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900 light' : 'bg-slate-950 text-slate-100 dark'
    }`}>
      {/* Dynamic SEO Meta Tags & JSON-LD Structured Data */}
      <SEOHead
        title={
          isBn
            ? 'বিজোরা ইআরপি ও পিওএস — আধুনিক রিটেল ও মাল্টি-ব্রাঞ্চ বাণিজ্যের ক্লাউড প্ল্যাটফর্ম'
            : 'Bizora ERP & POS — Intelligent Cloud Platform for Retail & Multi-Branch Commerce'
        }
        description={
          isBn
            ? 'সাব-সেকেন্ড বারকোড বিলিং, এফইএফও ব্যাচ মেয়াদ সুরক্ষা, স্বয়ংক্রিয় ডাবল-এন্ট্রি হিসাব ও এনবিআর ভ্যাট ৯.১। আজই ১৪ দিনের ফ্রি ট্রায়াল শুরু করুন।'
            : 'Sub-second barcode billing, FEFO batch expiry control, automated double-entry accounting, and multi-store distribution. Start your 14-day free trial today.'
        }
        keywords="ERP, POS, Retail POS, FEFO batch tracking, expiry control, double-entry accounting, multi-branch inventory, Bangladesh VAT 9.1, thermal receipt printing, offline POS"
        canonicalUrl="https://bizora-app-io.vercel.app/"
      />

      {/* 0. Sticky Global Header with Day/Night Theme Switcher */}
      <Navbar
        isBn={isBn}
        theme={theme}
        onToggleLang={toggleLanguage}
        onToggleTheme={toggleTheme}
        onPortalClick={handlePortalClick}
      />

      <main className="flex-1">
        {/* 1. Hero & Interactive 3D WebGL Canvas + Authentic Terminal */}
        <HeroSection
          isBn={isBn}
          theme={theme}
          onPortalClick={handlePortalClick}
        />

        {/* 2. Interactive Core Features (5 Pillars with Tab State Control) */}
        <CoreFeaturesSection
          isBn={isBn}
          theme={theme}
          activeTab={activeFeatureTab}
          onTabChange={setActiveFeatureTab}
        />

        {/* 3. Authentic Product Interface Walkthrough */}
        <ProductPreviewSection
          isBn={isBn}
          theme={theme}
        />

        {/* 4. Tailored Industry Solutions (With Deep Linking) */}
        <IndustrySolutionsSection
          isBn={isBn}
          theme={theme}
          selectedIndustry={selectedIndustry}
          onSelectIndustry={setSelectedIndustry}
          onPortalClick={handlePortalClick}
        />

        {/* 5. 5-Step Operational Pipeline */}
        <WorkflowSection
          isBn={isBn}
          theme={theme}
        />

        {/* 6. Transparent Dynamic Pricing */}
        <PricingSection
          isBn={isBn}
          theme={theme}
          plans={plans}
          isLoading={isPlansLoading}
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
          onSelectPlan={handleSelectPlan}
          onOpenPlanDetails={(plan) => setSelectedPlanForDetails(plan)}
        />

        {/* 7. Business & Technical FAQ */}
        <FaqSection
          isBn={isBn}
          theme={theme}
        />

        {/* 8. Dedicated Contact & Onboarding Assistance */}
        <ContactSection
          isBn={isBn}
          theme={theme}
          onPortalClick={handlePortalClick}
        />
      </main>

      {/* 9. Comprehensive Enterprise Footer (With Active Deep-Link Handlers) */}
      <FooterSection
        isBn={isBn}
        theme={theme}
        onOpenLegal={openLegalModal}
        onSelectFeatureTab={(tab) => setActiveFeatureTab(tab)}
        onSelectIndustry={(ind) => setSelectedIndustry(ind)}
        onPortalClick={handlePortalClick}
      />

      {/* Global Utilities */}
      <ScrollToTop
        isBn={isBn}
        theme={theme}
      />

      {/* Plan Details Modal */}
      <PlanDetailsModal
        isOpen={Boolean(selectedPlanForDetails)}
        plan={selectedPlanForDetails}
        billingCycle={billingCycle}
        onClose={() => setSelectedPlanForDetails(null)}
        onSelectPlan={(plan) => {
          setSelectedPlanForDetails(null);
          handleSelectPlan(plan);
        }}
        isBn={isBn}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        initialDoc={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
        isBn={isBn}
      />

      {/* GDPR & Local Privacy Cookie Banner */}
      <CookieBanner
        isBn={isBn}
        onOpenPrivacy={(e) => openLegalModal('privacy', e)}
        onOpenCookies={(e) => openLegalModal('cookies', e)}
      />
    </div>
  );
};

export default LandingPage;
