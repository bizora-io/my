import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Shield, Zap, TrendingUp, Store, Users, DollarSign, Package, 
  Check, X as XIcon, Menu, ChevronDown, ChevronRight, ChevronLeft, Globe, Lock, ArrowRight,
  Sparkles, Layers, Activity, Smartphone, Truck, FileText, BarChart3, HelpCircle,
  ExternalLink, ArrowUpRight, Crown, RefreshCw, CheckCircle2, ShieldCheck, Database,
  Boxes, Clock, CalendarClock, BookOpen, Building, Award, ChefHat, HeartPulse, Shirt,
  Laptop, Factory as FactoryIcon, Receipt, SlidersHorizontal, Scale, Eye, WifiOff,
  AlertTriangle, ArrowRightLeft, FileCheck, Trash2, Sun, Moon, Mail, Phone,
  HeadphonesIcon, Bot, Warehouse, Coins, FileSpreadsheet, Percent, Printer, QrCode,
  RotateCcw, Wallet, CreditCard
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

/** Authoritative helper to check if a plan supports a specific feature key */
export const checkPlanFeature = (plan: any, featureKey: string, aliasKeywords: string[] = []): boolean => {
  if (!plan) return false;
  if (Array.isArray(plan.features)) {
    if (plan.features.includes(featureKey)) return true;
    for (const kw of aliasKeywords) {
      if (plan.features.some((f: any) => typeof f === 'string' && f.toLowerCase().includes(kw.toLowerCase()))) {
        return true;
      }
    }
  }
  // Check modules association
  if (Array.isArray(plan.modules)) {
    const mod = featureKey.split('.')[0];
    if (plan.modules.includes(mod)) {
      if (plan.id === 'pro' || plan.id === 'enterprise') return true;
    }
  }
  return false;
};

/** Authoritative helper to format numeric resource limits */
export const formatPlanLimit = (plan: any, prop: string, isBn: boolean, unit = ''): string => {
  const val = plan?.[prop];
  if (val === undefined || val === null || val === -1 || val >= 99999) {
    return isBn ? 'আনলিমিটেড' : 'Unlimited';
  }
  if (val === 0) return isBn ? 'নেই' : 'None';
  return isBn ? `${val.toLocaleString('bn-BD')} ${unit}`.trim() : `${val.toLocaleString()} ${unit}`.trim();
};

const INDUSTRIES = [
  {
    id: 'retail',
    trade: 'Retail & General Stores',
    tradeBn: 'সাধারণ রিটেল ও ডিপার্টমেন্টাল শপ',
    badge: 'High-Speed POS & Billing',
    badgeBn: 'হাই-স্পিড পিওএস ও বিলিং',
    icon: Store,
    accentColor: 'from-blue-600 to-indigo-600',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    description: 'Accelerate checkout lines with sub-second barcode scanning, cash drawer float balancing, split payments, and instant returns.',
    descriptionBn: 'দ্রুত বারকোড স্ক্যানিং, ক্যাশ ড্রয়ার ব্যালেন্সিং, স্প্লিট পেমেন্ট এবং ইনস্ট্যান্ট সেলস রিটার্নের মাধ্যমে কাউন্টার বিলিং করুন নিমেষেই।',
    features: [
      'Sub-Second Barcode Scanning Till',
      'Split Tender: Cash, Card & bKash/MFS',
      'Shift Cashbox Float Reconciliation',
      'Instant Sales Return & Store Credit'
    ],
    featuresBn: [
      'এক সেকেন্ডের কম সময়ে বারকোড বিলিং',
      'নগদ, কার্ড ও মোবাইল ব্যাংকিং স্প্লিট পেমেন্ট',
      'শিফটভিত্তিক ক্যাশবাক্স হিসাব মেলানো',
      'সহজ পণ্য রিটার্ন ও স্টোর ক্রেডিট'
    ],
    workflowTitle: 'High-Speed Retail Counter Workflow',
    workflowTitleBn: 'কাউন্টার ও পিওএস বিলিং ওয়ার্কফ্লো',
    statBadge: '< 0.3s Barcode Scan',
    statBadgeBn: '০.৩ সেকেন্ডে বারকোড স্ক্যান',
    steps: [
      {
        num: '01',
        title: 'Instant Barcode Scan',
        titleBn: 'ইনস্ট্যান্ট বারকোড রিডিং',
        desc: 'Scan products using any barcode reader; prices, VAT, and active promotions load automatically without delay.',
        descBn: 'যেকোনো বারকোড স্ক্যানার দিয়ে স্ক্যান করুন; মূল্য, ভ্যাট এবং ডিসকাউন্ট স্বয়ংক্রিয়ভাবে হিসাব হয়ে যাবে।'
      },
      {
        num: '02',
        title: 'Multi-Tender Split Settlement',
        titleBn: 'ফ্লেক্সিবল স্প্লিট পেমেন্ট',
        desc: 'Accept partial cash and partial mobile banking (bKash/Nagad) in a single bill with automatic change calculation.',
        descBn: 'একই বিলে নগদ ও মোবাইল ব্যাংকিং উভয় পেমেন্ট গ্রহণ করুন এবং কাস্টমারের ফেরত টাকা নির্ভুল হিসাব করুন।'
      },
      {
        num: '03',
        title: 'Thermal Receipt & Realtime Ledger',
        titleBn: 'থার্মাল রসিদ ও অটো জার্নাল',
        desc: 'Print 58mm/80mm receipt while stock levels deduct and double-entry sales journals record in real time.',
        descBn: 'রসিদ প্রিন্ট হওয়ার সাথে সাথেই স্টক কমে যায় এবং আর্থিক জার্নালে ডাবল-এন্ট্রি সেলস জমা হয়।'
      }
    ],
    previewCard: {
      title: 'Live Retail Counter Dashboard',
      titleBn: 'লাইভ রিটেল ক্যাশবাক্স স্ট্যাটাস',
      stats: [
        { label: "Today's Sales", labelBn: 'আজকের বিক্রি', val: '৳ 84,250' },
        { label: 'Transactions', labelBn: 'মোট বিল', val: '186 Bills' },
        { label: 'Offline Sync', labelBn: 'অফলাইন সিঙ্ক', val: '100% Up to Date' }
      ]
    }
  },
  {
    id: 'grocery',
    trade: 'Grocery & Super Shops',
    tradeBn: 'গ্রোসারি ও সুপারশপ',
    badge: 'FEFO Batch & Expiry Guard',
    badgeBn: 'এফইএফও ব্যাচ ও মেয়াদ সুরক্ষা',
    icon: Boxes,
    accentColor: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    description: 'Eliminate expired item losses with FEFO oldest-expiry selling algorithm, digital scale barcode decoding, and automated reorder alerts.',
    descriptionBn: 'আগে মেয়াদ শেষ হওয়া ব্যাচ আগে বিক্রি (FEFO) নিশ্চিত করুন, ডিজিটাল ওজন স্কেলের বারকোড রিড করুন এবং কম-স্টক অটো রি-অর্ডার ড্রাফট তৈরি করুন।',
    features: [
      'Automated FEFO Oldest-Expiry Allocation',
      'Weigh Scale Barcode Decoding (EAN-13)',
      '30/60/90 Day Near-Expiry Warning Radar',
      'Automated Low-Stock Reorder Triggers'
    ],
    featuresBn: [
      'স্বয়ংক্রিয় এফইএফও ব্যাচ এলোকেশন',
      'ওজন স্কেল ইএএন-১৩ বারকোড ডিকোডিং',
      '৩০/৬০/৯০ দিনের মেয়াদের আগাম রাডার',
      'কম-স্টক সতর্কতা ও অটো রি-অর্ডার ড্রাফট'
    ],
    workflowTitle: 'Zero-Waste Freshness & Expiry Pipeline',
    workflowTitleBn: 'মেয়াদোত্তীর্ণ অপচয়মুক্ত ইনভেন্টরি পাইপলাইন',
    statBadge: 'Zero Spoilage Waste',
    statBadgeBn: 'জিরো মেয়াদোত্তীর্ণ অপচয়',
    steps: [
      {
        num: '01',
        title: 'Batch & Expiry Inwarding',
        titleBn: 'ব্যাচ ও মেয়াদ এন্ট্রি',
        desc: 'Log supplier lot numbers with manufacturing and expiry dates during goods delivery inwarding.',
        descBn: 'পণ্য রিসিভ করার সময়েই লট নম্বর ও মেয়াদোত্তীর্ণ তারিখ সিস্টেমে নিরাপদভাবে এন্ট্রি দিন।'
      },
      {
        num: '02',
        title: 'Automated FEFO Selling',
        titleBn: 'এফইএফও অটো বিক্রি',
        desc: 'POS automatically suggests and deducts the batch expiring soonest to protect retail margins.',
        descBn: 'বিল করার সময় সিস্টেম নিজ থেকেই আগে মেয়াদ শেষ হওয়া লট থেকে স্টক মাইনাস করে।'
      },
      {
        num: '03',
        title: 'Expiry Early-Warning Radar',
        titleBn: 'আগাম মেয়াদোত্তীর্ণ সতর্কতা',
        desc: 'Identify aging stock 30 days ahead to discount, bundle, or return to vendor with full audit trails.',
        descBn: 'মেয়াদ শেষ হওয়ার আগেই বিশেষ অফার দিন অথবা সাপ্লায়ারকে ফেরত পাঠিয়ে নিশ্চিত ক্ষতি রোধ করুন।'
      }
    ],
    previewCard: {
      title: 'FEFO Expiry Protection Radar',
      titleBn: 'এফইএফও স্টক ট্র্যাকিং রাডার',
      stats: [
        { label: 'Monitored Lots', labelBn: 'অ্যাক্টিভ লট', val: '1,420 Lots' },
        { label: 'Expiring in 30d', labelBn: '৩০ দিনে মেয়াদ শেষ', val: '0 Critical' },
        { label: 'Spoilage Prevented', labelBn: 'অপচয় রোধ', val: '৳ 42,800' }
      ]
    }
  },
  {
    id: 'fashion',
    trade: 'Fashion & Clothing',
    tradeBn: 'ফ্যাশন, বুটিক ও পোশাক',
    badge: 'Matrix Variants & Storefront',
    badgeBn: 'ম্যাট্রিক্স ভ্যারিয়েন্ট ও অনলাইন শপ',
    icon: Shirt,
    accentColor: 'from-pink-600 to-rose-600',
    badgeBg: 'bg-pink-500/10',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
    description: 'Manage thousands of apparel styles, sizes, and colors with 2D matrix variants, custom price tag sticker printing, and live online boutique sync.',
    descriptionBn: 'রং, সাইজ ও ফেব্রিকের ম্যাট্রিক্স ভ্যারিয়েন্ট, নিজস্ব বারকোড প্রাইস ট্যাগ স্টিকার প্রিন্টিং এবং রিয়েলটাইম অনলাইন বুটিক শপ পরিচালনা করুন।',
    features: [
      'Multi-Attribute Matrix (Size, Color, Fit)',
      'Custom Garment Barcode & Price Tag Printing',
      'Integrated Boutique E-Commerce Storefront',
      'Omnichannel In-Store & Online Stock Reservation'
    ],
    featuresBn: [
      'সাইজ, কালার ও ফিট ম্যাট্রিক্স গ্রিড',
      'গার্মেন্টস বারকোড ও প্রাইস ট্যাগ স্টিকার প্রিন্ট',
      'ইন্টিগ্রেটেড অনলাইন বুটিক স্টোরফ্রন্ট',
      'দোকান ও অনলাইন স্টকের লাইভ সমন্বয়'
    ],
    workflowTitle: 'Apparel Omnichannel Merchandising',
    workflowTitleBn: 'ফ্যাশন ও অনলাইন মার্চেন্ডাইজিং ওয়ার্কফ্লো',
    statBadge: 'Realtime Omnichannel Sync',
    statBadgeBn: 'রিয়েলটাইম মাল্টি-চ্যানেল সিঙ্ক',
    steps: [
      {
        num: '01',
        title: 'Matrix Style Creation',
        titleBn: 'ম্যাট্রিক্স স্টাইল তৈরি',
        desc: 'Create one apparel item; generate S/M/L/XL sizes across all seasonal colors in a single click.',
        descBn: 'একটি পোশাক ডিজাইন করে এক ক্লিকেই সব সাইজ ও কালার ভ্যারিয়েন্ট তৈরি করে ক্যাটালগে যুক্ত করুন।'
      },
      {
        num: '02',
        title: 'Barcode Hangtag Printing',
        titleBn: 'বারকোড ট্যাগ প্রিন্ট',
        desc: 'Print branded price stickers and garment hangtags with custom SKU barcodes directly from Bizora.',
        descBn: 'পোশাকের জন্য নিজস্ব ব্র্যান্ডেড বারকোড প্রাইস স্টিকার ও হ্যাংট্যাগ সরাসরি প্রিন্ট করুন।'
      },
      {
        num: '03',
        title: 'Omnichannel Realtime Sync',
        titleBn: 'অনলাইন ও শো-রুম সিঙ্ক',
        desc: 'When an item sells in the showroom, your public digital storefront inventory updates instantly.',
        descBn: 'দোকানে বিক্রি হওয়ার সাথে সাথেই আপনার অনলাইন ক্যাটালগের স্টক তাৎক্ষণিক আপডেট হয়ে যায়।'
      }
    ],
    previewCard: {
      title: 'Apparel Matrix & Live Storefront',
      titleBn: 'পোশাক ভ্যারিয়েন্ট ও অনলাইন শপ',
      stats: [
        { label: 'Active Styles', labelBn: 'অ্যাক্টিভ ডিজাইন', val: '380 Designs' },
        { label: 'SKU Variations', labelBn: 'মোট ভ্যারিয়েন্ট', val: '2,280 SKUs' },
        { label: 'Online Sync', labelBn: 'অনলাইন সিঙ্ক', val: 'Live & Locked' }
      ]
    }
  },
  {
    id: 'electronics',
    trade: 'Electronics & Mobile Devices',
    tradeBn: 'মোবাইল ও ইলেকট্রনিক্স',
    badge: 'IMEI & Warranty Lifecycle',
    badgeBn: 'আইএমইআই ও ওয়ারেন্টি ট্র্যাকিং',
    icon: Smartphone,
    accentColor: 'from-cyan-600 to-blue-600',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    description: 'Track individual IMEI and serial numbers from vendor invoice to customer sale, with digital warranty lookup, customer credit ledgers, and installment EMI schedules.',
    descriptionBn: 'প্রতিটি ডিভাইসের ইউনিক আইএমইআই/সিরিয়াল নম্বর ট্র্যাক করুন, ডিজিটাল ওয়ারেন্টি চেক করুন এবং বাকিতে বিক্রিতে কিস্তির শিডিউল বজায় রাখুন।',
    features: [
      'Per-Unit IMEI & Serial Lifecycle Tracking',
      'Digital Warranty Card & Service History',
      'Customer Credit Due Ledger with Reminders',
      'Flexible Installment (EMI) Billing Plans'
    ],
    featuresBn: [
      'প্রতিটি সেটের ইউনিক আইএমইআই ট্র্যাকিং',
      'ডিজিটাল ওয়ারেন্টি কার্ড ও সার্ভিস হিস্টোরি',
      'কাস্টমার বাকির খাতা ও অটো এসএমএস',
      'মাসিক কিস্তি (ইএমআই) শিডিউল ও ট্র্যাকিং'
    ],
    workflowTitle: 'Serialized Device Traceability Pipeline',
    workflowTitleBn: 'সিরিয়ালাইজড ডিভাইস ট্রেসেবিলিটি পাইপলাইন',
    statBadge: '100% Serialized Accountability',
    statBadgeBn: '১০০% সিরিয়াল অ্যাকাউন্টেবিলিটি',
    steps: [
      {
        num: '01',
        title: 'Scan Serial on Inwarding',
        titleBn: 'ক্রয়ে সিরিয়াল স্ক্যান',
        desc: 'Scan smartphone IMEI or appliance serial number directly from the supplier box upon receiving.',
        descBn: 'সাপ্লায়ারের কাছ থেকে মাল নেওয়ার সময় বক্সের আইএমইআই বা সিরিয়াল স্ক্যান করে ইনওয়ার্ড করুন।'
      },
      {
        num: '02',
        title: 'Warranty Card Binding',
        titleBn: 'ওয়ারেন্টি কার্ড বাইন্ডিং',
        desc: 'Invoice ties the exact serial to customer contact details, activating the warranty duration clock.',
        descBn: 'কাস্টমারের মেমোতে নির্দিষ্ট সিরিয়াল যুক্ত হয়ে ওয়ারেন্টির সময় গণনা নিরাপদভাবে শুরু হয়।'
      },
      {
        num: '03',
        title: 'Installment & Due Follow-Up',
        titleBn: 'কিস্তি ও বকেয়া ফলো-আপ',
        desc: 'Monitor unpaid installment balances and send automated SMS reminders before payment due dates.',
        descBn: 'বকেয়া কিস্তির তারিখ ট্র্যাক করুন এবং সময়মতো কাস্টমারকে স্বয়ংক্রিয় রিমাইন্ডার পাঠান।'
      }
    ],
    previewCard: {
      title: 'Serialized Inventory Register',
      titleBn: 'সিরিয়ালাইজড ডিভাইস রেজিস্টার',
      stats: [
        { label: 'Serialized Units', labelBn: 'সিরিয়াল ডিভাইস', val: '840 Units' },
        { label: 'Active Warranties', labelBn: 'চলতি ওয়ারেন্টি', val: '512 Devices' },
        { label: 'EMI Recovery', labelBn: 'কিস্তি কালেকশন', val: '98.4% On-Time' }
      ]
    }
  },
  {
    id: 'pharmacy',
    trade: 'Pharmacy & Healthcare',
    tradeBn: 'ফার্মেসি ও ড্রাগ স্টোর',
    badge: 'Drug Batch Safety Lock',
    badgeBn: 'ওষুধ ব্যাচ ও সুরক্ষা লক',
    icon: HeartPulse,
    accentColor: 'from-violet-600 to-purple-600',
    badgeBg: 'bg-violet-500/10',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-400',
    description: 'Enforce strict patient safety with automated medicine batch tracking, hard lockouts on expired drugs, supplier return logging, and instant generic brand lookups.',
    descriptionBn: 'ওষুধের ব্যাচ নম্বর ট্র্যাকিং, মেয়াদোত্তীর্ণ ওষুধ বিক্রিতে স্বয়ংক্রিয় লক, সাপ্লায়ার রিটার্ন এবং দ্রুত জেনেরিক বিকল্প খোঁজার নির্ভরযোগ্য ব্যবস্থা।',
    features: [
      'Strict Medicine Lot & Expiry Enforcement',
      'Hard Sale Lockout on Expired Pharmaceuticals',
      'Generic Molecule Alternative Search',
      'Supplier Expiry Return Claims & Credit Slips'
    ],
    featuresBn: [
      'ওষুধের ব্যাচ ও মেয়াদ বাধ্যতামূলক ট্র্যাকিং',
      'মেয়াদোত্তীর্ণ ওষুধে স্বয়ংক্রিয় সেলস লক',
      'জেনেরিক গ্রুপের বিকল্প ওষুধ খোঁজার সুবিধা',
      'সাপ্লায়ার মেয়াদোত্তীর্ণ রিটার্ন ও ক্রেডিট স্লিপ'
    ],
    workflowTitle: 'Patient Safety & Drug Regulation Pipeline',
    workflowTitleBn: 'রোগীর সুরক্ষা ও ফার্মাসিউটিক্যাল রেগুলেশন',
    statBadge: 'Guaranteed Expiry Lockout',
    statBadgeBn: 'মেয়াদোত্তীর্ণ বিক্রি শতভাগ রোধ',
    steps: [
      {
        num: '01',
        title: 'Receive Medicine Lots',
        titleBn: 'লট ও মেয়াদ এন্ট্রি',
        desc: 'Record manufacturer batch numbers, expiry dates, and supplier purchase trade rates.',
        descBn: 'ওষুধ রিসিভ করার সময় ব্যাচ নম্বর, মেয়াদ এবং সাপ্লায়ার মূল্য তালিকা সিস্টেমে এন্ট্রি দিন।'
      },
      {
        num: '02',
        title: 'Generic Alternative Search',
        titleBn: 'জেনেরিক বিকল্প সন্ধান',
        desc: 'Find prescribed medicines or quickly identify equivalent generics during stock shortages.',
        descBn: 'প্রেসক্রিপশনের নির্দিষ্ট ব্র্যান্ড না থাকলে দ্রুত একই জেনেরিকের বিকল্প ওষুধ খুঁজে বিল করুন।'
      },
      {
        num: '03',
        title: 'Safety Lockout & Vendor Claim',
        titleBn: 'সুরক্ষা লক ও রিটার্ন দাবি',
        desc: 'If a medicine batch expires, the POS blocks checkout and issues a supplier credit return memo.',
        descBn: 'মেয়াদ শেষ হওয়া মাত্রই পিওএস বিক্রি বন্ধ করে দেয় এবং সাপ্লায়ার রিটার্ন ভাউচার প্রস্তুত করে।'
      }
    ],
    previewCard: {
      title: 'Drug Safety & Audit Sentinel',
      titleBn: 'ওষুধ সুরক্ষা ও অডিট সেনটিনেল',
      stats: [
        { label: 'Active Medicines', labelBn: 'মোট ওষুধ আইটেম', val: '3,850 Items' },
        { label: 'Safety Lockouts', labelBn: 'সেফটি লকআউট', val: '100% Enforced' },
        { label: 'Vendor Returns', labelBn: 'সাপ্লায়ার রিটার্ন', val: 'Processed' }
      ]
    }
  },
  {
    id: 'restaurant',
    trade: 'Restaurants & Cafes',
    tradeBn: 'রেস্টুরেন্ট, ক্যাফে ও ফুড',
    badge: 'Live KDS & Thermal Tickets',
    badgeBn: 'লাইভ কিচেন ও থার্মাল টিকিট',
    icon: ChefHat,
    accentColor: 'from-amber-600 to-orange-600',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    description: 'Eliminate counter-to-kitchen miscommunication with live Kitchen Display System (KDS), automated 80mm order tickets (KOT), table token billing, and split payments.',
    descriptionBn: 'কাউন্টার ও রান্নাঘরের ভুল বোঝাবুঝি দূর করুন লাইভ কিচেন ডিসপ্লে (KDS), থার্মাল ফুড টিকিট (KOT), টেবিল টোকেন ও স্প্লিট বিলিংয়ের মাধ্যমে।',
    features: [
      'Real-Time Kitchen Display System (KDS) Routing',
      '80mm Kitchen Order Ticket (KOT) Auto-Printing',
      'Table Number, Dine-In Token & Takeaway Tracking',
      'Split Tender Bills for Group Dining Customers'
    ],
    featuresBn: [
      'লাইভ কিচেন ডিসপ্লে সিস্টেমে ইনস্ট্যান্ট অর্ডার',
      '৮০ মিমি কিচেন অর্ডার টিকিট (KOT) অটো প্রিন্ট',
      'টেবিল নম্বর, ডাইন-ইন টোকেন ও পার্সেল ট্র্যাকিং',
      'গ্রুপ আড্ডায় আলাদা আলাদা স্প্লিট বিলিং'
    ],
    workflowTitle: 'Counter-to-Kitchen Rapid Service Flow',
    workflowTitleBn: 'কাউন্টার থেকে কিচেন র্যাপিড সার্ভিস ফ্লো',
    statBadge: 'Zero Kitchen Ticket Mix-Ups',
    statBadgeBn: 'অর্ডার টিকিট বিভ্রান্তিমুক্ত',
    steps: [
      {
        num: '01',
        title: 'Punch Table or Takeaway Order',
        titleBn: 'টেবিল বা পার্সেল অর্ডার',
        desc: 'Cashier inputs food items, special cooking notes, and assigned table/token number on touch POS.',
        descBn: 'ক্যাশিয়ার খাবার আইটেম, রান্নার বিশেষ নির্দেশ ও টেবিল বা টোকেন নম্বর ইনপুট দেন।'
      },
      {
        num: '02',
        title: 'Instant KDS & Ticket Routing',
        titleBn: 'কিচেন স্ক্রিনে ইনস্ট্যান্ট টিকিট',
        desc: 'Kitchen screen dings with live cooking timer; chef marks preparation complete when ready to serve.',
        descBn: 'রান্নাঘরের স্ক্রিনে টাইমারসহ টিকিট ভেসে ওঠে; রান্না শেষে শেফ কমপ্লিট চাপেন।'
      },
      {
        num: '03',
        title: 'Split Bill & Fast Payment',
        titleBn: 'স্প্লিট বিল ও দ্রুত পেমেন্ট',
        desc: 'Cashier prints final guest receipt and splits cost between cash, card, or bKash in one tap.',
        descBn: 'অতিথি রসিদ প্রিন্ট করুন এবং একাধিক বন্ধুদের মাঝে বিল ভাগ করে দ্রুত পেমেন্ট নিন।'
      }
    ],
    previewCard: {
      title: 'Live Kitchen Order Terminal',
      titleBn: 'লাইভ কিচেন ডিসপ্লে স্ট্যাটাস',
      stats: [
        { label: 'Active Orders', labelBn: 'চলতি অর্ডার', val: '14 Orders' },
        { label: 'Avg Prep Time', labelBn: 'গড় রান্নার সময়', val: '8.5 Mins' },
        { label: 'Order Accuracy', labelBn: 'অর্ডার অ্যাকুরেসি', val: '99.8%' }
      ]
    }
  },
  {
    id: 'wholesale',
    trade: 'Wholesale & Distribution',
    tradeBn: 'পাইকারি ও ডিস্ট্রিবিউশন',
    badge: 'Tiered Pricing & Multi-Branch',
    badgeBn: 'পাইকারি রেট ও ব্রাঞ্চ ট্রান্সফার',
    icon: Truck,
    accentColor: 'from-sky-600 to-indigo-700',
    badgeBg: 'bg-sky-500/10',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    description: 'Manage high-volume B2B commerce with tiered wholesale price lists, master carton packaging conversions, inter-branch store stock transfers, and customer credit aging.',
    descriptionBn: 'বাল্ক ভলিউম পাইকারি রেট, মাস্টার কার্টন থেকে পিস রূপান্তর, একাধিক ব্রাঞ্চে স্টক ট্রান্সফার এবং কাস্টমার ক্রেডিট এজিং খাতা পরিচালনা করুন।',
    features: [
      'Tiered Volume & Wholesale Customer Price Lists',
      'Master Carton to Inner Box & Unit Conversions',
      'Inter-Branch Stock Transfers with Gate Passes',
      'Unified Multi-Store Financial Consolidation'
    ],
    featuresBn: [
      'ভলিউমভিত্তিক কাস্টমার পাইকারি মূল্য তালিকা',
      'মাস্টার কার্টন থেকে ডজন ও পিস রূপান্তর',
      'গেটপাসসহ শাখাগুলোর মাঝে স্টক ট্রান্সফার',
      'সব ব্রাঞ্চের সমন্বিত ব্যালেন্স শিট ও রিপোর্ট'
    ],
    workflowTitle: 'High-Volume B2B Distribution Pipeline',
    workflowTitleBn: 'উচ্চ ভলিউম বি২বি ডিস্ট্রিবিউশন পাইপলাইন',
    statBadge: 'Centralized Multi-Store Control',
    statBadgeBn: 'এক লগইনে সব ব্রাঞ্চ নিয়ন্ত্রণ',
    steps: [
      {
        num: '01',
        title: 'Inward Master Cartons',
        titleBn: 'মাস্টার কার্টন রিসিভ',
        desc: 'Receive bulk cargo; system automatically calculates piece unit cost from carton trade price.',
        descBn: 'কন্টেইনার বা বড় কার্টন রিসিভ করুন; কার্টন থেকে প্রতি পিসের মূল্য অটো হিসাব হবে।'
      },
      {
        num: '02',
        title: 'Inter-Branch Stock Dispatch',
        titleBn: 'ব্রাঞ্চে স্টক ডিসপ্যাচ',
        desc: 'Dispatch goods from central warehouse to retail outlets with in-transit gate pass tracking.',
        descBn: 'সেন্ট্রাল ওয়্যারহাউস থেকে বিভিন্ন শাখায় স্টক পাঠান ও ইন-ট্রানজিট ট্র্যাক করুন।'
      },
      {
        num: '03',
        title: 'Consolidated B2B Ledger',
        titleBn: 'একত্রিত বি২বি লেজার',
        desc: 'Review customer receivable aging and unified profit & loss across all branch locations.',
        descBn: 'সব কাস্টমারের বকেয়ার বয়স বিশ্লেষণ এবং সব শাখার সমন্বিত লাভ-ক্ষতি রিপোর্ট দেখুন।'
      }
    ],
    previewCard: {
      title: 'Multi-Branch Distribution Hub',
      titleBn: 'মাল্টি-ব্রাঞ্চ ডিস্ট্রিবিউশন হাব',
      stats: [
        { label: 'Branch Stores', labelBn: 'শাখা দোকান', val: '6 Branches' },
        { label: 'In-Transit Goods', labelBn: 'ট্রান্সফার স্টক', val: '৳ 1,84,000' },
        { label: 'Consolidated Sales', labelBn: 'মোট বিক্রি', val: '৳ 14.8L / Mo' }
      ]
    }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigatePortal }) => {
  const [isBn, setIsBn] = useState(false);
  const [activeTab, setActiveTab] = useState<'pos' | 'stock' | 'accounts' | 'vat' | 'branches' | 'roles' | 'store' | 'assistant'>('pos');
  const [aboutTab, setAboutTab] = useState<'mission' | 'problems' | 'profiles' | 'roles' | 'security'>('mission');
  const [feedIndex, setFeedIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [themeDark, setThemeDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedIndustryIndex, setSelectedIndustryIndex] = useState<number>(0);
  const [compareMode, setCompareMode] = useState<'plans' | 'traditional'>('plans');

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

  const handlePortalClick = (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => {
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
        name: 'What is Bizora ERP?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora is an all-in-one cloud business management ERP engineered for modern retail, supermarkets, pharmacies, wholesale, and light manufacturing enterprises. It combines sub-second POS barcode billing, FEFO batch and expiry tracking, double-entry accounting journals, Net VAT compliance, and multi-channel e-commerce synchronization.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which modules are available in the platform?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora includes 8 core modules: High-Speed POS & Billing, Batch Inventory with FEFO Expiry & IMEI Tracking, Cashbox & Double-Entry Accounting, Tax & Net VAT 9.1 Returns, Multi-Branch & Warehouse Transfers, Staff Shifts & Role-Based Permissions, Online E-Commerce Storefront with Courier Integrations, and Bizora AI Business Assistant with Tamper-Evident Audit Logs.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I create an account and get started?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can start a 14-day free trial in under 2 minutes with zero credit card required. Register with your email or phone number, enter your business name and tax configuration, import products via CSV or add them manually, and start processing sales immediately.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are packages and subscription pricing determined?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora offers transparent monthly and discounted yearly subscriptions: Trial (Free for 14 days), Basic (৳999/mo for single retail stores), Pro (৳2,499/mo with batch FEFO, online store, and couriers), and Enterprise (৳4,999/mo for multi-branch chains, manufacturing BOM, and API access).',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I manage multiple branch stores under one account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. On Pro and Enterprise plans, you can manage multiple branches and central warehouses under a single owner login, execute inter-branch stock transfers with in-transit gate passes, and generate consolidated financial balance sheets.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do customer dues, credit sales, and payment receipts work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora tracks customer receivable ledgers (baki khata) in real time. You can split bills between cash, cards, and mobile banking, schedule credit instalment payments, issue store credit vouchers on sales returns, and print 58mm/80mm thermal receipts.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are employees and role-based permissions managed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora provides pre-built role templates: Shop Owner, Manager, Cashier, Stock Manager, and Accountant. Granular access control restricts staff strictly to authorized screens, protects sensitive margin and profit figures, and enforces daily cash drawer float reconciliation.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do data backup and offline point of sale work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bizora is 100% offline-resilient. When internet or WiFi drops, cashiers continue scanning barcodes and printing receipts via IndexedDB local storage. Once connected, all transactions auto-reconcile to the cloud database with cryptographic tamper protection and automatic daily backups.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I contact customer support and onboarding assistance?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our technical team assists with Excel/CSV product catalog migration, thermal printer configuration, and staff onboarding. You can contact support directly at support@bizora.app or submit support tickets directly from the merchant dashboard.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I upgrade or manage my subscription plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can upgrade, downgrade, or switch between monthly and yearly billing anytime from the Subscriptions screen in your Shop Owner portal. Feature limits and additional branches unlock immediately upon plan activation.',
        },
      },
    ],
  }), []);

  return (
    <div className={`min-h-screen ${themeDark ? 'bg-[#09090b] text-slate-100' : 'bg-slate-950 text-slate-100'} font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden ${themeDark ? 'dark' : ''}`}>
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
          <nav className="hidden xl:flex items-center gap-0.5">
            <a href="#features" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'ফিচারসমূহ' : 'Features'}
            </a>
            <a href="#how" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'কীভাবে চলে' : 'How It Works'}
            </a>
            <a href="#benefits" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'সুবিধাসমূহ' : 'Benefits'}
            </a>
            <a href="#os" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'বিজনেস OS' : 'Business OS'}
            </a>
            <a href="#industries" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'ব্যবসার ধরন' : 'Industries'}
            </a>
            <a href="#compare" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'তুলনা' : 'Compare'}
            </a>
            <a href="#plans" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'সাবস্ক্রিপশন' : 'Pricing'}
            </a>
            <a href="#about" className="px-3 py-1.5 rounded-full text-xs font-medium text-amber-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'পরিচিতি' : 'About'}
            </a>
            <a href="#faq" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'জিজ্ঞাসা' : 'FAQ'}
            </a>
            <a href="#contact" className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
              {isBn ? 'যোগাযোগ' : 'Contact'}
            </a>
          </nav>

          {/* Actions, Sign In, & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemeDark(!themeDark)}
              aria-label={themeDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-full border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={themeDark ? (isBn ? 'লাইট মোড' : 'Light Mode') : (isBn ? 'ডার্ক মোড' : 'Dark Mode')}
            >
              {themeDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setIsBn(!isBn)}
              aria-label="Toggle language"
              className="px-2.5 sm:px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? 'EN' : 'বাং'}</span>
            </button>

            {/* Sign In CTA */}
            <button
              type="button"
              onClick={(e) => handlePortalClick('shop', e, { mode: 'login' })}
              className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-400/50 text-amber-400 text-xs sm:text-sm font-bold hover:bg-amber-400 hover:text-black transition-all cursor-pointer"
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>

            {/* Free Trial CTA */}
            <button
              type="button"
              onClick={(e) => handlePortalClick('shop', e, { mode: 'register' })}
              className="hidden sm:inline-flex px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-amber-400 text-black text-xs sm:text-sm font-extrabold hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/25 transition-all active:scale-95 cursor-pointer"
            >
              {isBn ? 'ফ্রি ট্রায়াল' : 'Get Started'}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="xl:hidden p-2 rounded-full border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <XIcon className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-slate-200" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#0c0c0e] border-b border-white/15 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Quick Portal Switcher for Mobile */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {isBn ? 'সরাসরি পোর্টাল অ্যাক্সেস' : 'Direct Portal Access'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('shop', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-amber-400/10 hover:border-amber-400/40 transition-colors cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'শপ ওনার' : 'Shop Owner'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('employee', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-blue-400/10 hover:border-blue-400/40 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'এমপ্লয়ী' : 'Employee'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('customer', e); }}
                  className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-purple-400/10 hover:border-purple-400/40 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-white">{isBn ? 'কাস্টমার' : 'Customer'}</span>
                </button>
              </div>
            </div>

            {/* Navigation Section Links */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <a onClick={() => setMobileMenuOpen(false)} href="#features" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'ফিচারসমূহ' : 'Features'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#how" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'কীভাবে চলে' : 'How It Works'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#benefits" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'সুবিধাসমূহ' : 'Benefits'}
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
              <a onClick={() => setMobileMenuOpen(false)} href="#about" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'পরিচিতি' : 'About'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#faq" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'জিজ্ঞাসা' : 'FAQ'}
              </a>
              <a onClick={() => setMobileMenuOpen(false)} href="#contact" className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200">
                {isBn ? 'যোগাযোগ' : 'Contact'}
              </a>
            </div>

            <button
              type="button"
              onClick={(e) => { setMobileMenuOpen(false); handlePortalClick('shop', e, { mode: 'register' }); }}
              className="block w-full text-center py-3 rounded-xl bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-400/20 cursor-pointer"
            >
              {isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
            </button>
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

        {/* Feature Tab Navigation (8 Canonical Modules) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 max-w-6xl mx-auto mb-10">
          {[
            { id: 'pos', label: 'POS & Till', labelBn: 'পিওএস ও বিলিং', icon: ShoppingBag },
            { id: 'stock', label: 'FEFO Stock', labelBn: 'স্টক ও মেয়াদ', icon: Boxes },
            { id: 'accounts', label: 'Accounts', labelBn: 'হিসাব ও ক্যাশবক্স', icon: DollarSign },
            { id: 'vat', label: 'Net VAT', labelBn: 'ভ্যাট ও কর', icon: Receipt },
            { id: 'branches', label: 'Branches', labelBn: 'শাখা ও ওয়্যারহাউস', icon: Warehouse },
            { id: 'roles', label: 'Staff Roles', labelBn: 'স্টাফ ও পারমিশন', icon: Users },
            { id: 'store', label: 'Online Store', labelBn: 'অনলাইন শপ', icon: Globe },
            { id: 'assistant', label: 'AI & Audit', labelBn: 'সহকারী ও অডিট', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-black scale-[1.02]'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{isBn ? tab.labelBn : tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Panel Content */}
        <div className="bg-[#121216] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-5xl mx-auto">
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase">
                  <span>Module 01</span> · <span>High-Speed Checkout</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'সেকেন্ডে দ্রুত বিক্রি ও থার্মাল প্রিন্ট' : 'Sell in seconds with smart barcode scanning'}
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold uppercase">
                  <span>Module 02</span> · <span>FEFO Batch Protection</span>
                </div>
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
                    isBn ? 'ওজন স্কেলের EAN-13 বারকোড অটোমেটিক ডিকোডিং' : 'Weigh scale barcode decoding for fresh produce and meat',
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-300 text-xs font-bold uppercase">
                  <span>Module 03</span> · <span>Double-Entry General Ledger</span>
                </div>
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
                    isBn ? 'দৈনিক খরচের ভাউচার এবং ক্যাশ ড্রয়ার ফ্লোট ব্যালেন্স' : 'Daily expense vouchers with shift open/close cash float auditing',
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-300 text-xs font-bold uppercase">
                  <span>Module 04</span> · <span>NBR Net VAT 9.1 Compliance</span>
                </div>
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
                    isBn ? 'অডিট ট্রায়াল ও চালান রেজিস্টার বুক' : 'Tamper-evident invoice tax register with full audit trails',
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

          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold uppercase">
                  <span>Module 05</span> · <span>Multi-Store & Warehouses</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'এক লগইনে সব শাখা ও ওয়্যারহাউস নিয়ন্ত্রণ' : 'Multi-branch operations in unified sync'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'সেন্ট্রাল ওয়্যারহাউস থেকে বিভিন্ন শাখায় স্টক পাঠান। গেটপাসসহ ইন-ট্রানজিট পণ্য ট্র্যাক করুন এবং সব ব্রাঞ্চের সমন্বিত ব্যালেন্স শিট দেখুন।'
                    : 'Dispatch inventory between central depots and retail branch outlets with gate-pass transit control and consolidated P&L statements.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'শাখায় শাখায় স্টক ট্রান্সফার ও গেটপাস ট্র্যাকিং' : 'Inter-branch stock requisition & dispatch with gate passes',
                    isBn ? 'সমন্বিত মাল্টি-স্টোর ফিনান্সিয়াল ব্যালেন্স শিট' : 'Consolidated P&L, balance sheets and inventory valuations',
                    isBn ? 'শাখাভিত্তিক আলাদা সেলস কাউন্টার ও ক্যাশবাক্স' : 'Independent store tills, cashbox floats, and branch reporting',
                    isBn ? 'এক ক্লিকে স্টোর সুইচিং ও সেন্ট্রাল প্রডাক্ট ক্যাটালগ' : 'Instant store switching with central catalog distribution',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">INTER-STORE DISPATCH #TR-402</div>
                <div className="flex justify-between py-1">
                  <span>Origin Warehouse</span>
                  <span className="text-white font-bold">Central Depot</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Destination Store</span>
                  <span className="text-cyan-400 font-bold">Dhanmondi Branch</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-emerald-400">
                  <span>GATE PASS STATUS</span>
                  <span>Dispatched (In Transit)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase">
                  <span>Module 06</span> · <span>Staff Hierarchy & RBAC</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'কর্মচারী রোল ও নির্ভুল অনুমতি নিয়ন্ত্রণ' : 'Role-based access & shift security'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'ক্যাশিয়ার, ম্যানেজার এবং স্টক কিপারের জন্য আলাদা অনুমতি। মালিকের ব্যক্তিগত মার্জিন ও ক্রয়মূল্য কর্মচারীদের কাছ থেকে লুকায়িত থাকে।'
                    : 'Keep sensitive wholesale costs, purchase margins, and financial ledgers strictly hidden from counter cashiers while empowering high-speed checkout.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'ক্যাশিয়ার, ম্যানেজার, স্টক ও হিসাবের তৈরি রোল' : 'Preconfigured roles: Cashier, Stock Manager, Accountant, Manager',
                    isBn ? 'ক্রয়মূল্য ও লাভের মার্জিন গোপন রাখার নিশ্চয়তা' : 'Hide purchase prices, wholesale costs, and net profits from staff',
                    isBn ? 'শিফটভিত্তিক ক্যাশবাক্স খোলা ও বন্ধের হিসাব' : 'Shift opening/closing cash float audit logs per employee',
                    isBn ? 'স্টাফ উপস্থিতি ও মাসিক বেতন খাতা' : 'Employee attendance logs, shift records, and payroll disbursements',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">STAFF PERMISSION MATRIX</div>
                <div className="flex justify-between py-1">
                  <span>Cashier Till Sales</span>
                  <span className="text-emerald-400 font-bold">ALLOWED</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>View Product Profit Margins</span>
                  <span className="text-rose-400 font-bold">BLOCKED (Owner Only)</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-sky-400">
                  <span>SHIFT FLOAT CHECK</span>
                  <span>Balanced (৳0 Discrepancy)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-300 text-xs font-bold uppercase">
                  <span>Module 07</span> · <span>Omnichannel Storefront</span>
                </div>
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
                    isBn ? 'কাস্টমার সেলফ-সার্ভিস অর্ডার ও ট্র্যাকিং পোর্টাল' : 'Customer portal with order status, tracking, and invoice downloads',
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

          {activeTab === 'assistant' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-rose-300 text-xs font-bold uppercase">
                  <span>Module 08</span> · <span>AI Intelligence & Security</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {isBn ? 'বিজনেস সহকারী ও নিরাপত্তা অডিট লগ' : 'Bizora Assistant & security radar'}
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {isBn
                    ? 'বাংলা বা ইংরেজিতে সহজ ভাষায় আপনার ব্যবসার সেলস ও স্টক নিয়ে প্রশ্ন করুন। বিস্তারিত অডিট লগে প্রতিটি পরিবর্তন ট্র্যাক থাকে।'
                    : 'Query your business metrics in conversational English or Bengali. Every user login, invoice creation, discount modification, and price override is preserved in tamper-evident audit logs.'}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    isBn ? 'বাংলা ও ইংরেজিতে ন্যাচারাল ল্যাঙ্গুয়েজ সহকারী' : 'Ask questions in English or Bengali without complex SQL or dashboards',
                    isBn ? 'ক্রিপ্টোগ্রাফিক ট্যাম্পার-রেজিস্ট্যান্ট অডিট লগ' : 'Tamper-evident audit logs of discounts, price edits, and voids',
                    isBn ? 'পুরোনো তারিখের ভাউচার এডিটিং রোধে পিরিয়ড লক' : 'Accounting period locks preventing unauthorized back-dated entries',
                    isBn ? 'টু-ফ্যাক্টর অথেন্টিকেশন ও অটোমেটিক এনক্রিপ্টেড ব্যাকআপ' : 'Two-factor auth (2FA) and isolated multi-tenant database protection',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0">✓</div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 bg-black text-white p-6 rounded-2xl space-y-3 font-mono text-xs border border-white/15 shadow-xl">
                <div className="text-amber-400 font-bold border-b border-white/15 pb-2">BIZORA_ASSISTANT_QUERY</div>
                <div className="p-2.5 bg-white/5 rounded-lg text-slate-300">
                  <span className="text-cyan-400">&gt;</span> &ldquo;What were our top 3 best-selling products this week?&rdquo;
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 space-y-1">
                  <div>1. Soybean Oil 2L (142 units)</div>
                  <div>2. ACI Pure Salt 1kg (98 units)</div>
                  <div>3. Ceylon Tea 400g (74 units)</div>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-black text-sm text-sky-400">
                  <span>AUDIT STATUS</span>
                  <span>100% Verified in Database</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. HOW IT WORKS (REAL 5-STEP ONBOARDING PIPELINE) */}
      <section id="how" className="py-20 bg-[#09090c] text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? 'ইনস্ট্যান্ট অনবোর্ডিং' : 'Real 5-Step Setup'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              {isBn ? '৫টি সহজ ধাপে শুরু করুন।' : 'Up and running in 5 simple steps.'}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 font-medium">
              {isBn
                ? 'এতটাই সহজ যে আপনার যেকোনো স্টাফ কোনো প্রযুক্তিগত প্রশিক্ষণ ছাড়াই প্রথম দিন থেকেই চালাতে পারবে।'
                : 'Engineered for zero friction: from new sign-up to your first barcode scan in under 10 minutes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                num: '1',
                title: 'Create Account',
                titleBn: 'অ্যাকাউন্ট খুলুন',
                desc: 'Sign up in under 2 minutes with email/phone. Zero credit card required for 14-day full access.',
                descBn: 'ইমেইল বা ফোন দিয়ে ২ মিনিটে ফ্রি রেজিস্ট্রেশন করুন। কোনো ক্রেডিট কার্ড লাগবে না।'
              },
              {
                num: '2',
                title: 'Set Up Business Profile',
                titleBn: 'স্টোর ও তথ্য দিন',
                desc: 'Add your shop name, logo, currency, default VAT rate, and receipt header details.',
                descBn: 'দোকানের নাম, লোগো, মুদ্রা, ভ্যাট রেট ও রসিদের শিরোনাম কনফিগার করুন।'
              },
              {
                num: '3',
                title: 'Configure Catalog & Tax',
                titleBn: 'পণ্য ও স্টক যোগ করুন',
                desc: 'Import existing inventory via CSV/Excel or scan barcodes with opening cashbox balances.',
                descBn: 'এক্সেল/সিএসভি থেকে পণ্য ক্যাটালগ আপলোড করুন এবং প্রাথমিক ক্যাশবক্স এন্ট্রি দিন।'
              },
              {
                num: '4',
                title: 'Record Sales & POs',
                titleBn: 'বিক্রি ও ক্রয় লিখুন',
                desc: 'Ring up customers at the offline-ready till and receive supplier PO deliveries with FEFO batches.',
                descBn: 'কাউন্টারে দ্রুত বিক্রি শুরু করুন এবং সাপ্লায়ারদের পারচেজ লট ও মেয়াদে গ্রহণ করুন।'
              },
              {
                num: '5',
                title: 'Review Live Reports',
                titleBn: 'লাইভ রিপোর্ট দেখুন',
                desc: 'Access audit-grade profit/loss, ledger dues, and Net VAT 9.1 returns in a single tap.',
                descBn: 'লাভ-ক্ষতি, কাস্টমার বাকি খাতা এবং এনবিআর ভ্যাট ৯.১ রিটার্ন দেখুন এক ক্লিকে।'
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-[#141417] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-400/50 transition-colors text-left flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-lg mb-4 shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform">
                    {step.num}
                  </div>
                  <h3 className="text-base font-black text-white mb-2">{isBn ? step.titleBn : step.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{isBn ? step.descBn : step.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isBn ? 'সহজ ও দ্রুত' : 'Verified Flow'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-white/10 text-center">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">35+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'সমন্বিত স্ক্রিন' : 'Enterprise Screens'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">8</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'রেডি স্টাফ রোল' : 'Prebuilt Roles'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">4</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'কুরিয়ার পার্টনার' : 'Courier Couplings'}</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-400">5</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">{isBn ? 'তৈরি স্টোর থিম' : 'Storefront Themes'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6B. BUSINESS BENEFITS & CONCRETE OUTCOMES */}
      <section id="benefits" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold uppercase tracking-widest">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isBn ? 'বাস্তব ব্যবসায়িক ফলাফল' : 'Measurable Business ROI'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'ব্যবসার আসল উন্নয়ন যা আপনি প্রতিদিন দেখতে পাবেন।' : 'Concrete Outcomes for Your Daily Operations.'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn
              ? 'অনুমাননির্ভর ব্যবসা থেকে বেরিয়ে আসুন। বিজোরার সাহায্যে প্রতিটি পণ্য ও টাকার পুঙ্খানুপুঙ্খ হিসাব রাখুন।'
              : 'Defensive engineering and automated reconciliation deliver tangible operational control without marketing hype.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Eye,
              color: 'text-amber-400',
              title: 'Total Visibility into Real-Time Sales & Margins',
              titleBn: 'বিক্রি ও মার্জিনের রিয়েল-টাইম স্বচ্ছতা',
              desc: 'Never wait until month-end to know your profits. See gross margin, net profit, top-moving items, and branch sales live on your phone.',
              descBn: 'মাস শেষের জন্য অপেক্ষা করতে হবে না। মোবাইলেই যেকোনো মুহূর্তের নিট লাভ, মোট বিক্রি এবং সর্বাধিক বিক্রিত পণ্য দেখুন।'
            },
            {
              icon: CalendarClock,
              color: 'text-rose-400',
              title: 'Zero Expired Stock Waste with FEFO Discipline',
              titleBn: 'মেয়াদোত্তীর্ণ মালের ক্ষতি থেকে ১০০% সুরক্ষা',
              desc: 'First-Expired, First-Out algorithm ensures oldest supplier deliveries sell first. Near-expiry radar alerts you 30, 60, and 90 days before expiration.',
              descBn: 'আগে মেয়াদ শেষ হওয়া লট আগে বিক্রি নিশ্চিত হয়। ৩০ ও ৬০ দিন আগেই সতর্কবার্তা পান যাতে ক্ষতি হওয়ার আগেই প্রমোশন দেওয়া যায়।'
            },
            {
              icon: Wallet,
              color: 'text-emerald-400',
              title: 'Organized Customer & Supplier Dues (Baki Khata)',
              titleBn: 'বকেয়া খাতা ও সাপ্লায়ার দেনার নির্ভুল ট্র্যাক',
              desc: 'Track who owes what to the exact penny. Automated SMS payment reminders and instalment schedules turn sticky receivables into working capital.',
              descBn: 'কার কাছে কত টাকা বাকি আছে তা নিমেষেই দেখুন। এসএমএস রিমাইন্ডার এবং কিস্তির শিডিউলে আটকে থাকা টাকা দ্রুত সংগ্রহ করুন।'
            },
            {
              icon: Scale,
              color: 'text-sky-400',
              title: 'Audit-Grade Books with Zero Manual Math',
              titleBn: 'হিসাবের খাতায় শূন্য ভুল ও ডাবল-এন্ট্রি জার্নাল',
              desc: 'Every sale, return, supplier delivery, and expense posts debits and credits automatically. Balance sheets and cash registers match perfectly at shift close.',
              descBn: 'প্রতিটি বিল ও ভাউচার নিজে থেকেই ডাবল-এন্ট্রিতে জমা হয়। দিন শেষে ক্যাশবাক্স ও ব্যাংক স্টেটমেন্ট সেকেন্ডে মিলিয়ে নিন।'
            },
            {
              icon: Warehouse,
              color: 'text-cyan-400',
              title: 'Centralized Multi-Store Control from One Login',
              titleBn: 'এক লগইনে সব শাখা ও ওয়্যারহাউস নিয়ন্ত্রণ',
              desc: 'Expand your retail chain without operational chaos. Switch between stores, transfer goods with gate passes, and compare branch revenues.',
              descBn: 'একাধিক দোকান খোলা এখন কোনো ঝামেলার নয়। যেকোনো দোকান থেকে অন্য দোকানে স্টক পাঠান এবং ব্রাঞ্চের পারফরম্যান্স তুলনা করুন।'
            },
            {
              icon: ShieldCheck,
              color: 'text-indigo-400',
              title: 'Role-Based Security & Anti-Leakage Controls',
              titleBn: 'কর্মচারী নিরাপত্তা ও ক্যাশ চুরির ঝুঁকি বন্ধ',
              desc: 'Keep wholesale buying costs private. Cashiers can ring up bills quickly while cash drawer float limits prevent unrecorded till removals.',
              descBn: 'ক্যাশিয়াররা নির্ভুল বিল করতে পারবে কিন্তু পণ্যের লাভ বা ক্রয়মূল্য দেখতে পারবে না। শিফটভিত্তিক ক্যাশ অডিটে টাকার গড়মিল বন্ধ থাকে।'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-7 rounded-3xl bg-[#14141a] border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{isBn ? item.titleBn : item.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{isBn ? item.descBn : item.desc}</p>
                </div>
              </div>
            );
          })}
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

      {/* 8. PREMIUM INDUSTRIES SHOWCASE */}
      <section id="industries" className="relative py-24 sm:py-28 bg-[#070a12] text-white border-y border-white/10 overflow-hidden">
        {/* Ambient atmospheric gradients & fine grid overlay */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Eyebrow, Heading, Description */}
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{isBn ? 'আপনার ব্যবসার জন্য নির্মিত' : 'BUILT FOR YOUR BUSINESS'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              {isBn ? 'একটি শক্তিশালী ইআরপি। প্রতিটি ধরনের ব্যবসার জন্য।' : 'One Powerful ERP. Every Type of Business.'}
            </h2>

            <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
              {isBn
                ? 'বিক্রি, ইনভেন্টরি, কাস্টমার এবং দৈনিক হিসাব পরিচালনা করুন আপনার ব্যবসার ধরন অনুযায়ী কাস্টমাইজড টুলের মাধ্যমে।'
                : 'Manage sales, inventory, customers and daily operations with tools tailored to the way your business works.'}
            </p>
          </div>

          {/* Responsive Industry Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5" role="tablist" aria-label="Supported Industries">
            {INDUSTRIES.map((ind, idx) => {
              const isSelected = selectedIndustryIndex === idx;
              const IconComp = ind.icon;

              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndustryIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndustryIndex(idx);
                    }
                  }}
                  role="tab"
                  aria-selected={isSelected}
                  className={`group relative text-left p-5 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12] ${
                    isSelected
                      ? 'bg-gradient-to-b from-white/[0.09] to-white/[0.03] border-cyan-400/60 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/40 -translate-y-1'
                      : 'bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.05] hover:-translate-y-0.5'
                  }`}
                >
                  {/* Top Bar: Icon + Badge Pill */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${ind.accentColor} text-white shadow-md shadow-black/40 group-hover:scale-105 transition-transform shrink-0`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${ind.badgeBg} ${ind.badgeBorder} ${ind.badgeText} border truncate`}>
                        {isBn ? ind.badgeBn : ind.badge}
                      </span>
                    </div>

                    {/* Trade Name & Description */}
                    <h3 className={`text-base sm:text-lg font-bold transition-colors mb-2 ${isSelected ? 'text-white font-black' : 'text-slate-100 group-hover:text-cyan-300'}`}>
                      {isBn ? ind.tradeBn : ind.trade}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                      {isBn ? ind.descriptionBn : ind.description}
                    </p>

                    {/* Verified Feature Tags */}
                    <div className="space-y-1.5 pt-3 border-t border-white/5 mb-4">
                      {(isBn ? ind.featuresBn : ind.features).slice(0, 3).map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-300">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Explore Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-bold">
                    <span className={`transition-colors ${isSelected ? 'text-cyan-400 font-black' : 'text-slate-400 group-hover:text-white'}`}>
                      {isSelected ? (isBn ? 'বর্তমানে নির্বাচিত' : 'Currently Viewing') : (isBn ? 'ওয়ার্কফ্লো দেখুন' : 'Explore Workflow')}
                    </span>
                    <div className={`p-1.5 rounded-full transition-all ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white group-hover:translate-x-0.5'}`}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Deep-Dive Workflow Showcase */}
          {(() => {
            const activeInd = INDUSTRIES[selectedIndustryIndex] || INDUSTRIES[0];
            const ActiveIcon = activeInd.icon;

            return (
              <div className="mt-10 sm:mt-12 rounded-3xl bg-gradient-to-b from-slate-900/90 via-[#0a0f1d]/90 to-[#070b14]/90 backdrop-blur-2xl border border-cyan-500/30 p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Showcase Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${activeInd.accentColor} text-white shadow-lg shadow-black/40`}>
                      <ActiveIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {isBn ? activeInd.tradeBn : activeInd.trade}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${activeInd.badgeBg} ${activeInd.badgeBorder} ${activeInd.badgeText} border`}>
                          {isBn ? activeInd.badgeBn : activeInd.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        {isBn ? activeInd.workflowTitleBn : activeInd.workflowTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold shrink-0 self-start md:self-auto">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isBn ? activeInd.statBadgeBn : activeInd.statBadge}</span>
                  </div>
                </div>

                {/* Showcase Grid: Left = Workflow Steps, Right = Live Capabilities & CTA */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-8">
                  
                  {/* Left Column (7 cols): 3 Chronological Workflow Steps */}
                  <div className="lg:col-span-7 space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{isBn ? 'বাস্তব কাজের প্রবাহ (Daily Operational Workflow)' : 'Step-by-Step Daily Workflow in Bizora'}</span>
                    </h4>

                    <div className="space-y-4">
                      {activeInd.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            {step.num}
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-sm font-bold text-white">
                              {isBn ? step.titleBn : step.title}
                            </h5>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {isBn ? step.descBn : step.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column (5 cols): Live Preview Terminal & Action */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                    
                    {/* Live Preview Terminal Box */}
                    <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 space-y-4 shadow-inner">
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          <span className="font-mono text-[11px] text-slate-400 ml-2">
                            {isBn ? activeInd.previewCard.titleBn : activeInd.previewCard.title}
                          </span>
                        </div>
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live
                        </span>
                      </div>

                      {/* Real KPI Metrics */}
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        {activeInd.previewCard.stats.map((st, stIdx) => (
                          <div key={stIdx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                            <div className="text-xs sm:text-sm font-black text-white truncate">
                              {st.val}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {isBn ? st.labelBn : st.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Verified Trade Capability Badges */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isBn ? 'অন্তর্ভুক্ত মডিউলসমূহ:' : 'Included ERP Modules:'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(isBn ? activeInd.featuresBn : activeInd.features).map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Block with Functional Buttons */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => handlePortalClick('shop', e)}
                          className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                        >
                          <span>{isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        
                        <a
                          href="#plans"
                          className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                        >
                          <span>{isBn ? 'মূল্য দেখুন' : 'View Plans'}</span>
                          <ArrowUpRight className="w-4 h-4 text-slate-400" />
                        </a>
                      </div>

                      {/* Trust Markers */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isBn ? 'ক্রেডিট কার্ড ছাড়া শুরু করুন' : 'No credit card required'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {isBn ? '২ মিনিটে ইনস্ট্যান্ট সেটআপ' : '2-minute instant setup'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {isBn ? 'সকল প্রো ফিচার অ্যাক্সেস' : 'Full Pro access'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* 9. AUTHORITATIVE COMPARISON MATRIX (REAL CONFIGURATION & ENTITLEMENTS) */}
      <section id="compare" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-xs font-bold uppercase tracking-widest">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBn ? 'সঠিক ডাটাভিত্তিক প্যাকেজ তুলনা' : 'Authoritative Package Matrix'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'আপনার ব্যবসার জন্য কোন প্যাকেজটি উপযুক্ত?' : 'Compare Bizora Packages & Capabilities.'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn
              ? 'বাস্তব ডাটাবেস সীমা ও মডিউল পারমিশন অনুযায়ী সকল Bizora প্যাকেজের স্পষ্ট তুলনা।'
              : 'Direct side-by-side comparison of verified resource limits and operational module entitlements.'}
          </p>

          {/* View Mode Switcher: Bizora Plans vs Traditional Systems */}
          <div className="pt-2 flex items-center justify-center">
            <div className="inline-flex items-center p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setCompareMode('plans')}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  compareMode === 'plans'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? 'সব Bizora প্যাকেজ তুলনা' : 'Compare Bizora Plans'}
              </button>
              <button
                type="button"
                onClick={() => setCompareMode('traditional')}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  compareMode === 'traditional'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? 'বনাম প্রচলিত খাতা ও বেসিক POS' : 'vs Traditional Systems'}
              </button>
            </div>
          </div>
        </div>

        {compareMode === 'plans' ? (
          /* REAL DYNAMIC PLAN-TO-PLAN MATRIX */
          <div className="overflow-x-auto bg-[#141418] border border-white/10 rounded-3xl shadow-2xl">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[850px]">
              {/* Header with Plan Names, Prices, and Action Buttons */}
              <thead>
                <tr className="border-b border-white/15 bg-white/[0.02]">
                  <th className="p-5 font-black text-white w-1/4 align-bottom">
                    <span className="text-base font-black text-slate-200 block">
                      {isBn ? 'প্যাকেজের বৈশিষ্ট্য ও সীমা' : 'Capability / Feature'}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                      {isBn ? 'লাইভ ডাটাবেস কনফিগারেশন' : 'Live Platform Enforced'}
                    </span>
                  </th>
                  {plans.map((p) => {
                    const monthlyPrice = Number(p.monthlyPrice ?? p.price) || 0;
                    const yearlyPrice = Number(p.yearlyPrice) || (monthlyPrice > 0 ? monthlyPrice * 10 : 0);
                    const isFree = monthlyPrice === 0 && yearlyPrice === 0;
                    const priceToShow = isFree ? 0 : billingCycle === 'yearly' && yearlyPrice > 0 ? yearlyPrice : monthlyPrice;
                    const isPopular = Boolean(p.isPopular);

                    return (
                      <th
                        key={p.id || p.name}
                        className={`p-5 text-center align-top transition-colors ${
                          isPopular ? 'bg-amber-400/10 border-x border-amber-400/30' : ''
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-black text-base text-white tracking-tight">{p.name}</span>
                            {isPopular && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px] uppercase tracking-wider">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-amber-400">
                            {isFree ? (
                              <span>{isBn ? 'ফ্রি' : 'Free'}</span>
                            ) : (
                              <span>৳ {priceToShow.toLocaleString()}</span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              {isFree
                                ? (p.trialDays ? `${p.trialDays} ${isBn ? 'দিনের ট্রায়াল' : 'Days Free'}` : 'Forever')
                                : billingCycle === 'yearly'
                                ? (isBn ? '/ বছর' : '/ year')
                                : (isBn ? '/ মাস' : '/ month')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handlePortalClick('shop', e, { plan: p.id, billing: billingCycle })}
                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              isPopular
                                ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-md shadow-amber-400/20'
                                : 'bg-white/10 text-white hover:bg-white hover:text-black border border-white/10'
                            }`}
                          >
                            {isFree ? (isBn ? 'ফ্রি শুরু করুন' : 'Start Trial') : (isBn ? 'প্যাকেজ নিন' : 'Choose Plan')}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {/* 1. RESOURCE & HARD LIMITS SECTION */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={plans.length + 1} className="py-3 px-5 font-black text-[11px] uppercase tracking-wider text-amber-400">
                    {isBn ? '১. রিসোর্স ও ক্যাপাসিটি সীমা' : '1. Resource & Capacity Limits'}
                  </td>
                </tr>

                {[
                  { label: 'Store Branches', labelBn: 'দোকান / শাখা', prop: 'limitStores', unit: isBn ? 'টি' : '' },
                  { label: 'User Logins', labelBn: 'ইউজার লগইন', prop: 'limitUsers', unit: isBn ? 'জন' : '' },
                  { label: 'Staff / Employees', labelBn: 'স্টাফ / কর্মচারী', prop: 'limitEmployees', unit: isBn ? 'জন' : '' },
                  { label: 'Product Catalog Items', labelBn: 'পণ্য ক্যাটালগ লিমিট', prop: 'limitProducts', unit: isBn ? 'টি' : '' },
                  { label: 'Monthly Invoices', labelBn: 'মাসিক ইনভয়েস', prop: 'limitInvoices', unit: isBn ? 'টি' : '' },
                  { label: 'Warehouses', labelBn: 'ওয়্যারহাউস / গুদাম', prop: 'limitWarehouses', unit: isBn ? 'টি' : '' },
                  { label: 'Cloud Document Storage', labelBn: 'ক্লাউড স্টোরেজ', prop: 'limitStorageMb', unit: 'MB' },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{isBn ? row.labelBn : row.label}</td>
                    {plans.map((p) => (
                      <td
                        key={p.id || p.name}
                        className={`p-4 text-center font-bold text-slate-100 ${
                          p.isPopular ? 'bg-amber-400/[0.03] border-x border-amber-400/20 font-black text-amber-300' : ''
                        }`}
                      >
                        {formatPlanLimit(p, row.prop, isBn, row.unit)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 2. POINT OF SALE & BILLING */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={plans.length + 1} className="py-3 px-5 font-black text-[11px] uppercase tracking-wider text-amber-400">
                    {isBn ? '২. পয়েন্ট অব সেল (POS) ও বিলিং' : '2. Point of Sale & Billing Capabilities'}
                  </td>
                </tr>

                {[
                  { label: 'High-Speed Barcode Till', labelBn: 'হাই-স্পিড বারকোড স্ক্যানার টিল', key: 'pos.terminal', kw: ['pos', 'terminal'] },
                  { label: 'Quick Sale Touch Keypad', labelBn: 'কুইক সেল টাচ কীপ্যাড টিল', key: 'pos.quick_sale', kw: ['quick'] },
                  { label: 'Split Tender (Cash, Card, bKash/Nagad)', labelBn: 'স্প্লিট পেমেন্ট (ক্যাশ, কার্ড, বিকাশ/নগদ)', key: 'pos.terminal', kw: ['split', 'pos'] },
                  { label: 'Thermal Receipt Printing (58/80mm)', labelBn: 'থার্মাল রসিদ প্রিন্টিং (৫৮/৮০ মিমি)', key: 'pos.terminal', kw: ['receipt', 'print'] },
                  { label: '100% Offline POS & Auto Cloud Sync', labelBn: '১০০% অফলাইন বিক্রি ও অটো সিঙ্ক', key: 'pos.terminal', kw: ['offline'] },
                  { label: 'Sales Returns & Store Credit Vouchers', labelBn: 'সেলস রিটার্ন ও স্টোর ক্রেডিট', key: 'pos.returns', kw: ['return'] },
                  { label: 'Kitchen Display Screen (KDS)', labelBn: 'কিচেন ডিসপ্লে স্ক্রিন (KDS)', key: 'pos.kitchen_display', kw: ['kitchen', 'kds'] },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{isBn ? row.labelBn : row.label}</td>
                    {plans.map((p) => {
                      const hasFeat = checkPlanFeature(p, row.key, row.kw);
                      return (
                        <td
                          key={p.id || p.name}
                          className={`p-4 text-center ${
                            p.isPopular ? 'bg-amber-400/[0.03] border-x border-amber-400/20' : ''
                          }`}
                        >
                          {hasFeat ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-slate-600 text-xs">
                              ✕
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 3. INVENTORY, BATCHES & EXPIRE */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={plans.length + 1} className="py-3 px-5 font-black text-[11px] uppercase tracking-wider text-amber-400">
                    {isBn ? '৩. ইনভেন্টরি, ব্যাচ ও ট্র্যাকিং' : '3. Inventory, Batches & Tracking'}
                  </td>
                </tr>

                {[
                  { label: 'Barcode Label Designer & Printing', labelBn: 'বারকোড লেবেল ডিজাইন ও প্রিন্টিং', key: 'inventory.barcode_labels', kw: ['barcode', 'label'] },
                  { label: 'FEFO Batch & Expiry Date Algorithm', labelBn: 'এফইএফও ব্যাচ ও মেয়াদোত্তীর্ণ ট্র্যাকিং', key: 'inventory.batch_tracking', kw: ['batch', 'expiry', 'fefo'] },
                  { label: 'Serial & IMEI Lifecycle Tracking', labelBn: 'সিরিয়াল ও আইএমইআই (IMEI) ট্র্যাকিং', key: 'inventory.serial_tracking', kw: ['serial', 'imei'] },
                  { label: 'Supplier Purchase Orders & Delivery', labelBn: 'সাপ্লায়ার পারচেজ অর্ডার ও রিসিভিং', key: 'purchases.orders', kw: ['purchase', 'order'] },
                  { label: 'Inter-Branch Stock Transfers & Gate Pass', labelBn: 'ব্রাঞ্চ স্টক ট্রান্সফার ও গেটপাস', key: 'inventory.multi_warehouse', kw: ['warehouse', 'transfer', 'branch'] },
                  { label: 'Light Manufacturing & Bill of Materials', labelBn: 'প্রোডাকশন ও বিল অব ম্যাটেরিয়ালস (BOM)', key: 'manufacturing.bom', kw: ['bom', 'manufacturing'] },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{isBn ? row.labelBn : row.label}</td>
                    {plans.map((p) => {
                      const hasFeat = checkPlanFeature(p, row.key, row.kw);
                      return (
                        <td
                          key={p.id || p.name}
                          className={`p-4 text-center ${
                            p.isPopular ? 'bg-amber-400/[0.03] border-x border-amber-400/20' : ''
                          }`}
                        >
                          {hasFeat ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-slate-600 text-xs">
                              ✕
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 4. ACCOUNTS & COMPLIANCE */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={plans.length + 1} className="py-3 px-5 font-black text-[11px] uppercase tracking-wider text-amber-400">
                    {isBn ? '৪. হিসাব, ক্যাশবক্স ও ট্যাক্স' : '4. Accounting & Compliance'}
                  </td>
                </tr>

                {[
                  { label: 'Shift Cashbox Float Reconciliation', labelBn: 'শিফট ক্যাশবক্স ফ্লোট ব্যালেন্সিং', key: 'finance.cashbox', kw: ['cashbox'] },
                  { label: 'Expense Vouchers & Petty Cash', labelBn: 'খরচের ভাউচার ও দৈনিক ক্যাশ', key: 'finance.expenses', kw: ['expense'] },
                  { label: 'Double-Entry General Journal', labelBn: 'অটোমেটিক ডাবল-এন্ট্রি জার্নাল', key: 'finance.journal', kw: ['journal', 'accounting'] },
                  { label: 'Customer Due (Baki) & SMS Reminders', labelBn: 'কাস্টমার বকেয়া খাতা ও এসএমএস রিমাইন্ডার', key: 'finance.cashbox', kw: ['due', 'ledger'] },
                  { label: 'Net VAT 9.1 Return Calculation', labelBn: 'এনবিআর নেট ভ্যাট ৯.১ রিটার্ন হিসাব', key: 'reports.tax_vat', kw: ['vat', 'tax'] },
                  { label: 'Audit-Grade Profit & Loss Report', labelBn: 'অডিট-গ্রেড লাভ-ক্ষতি ও ব্যালেন্স শিট', key: 'reports.basic_sales', kw: ['profit', 'report'] },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{isBn ? row.labelBn : row.label}</td>
                    {plans.map((p) => {
                      const hasFeat = checkPlanFeature(p, row.key, row.kw);
                      return (
                        <td
                          key={p.id || p.name}
                          className={`p-4 text-center ${
                            p.isPopular ? 'bg-amber-400/[0.03] border-x border-amber-400/20' : ''
                          }`}
                        >
                          {hasFeat ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-slate-600 text-xs">
                              ✕
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 5. OMNICHANNEL, AI & ENTERPRISE */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={plans.length + 1} className="py-3 px-5 font-black text-[11px] uppercase tracking-wider text-amber-400">
                    {isBn ? '৫. অনলাইন স্টোর, AI ও এন্টারপ্রাইজ' : '5. Omnichannel, AI & Enterprise'}
                  </td>
                </tr>

                {[
                  { label: 'Online Storefront (5 Themes)', labelBn: 'অনলাইন ই-কমার্স স্টোর (৫টি থিম)', key: 'ecommerce.storefront', kw: ['ecommerce', 'storefront'] },
                  { label: 'Pathao & Steadfast Courier Booking', labelBn: 'সরাসরি পাঠাও ও স্টিডফাস্ট কুরিয়ার বুকিং', key: 'ecommerce.courier_integration', kw: ['courier'] },
                  { label: 'Custom Store Domain Connection', labelBn: 'কাস্টম নিজস্ব স্টোর ডোমেন', key: 'ecommerce.custom_domain', kw: ['domain'] },
                  { label: 'Bizora AI ERP Assistant (EN & BN)', labelBn: 'বিজনেস এআই সহকারী (বাংলা ও ইংরেজি)', key: 'ai.assistant', kw: ['ai', 'assistant'] },
                  { label: 'Tamper-Evident Security Audit Logs', labelBn: 'ক্রিপ্টোগ্রাফিক সিকিউরিটি অডিট লগ', key: 'security.audit_logs', kw: ['audit', 'security'] },
                  { label: 'Public Developer REST & Webhook APIs', labelBn: 'ডেভেলপার রেস্ট ও ওয়েবহুক এপিআই', key: 'api.access', kw: ['api'] },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{isBn ? row.labelBn : row.label}</td>
                    {plans.map((p) => {
                      const hasFeat = checkPlanFeature(p, row.key, row.kw);
                      return (
                        <td
                          key={p.id || p.name}
                          className={`p-4 text-center ${
                            p.isPopular ? 'bg-amber-400/[0.03] border-x border-amber-400/20' : ''
                          }`}
                        >
                          {hasFeat ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-slate-600 text-xs">
                              ✕
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        ) : (
          /* TRADITIONAL SYSTEMS SIDE-BY-SIDE COMPARISON */
          <div className="overflow-x-auto bg-[#141418] border border-white/10 rounded-2xl shadow-2xl">
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-5 font-black text-white bg-white/5 w-2/5">{isBn ? 'ফিচার ও সক্ষমতা' : 'Capability'}</th>
                  <th className="p-5 font-black text-black bg-amber-400 text-center w-1/5">Bizora Cloud ERP</th>
                  <th className="p-5 font-semibold text-slate-400 bg-white/5 text-center w-1/5">{isBn ? 'খাতা ও এক্সেল' : 'Spreadsheets'}</th>
                  <th className="p-5 font-semibold text-slate-400 bg-white/5 text-center w-1/5">{isBn ? 'সাধারণ POS' : 'Basic POS Registers'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { title: 'Works 100% offline & auto-syncs to cloud', titleBn: 'অফলাইনে কাজ ও স্বয়ংক্রিয় সিঙ্ক', biz: true, sp: false, pos: false },
                  { title: 'FEFO oldest-expiry selling algorithm', titleBn: 'আগে মেয়াদ শেষ হওয়া ব্যাচ আগে বিক্রি (FEFO)', biz: true, sp: false, pos: false },
                  { title: 'IMEI & Serial tracking from PO to sale', titleBn: 'ক্রয় থেকে বিক্রি পর্যন্ত সিরিয়াল ট্র্যাকিং', biz: true, sp: false, pos: false },
                  { title: 'Automated double-entry journal posting', titleBn: 'প্রতিটি বিক্রিতে অটোমেটিক হিসাব জার্নাল', biz: true, sp: false, pos: false },
                  { title: 'Net VAT calculation net of returns', titleBn: 'রিটার্ন বাদ দিয়ে সঠিক ভ্যাট রিপোর্ট', biz: true, sp: false, pos: true },
                  { title: 'Credit sale instalment schedules & SMS', titleBn: 'বাকিতে বিক্রির কিস্তি ও এসএমএস রিমাইন্ডার', biz: true, sp: false, pos: false },
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
        )}
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

      {/* 11. ACCORDION FAQ SECTION (ALL 10 VERIFIED QUESTIONS) */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{isBn ? 'সচরাচর জিজ্ঞাসা' : 'Verified Knowledge Base'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {isBn ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            {isBn ? 'দোকান ও ব্যবসা পরিচালনার বাস্তব প্রশ্ন ও নির্ভরযোগ্য উত্তর।' : 'Straightforward answers to key technical and operational questions.'}
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: '1. What is Bizora ERP?',
              qBn: '১. Bizora ERP কী এবং এটি কাদের জন্য?',
              a: 'Bizora is a comprehensive multi-tenant cloud ERP platform designed specifically for modern retail, supermarkets, pharmacies, wholesale distribution, and light manufacturing. It integrates high-speed barcode checkout, FEFO batch and expiry inventory, double-entry financial accounting, Net VAT 9.1 compliance, multi-branch store control, and live e-commerce into a single connected platform.',
              aBn: 'Bizora একটি সমন্বিত ক্লাউড ইআরপি প্ল্যাটফর্ম যা সাধারণ রিটেল, সুপারশপ, ফার্মেসি, পাইকারি ডিস্ট্রিবিউশন এবং ম্যানুফ্যাকচারিং ব্যবসার জন্য তৈরি। এটি হাই-স্পিড বারকোড বিলিং, এফইএফও ব্যাচ ও মেয়াদ ট্র্যাকিং, স্বয়ংক্রিয় ডাবল-এন্ট্রি হিসাব, ভ্যাট ৯.১ রিটার্ন, ব্রাঞ্চ ম্যানেজমেন্ট এবং অনলাইন শপকে একই প্ল্যাটফর্মে সংযুক্ত করে।'
            },
            {
              q: '2. Which operational modules are available in the platform?',
              qBn: '২. প্ল্যাটফর্মে কোন কোন মডিউল উপলব্ধ আছে?',
              a: 'Bizora provides 8 canonical ERP modules: (1) Point of Sale & Quick Till, (2) Purchasing, Batches, Serials & FEFO Expiry, (3) Accounts, Cashbox Shifts & Double-Entry Journal, (4) Tax Compliance & Net VAT 9.1 Returns, (5) Multi-Store, Branches & Warehouses, (6) Staff Hierarchy & Granular RBAC Permissions, (7) Online Storefront & Courier Consignments, and (8) Natural Language Business Assistant with Tamper-Evident Security Audit Logs.',
              aBn: 'Bizora-তে ৮টি মূল মডিউল রয়েছে: (১) পিওএস ও কুইক সেল টিল, (২) ক্রয়, ব্যাচ, সিরিয়াল ও এফইএফও মেয়াদ, (৩) হিসাব, ক্যাশবক্স ও ডাবল-এন্ট্রি জার্নাল, (৪) কর ও নেট ভ্যাট ৯.১ রিটার্ন, (৫) একাধিক শাখা ও ওয়্যারহাউস ট্রান্সফার, (৬) স্টাফ রোল ও পারমিশন কন্ট্রোল, (৭) অনলাইন স্টোর ও কুরিয়ার পার্সেল বুকিং, এবং (৮) বিজনেস এআই সহকারী ও অডিট লগ।'
            },
            {
              q: '3. How do I create an account and get started?',
              qBn: '৩. কীভাবে অ্যাকাউন্ট খুলব এবং শুরু করব?',
              a: 'You can start a 14-day free trial in under 2 minutes with zero credit card required. Simply click "Start Free Trial", register with your email or phone, set up your shop profile and VAT number, and import your product catalog via Excel/CSV. Our onboarding team is also available to assist with receipt format and barcode printer pairing.',
              aBn: 'কোনো ক্রেডিট কার্ড ছাড়াই ২ মিনিটে ১৪ দিনের ফ্রি ট্রায়াল শুরু করতে পারেন। "ফ্রি ট্রায়াল" বাটনে ক্লিক করে ইমেইল বা ফোন দিয়ে রেজিস্টার করুন, দোকানের নাম ও ভ্যাট কনফিগার করুন এবং এক্সেল/সিএসভি দিয়ে পণ্য আপলোড করে সাথে সাথে কাউন্টারে বিক্রি শুরু করুন।'
            },
            {
              q: '4. How are packages and subscription pricing determined?',
              qBn: '৪. প্যাকেজ ও সাবস্ক্রিপশন মূল্য কীভাবে নির্ধারিত হয়?',
              a: 'Bizora pricing is fully transparent with no hidden onboarding fees: Trial (14-day full evaluation), Basic (৳999/month for single retail stores), Pro (৳2,499/month for growing stores requiring batch FEFO, online storefront, and courier shipping), and Enterprise (৳4,999/month for multi-branch chains, manufacturing BOM, and API access). Annual billing includes substantial multi-month discounts.',
              aBn: 'Bizora-র মূল্য সম্পূর্ণ স্বচ্ছ: ট্রায়াল (১৪ দিন ফ্রি), বেসিক (৳৯৯৯/মাস একক রিটেল দোকানের জন্য), প্রো (৳২,৪৯৯/মাস ব্যাচ মেয়াদ, অনলাইন শপ ও কুরিয়ার বুকিং সহ), এবং এন্টারপ্রাইজ (৳৪,৯৯৯/মাস একাধিক শাখা, কারখানা BOM ও এপিআই অ্যাক্সেস সহ)। বাৎসরিক পেমেন্টে বড় ছাড় পাওয়া যায়।'
            },
            {
              q: '5. Can I manage multiple branch stores and warehouses under one account?',
              qBn: '৫. আমি কি এক অ্যাকাউন্টেই একাধিক ব্রাঞ্চ বা শাখা পরিচালনা করতে পারব?',
              a: 'Yes. On Pro and Enterprise plans, you can manage multiple retail branch stores and central warehouses under a single owner login. You can transfer stock between locations using gate passes, set store-specific selling prices, and review unified financial statements as well as per-branch profitability.',
              aBn: 'হ্যাঁ। প্রো এবং এন্টারপ্রাইজ প্ল্যানে এক লগইনেই একাধিক ব্রাঞ্চ দোকান এবং সেন্ট্রাল গুদাম পরিচালনা করা যায়। গেটপাস দিয়ে শাখাগুলোর মাঝে স্টক ট্রান্সফার করা যায় এবং সব ব্রাঞ্চের আলাদা ও সমন্বিত লাভ-ক্ষতি রিপোর্ট দেখা যায়।'
            },
            {
              q: '6. How do customer dues, credit sales, and payment receipts work?',
              qBn: '৬. কাস্টমার বাকি (Credit), কিস্তি এবং পেমেন্ট রসিদ কীভাবে কাজ করে?',
              a: 'Bizora maintains a real-time customer receivable ledger (baki khata). You can accept split payments (cash, cards, mobile banking, and credit), generate instalment repayment schedules, send automated SMS balance reminders, issue store credit vouchers on returns, and print thermal 58mm/80mm receipts.',
              aBn: 'Bizora প্রতিটি কাস্টমারের বকেয়া খাতা রিয়েল-টাইমে ট্র্যাক করে। স্প্লিট পেমেন্ট নেওয়া যায়, বাকির কিস্তি নির্ধারণ করা যায়, স্বয়ংক্রিয় এসএমএস পাঠানো যায় এবং পণ্যের আংশিক বা পূর্ণ রিটার্নে স্টোর ক্রেডিট ভাউচার ও রসিদ প্রিন্ট করা যায়।'
            },
            {
              q: '7. How are employees and role-based permissions managed?',
              qBn: '৭. স্টাফ এবং রোলভিত্তিক পারমিশন কীভাবে নিয়ন্ত্রিত হয়?',
              a: 'Bizora provides preconfigured role templates: Shop Owner, Manager, Cashier, Stock Manager, and Accountant. Granular access controls hide purchase wholesale costs, supplier margins, and balance sheets from counter cashiers while enforcing shift opening/closing cash drawer float reconciliation.',
              aBn: 'দোকান মালিক, ম্যানেজার, ক্যাশিয়ার, স্টক কিপার এবং অ্যাকাউন্ট্যান্টের জন্য তৈরি রোল রয়েছে। ক্যাশিয়াররা দ্রুত বিক্রি করতে পারলেও মালিকের আসল ক্রয়মূল্য বা মুনাফার মার্জিন দেখতে পারে না। প্রতিটি শিফটের শুরুতে ও শেষে ক্যাশবাক্স হিসাব মেলানো বাধ্যতামূলক।'
            },
            {
              q: '8. How do data backup and offline point of sale work?',
              qBn: '৮. অফলাইনে বিক্রি এবং ক্লাউড ব্যাকআপ কীভাবে কাজ করে?',
              a: 'Bizora uses an offline-first IndexedDB architecture. If your store loses internet connection or WiFi drops, counter sales, barcode scanning, and thermal receipt printing continue without stopping. When connectivity returns, transactions automatically reconcile to the cloud database with conflict prevention and automated daily backups.',
              aBn: 'Bizora সম্পূর্ণ অফলাইন-ফার্স্ট প্রযুক্তিতে তৈরি। ইন্টারনেট বা ওয়াইফাই সংযোগ বিচ্ছিন্ন হলেও ক্যাশ কাউন্টারে বিক্রি ও রসিদ প্রিন্টিং স্বাভাবিকভাবে চলবে। নেট কানেকশন ফিরে আসার সাথে সাথে ডাটা ক্লাউডে নিরাপদভাবে সিঙ্ক হয়ে যাবে।'
            },
            {
              q: '9. How can I contact customer support and onboarding assistance?',
              qBn: '৯. কাস্টমার সাপোর্ট ও সেটআপ সহায়তার জন্য কীভাবে যোগাযোগ করব?',
              a: 'You can reach our engineering support team via email at support@bizora.app, through our in-app ticket desk, or by scheduling an onboarding session where our specialists assist with product catalog migration and thermal printer setup.',
              aBn: 'আমাদের সাপোর্ট টিমের সাথে সরাসরি support@bizora.app ইমেইলে অথবা ড্যাশবোর্ডের টিকেট সিস্টেমের মাধ্যমে যোগাযোগ করতে পারেন। আমাদের বিশেষজ্ঞ দল আপনার ক্যাটালগ আপলোড এবং প্রিন্টার কনফিগারেশনে সহায়তা করবে।'
            },
            {
              q: '10. How can I upgrade or manage my subscription plan?',
              qBn: '১০. কীভাবে সাবস্ক্রিপশন প্ল্যান আপগ্রেড বা পরিবর্তন করব?',
              a: 'You can upgrade, downgrade, or switch between monthly and annual billing cycles at any time from the Subscriptions section of your Shop Owner portal. Additional branch limits, user seats, and enterprise modules activate instantly upon subscription confirmation.',
              aBn: 'দোকান মালিকের পোর্টালের সাবস্ক্রিপশন মেনু থেকে যেকোনো সময় প্যাকেজ পরিবর্তন বা বাৎসরিক বিলিংয়ে সুইচ করতে পারেন। আপগ্রেড নিশ্চিত করার সাথে সাথেই অতিরিক্ত ব্রাঞ্চ ও ফিচার স্বয়ংক্রিয়ভাবে কার্যকর হয়।'
            }
          ].map((item, idx) => (
            <div key={idx} className="border border-white/10 rounded-2xl bg-[#141418] overflow-hidden shadow-xs hover:border-white/20 transition-colors">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 sm:p-6 text-left font-bold text-sm sm:text-base text-white flex justify-between items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <span>{isBn ? item.qBn : item.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-6 sm:px-6 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-3">
                  {isBn ? item.aBn : item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 11B. CONTACT & ONBOARDING ASSISTANCE */}
      <section id="contact" className="py-20 bg-[#0d0d12] text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold uppercase tracking-widest">
                <HeadphonesIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isBn ? 'সাপোর্ট ও অনবোর্ডিং' : 'Merchant Support & Onboarding'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {isBn ? 'আমরা আপনার ব্যবসার পাশে আছি।' : 'Direct Support for Growing Businesses.'}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {isBn
                  ? 'আপনার পুরোনো সফটওয়্যার বা এক্সেল খাতা থেকে Bizora-তে ডাটা মাইগ্রেশন করতে সহায়তা প্রয়োজন? আমাদের টেকনিক্যাল টিম আপনাকে সরাসরি সাহায্য করবে।'
                  : 'Transitioning from paper notebooks or legacy spreadsheets? Our engineering specialists assist with bulk item catalog import, thermal receipt pairing, and cashier staff setup.'}
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">{isBn ? 'ইমেইল সাপোর্ট' : 'Engineering Support'}</span>
                    <a href="mailto:support@bizora.app" className="font-bold hover:text-amber-400 transition-colors">support@bizora.app</a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">{isBn ? 'সাপোর্ট সময়' : 'Availability'}</span>
                    <span className="font-bold">Saturday – Thursday · 9:00 AM – 8:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#141419] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 text-left shadow-2xl">
              <h3 className="text-xl font-black text-white">
                {isBn ? 'সরাসরি পোর্টাল লগইন' : 'Direct Portal Access'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBn ? 'আপনার ভূমিকা অনুযায়ী নির্দিষ্ট পোর্টালে প্রবেশ করুন:' : 'Access your authorized workspace based on your business role:'}
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={(e) => handlePortalClick('shop', e)}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        {isBn ? 'শপ ওনার পোর্টাল' : 'Shop Owner Portal'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isBn ? 'দোকান পরিচালনা, ইনভেন্টরি, হিসাব ও সেটিংস' : 'Manage stores, inventory, finance & branches'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handlePortalClick('employee', e)}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                        {isBn ? 'এমপ্লয়ী পোর্টাল' : 'Employee Portal'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isBn ? 'ক্যাশিয়ার টিল, শিফট ব্যালেন্স ও অর্ডার' : 'POS sales till, shift drawer float & order lookup'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handlePortalClick('customer', e)}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/50 hover:bg-purple-400/5 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">
                        {isBn ? 'কাস্টমার পোর্টাল' : 'Customer Portal'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isBn ? 'ক্রয় ইতিহাস, ডিজিটাল রসিদ ও ডেলিভারি ট্র্যাক' : 'View purchase history, receipts & courier tracking'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>

          </div>
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
              ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন। কোনো ক্রেডিট কার্ড লাগবে না। আমাদের সাপোর্ট টিম আপনাকে সম্পূর্ণ ক্যাটালগ ও রসিদ সেটআপে সাহায্য করবে।'
              : 'Start your 14-day free trial now with zero credit card. Our technical team assists with product catalog import and receipt setup.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={(e) => handlePortalClick('shop', e, { mode: 'register' })}
              className="px-8 py-4 rounded-full bg-black text-white font-black text-base shadow-xl hover:bg-slate-900 hover:scale-105 transition-all cursor-pointer"
            >
              {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
            </button>
            <a
              href="mailto:support@bizora.app"
              className="px-8 py-4 rounded-full border-2 border-black text-black font-extrabold text-base hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              {isBn ? 'সাপোর্টে কথা বলুন' : 'Talk to Onboarding Team'}
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
                <li><a href="#how" className="hover:text-white transition-colors">{isBn ? 'কীভাবে চলে' : 'How It Works'}</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">{isBn ? 'সুবিধাসমূহ' : 'Benefits'}</a></li>
                <li><a href="#os" className="hover:text-white transition-colors">{isBn ? 'বিজনেস OS' : 'Business OS'}</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">{isBn ? 'ব্যবসার ধরন' : 'Industries'}</a></li>
                <li><a href="#compare" className="hover:text-white transition-colors">{isBn ? 'প্যাকেজ তুলনা' : 'Compare Matrix'}</a></li>
                <li><a href="#plans" className="hover:text-white transition-colors">{isBn ? 'সাবস্ক্রিপশন প্ল্যান' : 'Pricing Plans'}</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">{isBn ? 'Bizora পরিচিতি' : 'About Bizora'}</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">{isBn ? 'সাধারণ জিজ্ঞাসা' : 'FAQ'}</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">{isBn ? 'যোগাযোগ ও সাপোর্ট' : 'Contact Support'}</a></li>
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
