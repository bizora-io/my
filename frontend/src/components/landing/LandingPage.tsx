import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Shield, Zap, TrendingUp, Store, Users, DollarSign, Package, 
  Check, X as XIcon, Menu, ChevronDown, ChevronRight, ChevronLeft, Globe, Lock, ArrowRight,
  Sparkles, Layers, Activity, Smartphone, Truck, FileText, BarChart3, HelpCircle,
  ExternalLink, ArrowUpRight, Crown, RefreshCw, CheckCircle2, ShieldCheck, Database,
  Boxes, Clock, CalendarClock, BookOpen, Building, Award, ChefHat, HeartPulse, Shirt,
  Laptop, Factory as FactoryIcon, Receipt, SlidersHorizontal, Scale, Eye, WifiOff,
  AlertTriangle, ArrowRightLeft, FileCheck, Trash2
} from 'lucide-react';
import ThreeHeroScene from './ThreeHeroScene';
import { getPortalUrl, PORTAL_CONFIGS, PortalType } from '../../lib/domainRouter';
import { apiFetch } from '../../lib/apiClient';
import { getPlanFeaturesOverview, formatFeatureForDisplay, DisplayFeature } from '../../lib/featureDisplayMapping';
import { PlanDetailsModal } from './PlanDetailsModal';
import { LegalModal, LegalDocType } from '../legal/LegalModal';
import CookieBanner from '../legal/CookieBanner';
import { SEOHead } from '../common/SEOHead';

interface LandingPageProps {
  onNavigatePortal?: (portal: PortalType) => void;
}

const FALLBACK_PLANS = [
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
    limitStorageMb: 20480,
    status: 'active',
    isPopular: false,
    trialDays: 0,
    description: 'For large retail chains, manufacturing enterprises, and franchised networks.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigatePortal }) => {
  const [isBn, setIsBn] = useState(false);
  const [activeTab, setActiveTab] = useState<'pos' | 'stock' | 'accounts' | 'vat' | 'store'>('pos');
  const [aboutTab, setAboutTab] = useState<'mission' | 'problems' | 'profiles' | 'roles' | 'security'>('mission');
  const [feedIndex, setFeedIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [themeDark, setThemeDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic Pricing & SaaS Admin Synchronization State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
  const [isPlansLoading, setIsPlansLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Modals state
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<any | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('privacy');

  const openLegalModal = (doc: LegalDocType, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveLegalTab(doc);
    setLegalModalOpen(true);
  };

  // Listen to hash changes for legal modal deep linking (#privacy, #terms, etc.)
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
      console.warn('Failed to fetch public subscription packages:', e);
    } finally {
      if (!silent) setIsPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPlans();

    // Revalidate live packages on window focus & document visibility change
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

  // Calculate highest verified yearly savings percentage across active plans
  const maxSavingsPct = useMemo(() => {
    let max = 0;
    plans.forEach((p) => {
      const m = Number(p.monthlyPrice ?? p.price) || 0;
      const y = Number(p.yearlyPrice) || 0;
      if (m > 0 && y > 0 && y < m * 12) {
        const pct = Math.round(((m * 12 - y) / (m * 12)) * 100);
        if (pct > max) max = pct;
      }
    });
    return max;
  }, [plans]);

  // Touch Swipe Handlers for Mobile Carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      handleNextSlide();
    } else if (diff < -45) {
      handlePrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const items = carouselRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => {
      const next = Math.min(prev + 1, plans.length - 1);
      scrollToIndex(next);
      return next;
    });
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => {
      const prevIdx = Math.max(prev - 1, 0);
      scrollToIndex(prevIdx);
      return prevIdx;
    });
  };

  // Live feed simulation in hero dashboard
  const liveFeeds = useMemo(() => [
    { id: '1043', amount: '৳ 620', method: 'Cash', methodBn: 'ক্যাশ' },
    { id: '1044', amount: '৳ 2,340', method: 'bKash', methodBn: 'বিকাশ' },
    { id: '1045', amount: '৳ 185', method: 'Cash', methodBn: 'ক্যাশ' },
    { id: '1046', amount: '৳ 1,090', method: 'Nagad', methodBn: 'নগদ' },
    { id: '1042', amount: '৳ 1,250', method: 'bKash', methodBn: 'বিকাশ' },
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % liveFeeds.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [liveFeeds.length]);

  const marqueeItems = [
    'POS & Barcode Billing',
    'FEFO Batch & Expiry',
    'IMEI & Serial Units',
    'VAT Net Reports',
    'Journal & Cashbox',
    'Instalments & Dues',
    'Quotations',
    'Product Variants',
    'Purchase Orders',
    'Production & BOM',
    'Payroll & HR Shifts',
    'Multi-Store Branches',
    'Online Storefront',
    'Courier Booking (Pathao/Steadfast)',
    'Kitchen Display (KDS)',
    'Works 100% Offline',
    'Bangla & English',
    'Bizora Assistant'
  ];

  const handlePortalClick = (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string }) => {
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

  const landingFAQSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does Bizora work without internet?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. All sales, barcode scanning, and receipts run seamlessly offline. Once connectivity is restored, all offline transactions automatically sync to the cloud database with conflict resolution.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can my staff use it without prior technical training?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Bizora provides pre-configured role templates (Cashier, Stock Manager, Manager). Each person only sees what they are authorized to do, keeping screens intuitive and uncluttered.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I manage multiple branch stores under one account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. You can manage multiple branch stores under one central owner account, perform stock transfers between locations, and review unified financial reports.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does VAT calculation handle customer returns?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora automatically nets output and input VAT against partial and full returns, ensuring you only report and pay legitimate tax obligations.',
        },
      },
      {
        '@type': 'Question',
        name: 'How secure is my business data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your data is protected with 2FA, argon2id/bcrypt password hashing, automated cloud backups, audit logging, and strict multi-tenant isolation.',
        },
      },
    ],
  }), []);

  return (
    <div className={`min-h-screen bg-[#09090b] text-slate-100 font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden ${themeDark ? 'dark' : ''}`}>
      <SEOHead
        title={isBn ? "Bizora — ক্লাউড ইআরপি, পিওএস এবং ইনভেন্টরি সফটওয়্যার" : "Bizora — Smart Cloud ERP, POS & Inventory Management Software"}
        description="All-in-one business management software for modern retail and SMEs. High-speed barcode POS, FEFO batch inventory, double-entry accounting, VAT invoicing, and multi-branch operations."
        canonicalUrl="https://bizora-app-io.vercel.app/"
        keywords="Bizora, SaaS ERP, POS software, inventory management, retail billing software, multi-branch ERP, accounting software, FEFO stock, e-commerce POS, cloud ERP Bangladesh"
        structuredData={landingFAQSchema}
      />
      
      {/* 1. STICKY GLASS HEADER (Clean, Professional, Zero Admin Links) */}
      <header className="sticky top-0 z-50 bg-[#09090b]/85 backdrop-blur-xl border-b border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 group">
            <img 
              src="/assets/bizora-emblem.png" 
              alt="Bizora Logo" 
              className="h-10 w-10 object-contain group-hover:scale-105 transition-transform drop-shadow" 
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent leading-none">
                Bizora
              </span>
              <span className="text-[9px] font-semibold text-cyan-400 tracking-wider uppercase mt-0.5">
                Smart Business
              </span>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <a href="#features" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'ফিচারসমূহ' : 'Features'}
            </a>
            <a href="#how" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'কীভাবে চলে' : 'How It Works'}
            </a>
            <a href="#os" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'বিজনেস OS' : 'Business OS'}
            </a>
            <a href="#about" className="px-3.5 py-2 rounded-full text-sm font-medium text-amber-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'Bizora সম্পর্কে' : 'About Bizora'}
            </a>
            <a href="#industries" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'ব্যবসার ধরন' : 'Industries'}
            </a>
            <a href="#compare" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'তুলনা' : 'Compare'}
            </a>
            <a href="#plans" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'সাবস্ক্রিপশন' : 'Pricing'}
            </a>
            <a href="#faq" className="px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'জিজ্ঞাসা' : 'FAQ'}
            </a>
          </nav>

          {/* Actions, Sign In, & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsBn(!isBn)}
              aria-label="Toggle language"
              className="px-2.5 sm:px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>

            <button
              onClick={(e) => handlePortalClick('shop', e)}
              className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-400/50 text-amber-400 text-xs sm:text-sm font-bold hover:bg-amber-400 hover:text-black transition-all cursor-pointer"
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>

            <a
              href="#plans"
              className="hidden sm:inline-flex px-5 py-2 rounded-full bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/25 transition-all active:scale-95 cursor-pointer"
            >
              {isBn ? 'ফ্রি ট্রায়াল' : 'Get Started'}
            </a>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-full border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-slate-200" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0c0c0e] border-b border-white/15 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Quick Portal Switcher for Mobile */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {isBn ? 'সরাসরি পোর্টাল লগইন' : 'Direct Portal Access'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('shop', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-amber-400/10 hover:border-amber-400/40 transition-colors cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'শপ ওনার' : 'Shop Owner'}</span>
                </button>
                <button
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('employee', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-blue-400/10 hover:border-blue-400/40 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'এমপ্লয়ী' : 'Employee'}</span>
                </button>
                <button
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('customer', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-purple-400/10 hover:border-purple-400/40 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'কাস্টমার' : 'Customer'}</span>
                </button>
              </div>
            </div>

            {/* Navigation Section Links */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <a onClick={() => setMobileMenuOpen(false)} href="#features" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'ফিচারসমূহ' : 'Features'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#about" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'Bizora সম্পর্কে' : 'About Bizora'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#os" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'বিজনেস OS' : 'Business OS'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#industries" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'ব্যবসার ধরন' : 'Industries'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#compare" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'তুলনা' : 'Compare'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#plans" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'সাবস্ক্রিপশন' : 'Pricing'}
              </a>
            </div>

            <a
              onClick={() => setMobileMenuOpen(false)}
              href="#plans"
              className="block w-full text-center py-3 rounded-xl bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-400/20"
            >
              {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
            </a>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WITH 3D CANVAS & HIGH-CONVERSION TRUST METRICS */}
      <section id="top" className="relative bg-[#09090b] text-white pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden border-b border-white/10">
        {/* Ambient Glowing Orbs */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent blur-[140px] animate-pulse" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-sky-500/10 to-transparent blur-[140px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Hero Headline, Value Proposition, & SaaS Trust Cards */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 backdrop-blur-md text-xs font-bold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isBn ? 'পরবর্তী প্রজন্মের ক্লাউড ERP · ১০০% অফলাইন সক্রিয়' : 'Next-Gen Commerce ERP · 100% Offline-First'}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                {isBn ? (
                  <>
                    আপনার <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">পুরো ব্যবসা</span> এক সমন্বিত প্ল্যাটফর্মে চালান।
                  </>
                ) : (
                  <>
                    Run your <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">entire commerce enterprise</span> from one unified platform.
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl">
                {isBn
                  ? 'দ্রুত POS বিক্রি, FEFO ব্যাচ ও এক্সপায়ারি স্টক, ডাবল-এন্ট্রি হিসাব, ভ্যাট রিপোর্ট এবং অনলাইন স্টোর। ইন্টারনেট বন্ধ থাকলেও বিক্রি কখনো থামবে না।'
                  : 'High-speed POS billing, FEFO batch expiry control, automated double-entry ledger, net VAT reporting, and omnichannel storefront sync. Never miss a customer even when WiFi drops.'}
              </p>

              {/* Action CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#plans"
                  className="px-8 py-4 rounded-full bg-amber-400 text-black font-extrabold text-base shadow-xl shadow-amber-400/20 hover:bg-amber-300 hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <span>{isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>

                <a
                  href="#about"
                  className="px-7 py-4 rounded-full border border-white/25 text-white font-bold text-base hover:bg-white/10 hover:border-white/50 transition-all cursor-pointer"
                >
                  {isBn ? 'Bizora পরিচিতি' : 'Explore Platform'}
                </a>
              </div>

              {/* HIGH-CONVERTING SAAS TRUST METRIC CARDS (Replacing subdomain cards) */}
              <div className="pt-8 border-t border-white/10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all">
                    <div className="flex items-center gap-2 mb-1 text-emerald-400">
                      <WifiOff className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resilience</span>
                    </div>
                    <div className="text-xs font-black text-white">
                      {isBn ? '১০০% অফলাইন পিওএস' : '100% Offline POS'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isBn ? 'নেট ড্রপ করলেও বিক্রি সচল' : 'Keeps selling without net'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all">
                    <div className="flex items-center gap-2 mb-1 text-amber-400">
                      <CalendarClock className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inventory</span>
                    </div>
                    <div className="text-xs font-black text-white">
                      {isBn ? 'FEFO ও এক্সপায়ারি' : 'FEFO Expiry Flow'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isBn ? 'পুরোনো ব্যাচ আগে বিক্রি' : 'Zero dead-stock waste'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all">
                    <div className="flex items-center gap-2 mb-1 text-sky-400">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Compliance</span>
                    </div>
                    <div className="text-xs font-black text-white">
                      {isBn ? 'অটো ভ্যাট ও লেজার' : 'Auto VAT & Ledger'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isBn ? 'ডাবল-এন্ট্রি নির্ভুল হিসাব' : 'Audit-grade books'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all">
                    <div className="flex items-center gap-2 mb-1 text-purple-400">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Omnichannel</span>
                    </div>
                    <div className="text-xs font-black text-white">
                      {isBn ? 'দোকান ও অনলাইন সিঙ্ক' : 'Storefront & Sync'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isBn ? 'একই স্টকে লাইভ ই-কমার্স' : 'Real-time inventory pool'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Interactive Canvas & Live Sample Dashboard */}
            <div className="lg:col-span-6 relative">
              {/* Three.js Interactive 3D Canvas */}
              <div className="absolute inset-0 pointer-events-auto opacity-75 lg:opacity-90">
                <ThreeHeroScene />
              </div>

              {/* Floating Live Sample Dashboard Card */}
              <div className="relative z-20 max-w-md mx-auto lg:ml-auto bg-gradient-to-br from-[#18181b]/95 to-[#0c0c0e]/95 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {isBn ? 'আজকের মোট বিক্রি' : "Today's Gross Sales"}
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight mt-0.5">
                      ৳ 48,250
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> +18.4%
                  </div>
                </div>

                {/* Animated Weekly Sales Histogram */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">
                    {isBn ? 'সাপ্তাহিক সেলস ভেলোসিটি' : 'Weekly Sales Velocity'}
                  </div>
                  <div className="flex items-end gap-2 h-20 bg-white/5 p-2 rounded-xl">
                    {[40, 65, 48, 82, 58, 94, 72].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className="w-full rounded-t-sm bg-gradient-to-t from-amber-500 to-amber-300 transition-all duration-700 hover:brightness-125"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Metric Cards */}
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'নিট লাভ' : 'Profit'}</div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5">৳ 9,610</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'দৈনিক খরচ' : 'Expense'}</div>
                    <div className="text-sm font-black text-rose-400 mt-0.5">৳ 2,140</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'ভ্যাট' : 'VAT'}</div>
                    <div className="text-sm font-black text-sky-400 mt-0.5">৳ 3,120</div>
                  </div>
                </div>

                {/* Live Animated Sales Feed Bar */}
                <div className="p-3 bg-amber-400 text-black rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    <span>Sale #{liveFeeds[feedIndex].id}</span>
                  </div>
                  <span>{liveFeeds[feedIndex].amount} · {isBn ? liveFeeds[feedIndex].methodBn : liveFeeds[feedIndex].method}</span>
                </div>
              </div>

              {/* Floating Parallax Tags */}
              <div className="hidden sm:flex absolute -left-6 top-1/3 z-30 px-3.5 py-1.5 rounded-full bg-white text-black font-extrabold text-xs shadow-xl items-center gap-1.5 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{isBn ? '৩টি পণ্যের মেয়াদ শেষ কাছাকাছি' : '3 items expire soon (FEFO)'}</span>
              </div>
              <div className="hidden sm:flex absolute -right-4 -bottom-6 z-30 px-4 py-2 rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-xl items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{isBn ? 'VAT ও হিসাব অডিট রেডি' : 'VAT & books audit-ready'}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. INFINITE MARQUEE TICKER */}
      <div className="bg-amber-400 text-black overflow-hidden py-3 font-black text-sm tracking-wide select-none border-y border-black">
        <div className="flex whitespace-nowrap animate-marquee gap-8">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <span key={idx} className="flex items-center gap-8">
              <span>{item}</span>
              <span className="w-2 h-2 rounded-full bg-black" />
            </span>
          ))}
        </div>
      </div>

      {/* 4. DEDICATED ABOUT BIZORA SECTION */}
      <section id="about" className="py-24 bg-[#0d0d12] text-white border-b border-white/10 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-amber-500/10 via-indigo-500/5 to-transparent blur-3xl rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-bold uppercase tracking-widest">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? 'বিজনেস ইঞ্জিনিয়ারিং দর্শন' : 'Architecture & Core Mission'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              {isBn ? 'Bizora ERP কী এবং কেন আলাদা?' : 'What is Bizora ERP & Why It Exists.'}
            </h2>
            <p className="text-base sm:text-lg text-slate-300 font-medium">
              {isBn
                ? 'খাতা-কলম বা জটিল বিদেশি সফটওয়্যারের বদলে দেশীয় খুচরা ও পাইকারি ব্যবসার আসল চ্যালেঞ্জগুলো সমাধান করতেই বিজোরার সৃষ্টি।'
                : 'Engineered from first principles to resolve operational deadlocks in multi-branch retail, wholesale, and omnichannel trade.'}
            </p>
          </div>

          {/* About Tab Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto mb-12">
            {[
              { id: 'mission', label: isBn ? 'প্ল্যাটফর্মের ভিত্তি' : 'Core Architecture', icon: Layers },
              { id: 'problems', label: isBn ? 'বাস্তব সমস্যা সমাধান' : 'Problems Solved', icon: AlertTriangle },
              { id: 'profiles', label: isBn ? 'সমর্থিত ব্যবসাসমূহ' : 'Industry Profiles', icon: Building },
              { id: 'roles', label: isBn ? 'ইউজার রোলস' : 'Role Hierarchy', icon: Users },
              { id: 'security', label: isBn ? 'নিরাপত্তা ও প্রাইভেসি' : 'Security Boundaries', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAboutTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    aboutTab === tab.id
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* About Tab Content Panels */}
          <div className="bg-[#14141a] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-5xl mx-auto">
            
            {aboutTab === 'mission' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
                <div className="lg:col-span-7 space-y-5">
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {isBn ? 'একটি অবিচ্ছেদ্য একক ব্যবসা অপারেটিং সিস্টেম' : 'A Unified Commerce Operating System'}
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    {isBn
                      ? 'অধিকাংশ দোকানে পিওএস, ইনভেন্টরি, হিসাবের খাতা এবং অনলাইন শপ থাকে সম্পূর্ণ আলাদা। ফলে এক জায়গার বিক্রির তথ্য অন্য জায়গায় মেলাতে ঘণ্টার পর ঘণ্টা অপচয় হয়। Bizora এই বিভক্তি চিরতরে দূর করে।'
                      : 'Traditional merchants struggle with disconnected point-of-sale registers, manual inventory spreadsheets, separate bookkeeping notebooks, and siloed web stores. Bizora unites every customer counter, warehouse shelf, supplier order, and balance sheet into a single source of truth.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="font-bold text-amber-400 text-sm mb-1">{isBn ? '১. অফলাইন-ফার্স্ট রেজিলিয়েন্স' : '1. Offline-First Architecture'}</div>
                      <p className="text-xs text-slate-400">
                        {isBn ? 'ব্রাউজারেই লোকাল ক্যাশিংয়ের মাধ্যমে নেট ড্রপ করলেও ক্যাশ কাউন্টার নিরবচ্ছিন্ন থাকে।' : 'IndexedDB local engine guarantees zero checkout stoppage during broadband or 4G blackouts.'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="font-bold text-amber-400 text-sm mb-1">{isBn ? '২. রিয়েল-টাইম মডিউল সিনার্জি' : '2. Real-Time Module Synergy'}</div>
                      <p className="text-xs text-slate-400">
                        {isBn ? 'প্রতিটি বিক্রি মুহূর্তে স্টক আপডেট করে, ভ্যাট হিসাব করে এবং জার্নালে ডাবল-এন্ট্রি পোস্ট করে।' : 'Every sale automatically decrements inventory, calculates tax, and balances financial journals.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#09090c] border border-white/10 rounded-2xl p-6 font-mono text-xs space-y-4">
                  <div className="text-amber-400 font-bold border-b border-white/10 pb-2 flex items-center justify-between">
                    <span>BIZORA_KERNEL_PIPELINE</span>
                    <span className="text-[10px] text-emerald-400">ACTIVE</span>
                  </div>
                  <div className="space-y-3 text-slate-300">
                    <div className="p-2.5 rounded-lg bg-white/5 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-white font-bold">1. Counter Checkout</div>
                        <div className="text-[10px] text-slate-400">Thermal receipt + split tender</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="text-white font-bold">2. FEFO Batch Decrement</div>
                        <div className="text-[10px] text-slate-400">Oldest lot consumed first</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-white font-bold">3. Auto Double-Entry Posting</div>
                        <div className="text-[10px] text-slate-400">Debit Cash / Credit Revenue + VAT</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="text-white font-bold">4. Storefront Real-time Sync</div>
                        <div className="text-[10px] text-slate-400">Online stock reflects instantly</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aboutTab === 'problems' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    {isBn ? 'ব্যবসায়ীদের মূল ৪টি মাথাব্যথা — যা বিজোরা দূর করে' : 'Four Core Headaches Bizora Eliminates Forever'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isBn ? 'প্রতিদিনের ক্ষতি এবং প্রশাসনিক জটিলতা রোধে নিশ্চিত প্রযুক্তিগত সমাধান।' : 'Operational friction solved through disciplined backend algorithms and defensive design.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 transition-colors">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{isBn ? '১. মেয়াদোত্তীর্ণ মালের ক্ষতি (Expired Stock)' : '1. Expired Stock Write-Offs'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      <strong className="text-slate-400">Headache:</strong> Newer stock placed in front sells while older batches sit behind and expire unnoticed.
                    </p>
                    <p className="text-xs text-amber-300 leading-relaxed bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                      <strong>Bizora Fix:</strong> First-Expired, First-Out (FEFO) engine allocates oldest lots automatically with pre-expiry alerts 30/60 days prior.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 transition-colors">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1.5">
                      <WifiOff className="w-4 h-4" />
                      <span>{isBn ? '২. ইন্টারনেট ড্রপআউট (POS Freeze)' : '2. POS Outages During Busy Hours'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      <strong className="text-slate-400">Headache:</strong> Cloud software stops working when broadband fails, creating customer queues.
                    </p>
                    <p className="text-xs text-amber-300 leading-relaxed bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                      <strong>Bizora Fix:</strong> Full offline queue in IndexedDB. Sales and thermal receipts print immediately; changes auto-reconcile to cloud when reconnected.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/40 transition-colors">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-1.5">
                      <Scale className="w-4 h-4" />
                      <span>{isBn ? '৩. হিসাবের অমিল ও ভ্যাট বিভ্রান্তি' : '3. Ledger Discrepancies & VAT Panic'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      <strong className="text-slate-400">Headache:</strong> Manual sales books leave owners unsure of true profit after returns, discounts, and tax.
                    </p>
                    <p className="text-xs text-amber-300 leading-relaxed bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                      <strong>Bizora Fix:</strong> Double-entry journal posting for every counter sale and return. Net input/output VAT statements generated in 1 click.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/40 transition-colors">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-1.5">
                      <Globe className="w-4 h-4" />
                      <span>{isBn ? '৪. দোকান বনাম অনলাইন স্টক দ্বিধা' : '4. In-Store vs. Online Double-Selling'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      <strong className="text-slate-400">Headache:</strong> A customer buys online an item that was already sold over the retail counter 10 minutes ago.
                    </p>
                    <p className="text-xs text-amber-300 leading-relaxed bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                      <strong>Bizora Fix:</strong> Unified omnichannel inventory. A sale at the physical counter reduces web stock in real-time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {aboutTab === 'profiles' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    {isBn ? 'যেসব ব্যবসার জন্য বিজোরা বিশেষভাবে কার্যকর' : 'Supported Commerce Profiles'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isBn ? 'প্রতিটি সেক্টরের বাস্তব কাজের প্রয়োজনীয়তা মাথায় রেখে ফিচার ডিজাইন করা হয়েছে।' : 'Tested across diversified retail verticals with custom data fields and workflows.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                  {[
                    { title: 'Supermarkets & Grocery', icon: ShoppingBag, color: 'text-emerald-400', desc: 'Barcode scales, weigh integrations, multi-pack bundles, and expiry alerts.' },
                    { title: 'Pharmacies & Healthcare', icon: HeartPulse, color: 'text-rose-400', desc: 'Mandatory batch numbers, expiry dates, medicine formulation lookup, and doctor prescription logs.' },
                    { title: 'Fashion & Apparel', icon: Shirt, color: 'text-amber-400', desc: 'Matrix variants (size, color, fit), barcode label generation, and seasonal lookbook storefront.' },
                    { title: 'Mobile & Electronics', icon: Laptop, color: 'text-sky-400', desc: 'Serial & IMEI tracking from purchase bill to customer receipt, warranty verification, and instalments.' },
                    { title: 'Restaurants & Cafes', icon: ChefHat, color: 'text-yellow-400', desc: 'Kitchen Display Screen (KDS), split table billing, food ticket printers, and recipe ingredient tracking.' },
                    { title: 'Light Manufacturing', icon: FactoryIcon, color: 'text-indigo-400', desc: 'Bills of Materials (BOM), raw material reservations, finished goods unit cost calculation, and scrap logs.' },
                  ].map((prof, idx) => {
                    const Icon = prof.icon;
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${prof.color}`} />
                          <h4 className="font-bold text-white text-sm">{prof.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{prof.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {aboutTab === 'roles' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    {isBn ? 'ইউজার রোল এবং দায়িত্বের সুনির্দিষ্ট বণ্টন' : 'Role-Based Access Control (RBAC)'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isBn ? 'মালিক, ক্যাশিয়ার এবং গ্রাহকদের জন্য আলাদা অনুমতি যাতে ব্যবসার নিরাপত্তা ক্ষুণ্ণ না হয়।' : 'Strict least-privilege security model ensuring employees only access what their shift requires.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                      <Store className="w-4 h-4" />
                      <span>{isBn ? 'দোকান মালিক (Shop Owner)' : 'Shop Owner'}</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> Full financial P&L and net profit access</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> Multi-branch control and stock transfers</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> Staff role permissions and salary approvals</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> Cloud backup download and period locking</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
                      <Users className="w-4 h-4" />
                      <span>{isBn ? 'কর্মচারী ও ক্যাশিয়ার (Staff)' : 'Cashier & Staff'}</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /> High-speed POS checkout and barcode scanning</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /> Cashbox opening, shift sales, and closing count</li>
                      <li className="flex items-start gap-1.5"><XIcon className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" /> Zero access to sensitive profit margins or accounting</li>
                      <li className="flex items-start gap-1.5"><XIcon className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" /> Cannot delete historical invoices or audit records</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{isBn ? 'গ্রাহক (Customer)' : 'Customer Portal'}</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" /> Itemized purchase history and digital receipts</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" /> Transparent dues and installment ledger tracking</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" /> Online storefront ordering and parcel tracking</li>
                      <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" /> Self-service payment verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {aboutTab === 'security' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    {isBn ? 'প্ল্যাটফর্ম সীমানা ও ডাটা নিরাপত্তা' : 'Platform Boundaries & Multi-Tenant Isolation'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isBn ? 'আপনার দোকানের আর্থিক ডাটা সম্পূর্ণ নিরাপদ ও অন্যান্য দোকান থেকে সম্পূর্ণ বিচ্ছিন্ন।' : 'Strict tenant boundaries enforced through multi-tenant Firestore collections and role claims.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Multi-Tenant Data Isolation</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Every database read, write, and index query strictly enforces the tenant’s verified `businessId`. There is zero cross-tenant contamination. One shop can never view another shop’s products, sales, margins, or customers.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
                      <Lock className="w-4 h-4" />
                      <span>Isolated SaaS Admin Boundary</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      SaaS Admin is strictly an internal infrastructure and billing management plane deployed on a separate domain. It is completely isolated from the public website and customer portals. SaaS administrators do not touch confidential merchant sales entries.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE FEATURES & MODULE SHOWCASE */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'দোকানের বাস্তব কাজের জন্য তৈরি।' : 'Built for how shops actually work.'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn
              ? 'নিচের মডিউল ট্যাবগুলো বেছে নিন, দেখুন Bizora আপনার সারাদিনের কোন কাজগুলো সেকেন্ডে সমাধান করে।'
              : 'Pick an operational module below to see how Bizora simplifies your core daily bottlenecks.'}
          </p>
        </div>

        {/* Feature Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-4xl mx-auto mb-10">
          {[
            { id: 'pos', label: 'POS & Billing', labelBn: 'পিওএস ও বিলিং' },
            { id: 'stock', label: 'Stock & Expiry (FEFO)', labelBn: 'স্টক ও মেয়াদ' },
            { id: 'accounts', label: 'Auto Accounts & Cash', labelBn: 'হিসাব ও ক্যাশবক্স' },
            { id: 'vat', label: 'VAT & Tax Reports', labelBn: 'ভ্যাট ও কর' },
            { id: 'store', label: 'Online Store & Courier', labelBn: 'অনলাইন শপ ও কুরিয়ার' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-black'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
              }`}
            >
              {isBn ? tab.labelBn : tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Panel Content */}
        <div className="bg-[#121216] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-5xl mx-auto">
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'সেকেন্ডে দ্রুত বিক্রি ও প্রিন্ট' : 'Sell in seconds with smart barcode scanning'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'বারকোড স্ক্যানার বা ক্যামেরার মাধ্যমে চোখের পলকে প্রোডাক্ট কাটুন। ইন্টারনেট না থাকলেও সম্পূর্ণ অফলাইনে বিলিং চলবে।'
                    : 'A lightning-fast till that pairs with any standard barcode scanner and keeps running even when the internet completely disconnects.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'ক্যামেরা বা স্ক্যানারে স্ক্যান করে তৎক্ষণাৎ বিল ও থার্মাল প্রিন্ট' : 'Instant barcode scan, touch numpad, and thermal 58mm/80mm receipts',
                    isBn ? 'এক বিল ভাগ করুন ক্যাশ, কার্ড, বিকাশ, নগদ বা বাকিতে' : 'Split tender payments across cash, card, bKash, Nagad, Rocket, or due',
                    isBn ? 'আংশিক রিটার্নে অটোমেটিক স্টক ও সিরিয়াল ফেরত' : 'Partial returns restore lot stocks and customer ledger automatically',
                    isBn ? 'প্রতিটি বিক্রি নিজে নিজেই অ্যাকাউন্টিং জার্নালে পোস্ট হয়' : 'Every sale posts double-entry debits and credits automatically',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual Demo Card */}
              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="flex justify-between border-b border-white/15 pb-2 font-bold text-amber-400">
                  <span>RECEIPT #POS-8821</span>
                  <span>COUNTER 01</span>
                </div>
                <div className="space-y-2 py-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>2 × Premium Tea (400g)</span>
                    <span className="font-bold text-white">৳ 580</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 × Pure Soybean Oil (2L)</span>
                    <span className="font-bold text-white">৳ 395</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 × Milk Powder (500g)</span>
                    <span className="font-bold text-white">৳ 450</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-white/20 pt-3 flex justify-between font-black text-base text-amber-400">
                  <span>TOTAL BILL</span>
                  <span>৳ 1,425</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'মেয়াদোত্তীর্ণ মাল আর কখনো বিক্রি হবে না' : 'FEFO: Never sell expired stock'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'Bizora প্রতিটি পারচেজের লট ও এক্সপায়ারি তারিখ ট্র্যাক করে। তাই যে ব্যাচের মেয়াদ আগে শেষ হবে, তা আগে বিক্রি হয়।'
                    : 'Bizora tracks every batch by purchase date and expiration. Oldest stock sells first (First-Expired, First-Out) with automated reorder triggers.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'প্রতি ক্রয়ে লট ও মেয়াদ ট্র্যাকিং' : 'Lot and expiry dates tracked on every purchase invoice',
                    isBn ? 'কম-স্টক ও এক্সপায়ারি অ্যালার্ট সহ অটো রিঅর্ডার' : 'Low-stock alerts with predictive supplier reorder quantities',
                    isBn ? 'ফোন ও ইলেকট্রনিক্সের সিরিয়াল/IMEI নম্বর ও ওয়ারেন্টি ট্র্যাকিং' : 'Serial/IMEI lifecycle from vendor purchase to customer warranty',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">EXPIRY FEFO ENGINE</div>
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 flex justify-between">
                  <span>Yogurt · Lot A-12</span>
                  <span className="font-bold">Expires in 3d</span>
                </div>
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 flex justify-between">
                  <span>Biscuits · Lot B-07</span>
                  <span className="font-bold">Expires in 38d</span>
                </div>
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 flex justify-between">
                  <span>Stock Status</span>
                  <span className="font-bold">100% FEFO Protected</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'অটোমেটিক অ্যাকাউন্টিং ও ক্যাশবক্স' : 'Books that write themselves'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'বিক্রি, ক্রয়, ভ্যাট ও খরচ নিজে থেকেই জার্নালে চলে যায়। দিন শেষে ক্যাশবক্স ও ব্যাংক ব্যালেন্স মুহূর্তের মধ্যে মিলে যায়।'
                    : 'Sales, purchases, expenses, and VAT become verified journal entries in real-time, delivering audit-grade profit and loss statements.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'ক্যাশ, বিকাশ, নগদ ও ব্যাংক স্টেটমেন্ট এক ক্লিকে রিকনসাইল' : 'Reconcile cash, bKash, Nagad, and bank accounts in one view',
                    isBn ? 'সাপ্লায়ার ও কাস্টমারের বাকি লেজার ট্র্যাক হয় স্বয়ংক্রিয়ভাবে' : 'Supplier payables and customer dues tracked with SMS reminders',
                    isBn ? 'পিরিয়ড লকে পুরোনো তারিখে ভুল এন্ট্রি বন্ধ থাকে' : 'Back-dated period locking prevents unauthorized tampering',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">FINANCIAL RECONCILIATION</div>
                <div className="flex justify-between py-1">
                  <span>Gross Sales</span>
                  <span className="text-white font-bold">৳ 48,250</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Cost of Goods & OpEx</span>
                  <span className="text-rose-400 font-bold">-৳ 38,640</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-emerald-400">
                  <span>NET PROFIT</span>
                  <span>+৳ 9,610</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'মাস শেষে VAT নিয়ে কোনো দুশ্চিন্তা নেই' : 'VAT without the month-end panic'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'যেকোনো নির্দিষ্ট সময়ের আউটপুট ও ইনপুট VAT হিসাব হয় স্বয়ংক্রিয়ভাবে। রিটার্ন বাদ দিয়ে সঠিক ট্যাক্স প্রদেয় দেখে নিন।'
                    : 'Calculate exact output and input VAT for any custom date range, netted against sales returns and purchases.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'রিটার্ন বাদ দেওয়া নিখুঁত আউটপুট ও ইনপুট ভ্যাট' : 'Net output and input VAT calculation with return deductions',
                    isBn ? 'এক ক্লিকে CSV এক্সপোর্ট অথবা প্রিন্ট' : 'One-click CSV audit export and printable official tax summaries',
                    isBn ? 'সেটিংসে দেওয়া কাস্টম ট্যাক্স রেট স্বয়ংক্রিয় কার্যকর' : 'Configurable standard VAT rates tailored to local tax rules',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">VAT AUDIT REPORT</div>
                <div className="flex justify-between py-1">
                  <span>Output VAT Collected</span>
                  <span className="text-white font-bold">৳ 3,120</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Input VAT Paid</span>
                  <span className="text-sky-300 font-bold">৳ 1,480</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-amber-400">
                  <span>NET TAX PAYABLE</span>
                  <span>৳ 1,640</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'একই স্টক থেকে সরাসরি অনলাইনে বিক্রি' : 'Sell online from the exact same stock'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'তৈরি ৫টি চমৎকার থিম থেকে বেছে নিন। কাস্টমারের অনলাইন অর্ডার সরাসরি আপনার ERP-তে আসবে এবং কুরিয়ার বুক হবে।'
                    : 'Pick a beautiful storefront theme and take orders directly into your POS. Stock syncs in real-time across retail counters and online.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? '৫টি রেডি স্টোর থিম (মিনিমালিস্ট থেকে টেক হাব)' : '5 polished storefront themes tailored for boutique, tech, and retail',
                    isBn ? 'কুরিয়ার বুকিং ও ট্র্যাকিং: পাঠাও, স্টিডফাস্ট, পেপারফ্লাই, RedX' : 'Instant courier consignment booking: Pathao, Steadfast, Paperfly, RedX',
                    isBn ? 'দোকানে বিক্রি হলে অনলাইনেও তাৎক্ষণিক স্টক কমে যায়' : 'Zero double-selling: stock levels sync immediately across all channels',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">ONLINE STORE ORDER #2031</div>
                <div className="flex justify-between py-1">
                  <span>Order Amount</span>
                  <span className="text-white font-bold">৳ 1,850</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Courier Partner</span>
                  <span className="text-amber-300 font-bold">Steadfast Logistics</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-emerald-400">
                  <span>DELIVERY STATUS</span>
                  <span>In Transit (Tracking Active)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. HOW IT WORKS (THREE-STEP WORKFLOW) */}
      <section id="how" className="py-20 bg-[#09090c] text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              {isBn ? 'তিন সহজ ধাপে শুরু করুন।' : 'Get started in three simple steps.'}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 font-medium">
              {isBn
                ? 'এতটাই সহজ যে আপনার যেকোনো স্টাফ ট্রেনিং ছাড়াই চালাতে পারবে।'
                : 'Simple enough that your store team needs zero technical training.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '1',
                title: 'Add your products',
                titleBn: 'পণ্য যোগ করুন',
                desc: 'Type them in directly or upload an Excel/CSV spreadsheet with barcodes in one click.',
                descBn: 'নিজে যোগ করুন অথবা বারকোড সহ CSV ফাইল এক ক্লিকে ইমপোর্ট করে নিন।'
              },
              {
                num: '2',
                title: 'Record sales & purchases',
                titleBn: 'বিক্রি ও ক্রয় লিখুন',
                desc: 'Sell quickly at the till and receive incoming vendor deliveries with batch and expiry tracking.',
                descBn: 'টিলে দ্রুত বিক্রি করুন, আর সাপ্লায়ারের মাল লট, মেয়াদ ও সিরিয়াল সহ গ্রহণ করুন।'
              },
              {
                num: '3',
                title: 'Read your reports',
                titleBn: 'রিপোর্ট দেখুন',
                desc: 'Access audit-grade profit and loss, balance sheets, dues, and VAT statements in one tap.',
                descBn: 'লাভ-ক্ষতি, ব্যালেন্স শিট, বকেয়া এবং ভ্যাট রিপোর্ট দেখুন এক ক্লিকে।'
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-[#141417] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-amber-400/50 transition-colors text-left">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xl mb-6 shadow-md shadow-amber-400/20 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <h3 className="text-xl font-black text-white mb-2">{isBn ? step.titleBn : step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{isBn ? step.descBn : step.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-white/10 text-center">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">35+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'স্ক্রিন, এক সমন্বিত প্ল্যাটফর্মে' : 'Enterprise Screens'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">8</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'রেডি স্টাফ রোল' : 'Prebuilt Roles'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">4</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'কুরিয়ার পার্টনার ইন্টিগ্রেশন' : 'Courier Couplings'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">5</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'তৈরি স্টোর থিম' : 'Storefront Themes'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. COMPLETE BUSINESS OS GRID (12 MODULES) */}
      <section id="os" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'শুধু POS নয়, একটি পূর্ণাঙ্গ বিজনেস OS।' : 'More than a till. A complete business OS.'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn
              ? 'ব্যবসা দক্ষতার সাথে পরিচালনা করতে যা যা প্রয়োজন, সবই একটি সিস্টেমে সংযুক্ত।'
              : 'Everything required to operate, scale, and secure your enterprise, already connected.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Purchasing & POs', titleBn: 'ক্রয় ও সাপ্লায়ার', desc: 'Order from suppliers, receive batch stock, and track payables.', descBn: 'সাপ্লায়ারকে অর্ডার দিন, মাল গ্রহণ করুন এবং দেনা ট্র্যাক করুন।' },
            { title: 'Serial & IMEI Tracking', titleBn: 'সিরিয়াল ট্র্যাকিং', desc: 'Follow each phone or appliance from arrival to warranty check.', descBn: 'প্রতিটি ফোন বা ইলেকট্রনিক্স কেনা থেকে বিক্রি পর্যন্ত ট্র্যাক করুন।' },
            { title: 'Quotes & Instalments', titleBn: 'কোটেশন ও কিস্তি', desc: 'Send quotes, convert to sales, and manage credit instalment schedules.', descBn: 'কোটেশন পাঠান, বিক্রিতে রূপান্তর করুন এবং বাকির কিস্তি সামলান।' },
            { title: 'Cashbox & Reconciliation', titleBn: 'ক্যাশবক্স ও ব্যাংক', desc: 'Reconcile cash drawers, bKash, and bank statements in one view.', descBn: 'ক্যাশ, বিকাশ ও ব্যাংক স্টেটমেন্ট এক জায়গায় মিলিয়ে নিন।' },
            { title: 'Online Storefront', titleBn: 'অনলাইন স্টোর', desc: 'Sell online from the same live inventory you sell over the counter.', descBn: 'দোকানের একই লাইভ স্টক থেকে অনলাইনে পণ্য বিক্রি করুন।' },
            { title: 'Courier Automation', titleBn: 'কুরিয়ার অটোমেশন', desc: 'Directly dispatch parcels to Steadfast/Pathao with live tracking.', descBn: 'তৎক্ষণাৎ পার্সেল বুক করুন এবং রিয়েল-টাইম ট্র্যাকিং দেখুন।' },
            { title: 'Production & BOM', titleBn: 'প্রোডাকশন ও BOM', desc: 'Transform raw materials into finished stock with bill of materials.', descBn: 'বিল অব ম্যাটেরিয়ালস সহ কাঁচামাল থেকে তৈরি পণ্য বানান।' },
            { title: 'Payroll & HR Shifts', titleBn: 'বেতন ও HR', desc: 'Manage employee attendance, shift schedules, and salary disbursements.', descBn: 'স্টাফ হাজিরা, শিফট শিডিউল ও বেতন বিতরণ করুন।' },
            { title: 'Multi-Store Branches', titleBn: 'একাধিক শাখা', desc: 'Add branches, transfer inventory, and generate consolidated reports.', descBn: 'শাখা যোগ করুন, স্টক ট্রান্সফার করুন এবং একত্র রিপোর্ট দেখুন।' },
            { title: 'Dedicated Portals', titleBn: 'পোর্টাল আর্কিটেকচার', desc: 'Shop owners, employees, and customers each get dedicated entry points.', descBn: 'মালিক, কর্মচারী ও গ্রাহক আলাদা ডেডিকেটেড পোর্টাল পান।' },
            { title: 'Audit & Data Security', titleBn: 'নিরাপত্তা ও অডিট', desc: 'Multi-tenant isolation, tamper-evident audit logs, and encrypted backups.', descBn: 'আইসোলেটেড ডাটাবেস, বিস্তারিত অডিট লগ ও এনক্রিপ্টেড ব্যাকআপ।' },
            { title: 'Bizora Assistant', titleBn: 'বিজনেস সহকারী', desc: 'Ask natural-language business questions in English or Bangla.', descBn: 'সহজ ভাষায় নিজের ব্যবসা, সেলস ও স্টক নিয়ে প্রশ্ন করুন।' },
          ].map((item, idx) => (
            <div key={idx} className="bg-[#141418] border border-white/10 rounded-2xl p-6 shadow-sm hover:border-amber-400 transition-all text-left group">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-lg mb-4 group-hover:scale-105 transition-transform">
                {item.title[0]}
              </div>
              <h3 className="text-lg font-black text-white mb-1.5">{isBn ? item.titleBn : item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{isBn ? item.descBn : item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. INDUSTRY BENTO-GRID */}
      <section id="industries" className="py-20 bg-[#09090c] text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              {isBn ? 'আপনার ব্যবসার ধরন অনুযায়ী সমাধান।' : 'What Bizora does for your industry.'}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 font-medium">
              {isBn
                ? 'একই শক্তিশালী প্ল্যাটফর্ম, কিন্তু প্রতিটি ব্যবসার আসল মাথাব্যথার নিখুঁত সমাধান আলাদা।'
                : 'One unified platform, tailored to eliminate the specific friction in your industry.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🛒',
                trade: 'Grocery & Supermart',
                tradeBn: 'গ্রোসারি ও সুপারশপ',
                pain: 'Older products expire on the back shelf while newly received items sell first.',
                painBn: 'পুরোনো মাল তাকে পড়ে মেয়াদ শেষ হয়, আর নতুন মাল আগে বিক্রি হয়ে যায়।',
                solution: 'FEFO batch tracking, automated expiry warnings, barcode scanning, and low-stock reorder triggers.',
                solutionBn: 'প্রতি কেনায় লট ও মেয়াদ, পুরোনো ব্যাচ আগে বিক্রি (FEFO), মেয়াদ ও কম-স্টক অ্যালার্ট।'
              },
              {
                icon: '📱',
                trade: 'Mobile & Electronics',
                tradeBn: 'মোবাইল ও ইলেকট্রনিক্স',
                pain: 'Uncertainty over exact serial numbers sold, warranty verification, and credit payment tracking.',
                painBn: 'ঠিক কোন ফোনটা বিক্রি হলো, ওয়ারেন্টি আছে কি না, আর বাকির কিস্তি মেলানো কঠিন।',
                solution: 'Serial/IMEI tracked from vendor to checkout, warranty ledger, and instalment reminder schedules.',
                solutionBn: 'কেনা থেকে বিক্রি পর্যন্ত সিরিয়াল নম্বর, ওয়ারেন্টি ভিউ ও বাকিতে বিক্রিতে কিস্তির শিডিউল।'
              },
              {
                icon: '👗',
                trade: 'Fashion & Boutique',
                tradeBn: 'ফ্যাশন ও বুটিক',
                pain: 'Managing thousands of individual color and size variations becomes an operational nightmare.',
                painBn: 'প্রতিটি সাইজ ও রঙের ভিন্নতা আলাদা প্রোডাক্ট হিসেবে সামলানো কঠিন হয়ে পড়ে।',
                solution: 'Matrix-based product variants at POS, Boutique storefront theme, and live inventory sync.',
                solutionBn: 'টিলে সাইজ ও রঙের ম্যাট্রিক্স ভ্যারিয়েন্ট, বুটিক স্টোর থিম ও লাইভ অনলাইন শপ।'
              },
              {
                icon: '☕',
                trade: 'Restaurant & Cafe',
                tradeBn: 'রেস্টুরেন্ট ও ক্যাফে',
                pain: 'Orders get mixed up between cashier counters, kitchen stations, and table servers.',
                painBn: 'কাউন্টার আর রান্নাঘরের মাঝে অর্ডার গুলিয়ে যায় এবং সার্ভিং দেরি হয়।',
                solution: 'Live Kitchen Display System (KDS), thermal food ticket printing, and split billing.',
                solutionBn: 'ক্যাশিয়ার থেকে কিচেনে অর্ডার পাঠানো, স্টেশনভিত্তিক লাইভ টিকিট ও থার্মাল প্রিন্ট।'
              },
              {
                icon: '⚙️',
                trade: 'Small Manufacturer',
                tradeBn: 'ছোট উৎপাদক ও ফ্যাক্টরি',
                pain: 'Exact unit costs remain unknown when raw materials turn into finished merchandise.',
                painBn: 'কাঁচামাল থেকে তৈরি পণ্যের আসল উৎপাদন খরচ সঠিকভাবে জানা থাকে না।',
                solution: 'Bill of Materials (BOM), production runs, raw material reservation, and variance audits.',
                solutionBn: 'বিল অব ম্যাটেরিয়ালস, প্রোডাকশন রান, কাঁচামাল রিজার্ভ ও খরচের পার্থক্য অডিট।'
              },
              {
                icon: '🏢',
                trade: 'Multi-Branch Retail',
                tradeBn: 'একাধিক শাখা ও চেইন স্টোর',
                pain: 'Every branch runs on separate notebooks, leaving management blind to global stock.',
                painBn: 'প্রতিটি শাখা আলাদা খাতা, ফলে ব্যবসার পূর্ণাঙ্গ চিত্র কোনো মালিক দেখতে পান না।',
                solution: 'Unified owner login, inter-branch stock transfers, and 1 consolidated financial statement.',
                solutionBn: 'এক লগইনে একাধিক স্টোর, শাখাগুলোর মধ্যে ট্রান্সফার ও একটি একত্র রিপোর্ট।'
              }
            ].map((ind, idx) => (
              <div key={idx} className="bg-[#141418] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-400/50 transition-colors text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10">{ind.icon}</div>
                  <h3 className="text-lg font-black text-white">{isBn ? ind.tradeBn : ind.trade}</h3>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border-l-4 border-rose-500 text-rose-200 text-xs">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-rose-400 mb-1">{isBn ? 'প্রধান সমস্যা:' : 'Core Headache:'}</div>
                  {isBn ? ind.painBn : ind.pain}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-200 text-xs">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-amber-400 mb-1">{isBn ? 'Bizora সমাধান:' : 'Bizora Solution:'}</div>
                  {isBn ? ind.solutionBn : ind.solution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FEATURE COMPARISON MATRIX */}
      <section id="compare" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'অন্যান্য সিস্টেমের সাথে মিলিয়ে দেখুন।' : 'Check it against what you use today.'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn
              ? 'খাতা-কলম, সাধারণ রসিদ প্রিন্টার বা জটিল এন্টারপ্রাইজ সিস্টেমের সাথে Bizora-র সরাসরি তুলনা।'
              : 'Compare Bizora side-by-side with spreadsheets, basic POS, and heavyweight legacy ERPs.'}
          </p>
        </div>

        <div className="overflow-x-auto bg-[#141418] border border-white/10 rounded-2xl shadow-2xl">
          <table className="w-full text-left border-collapse text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-5 font-black text-white bg-white/5 w-2/5">{isBn ? 'ফিচার ও সক্ষমতা' : 'Capability'}</th>
                <th className="p-5 font-black text-black bg-amber-400 text-center w-1/5">Bizora</th>
                <th className="p-5 font-semibold text-slate-400 bg-white/5 text-center w-1/5">{isBn ? 'খাতা ও এক্সেল' : 'Spreadsheets'}</th>
                <th className="p-5 font-semibold text-slate-400 bg-white/5 text-center w-1/5">{isBn ? 'সাধারণ POS' : 'Basic POS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { title: 'Works 100% offline & syncs to cloud', titleBn: 'অফলাইনে কাজ ও স্বয়ংক্রিয় সিঙ্ক', biz: true, sp: false, pos: false },
                { title: 'FEFO oldest-expiry selling algorithm', titleBn: 'আগে মেয়াদ শেষ হওয়া ব্যাচ আগে বিক্রি (FEFO)', biz: true, sp: false, pos: false },
                { title: 'IMEI & Serial tracking from PO to sale', titleBn: 'ক্রয় থেকে বিক্রি পর্যন্ত সিরিয়াল ট্র্যাকিং', biz: true, sp: false, pos: false },
                { title: 'Automated double-entry journal posting', titleBn: 'প্রতিটি বিক্রিতে অটোমেটিক হিসাব জার্নাল', biz: true, sp: false, pos: false },
                { title: 'Net VAT calculation net of returns', titleBn: 'রিটার্ন বাদ দিয়ে সঠিক ভ্যাট রিপোর্ট', biz: true, sp: false, pos: true },
                { title: 'Credit sale instalment schedules', titleBn: 'বাকিতে বিক্রির কিস্তি ও এসএমএস রিমাইন্ডার', biz: true, sp: false, pos: false },
                { title: 'Online storefront on the same inventory', titleBn: 'একই স্টকে অনলাইন শপ ও রিয়েলটাইম সিঙ্ক', biz: true, sp: false, pos: false },
                { title: 'Direct courier booking (Pathao/Steadfast)', titleBn: 'সরাসরি কুরিয়ার বুকিং ও ট্র্যাকিং', biz: true, sp: false, pos: false },
                { title: 'Multi-branch stores with stock transfers', titleBn: 'একাধিক শাখা ও ব্রাঞ্চ স্টক ট্রান্সফার', biz: true, sp: false, pos: false },
                { title: 'Bilingual English & Bengali toggle', titleBn: 'বাংলা ও ইংরেজি সম্পূর্ণ পরিবর্তনযোগ্য', biz: true, sp: false, pos: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-semibold text-slate-200">{isBn ? row.titleBn : row.title}</td>
                  <td className="p-4 text-center bg-amber-400/10 font-bold text-amber-400">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs">✓</span>
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-slate-400 text-xs">✕</span>
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    {row.pos ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">~</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-slate-400 text-xs">✕</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 10. DYNAMIC INTERACTIVE PRICING PLANS (HUMAN LABELS + MODAL VIEWER) */}
      <section id="plans" className="py-24 bg-[#0a0a0c] text-white border-y border-white/10 relative overflow-hidden">
        {/* Ambient radial lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-indigo-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header & Title */}
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {isBn ? 'স্বচ্ছ ও সাশ্রয়ী সাবস্ক্রিপশন' : 'Authoritative & Transparent Pricing'}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              {isBn ? 'আপনার ব্যবসার আকার অনুযায়ী সঠিক প্যাকেজ।' : 'Scalable packages for every retail milestone.'}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 font-medium">
              {isBn
                ? 'ছোট দোকান দিয়ে সহজে শুরু করুন, শাখা ও পণ্যের পরিমাণ বৃদ্ধির সাথে সাথে আপগ্রেড করুন।'
                : 'Start free with zero commitment. Upgrade seamlessly as your stores, inventory, and staff expand.'}
            </p>

            {/* Monthly / Yearly Billing Period Selector */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="inline-flex items-center p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-300 cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isBn ? 'মাসিক পেমেন্ট' : 'Monthly Billing'}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-300 cursor-pointer ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{isBn ? 'বাৎসরিক বিলিং' : 'Yearly Billing'}</span>
                  {maxSavingsPct > 0 && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      billingCycle === 'yearly' ? 'bg-black text-amber-300' : 'bg-amber-400 text-black'
                    }`}>
                      {isBn ? `${maxSavingsPct}% পর্যন্ত ছাড়` : `Save up to ${maxSavingsPct}%`}
                    </span>
                  )}
                </button>
              </div>

              {/* Live sync badge */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isBn ? 'লাইভ সিনক্রোনাইজড' : 'SaaS Sync Active'}</span>
                <button
                  type="button"
                  onClick={() => fetchPublicPlans()}
                  title={isBn ? 'প্যাকেজ রিফ্রেশ করুন' : 'Refresh live plans'}
                  className="p-1 text-slate-400 hover:text-amber-400 transition-colors rounded cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isPlansLoading ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* SKELETON LOADING STATE */}
          {isPlansLoading && plans.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#141417] border border-white/10 rounded-3xl p-8 animate-pulse space-y-6">
                  <div className="h-6 bg-white/10 rounded-lg w-1/3" />
                  <div className="h-10 bg-white/10 rounded-lg w-1/2" />
                  <div className="h-4 bg-white/10 rounded-lg w-2/3" />
                  <div className="space-y-3 pt-4">
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                    <div className="h-4 bg-white/10 rounded w-4/6" />
                  </div>
                  <div className="h-12 bg-white/10 rounded-full w-full pt-4" />
                </div>
              ))}
            </div>
          ) : (
            /* CAROUSEL / GRID SLIDER CONTAINER */
            <div className="relative">
              {/* Carousel Navigation Arrows for >3 plans */}
              {plans.length > 3 && (
                <div className="hidden lg:flex items-center justify-between absolute -top-14 right-0 gap-2 z-20">
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    disabled={currentSlide === 0}
                    aria-label="Previous plan"
                    className="p-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    disabled={currentSlide >= plans.length - 1}
                    aria-label="Next plan"
                    className="p-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Cards Track */}
              <div
                ref={carouselRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`
                  flex overflow-x-auto pb-4 gap-6 scroll-smooth snap-x snap-mandatory no-scrollbar
                  ${plans.length <= 3 ? 'md:grid md:grid-cols-3 md:overflow-visible md:pb-0' : 'md:flex md:overflow-x-auto'}
                `}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {plans.map((plan) => {
                  const monthlyPrice = Number(plan.monthlyPrice ?? plan.price) || 0;
                  const yearlyPrice = Number(plan.yearlyPrice) || (monthlyPrice > 0 ? monthlyPrice * 10 : 0);
                  const isFree = monthlyPrice === 0 && yearlyPrice === 0;
                  const isPopular = Boolean(plan.isPopular);

                  const hasYearlyDiscount = monthlyPrice > 0 && yearlyPrice > 0 && yearlyPrice < monthlyPrice * 12;
                  const yearlySavings = hasYearlyDiscount ? (monthlyPrice * 12) - yearlyPrice : 0;
                  const savingsPct = hasYearlyDiscount ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) : 0;

                  const displayPrice = isFree
                    ? 0
                    : billingCycle === 'yearly' && yearlyPrice > 0
                    ? yearlyPrice
                    : monthlyPrice;

                  const displayPeriod = isFree
                    ? (plan.trialDays ? `${plan.trialDays} ${isBn ? 'দিনের ট্রায়াল' : 'Days Free'}` : (isBn ? 'আজীবন ফ্রি' : 'Forever'))
                    : billingCycle === 'yearly' && yearlyPrice > 0
                    ? (isBn ? '/ বছর' : '/ year')
                    : (isBn ? '/ মাস' : '/ month');

                  const effectiveMonthly = !isFree && billingCycle === 'yearly' && yearlyPrice > 0
                    ? Math.round(yearlyPrice / 12)
                    : null;

                  // Resolve raw feature keys into clean human labels and Lucide icons
                  const featureOverview = getPlanFeaturesOverview(plan.features);

                  return (
                    <div
                      key={plan.id || plan.name}
                      className={`
                        min-w-[290px] sm:min-w-[320px] md:min-w-[340px] flex-1 snap-center flex flex-col justify-between
                        rounded-3xl p-7 transition-all duration-300 relative text-left
                        ${
                          isPopular
                            ? 'bg-[#18181e] border-2 border-amber-400 shadow-2xl shadow-amber-400/20 scale-[1.02] z-10'
                            : 'bg-[#121215] border border-white/10 hover:border-white/25 hover:bg-[#15151a]'
                        }
                      `}
                    >
                      {/* Popular / Recommended Pill */}
                      {isPopular && (
                        <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-[11px] uppercase tracking-wider shadow-lg shadow-amber-400/30 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 fill-black" />
                          {plan.badge || (isBn ? 'সর্বাধিক জনপ্রিয়' : 'Most Popular')}
                        </div>
                      )}

                      {/* Top content */}
                      <div>
                        {/* Name & Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-2xl font-black text-white tracking-tight">
                            {plan.name}
                          </h3>
                          {!isPopular && plan.badge && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 min-h-[32px] line-clamp-2 mb-4">
                          {plan.description || (isBn ? 'ব্যবসায়িক কার্যক্রম পরিচালনার পরিপূর্ণ সমাধান' : 'Complete operational suite designed for retail growth')}
                        </p>

                        {/* Price Block */}
                        <div className="py-4 border-y border-white/10 mb-5">
                          <div className="flex items-baseline gap-2">
                            {isFree ? (
                              <div className="text-3xl sm:text-4xl font-black text-amber-400">
                                {isBn ? 'ফ্রি' : 'Free'}
                              </div>
                            ) : (
                              <>
                                <span className="text-base font-bold text-amber-400">৳</span>
                                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                  {displayPrice.toLocaleString()}
                                </span>
                              </>
                            )}
                            <span className="text-xs font-semibold text-slate-400">
                              {displayPeriod}
                            </span>
                          </div>

                          {/* Effective Monthly / Yearly Savings Badge */}
                          {effectiveMonthly && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-400">
                                ({isBn ? `মাসিক ৳ ${effectiveMonthly.toLocaleString()} সমতুল্য` : `equiv. ৳ ${effectiveMonthly.toLocaleString()}/mo`})
                              </span>
                              {hasYearlyDiscount && (
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  {isBn ? `৳ ${yearlySavings.toLocaleString()} সাশ্রয় (${savingsPct}%)` : `Save ৳ ${yearlySavings.toLocaleString()} (${savingsPct}%)`}
                                </span>
                              )}
                            </div>
                          )}

                          {billingCycle === 'monthly' && hasYearlyDiscount && (
                            <div className="mt-1.5 text-[11px] text-amber-400/90 font-medium">
                              {isBn ? `বাৎসরিক বিলিংয়ে ${savingsPct}% সাশ্রয় করুন` : `Switch to yearly to save ${savingsPct}%`}
                            </div>
                          )}
                        </div>

                        {/* Resource Limits Pill Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-white/[0.03] p-3 rounded-2xl border border-white/5 mb-5 font-medium text-slate-300">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {isBn ? 'ব্রাঞ্চ' : 'Stores'}
                            </span>
                            <span className="font-bold text-white">{plan.limitStores ?? 1}</span> {isBn ? 'টি ব্রাঞ্চ' : 'branch(es)'}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {isBn ? 'স্টাফ' : 'Staff'}
                            </span>
                            <span className="font-bold text-white">{plan.limitEmployees ?? 10}</span> {isBn ? 'জন' : 'members'}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {isBn ? 'ইউজার' : 'Users'}
                            </span>
                            <span className="font-bold text-white">{plan.limitUsers ?? 5}</span> {isBn ? 'জন' : 'seats'}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {isBn ? 'স্টোরেজ' : 'Storage'}
                            </span>
                            <span className="font-bold text-white">{plan.limitStorageMb ?? 1024}</span> MB
                          </div>
                        </div>

                        {/* Highlights (Formatted with Lucide icons and clean names) */}
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                            {isBn ? 'শীর্ষ সুবিধাসমূহ' : 'Key Highlights'}
                          </span>
                          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                            {featureOverview.highlights.map((feat) => {
                              const FeatIcon = feat.icon || Check;
                              return (
                                <li key={feat.id} className="flex items-start gap-2.5">
                                  <div className="p-1 rounded-md bg-white/5 text-amber-400 shrink-0 mt-0.5">
                                    <FeatIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-medium text-slate-200">{feat.name}</span>
                                </li>
                              );
                            })}
                          </ul>

                          {/* "View All Features" Trigger */}
                          {featureOverview.totalCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedPlanForDetails(plan)}
                              className="mt-4 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
                            >
                              <span>
                                {isBn
                                  ? `সকল ফিচার ও সীমা দেখুন (${featureOverview.totalCount}টি)`
                                  : `View all included features (${featureOverview.totalCount})`}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* CTA Action Button */}
                      <button
                        type="button"
                        onClick={(e) => handlePortalClick('shop', e, { plan: plan.id, billing: billingCycle })}
                        className={`
                          mt-8 w-full py-3.5 rounded-full font-extrabold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
                          ${
                            isPopular
                              ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-xl shadow-amber-400/25 hover:shadow-amber-400/40 hover:scale-[1.01]'
                              : isFree
                              ? 'border border-white/20 text-white hover:bg-white hover:text-black'
                              : 'bg-white/10 text-white hover:bg-white hover:text-black border border-white/10'
                          }
                        `}
                      >
                        <span>
                          {isFree
                            ? (isBn ? 'ফ্রি শুরু করুন' : 'Start Free')
                            : plan.trialDays > 0
                            ? (isBn ? `${plan.trialDays} দিনের ট্রায়াল নিন` : `Start ${plan.trialDays}-Day Free Trial`)
                            : (isBn ? 'প্যাকেজটি বেছে নিন' : 'Choose Plan')}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Dot Indicators for Mobile Carousel */}
              {plans.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 lg:hidden">
                  {plans.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => {
                        setCurrentSlide(dotIdx);
                        scrollToIndex(dotIdx);
                      }}
                      aria-label={`Go to slide ${dotIdx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        currentSlide === dotIdx ? 'w-6 bg-amber-400' : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Guarantee Footer */}
          <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? '১৪ দিনের নো-রিস্ক ট্রায়াল · কোনো ক্রেডিট কার্ড লাগবে না' : '14-Day Risk-Free Trial · No Credit Card Required'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{isBn ? 'যেকোনো সময় আপগ্রেড অথবা ক্যান্সেল করুন' : 'Upgrade, downgrade, or cancel anytime'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <span>{isBn ? 'অফলাইন ও অনলাইন সিঙ্ক ১০০% সুরক্ষিত' : '100% Offline-capable & Automated Cloud Sync'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* 11. ACCORDION FAQ SECTION */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn ? 'দোকান মালিকদের সাধারণ প্রশ্ন ও সমাধান।' : 'Answers to key operational questions from business owners.'}
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: 'Does Bizora work without internet?',
              qBn: 'ইন্টারনেট সংযোগ না থাকলে কি Bizora কাজ করবে?',
              a: 'Yes. All sales, barcode scanning, and receipts run seamlessly offline. Once connectivity is restored, all offline transactions automatically sync to the cloud database with conflict resolution.',
              aBn: 'হ্যাঁ। ইন্টারনেট বন্ধ থাকলেও বিক্রি ও বিলিং স্বাভাবিকভাবে চলবে। সংযোগ ফিরে আসার সাথে সাথে সমস্ত ডাটা ক্লাউডে নিরাপদভাবে সিঙ্ক হয়ে যাবে।'
            },
            {
              q: 'Can my staff use it without prior technical training?',
              qBn: 'স্টাফ কি কোনো প্রশিক্ষণ ছাড়াই চালাতে পারবে?',
              a: 'Yes. Bizora provides pre-configured role templates (Cashier, Stock Manager, Manager). Each person only sees what they are authorized to do, keeping screens intuitive and uncluttered.',
              aBn: 'হ্যাঁ। ক্যাশিয়ার, স্টক ম্যানেজার বা ম্যানেজারের মতো তৈরি রোল বেছে নিন। প্রত্যেকে শুধু তাদের কাজের অংশ দেখতে পাবে।'
            },
            {
              q: 'Can I manage multiple branch stores under one account?',
              qBn: 'আমি কি একাধিক শাখা বা দোকান পরিচালনা করতে পারব?',
              a: 'Yes. You can manage multiple branch stores under one central owner account, perform stock transfers between locations, and review unified financial reports.',
              aBn: 'হ্যাঁ। এক লগইনেই সব ব্রাঞ্চ পরিচালনা করা যায়, এক দোকান থেকে অন্য দোকানে স্টক ট্রান্সফার করা যায় এবং একত্রিত রিপোর্ট দেখা যায়।'
            },
            {
              q: 'How does VAT calculation handle customer returns?',
              qBn: 'কাস্টমার পণ্য রিটার্ন করলে ভ্যাট কীভাবে সমন্বয় হয়?',
              a: 'Bizora automatically nets output and input VAT against partial and full returns, ensuring you only report and pay legitimate tax obligations.',
              aBn: 'Bizora স্বয়ংক্রিয়ভাবে রিটার্ন করা পণ্যের ভ্যাট বাদ দিয়ে মোট প্রদেয় ট্যাক্স হিসাব করে।'
            },
            {
              q: 'How secure is my business data?',
              qBn: 'আমার ব্যবসার ডাটা কতটা নিরাপদ?',
              a: 'Your data is protected with 2FA, argon2id/bcrypt password hashing, automated cloud backups, audit logging, and strict multi-tenant isolation.',
              aBn: 'আপনার সমস্ত তথ্য টু-ফ্যাক্টর অথেন্টিকেশন, এনক্রিপ্টেড ব্যাকআপ এবং সম্পূর্ণ বিচ্ছিন্ন ডাটাবেস সিকিউরিটির মাধ্যমে সুরক্ষিত।'
            }
          ].map((item, idx) => (
            <div key={idx} className="border border-white/10 rounded-2xl bg-[#141418] overflow-hidden shadow-xs">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 sm:p-6 text-left font-bold text-base sm:text-lg text-white flex justify-between items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <span>{isBn ? item.qBn : item.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-6 sm:px-6 text-slate-300 text-sm sm:text-base leading-relaxed border-t border-white/5 pt-3">
                  {isBn ? item.aBn : item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 12. HIGH-CONVERSION FINAL CALL TO ACTION */}
      <section className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {isBn ? 'আজই আপনার ব্যবসা গুছিয়ে নিন।' : 'Put your commerce operations in order today.'}
          </h2>
          <p className="text-lg sm:text-xl font-medium text-slate-900 max-w-2xl mx-auto">
            {isBn
              ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন। আমাদের সাপোর্ট টিম আপনাকে সম্পূর্ণ প্রোডাক্ট ও অ্যাকাউন্ট সেটআপে সাহায্য করবে।'
              : 'Start your free trial now with zero credit card. Our technical team assists with product catalog import and receipt setup.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={(e) => handlePortalClick('shop', e)}
              className="px-8 py-4 rounded-full bg-black text-white font-black text-base shadow-xl hover:bg-slate-900 hover:scale-105 transition-all cursor-pointer"
            >
              {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start Free Trial'}
            </button>
            <a
              href="mailto:support@bizora.app"
              className="px-8 py-4 rounded-full border-2 border-black text-black font-extrabold text-base hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              {isBn ? 'টিমের সাথে কথা বলুন' : 'Talk to Onboarding Team'}
            </a>
          </div>
        </div>
      </section>

      {/* 13. COMPREHENSIVE FOOTER (ZERO ADMIN LINKS, FULL LEGAL TRIGGER INTEGRATION) */}
      <footer className="bg-black text-slate-400 py-16 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-left mb-12">
            
            {/* Brand column */}
            <div className="space-y-4">
              <a href="#top" className="flex items-center gap-3 font-extrabold text-xl text-white">
                <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-8 h-8 object-contain" />
                <div className="flex flex-col">
                  <span className="leading-none">Bizora</span>
                  <span className="text-[9px] text-cyan-400 font-normal tracking-wide mt-0.5">Smart Business. Better Tomorrow.</span>
                </div>
              </a>
              <p className="text-xs leading-relaxed text-slate-400">
                {isBn
                  ? 'বিক্রি, স্টক, হিসাব, ভ্যাট ও অনলাইন শপের জন্য আধুনিক অল-ইন-ওয়ান ক্লাউড বিজনেস ম্যানেজমেন্ট প্ল্যাটফর্ম।'
                  : 'The complete enterprise cloud operating system for retail point of sale, FEFO batch inventory, and double-entry books.'}
              </p>
              <div className="text-xs text-amber-400 font-mono">
                {typeof window !== 'undefined' ? `${window.location.hostname} · shop · employee · customer` : 'Bizora Multi-Portal ERP'}
              </div>
            </div>

            {/* Portals Column (Only customer/merchant portals, ZERO admin) */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">{isBn ? 'পোর্টালসমূহ' : 'Portals'}</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button onClick={(e) => handlePortalClick('shop', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? 'শপ ওনার পোর্টাল' : 'Shop Owner Portal'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => handlePortalClick('employee', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isBn ? 'এমপ্লয়ী পোর্টাল' : 'Employee Portal'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => handlePortalClick('customer', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isBn ? 'কাস্টমার পোর্টাল' : 'Customer Portal'}</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">{isBn ? 'প্ল্যাটফর্ম' : 'Platform'}</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">{isBn ? 'ফিচারসমূহ' : 'Features'}</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">{isBn ? 'Bizora সম্পর্কে' : 'About Bizora'}</a></li>
                <li><a href="#os" className="hover:text-white transition-colors">{isBn ? 'বিজনেস OS' : 'Business OS'}</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">{isBn ? 'ব্যবসার ধরন' : 'Industries'}</a></li>
                <li><a href="#compare" className="hover:text-white transition-colors">{isBn ? 'তুলনা' : 'Compare'}</a></li>
                <li><a href="#plans" className="hover:text-white transition-colors">{isBn ? 'সাবস্ক্রিপশন প্ল্যান' : 'Pricing Plans'}</a></li>
              </ul>
            </div>

            {/* Legal & Compliance Column */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">{isBn ? 'আইনি ও নীতিমালা' : 'Legal & Trust'}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={(e) => openLegalModal('privacy', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => openLegalModal('terms', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => openLegalModal('cookies', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'কুকি পলিসি' : 'Cookie Policy'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => openLegalModal('refunds', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'রিফান্ড ও বাতিল নীতি' : 'Refund & Cancellation'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => openLegalModal('security', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? 'ডাটা সিকিউরিটি' : 'Data Security & Processing'}</span>
                  </button>
                </li>
                <li>
                  <button onClick={(e) => openLegalModal('deletion', e)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isBn ? 'অ্যাকাউন্ট ডিলিশন' : 'Account & Data Deletion'}</span>
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>© {new Date().getFullYear()} Bizora ERP. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}</div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-400">
              <button onClick={(e) => openLegalModal('privacy', e)} className="hover:text-white cursor-pointer">Privacy</button>
              <button onClick={(e) => openLegalModal('terms', e)} className="hover:text-white cursor-pointer">Terms</button>
              <button onClick={(e) => openLegalModal('cookies', e)} className="hover:text-white cursor-pointer">Cookies</button>
              <button onClick={(e) => openLegalModal('refunds', e)} className="hover:text-white cursor-pointer">Refunds</button>
              <button onClick={(e) => openLegalModal('security', e)} className="hover:text-white cursor-pointer">Security</button>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL: Full Categorized Plan Details Drawer */}
      <PlanDetailsModal
        isOpen={Boolean(selectedPlanForDetails)}
        plan={selectedPlanForDetails}
        billingCycle={billingCycle}
        onClose={() => setSelectedPlanForDetails(null)}
        onSelectPlan={(p) => handlePortalClick('shop', {} as any, { plan: p.id, billing: billingCycle })}
        isBn={isBn}
      />

      {/* MODAL: Comprehensive Legal Document Viewer */}
      <LegalModal
        isOpen={legalModalOpen}
        initialDoc={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
        isBn={isBn}
      />

      {/* Cookie Consent Banner */}
      <CookieBanner />

    </div>
  );
};

export default LandingPage;
