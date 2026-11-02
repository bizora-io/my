/**
 * Centralized Feature Registry for Bizora SaaS ERP.
 * Source of truth for all module features, package templates, permissions & entitlement guards.
 */

export interface FeatureItem {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultIncludedIn?: ('basic' | 'pro' | 'enterprise')[];
  legacyAliases?: string[];
}

export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: FeatureItem[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'pos',
    name: 'Sales & POS Terminal',
    description: 'Point of sale, fast billing, sales returns, quotations and kitchen orders.',
    icon: 'ShoppingBag',
    features: [
      {
        id: 'pos.terminal',
        name: 'Standard POS Terminal',
        category: 'pos',
        description: 'Complete point of sale register with scanner, cart, discount, tax, split tender & receipts.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['POS Operations', 'POS & Billing', 'Single store POS operations', 'POS'],
      },
      {
        id: 'pos.quick_sale',
        name: 'Quick Sale Workflow',
        category: 'pos',
        description: 'Streamlined quick sale checkout with keypad, manual profit entry, fast tender and cashbox sync.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Quick Sale', 'Fast POS'],
      },
      {
        id: 'pos.returns',
        name: 'Sales Return & Refunds',
        category: 'pos',
        description: 'Process full or partial item returns, store credit refunds, stock re-allocation & invoice matching.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Sales Return', 'Process Returns'],
      },
      {
        id: 'pos.quotations',
        name: 'Quotations & Estimates',
        category: 'pos',
        description: 'Create, print and convert price quotations into completed sales invoices.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Quotations'],
      },
      {
        id: 'pos.kitchen_display',
        name: 'Kitchen Display (KOT)',
        category: 'pos',
        description: 'Live kitchen order ticketing display for restaurants, food courts and cafes.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Kitchen Display', 'KOT'],
      },
      {
        id: 'pos.serial_tracking',
        name: 'IMEI & Serial Number Tracking',
        category: 'pos',
        description: 'Track warranty, IMEI and unique serial numbers on sales receipts and returns.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Serial Number Tracking', 'IMEI Tracking'],
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory & Warehouses',
    description: 'Stock management, multi-warehouse, batch expiry (FEFO) and barcode operations.',
    icon: 'Package',
    features: [
      {
        id: 'inventory.catalog',
        name: 'Product Catalog & Variants',
        category: 'inventory',
        description: 'Manage unlimited products, categories, brands, variants, units and pricing.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Product Catalog', 'Stock & Inventory'],
      },
      {
        id: 'inventory.multi_warehouse',
        name: 'Multi-Warehouse & Stores',
        category: 'inventory',
        description: 'Manage stock across multiple physical warehouses, outlets and branches.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Unlimited Stores', 'Multi-Warehouse', 'Multiple Stores'],
      },
      {
        id: 'inventory.transfer',
        name: 'Inter-Store Stock Transfers',
        category: 'inventory',
        description: 'Create transfer requests, in-transit dispatch, receiving verification and stock movements.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Product Transfer', 'Stock Transfers'],
      },
      {
        id: 'inventory.fefo_expiry',
        name: 'FEFO & Batch Expiry Tracking',
        category: 'inventory',
        description: 'First-Expired-First-Out automated stock allocation, batch numbers and expiration alarms.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['FEFO Expiry', 'Batch Tracking'],
      },
      {
        id: 'inventory.barcode',
        name: 'Barcode Generation & Label Printing',
        category: 'inventory',
        description: 'Generate Code-128 / EAN barcodes and print customized product shelf & price labels.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Barcode Labels', 'Barcode Generator'],
      },
      {
        id: 'inventory.adjustments',
        name: 'Stock Audits & Adjustments',
        category: 'inventory',
        description: 'Stock take counts, damage write-offs, variance logs and discrepancy reconciliations.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Stock Take', 'Stock Adjustment'],
      },
    ],
  },
  {
    id: 'purchases',
    name: 'Purchases & Vendors',
    description: 'Supplier directory, purchase orders, purchase returns and vendor credit management.',
    icon: 'ShoppingCart',
    features: [
      {
        id: 'purchases.orders',
        name: 'Purchase Orders & Invoices',
        category: 'purchases',
        description: 'Create POs, record incoming supplier bills, calculate landing costs and update stock.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Purchase Orders', 'Purchase Management'],
      },
      {
        id: 'purchases.suppliers',
        name: 'Supplier Directory & Ledger',
        category: 'purchases',
        description: 'Comprehensive supplier profiles, payable ledgers, purchase history and contact cards.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Supplier Management', 'Vendor Directory'],
      },
      {
        id: 'purchases.returns',
        name: 'Purchase Returns (Debit Notes)',
        category: 'purchases',
        description: 'Return damaged or surplus items to suppliers with auto debit notes and ledger reversal.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Purchase Returns', 'Debit Notes'],
      },
      {
        id: 'purchases.allocations',
        name: 'Supplier Payment Allocations',
        category: 'purchases',
        description: 'Match payments to specific supplier invoices, track credit limits and discounts received.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Supplier Payment Allocation'],
      },
    ],
  },
  {
    id: 'finance',
    name: 'Accounts & Finance',
    description: 'Double-entry general ledger, multi-account cashboxes, bank reconciliation and VAT.',
    icon: 'Wallet',
    features: [
      {
        id: 'finance.cashbox',
        name: 'Multi-Account & Cashbox',
        category: 'finance',
        description: 'Petty cashbox, bank accounts, bKash/Nagad mobile wallets and inter-account transfers.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Accounts & Cash', 'Cashbox Management'],
      },
      {
        id: 'finance.double_entry',
        name: 'Double-Entry General Ledger',
        category: 'finance',
        description: 'Automated double-entry posting of sales, purchases, returns, expenses and assets.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Accounts & Ledgers', 'General Ledger', 'Double Entry'],
      },
      {
        id: 'finance.bank_reconciliation',
        name: 'Bank Statement Reconciliation',
        category: 'finance',
        description: 'Reconcile bank statements against book transactions with fuzzy matching and variance logs.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Bank Reconciliation', 'Bank Reconcile'],
      },
      {
        id: 'finance.installments',
        name: 'Installments & Due Tracking',
        category: 'finance',
        description: 'Customer credit limits, installment payment schedules, overdue aging and due ledgers.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Due Ledger', 'Installments'],
      },
      {
        id: 'finance.vat_reports',
        name: 'VAT & Tax Filings (Mushak 9.1)',
        category: 'finance',
        description: 'Input/output VAT calculations, automated tax deductions, and exportable VAT returns.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Automated Tax Reports', 'Automated Tax Filings & GST', 'VAT Returns'],
      },
      {
        id: 'finance.expense_budgets',
        name: 'Expense Budgets & Categories',
        category: 'finance',
        description: 'Monthly department expenditure budgets, alert thresholds and expense ledger entries.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Expense Ledger', 'Expense Budgets'],
      },
    ],
  },
  {
    id: 'hrm',
    name: 'HRM & Employee Management',
    description: 'Staff directory, designations, attendance shifts, leave balances and payroll runs.',
    icon: 'Users',
    features: [
      {
        id: 'hrm.employees',
        name: 'Employee Directory & Roles',
        category: 'hrm',
        description: 'Store employee records, emergency contacts, branch assignments and system credentials.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Employee Management', 'HR & Employees', 'Manage Staff'],
      },
      {
        id: 'hrm.structure',
        name: 'Departments & Designations',
        category: 'hrm',
        description: 'Define organizational hierarchy, job titles, department allocations and reporting lines.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['HR Structure', 'Departments'],
      },
      {
        id: 'hrm.shifts_attendance',
        name: 'Work Shifts & Attendance Tracking',
        category: 'hrm',
        description: 'Configure daily shifts, grace times, attendance logging and overtime calculations.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Attendance Tracking', 'Shifts'],
      },
      {
        id: 'hrm.leave',
        name: 'Leave Management & Balances',
        category: 'hrm',
        description: 'Annual/sick/casual leave quota tracking, employee leave applications and supervisor approvals.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Leave Management', 'Leave Balance'],
      },
      {
        id: 'hrm.payroll',
        name: 'Payroll Processing & Payslips',
        category: 'hrm',
        description: 'Automated salary sheet calculations, deductions, allowances, bonuses and printable payslips.',
        defaultIncludedIn: ['enterprise'],
        legacyAliases: ['Payroll Processing', 'Payroll'],
      },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & MRP',
    description: 'Bill of Materials, batch production orders, material reservations and cost variance.',
    icon: 'Factory',
    features: [
      {
        id: 'manufacturing.bom',
        name: 'Bill of Materials (BOM Explosion)',
        category: 'manufacturing',
        description: 'Multi-level recipe and raw material bill of materials with yield percentages and phantom assemblies.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Manufacturing / MRP', 'Bill of Materials', 'BOM'],
      },
      {
        id: 'manufacturing.batches',
        name: 'Production Orders & Batches',
        category: 'manufacturing',
        description: 'Launch production runs, consume raw materials, convert to finished goods and track wastage.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Production', 'Manufacturing Batches'],
      },
      {
        id: 'manufacturing.reservations',
        name: 'Raw Material Reservations',
        category: 'manufacturing',
        description: 'Auto-reserve inventory for planned work orders to prevent sales stockouts.',
        defaultIncludedIn: ['enterprise'],
        legacyAliases: ['Material Reservations'],
      },
      {
        id: 'manufacturing.capacity_costing',
        name: 'Capacity Planning & Cost Variance',
        category: 'manufacturing',
        description: 'Work center labor hours, machine availability schedules, standard vs actual cost variance.',
        defaultIncludedIn: ['enterprise'],
        legacyAliases: ['Capacity Planning', 'Cost Variance'],
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce & Online Storefront',
    description: 'Public catalog, custom domain, shopping cart, online payments and order sync.',
    icon: 'Globe',
    features: [
      {
        id: 'ecommerce.storefront',
        name: 'Public Online Storefront',
        category: 'ecommerce',
        description: 'Customer-facing web shop powered by real-time inventory from your ERP.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['E-commerce Integration', 'E-commerce Online Shop Integration', 'E-commerce Storefront', 'Online Shop'],
      },
      {
        id: 'ecommerce.themes',
        name: 'Storefront Themes & Branding',
        category: 'ecommerce',
        description: 'Customizable storefront colors, hero banners, logo, contact cards and typography.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Storefront Themes', 'Custom Branding'],
      },
      {
        id: 'ecommerce.gateways',
        name: 'Online Payment Gateways',
        category: 'ecommerce',
        description: 'Accept digital customer payments via bKash, Nagad, Rocket, Stripe, and Cards.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Payment Gateways', 'Online Payments'],
      },
      {
        id: 'ecommerce.order_fulfillment',
        name: 'Web Order Sync & Courier Delivery',
        category: 'ecommerce',
        description: 'Orders flow straight to your POS desk with status updates and courier consignment slips.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Order Fulfillment', 'Order Sync'],
      },
    ],
  },
  {
    id: 'crm',
    name: 'CRM & Marketing Campaigns',
    description: 'Customer loyalty points, promotional coupons, SMS gateway broadcasts and statements.',
    icon: 'Megaphone',
    features: [
      {
        id: 'crm.customers',
        name: 'Customer Profiles & Statements',
        category: 'crm',
        description: 'Customer directories, transaction ledgers, balance statements and contact history.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Customers', 'Customer Management', 'CRM'],
      },
      {
        id: 'crm.loyalty',
        name: 'Loyalty Points & Customer Tiers',
        category: 'crm',
        description: 'Reward points per sale, membership levels (Bronze/Silver/Gold/VIP) and points redemption.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Loyalty Points', 'Customer Tiers'],
      },
      {
        id: 'crm.sms_marketing',
        name: 'SMS Gateway & Marketing Campaigns',
        category: 'crm',
        description: 'Broadcast bulk promotional SMS, greeting messages, and sale notification alerts.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['SMS Gateway Notification System', 'Marketing', 'Communication'],
      },
      {
        id: 'crm.coupons',
        name: 'Discount Coupons & Gift Vouchers',
        category: 'crm',
        description: 'Create promotional promo codes with minimum purchase limits, expiry dates, and usage caps.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Coupons', 'Gift Cards'],
      },
    ],
  },
  {
    id: 'support',
    name: 'Customer Support & AI Chat',
    description: 'In-app AI assistant, SaaS customer support ticketing and team communication.',
    icon: 'HeadphonesIcon',
    features: [
      {
        id: 'support.ai_assistant',
        name: 'Bizora ERP Assistant & Live Insights',
        category: 'support',
        description: 'Authoritative context-aware assistant for natural language sales summaries, reorder alerts, customer dues, and ERP workflows.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['AI Assistant & Smart Analytics', 'AI Chat', 'system.ai_assistant', 'ERP Assistant'],
      },
      {
        id: 'support.tickets',
        name: 'Customer & SaaS Support Tickets',
        category: 'support',
        description: 'Submit technical help requests directly to the platform team with real-time updates.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Email support', 'Priority support', 'Support System', 'Customer Support'],
      },
      {
        id: 'support.chat',
        name: 'Real-time Team Communication',
        category: 'support',
        description: 'Internal announcements and instant team notifications across sales desks.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Team Communication'],
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Financial profit & loss, inventory valuation, trend analytics and export suites.',
    icon: 'BarChart2',
    features: [
      {
        id: 'reports.financial',
        name: 'P&L, Cashflow & Financial Reports',
        category: 'reports',
        description: 'Net profit margins, day close summary, daily cash flow statements and balance sheets.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Basic reports', 'Basic sales reports', 'Analytics & Reports', 'Reports & Tax'],
      },
      {
        id: 'reports.advanced',
        name: 'Advanced Analytics & Sales Heatmaps',
        category: 'reports',
        description: 'Customer churn rate, item velocity, peak shopping hours, and cashier performance audits.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Advanced reports', 'Advanced Analytics', 'Business Intelligence'],
      },
      {
        id: 'reports.consolidation',
        name: 'Multi-Branch Consolidation Reports',
        category: 'reports',
        description: 'Cross-store consolidated sales, central inventory valuation and company-wide summaries.',
        defaultIncludedIn: ['enterprise'],
        legacyAliases: ['Consolidation', 'Multi-Branch Sync'],
      },
      {
        id: 'reports.export',
        name: 'Data Export (Excel, PDF & CSV)',
        category: 'reports',
        description: 'One-click exports of all ledgers, products, customers and audit reports.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Data Export', 'Export Reports'],
      },
    ],
  },
  {
    id: 'system',
    name: 'System, Enterprise & Security',
    description: 'API keys, webhooks, automated cloud backups, audit logs and role security.',
    icon: 'Shield',
    features: [
      {
        id: 'system.api',
        name: 'Developer API & Webhooks',
        category: 'system',
        description: 'REST API keys and real-time outbound webhooks for custom integrations and 3rd party apps.',
        defaultIncludedIn: ['enterprise'],
        legacyAliases: ['Custom API & Webhooks', 'Developer API Keys & Webhooks', 'API'],
      },
      {
        id: 'system.auto_backups',
        name: 'Automated Database Backups',
        category: 'system',
        description: 'Encrypted daily automatic snapshots with point-in-time restore protection.',
        defaultIncludedIn: ['pro', 'enterprise'],
        legacyAliases: ['Automated Backups', 'Auto Backup'],
      },
      {
        id: 'system.audit_logs',
        name: 'Audit Trail & Action Logs',
        category: 'system',
        description: 'Detailed activity ledger of who made changes, price modifications, voids and login IPs.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Audit Logs', 'Activity Logs'],
      },
      {
        id: 'system.recycle_bin',
        name: 'Recycle Bin & Data Recovery',
        category: 'system',
        description: 'Soft-delete protection allowing 30-day recovery of mistakenly deleted records.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Recycle Bin'],
      },
      {
        id: 'system.rbac',
        name: 'Custom Roles & Granular Permissions',
        category: 'system',
        description: 'Custom security permission matrix per cashier, store manager, accountant and auditor.',
        defaultIncludedIn: ['basic', 'pro', 'enterprise'],
        legacyAliases: ['Access Control', 'RBAC'],
      },
    ],
  },
];

/** Flattened array of all application features */
export const ALL_FEATURES: FeatureItem[] = FEATURE_CATEGORIES.flatMap((c) => c.features);

/** Alias for FEATURE_CATEGORIES */
export const FEATURE_CATALOG = FEATURE_CATEGORIES;

/** Total count of all features in registry */
export const TOTAL_FEATURES_COUNT = ALL_FEATURES.length;

/** Lookup feature by ID */
export function getFeatureById(id: string): FeatureItem | undefined {
  const norm = String(id || '').trim().toLowerCase();
  return ALL_FEATURES.find(
    (f) =>
      f.id.toLowerCase() === norm ||
      f.name.toLowerCase() === norm ||
      f.legacyAliases?.some((a) => a.toLowerCase() === norm)
  );
}

/** Get list of features by category */
export function getFeaturesByCategory(categoryId: string): FeatureItem[] {
  const cat = FEATURE_CATEGORIES.find((c) => c.id.toLowerCase() === categoryId.toLowerCase());
  return cat ? cat.features : [];
}

/** Get default recommended feature IDs for a plan tier */
export function getRecommendedFeaturesForPlan(tier: 'basic' | 'pro' | 'enterprise' = 'pro'): string[] {
  return ALL_FEATURES.filter((f) => f.defaultIncludedIn?.includes(tier)).map((f) => f.id);
}

/**
 * Universal feature check that checks:
 * 1. Wildcard access ('*' or 'all')
 * 2. Exact feature ID (e.g. 'pos.quick_sale')
 * 3. Module/Category prefix (e.g. if 'pos' or 'inventory' is enabled, grants all pos/inventory features)
 * 4. Human-readable name (e.g. 'Quick Sale Workflow')
 * 5. Legacy aliases (e.g. 'Unlimited Stores', 'Employee Management', etc.)
 */
export function isFeatureEnabled(
  featureKeyOrAlias: string,
  userFeatures: string[] | undefined | null,
  userModules?: string[] | null
): boolean {
  if (!featureKeyOrAlias) return true;
  if (!userFeatures && !userModules) return false;

  const target = String(featureKeyOrAlias).trim().toLowerCase();
  const featuresList = Array.isArray(userFeatures) ? userFeatures.map((f) => String(f).trim().toLowerCase()) : [];
  const modulesList = Array.isArray(userModules) ? userModules.map((m) => String(m).trim().toLowerCase()) : [];

  // 1. Superuser / Full access flags
  if (featuresList.includes('*') || featuresList.includes('all')) return true;
  if (modulesList.includes('*') || modulesList.includes('all')) return true;

  // 2. Direct string match in features list
  if (featuresList.includes(target)) return true;

  // 3. Module check (e.g. if user has 'pos' module enabled, target starting with 'pos.' matches)
  const [prefix] = target.split('.');
  if (prefix && (modulesList.includes(prefix) || featuresList.includes(prefix))) return true;

  // 4. Resolve against registry for aliases and normalized IDs
  const regItem = getFeatureById(target);
  if (regItem) {
    // Check if ID is in list
    if (featuresList.includes(regItem.id.toLowerCase())) return true;
    // Check if Category is in modules or features list
    if (modulesList.includes(regItem.category.toLowerCase()) || featuresList.includes(regItem.category.toLowerCase())) return true;
    // Check if Display Name is in features list
    if (featuresList.includes(regItem.name.toLowerCase())) return true;
    // Check if any legacy aliases are in features list
    if (regItem.legacyAliases?.some((a) => featuresList.includes(a.toLowerCase()))) return true;
  }

  // 5. Reverse check: if userFeatures contains an alias or name that maps to this target
  for (const f of featuresList) {
    const matched = getFeatureById(f);
    if (matched && matched.id.toLowerCase() === target) return true;
  }

  return false;
}

