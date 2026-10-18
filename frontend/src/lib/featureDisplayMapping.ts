/**
 * Central Feature Display Mapping for Bizora SaaS ERP Public Website & Pricing Cards.
 * Maps raw backend permission keys (e.g. 'pos.terminal', 'inventory.catalog', 'purchases.orders')
 * into human-readable labels, descriptions, module categories, and Lucide icons.
 */
import React from 'react';
import {
  ShoppingBag,
  Zap,
  RotateCcw,
  FileText,
  ChefHat,
  Smartphone,
  Package,
  Warehouse,
  ArrowRightLeft,
  CalendarClock,
  Printer,
  SlidersHorizontal,
  ShoppingCart,
  Truck,
  CreditCard,
  Wallet,
  BookOpen,
  Building,
  Tags,
  Receipt,
  PiggyBank,
  Users,
  Briefcase,
  Clock,
  Calendar,
  DollarSign,
  Factory,
  Boxes,
  Layers,
  Activity,
  Globe,
  Palette,
  ShieldCheck,
  Send,
  Megaphone,
  Award,
  Ticket,
  HeadphonesIcon,
  Bot,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Network,
  Download,
  Key,
  Database,
  Shield,
  Trash2,
  Lock,
  LucideIcon
} from 'lucide-react';

export interface DisplayFeature {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  icon: LucideIcon;
  isHighlight?: boolean;
}

/** Comprehensive dictionary of verified features */
export const FEATURE_DISPLAY_MAP: Record<string, DisplayFeature> = {
  // Sales & POS Terminal
  'pos.terminal': {
    id: 'pos.terminal',
    name: 'Standard POS Terminal',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'High-speed barcode checkout, cart discounts, customer selection, split payment & thermal receipts.',
    icon: ShoppingBag,
    isHighlight: true,
  },
  'pos.quick_sale': {
    id: 'pos.quick_sale',
    name: 'Quick Sale Register',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'Rapid keypad checkout for fast-moving items, quick tender, and instant cashbox balancing.',
    icon: Zap,
    isHighlight: true,
  },
  'pos.returns': {
    id: 'pos.returns',
    name: 'Sales Returns & Store Credit',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'Full or partial invoice returns with restock algorithms, store credit vouchers, and tax adjustments.',
    icon: RotateCcw,
    isHighlight: false,
  },
  'pos.quotations': {
    id: 'pos.quotations',
    name: 'Quotations & Estimates',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'Generate, print, and convert price quotations into completed sales invoices with 1 click.',
    icon: FileText,
    isHighlight: false,
  },
  'pos.kitchen_display': {
    id: 'pos.kitchen_display',
    name: 'Kitchen Display System (KDS)',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'Live order ticketing display for restaurants, cloud kitchens, and cafes with station routing.',
    icon: ChefHat,
    isHighlight: false,
  },
  'pos.serial_tracking': {
    id: 'pos.serial_tracking',
    name: 'IMEI & Serial Number Tracking',
    category: 'pos',
    categoryLabel: 'Sales & POS',
    description: 'Record serial and IMEI units from vendor purchase to sales receipt with warranty tracking.',
    icon: Smartphone,
    isHighlight: true,
  },

  // Inventory & Warehousing
  'inventory.catalog': {
    id: 'inventory.catalog',
    name: 'Product Catalog & Matrix Variants',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'Unlimited catalog with barcode scanning, color/size matrix variants, brands, and categories.',
    icon: Package,
    isHighlight: true,
  },
  'inventory.multi_warehouse': {
    id: 'inventory.multi_warehouse',
    name: 'Multi-Warehouse & Branches',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'Manage stock across multiple physical warehouses, outlets, and central distribution hubs.',
    icon: Warehouse,
    isHighlight: true,
  },
  'inventory.transfer': {
    id: 'inventory.transfer',
    name: 'Inter-Store Stock Transfers',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'Request, dispatch, and verify stock shipments between branches with in-transit audit logs.',
    icon: ArrowRightLeft,
    isHighlight: false,
  },
  'inventory.fefo_expiry': {
    id: 'inventory.fefo_expiry',
    name: 'FEFO Batch Expiration Tracking',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'First-Expired-First-Out automated selling algorithm with proactive expiration alarms.',
    icon: CalendarClock,
    isHighlight: true,
  },
  'inventory.barcode': {
    id: 'inventory.barcode',
    name: 'Barcode Generation & Labels',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'Generate Code-128 / EAN barcodes and print customized shelf tags and price labels.',
    icon: Printer,
    isHighlight: false,
  },
  'inventory.adjustments': {
    id: 'inventory.adjustments',
    name: 'Stock Audits & Adjustments',
    category: 'inventory',
    categoryLabel: 'Inventory & Stock',
    description: 'Physical inventory cycle counts, damaged write-offs, and discrepancy reconciliations.',
    icon: SlidersHorizontal,
    isHighlight: false,
  },

  // Purchases & Suppliers
  'purchases.orders': {
    id: 'purchases.orders',
    name: 'Purchase Orders & Supplier Bills',
    category: 'purchases',
    categoryLabel: 'Purchases & Vendors',
    description: 'Issue formal purchase orders, receive vendor bills, calculate landed cost, and auto-bump stock.',
    icon: ShoppingCart,
    isHighlight: true,
  },
  'purchases.suppliers': {
    id: 'purchases.suppliers',
    name: 'Supplier Directory & Payable Ledger',
    category: 'purchases',
    categoryLabel: 'Purchases & Vendors',
    description: 'Supplier profiles, contact records, payment terms, and consolidated accounts payable history.',
    icon: Truck,
    isHighlight: false,
  },
  'purchases.returns': {
    id: 'purchases.returns',
    name: 'Purchase Returns (Debit Notes)',
    category: 'purchases',
    categoryLabel: 'Purchases & Vendors',
    description: 'Return defective stock to suppliers with automated debit note generation and ledger debiting.',
    icon: RotateCcw,
    isHighlight: false,
  },
  'purchases.allocations': {
    id: 'purchases.allocations',
    name: 'Supplier Payment Allocations',
    category: 'purchases',
    categoryLabel: 'Purchases & Vendors',
    description: 'Match bank transfers or cash disbursements against specific purchase bills with discount reconciliation.',
    icon: CreditCard,
    isHighlight: false,
  },

  // Accounts & Finance
  'finance.cashbox': {
    id: 'finance.cashbox',
    name: 'Cashbox & Mobile Wallets',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Track daily register shifts, physical cash drawer totals, bKash, Nagad, and bank balances.',
    icon: Wallet,
    isHighlight: true,
  },
  'finance.double_entry': {
    id: 'finance.double_entry',
    name: 'Double-Entry General Ledger',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Automated journal entry postings for every sale, purchase, expense, return, and payment.',
    icon: BookOpen,
    isHighlight: true,
  },
  'finance.bank_reconciliation': {
    id: 'finance.bank_reconciliation',
    name: 'Bank Statement Reconciliation',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Reconcile bank statements against ERP transaction records with fuzzy match audits.',
    icon: Building,
    isHighlight: false,
  },
  'finance.installments': {
    id: 'finance.installments',
    name: 'Customer Due Ledgers & Installments',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Track credit sales, partial down-payments, installment repayment schedules, and due aging.',
    icon: Tags,
    isHighlight: true,
  },
  'finance.vat_reports': {
    id: 'finance.vat_reports',
    name: 'Automated VAT Reports (Mushak 9.1)',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Compliant output and input VAT calculations net of customer returns for tax filings.',
    icon: Receipt,
    isHighlight: true,
  },
  'finance.expense_budgets': {
    id: 'finance.expense_budgets',
    name: 'Expense Ledgers & Cost Centers',
    category: 'finance',
    categoryLabel: 'Accounts & Finance',
    description: 'Track store rent, utility bills, staff lunches, and miscellaneous operational costs.',
    icon: PiggyBank,
    isHighlight: false,
  },

  // HRM & Staff
  'hrm.employees': {
    id: 'hrm.employees',
    name: 'Staff Profiles & Granular Roles',
    category: 'hrm',
    categoryLabel: 'HRM & Staff',
    description: 'Staff directory with preconfigured role templates (Cashier, Stock Manager, Manager, Accountant).',
    icon: Users,
    isHighlight: true,
  },
  'hrm.structure': {
    id: 'hrm.structure',
    name: 'Departments & Designations',
    category: 'hrm',
    categoryLabel: 'HRM & Staff',
    description: 'Define organizational hierarchy, job designations, branch assignments, and reporting lines.',
    icon: Briefcase,
    isHighlight: false,
  },
  'hrm.shifts_attendance': {
    id: 'hrm.shifts_attendance',
    name: 'Work Shifts & Daily Attendance',
    category: 'hrm',
    categoryLabel: 'HRM & Staff',
    description: 'Configure shift rosters, grace periods, attendance check-ins, and overtime logging.',
    icon: Clock,
    isHighlight: false,
  },
  'hrm.leave': {
    id: 'hrm.leave',
    name: 'Leave Management & Approvals',
    category: 'hrm',
    categoryLabel: 'HRM & Staff',
    description: 'Annual, casual, and medical leave quotas with in-app employee applications and manager approvals.',
    icon: Calendar,
    isHighlight: false,
  },
  'hrm.payroll': {
    id: 'hrm.payroll',
    name: 'Automated Payroll & Payslips',
    category: 'hrm',
    categoryLabel: 'HRM & Staff',
    description: 'Compute monthly salary sheets, overtime bonuses, deductions, and print formal payslips.',
    icon: DollarSign,
    isHighlight: true,
  },

  // Manufacturing & MRP
  'manufacturing.bom': {
    id: 'manufacturing.bom',
    name: 'Bill of Materials (BOM Explosion)',
    category: 'manufacturing',
    categoryLabel: 'Manufacturing & Production',
    description: 'Recipe formulas for finished goods with ingredient quantities, wastage yield, and estimated unit cost.',
    icon: Factory,
    isHighlight: true,
  },
  'manufacturing.batches': {
    id: 'manufacturing.batches',
    name: 'Production Orders & Batches',
    category: 'manufacturing',
    categoryLabel: 'Manufacturing & Production',
    description: 'Launch work orders, consume raw materials, produce finished batches, and track unit variances.',
    icon: Boxes,
    isHighlight: true,
  },
  'manufacturing.reservations': {
    id: 'manufacturing.reservations',
    name: 'Raw Material Reservations',
    category: 'manufacturing',
    categoryLabel: 'Manufacturing & Production',
    description: 'Reserve inventory for scheduled production runs to prevent counter stockouts.',
    icon: Layers,
    isHighlight: false,
  },
  'manufacturing.capacity_costing': {
    id: 'manufacturing.capacity_costing',
    name: 'Capacity Planning & Labor Costing',
    category: 'manufacturing',
    categoryLabel: 'Manufacturing & Production',
    description: 'Track machine center runtimes, direct labor hours, and production variance audits.',
    icon: Activity,
    isHighlight: false,
  },

  // E-Commerce Storefront
  'ecommerce.storefront': {
    id: 'ecommerce.storefront',
    name: 'Online E-Commerce Storefront',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce Storefront',
    description: 'Customer-facing web shop powered by real-time inventory from your physical stores.',
    icon: Globe,
    isHighlight: true,
  },
  'ecommerce.themes': {
    id: 'ecommerce.themes',
    name: 'Custom Themes & Branding',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce Storefront',
    description: 'Custom logo, brand colors, promotional hero carousels, and responsive mobile shop theme.',
    icon: Palette,
    isHighlight: false,
  },
  'ecommerce.gateways': {
    id: 'ecommerce.gateways',
    name: 'Digital Payment Gateways',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce Storefront',
    description: 'Accept customer online payments via bKash, Nagad, Rocket, credit cards, and cash on delivery.',
    icon: ShieldCheck,
    isHighlight: false,
  },
  'ecommerce.order_fulfillment': {
    id: 'ecommerce.order_fulfillment',
    name: 'Courier Booking (Pathao / Steadfast)',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce Storefront',
    description: 'Online orders appear on your POS desk; generate courier consignments and tracking slips instantly.',
    icon: Send,
    isHighlight: true,
  },

  // CRM & Marketing
  'crm.customers': {
    id: 'crm.customers',
    name: 'Customer Profiles & Ledgers',
    category: 'crm',
    categoryLabel: 'CRM & Marketing',
    description: 'Customer purchase histories, contact cards, outstanding due ledgers, and credit limits.',
    icon: Users,
    isHighlight: true,
  },
  'crm.loyalty': {
    id: 'crm.loyalty',
    name: 'Loyalty Points & VIP Tiers',
    category: 'crm',
    categoryLabel: 'CRM & Marketing',
    description: 'Earn points per purchase, configure membership tiers (Silver/Gold/VIP), and redeem at checkout.',
    icon: Award,
    isHighlight: false,
  },
  'crm.sms_marketing': {
    id: 'crm.sms_marketing',
    name: 'SMS Gateway & Marketing Campaigns',
    category: 'crm',
    categoryLabel: 'CRM & Marketing',
    description: 'Send automated invoice SMS, due payment reminders, and broadcast promotional campaigns.',
    icon: Megaphone,
    isHighlight: true,
  },
  'crm.coupons': {
    id: 'crm.coupons',
    name: 'Promo Coupons & Gift Vouchers',
    category: 'crm',
    categoryLabel: 'CRM & Marketing',
    description: 'Create promotional discount codes with expiration dates, min-spend limits, and usage caps.',
    icon: Ticket,
    isHighlight: false,
  },

  // Support & AI Assistant
  'support.ai_assistant': {
    id: 'support.ai_assistant',
    name: 'Bizora ERP Assistant (Context-Aware)',
    category: 'support',
    categoryLabel: 'Support & AI',
    description: 'Natural language business queries: ask for today\'s profit, low stock alarms, or top customer balances in English or Bangla.',
    icon: Bot,
    isHighlight: true,
  },
  'support.tickets': {
    id: 'support.tickets',
    name: 'Helpdesk & Support Tickets',
    category: 'support',
    categoryLabel: 'Support & AI',
    description: 'In-app technical support ticketing with priority SLA tracking and prompt resolutions.',
    icon: HeadphonesIcon,
    isHighlight: false,
  },
  'support.chat': {
    id: 'support.chat',
    name: 'Internal Team Announcements',
    category: 'support',
    categoryLabel: 'Support & AI',
    description: 'Broadcast urgent announcements and price alerts across staff sales counters in real-time.',
    icon: MessageSquare,
    isHighlight: false,
  },

  // Reports & Analytics
  'reports.financial': {
    id: 'reports.financial',
    name: 'P&L, Cashflow & Financial Statements',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    description: 'Net profit margins, day-close sales digests, balance sheets, and cash flow summaries.',
    icon: BarChart3,
    isHighlight: true,
  },
  'reports.advanced': {
    id: 'reports.advanced',
    name: 'Sales Heatmaps & Velocity Analytics',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    description: 'Peak shopping hours, item velocity, cashier performance rankings, and customer retention metrics.',
    icon: TrendingUp,
    isHighlight: false,
  },
  'reports.consolidation': {
    id: 'reports.consolidation',
    name: 'Multi-Branch Consolidated Reports',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    description: 'Combine sales, inventory valuations, and net revenues across all stores into 1 executive report.',
    icon: Network,
    isHighlight: true,
  },
  'reports.export': {
    id: 'reports.export',
    name: 'Excel, PDF & CSV Data Exports',
    category: 'reports',
    categoryLabel: 'Reports & Analytics',
    description: 'One-click exports of all ledgers, transactions, inventories, and tax reports.',
    icon: Download,
    isHighlight: false,
  },

  // System, Enterprise & Security
  'system.api': {
    id: 'system.api',
    name: 'REST API Keys & Real-Time Webhooks',
    category: 'system',
    categoryLabel: 'Enterprise & Security',
    description: 'Secure API keys and automated outbound webhooks for accounting, ERP, or custom software sync.',
    icon: Key,
    isHighlight: true,
  },
  'system.auto_backups': {
    id: 'system.auto_backups',
    name: 'Automated Encrypted Backups',
    category: 'system',
    categoryLabel: 'Enterprise & Security',
    description: 'Daily automated cloud snapshots with point-in-time encrypted rollback protection.',
    icon: Database,
    isHighlight: true,
  },
  'system.audit_logs': {
    id: 'system.audit_logs',
    name: 'Tamper-Evident Audit Trails',
    category: 'system',
    categoryLabel: 'Enterprise & Security',
    description: 'Immutable record of staff actions, price adjustments, voids, drawer opens, and IP addresses.',
    icon: Shield,
    isHighlight: false,
  },
  'system.recycle_bin': {
    id: 'system.recycle_bin',
    name: 'Recycle Bin & 30-Day Recovery',
    category: 'system',
    categoryLabel: 'Enterprise & Security',
    description: 'Soft-delete safety net enabling 30-day restoration of accidentally deleted records.',
    icon: Trash2,
    isHighlight: false,
  },
  'system.rbac': {
    id: 'system.rbac',
    name: 'Granular Role-Based Permissions',
    category: 'system',
    categoryLabel: 'Enterprise & Security',
    description: 'Custom permission matrix for each staff role to enforce financial and operational boundaries.',
    icon: Lock,
    isHighlight: true,
  },
};

/**
 * Resolves any raw permission key or legacy feature string into a clean DisplayFeature.
 */
export function formatFeatureForDisplay(featureKeyOrString: string): DisplayFeature {
  const raw = String(featureKeyOrString || '').trim();
  const normalizedKey = raw.toLowerCase();

  // 1. Direct dictionary match
  if (FEATURE_DISPLAY_MAP[normalizedKey]) {
    return FEATURE_DISPLAY_MAP[normalizedKey];
  }

  // 2. Lookup by prefix or substring
  const foundKey = Object.keys(FEATURE_DISPLAY_MAP).find(
    (k) => k === normalizedKey || normalizedKey.includes(k) || k.includes(normalizedKey)
  );
  if (foundKey) {
    return FEATURE_DISPLAY_MAP[foundKey];
  }

  // 3. Fallback for custom or legacy names
  // Convert 'pos.quick_sale' -> 'Quick Sale'
  const cleanTitle = raw
    .replace(/^[a-z_]+\./i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: normalizedKey,
    name: cleanTitle || raw,
    category: 'general',
    categoryLabel: 'Features',
    description: 'Integrated business module capability.',
    icon: ShieldCheck,
    isHighlight: false,
  };
}

/**
 * Given a package's list of raw feature strings, resolves them all into DisplayFeature items,
 * separating high-priority highlight features (for the primary compact card) from the full categorized catalog.
 */
export function getPlanFeaturesOverview(featuresList: string[] | undefined | null): {
  highlights: DisplayFeature[];
  allFeatures: DisplayFeature[];
  byCategory: Record<string, { label: string; items: DisplayFeature[] }>;
  totalCount: number;
} {
  if (!Array.isArray(featuresList) || featuresList.length === 0) {
    return {
      highlights: [],
      allFeatures: [],
      byCategory: {},
      totalCount: 0,
    };
  }

  const seenIds = new Set<string>();
  const allFeatures: DisplayFeature[] = [];

  featuresList.forEach((item) => {
    const display = formatFeatureForDisplay(item);
    if (!seenIds.has(display.id)) {
      seenIds.add(display.id);
      allFeatures.push(display);
    }
  });

  // Pick top 4-6 prioritized highlights
  const highlighted = allFeatures.filter((f) => f.isHighlight);
  const remaining = allFeatures.filter((f) => !f.isHighlight);
  const topHighlights = [...highlighted, ...remaining].slice(0, 5);

  // Group by category
  const byCategory: Record<string, { label: string; items: DisplayFeature[] }> = {};
  allFeatures.forEach((f) => {
    if (!byCategory[f.category]) {
      byCategory[f.category] = { label: f.categoryLabel, items: [] };
    }
    byCategory[f.category].items.push(f);
  });

  return {
    highlights: topHighlights,
    allFeatures,
    byCategory,
    totalCount: allFeatures.length,
  };
}

