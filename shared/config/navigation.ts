/**
 * Bizora ERP — Canonical Navigation Architecture & Single Source of Truth
 *
 * Defines all navigation groups, items, routes, permissions, role rules,
 * breadcrumbs, and page metadata for Desktop Sidebar, Top Navigation Bar,
 * and Mobile Navigation Drawer.
 */

export interface NavItemConfig {
  id: string;
  to: string;
  label: string;
  labelBn: string;
  iconName: string;
  permission?: string;
  requiredFeature?: string;
  businessType?: string; // e.g. 'restaurant'
  badge?: string;
  badgeColor?: string;
  description: string;
  descriptionBn: string;
  keywords: string[];
  isLocked?: boolean;
}

export interface NavGroupConfig {
  id: string;
  title: string;
  titleBn: string;
  iconName: string;
  items: NavItemConfig[];
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * All ERP functional domains organized into logical, structured groups.
 */
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'grp-overview',
    title: 'Workspace',
    titleBn: 'ওয়ার্কস্পেস',
    iconName: 'LayoutDashboard',
    items: [
      {
        id: 'nav-home',
        to: '/',
        label: 'Dashboard',
        labelBn: 'ড্যাশবোর্ড',
        iconName: 'LayoutDashboard',
        description: 'Real-time sales, cashflow, stock alerts & quick actions',
        descriptionBn: 'লাইভ বিক্রয়, ক্যাশফ্লো, স্টক অ্যালার্ট ও অ্যাকশন',
        keywords: ['home', 'dashboard', 'overview', 'kpi', 'summary', 'analytics']
      },
      {
        id: 'nav-notifications',
        to: '/notifications',
        label: 'Notifications',
        labelBn: 'নোটিফিকেশন',
        iconName: 'Bell',
        description: 'Real-time activity alerts, low-stock warnings & broadcast updates',
        descriptionBn: 'সকল নোটিফিকেশন, স্টক অ্যালার্ট ও সিস্টেম বার্তা',
        keywords: ['notifications', 'alerts', 'announcements', 'messages', 'updates', 'inbox']
      }
    ]
  },
  {
    id: 'grp-sales',
    title: 'Sales & POS',
    titleBn: 'বিক্রয় ও পিওএস',
    iconName: 'ShoppingBag',
    items: [
      {
        id: 'nav-sale',
        to: '/sale',
        label: 'Sell / POS',
        labelBn: 'বিক্রয় (পিওএস)',
        iconName: 'ShoppingBag',
        permission: 'pos.sell',
        description: 'Complete POS register with barcode scanner and split tenders',
        descriptionBn: 'বারকোড স্ক্যানার ও মাল্টি-পেমেন্ট সহ পূর্ণাঙ্গ পিওএস',
        keywords: ['sell', 'pos', 'checkout', 'invoice', 'billing', 'cashier', 'receipt']
      },
      {
        id: 'nav-quick-sale',
        to: '/quick-sale',
        label: 'Quick Sale',
        labelBn: 'দ্রুত বিক্রয়',
        iconName: 'Zap',
        permission: 'pos.quick_sale',
        badge: 'Fast',
        badgeColor: 'bg-amber-100 text-amber-800',
        description: 'Fast walk-in cash counter with rapid keypad checkout',
        descriptionBn: 'দ্রুত ওয়াক-ইন গ্রাহক ক্যাশ কাউন্টার',
        keywords: ['quick', 'fast', 'express', 'cash sale', 'walk-in']
      },
      {
        id: 'nav-sales-return',
        to: '/sales-return',
        label: 'Sales Return',
        labelBn: 'বিক্রয় ফেরত',
        iconName: 'RotateCcw',
        permission: 'pos.returns',
        description: 'Process customer returns, stock replenishment & refunds',
        descriptionBn: 'গ্রাহকের পণ্য ফেরত, স্টক সমন্বয় ও রিফান্ড',
        keywords: ['return', 'refund', 'credit note', 'exchange', 'damage return']
      },
      {
        id: 'nav-quotations',
        to: '/quotations',
        label: 'Quotations',
        labelBn: 'কোটেশন',
        iconName: 'FileText',
        permission: 'pos.sell',
        description: 'Create estimates, proforma invoices & convert to sale',
        descriptionBn: 'প্রস্তাবনা, কোটেশন তৈরি ও সরাসরি চালানে রূপান্তর',
        keywords: ['quotation', 'estimate', 'proforma', 'proposal', 'quote']
      },
      {
        id: 'nav-kitchen',
        to: '/kitchen',
        label: 'Kitchen Display',
        labelBn: 'কিচেন ডিসপ্লে',
        iconName: 'ChefHat',
        permission: 'pos.sell',
        businessType: 'restaurant',
        badge: 'KOT',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        description: 'Live kitchen order tickets for restaurants and cafes',
        descriptionBn: 'রেস্তোরাঁর লাইভ কিচেন অর্ডার টিকিট (KOT)',
        keywords: ['kitchen', 'restaurant', 'kot', 'orders', 'chef', 'food']
      }
    ]
  },
  {
    id: 'grp-inventory',
    title: 'Inventory & Stock',
    titleBn: 'মজুদ ও ক্রয়',
    iconName: 'Package',
    items: [
      {
        id: 'nav-purchase',
        to: '/purchase',
        label: 'Buy / Purchase',
        labelBn: 'পণ্য ক্রয়',
        iconName: 'ShoppingCart',
        permission: 'inventory.purchase',
        description: 'Receive supplier goods, lot batches, serials & payables',
        descriptionBn: 'সরবরাহকারীর থেকে পণ্য ক্রয়, লট নম্বর ও সিরিয়াল যুক্তকরণ',
        keywords: ['buy', 'purchase', 'receive', 'supplier bill', 'procure']
      },
      {
        id: 'nav-purchase-return',
        to: '/purchase-return',
        label: 'Purchase Return',
        labelBn: 'ক্রয় ফেরত',
        iconName: 'RotateCcw',
        permission: 'pos.returns',
        description: 'Return defective or excess goods to suppliers',
        descriptionBn: 'সাপ্লায়ারকে পণ্য ফেরত ও ডেবিট নোট তৈরি',
        keywords: ['purchase return', 'debit note', 'supplier return', 'reject']
      },
      {
        id: 'nav-purchase-orders',
        to: '/purchase-orders',
        label: 'Purchase Orders',
        labelBn: 'পারচেজ অর্ডার',
        iconName: 'ClipboardList',
        permission: 'inventory.purchase',
        description: 'Draft, approve and dispatch official Purchase Orders',
        descriptionBn: 'অফিসিয়াল পারচেজ অর্ডার তৈরি, অনুমোদন ও প্রেরণ',
        keywords: ['purchase order', 'po', 'requisition', 'procurement order']
      },
      {
        id: 'nav-stock-report',
        to: '/stock',
        label: 'Stock Report',
        labelBn: 'স্টক রিপোর্ট',
        iconName: 'Package',
        permission: 'inventory.view',
        description: 'Live inventory balances, valuations & low-stock alerts',
        descriptionBn: 'বর্তমান স্টক ব্যালেন্স, পণ্যের মূল্যায়ন ও লো-স্টক সতর্কতা',
        keywords: ['stock', 'inventory', 'quantity', 'valuation', 'alert', 'reorder']
      },
      {
        id: 'nav-lots',
        to: '/lots',
        label: 'Lot & FEFO Enquiry',
        labelBn: 'লট ও মেয়াদ ট্র্যাকিং',
        iconName: 'CalendarClock',
        permission: 'inventory.view',
        description: 'Batch-wise expiry monitoring and First-Expire-First-Out',
        descriptionBn: 'মেয়াদোত্তীর্ণের তারিখ ও ব্যাচ অনুযায়ী স্টক ট্র্যাকিং',
        keywords: ['lot', 'batch', 'fefo', 'expiry', 'shelf life', 'fifo']
      },
      {
        id: 'nav-products',
        to: '/products',
        label: 'Product List',
        labelBn: 'পণ্য তালিকা',
        iconName: 'Box',
        permission: 'inventory.view',
        description: 'Master items catalog, barcodes, variants & pricing',
        descriptionBn: 'পণ্য তালিকা, বারকোড, ভ্যারিয়েন্ট ও বিক্রয়মূল্য',
        keywords: ['products', 'items', 'sku', 'barcode', 'variants', 'prices']
      },
      {
        id: 'nav-catalog',
        to: '/catalog',
        label: 'Catalog Master',
        labelBn: 'ক্যাটালগ মাস্টার',
        iconName: 'Tags',
        permission: 'inventory.view',
        badge: 'Enterprise',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        description: 'Hierarchical category, brand & unit taxonomy with product bounds',
        descriptionBn: 'ক্যাটাগরি, ব্র্যান্ড ও পরিমাপের একক ব্যবস্থাপনা',
        keywords: ['catalog', 'category', 'brand', 'unit', 'taxonomy']
      },
      {
        id: 'nav-product-attributes',
        to: '/product-attributes',
        label: 'Categories & Brands',
        labelBn: 'শ্রেণী ও ব্র্যান্ড',
        iconName: 'Grid',
        permission: 'inventory.view',
        description: 'Manage quick categories, subcategories & product tags',
        descriptionBn: 'ক্যাটাগরি, সাব-ক্যাটাগরি ও ব্র্যান্ডের তালিকা',
        keywords: ['categories', 'brands', 'subcategories', 'attributes']
      },
      {
        id: 'nav-wastage',
        to: '/wastage',
        label: 'Wastage & Damage',
        labelBn: 'ক্ষয়ক্ষতি ও বিনষ্ট',
        iconName: 'AlertTriangle',
        permission: 'inventory.adjustment',
        description: 'Record damaged, expired or lost stock with automatic ledger write-off',
        descriptionBn: 'নষ্ট বা মেয়াদোত্তীর্ণ পণ্যের হিসাব ও স্টক কর্তন',
        keywords: ['wastage', 'damage', 'spoilage', 'expired', 'loss', 'write off']
      },
      {
        id: 'nav-transfer',
        to: '/transfer',
        label: 'Product Transfer',
        labelBn: 'পণ্য স্থানান্তর',
        iconName: 'ArrowRightLeft',
        permission: 'inventory.transfer',
        requiredFeature: 'inventory.transfers',
        description: 'Inter-store stock transfers, transit status & branch receipts',
        descriptionBn: 'এক শাখা থেকে অন্য শাখায় পণ্য স্থানান্তর',
        keywords: ['transfer', 'inter-store', 'branch transfer', 'transit', 'dispatch']
      },
      {
        id: 'nav-production',
        to: '/production',
        label: 'Production & BOM',
        labelBn: 'উৎপাদন ও বিওএম',
        iconName: 'Factory',
        permission: 'inventory.production',
        requiredFeature: 'manufacturing',
        badge: 'Mfg',
        badgeColor: 'bg-blue-100 text-blue-800',
        description: 'Bill of Materials, manufacturing batches & raw material conversion',
        descriptionBn: 'কাঁচামাল থেকে প্রক্রিয়াজাত পণ্য উৎপাদন ও বিওএম',
        keywords: ['manufacturing', 'production', 'bom', 'raw materials', 'batch run']
      }
    ]
  },
  {
    id: 'grp-finance',
    title: 'Finance & Accounts',
    titleBn: 'অর্থ ও হিসাব',
    iconName: 'Wallet',
    items: [
      {
        id: 'nav-cashbox',
        to: '/cashbox',
        label: 'Accounts & Cashbox',
        labelBn: 'ক্যাশ ও ব্যাংক হিসাব',
        iconName: 'Wallet',
        permission: 'finance.cashbox',
        description: 'Cash in hand, bank balances, bKash/Nagad accounts & reconciliation',
        descriptionBn: 'নগদ ক্যাশ, ব্যাংক অ্যাকাউন্ট, মোবাইল ব্যাংকিং ও হিসাব সমন্বয়',
        keywords: ['cashbox', 'bank', 'accounts', 'cash in hand', 'bkash', 'nagad', 'reconciliation']
      },
      {
        id: 'nav-bank-reconcile',
        to: '/bank-reconcile',
        label: 'Bank Reconciliation',
        labelBn: 'ব্যাংক সমন্বয়',
        iconName: 'RefreshCw',
        permission: 'finance.cashbox',
        description: 'Upload bank statement CSV, match book transactions & verify balance',
        descriptionBn: 'ব্যাংক স্টেটমেন্ট আপলোড ও স্বয়ংক্রিয় লেনদেন সমন্বয়',
        keywords: ['bank reconciliation', 'reconciliation', 'statement', 'csv match', 'reconcile']
      },
      {
        id: 'nav-sale-ledger',
        to: '/sale-ledger',
        label: 'Sale Ledger',
        labelBn: 'বিক্রয় খতিয়ান',
        iconName: 'FileText',
        permission: 'finance.ledgers',
        description: 'Detailed chronological sales register and invoice journal',
        descriptionBn: 'তারিখভিত্তিক পূর্ণাঙ্গ বিক্রয় রেজিস্টার ও চালান খতিয়ান',
        keywords: ['sale ledger', 'sales register', 'sales journal', 'daily sales']
      },
      {
        id: 'nav-purchase-ledger',
        to: '/purchase-ledger',
        label: 'Purchase Ledger',
        labelBn: 'ক্রয় খতিয়ান',
        iconName: 'ClipboardList',
        permission: 'finance.ledgers',
        description: 'Supplier purchases register and goods receipt records',
        descriptionBn: 'সরবরাহকারীদের থেকে ক্রয়কৃত পণ্যের হিসাব খতিয়ান',
        keywords: ['purchase ledger', 'purchase register', 'bills', 'supplier register']
      },
      {
        id: 'nav-due-ledger',
        to: '/due-ledger',
        label: 'Due Ledger',
        labelBn: 'বকেয়া খতিয়ান',
        iconName: 'BookOpen',
        permission: 'finance.ledgers',
        description: 'Customer receivables, credit limits & due collection register',
        descriptionBn: 'গ্রাহকদের বকেয়া হিসাব, বাকি আদায় ও কালেকশন খতিয়ান',
        keywords: ['due', 'receivables', 'customer due', 'collection', 'credit ledger']
      },
      {
        id: 'nav-installments',
        to: '/installments',
        label: 'Installment Ledger',
        labelBn: 'কিস্তি খতিয়ান',
        iconName: 'CalendarClock',
        permission: 'finance.ledgers',
        description: 'Hire purchase EMI installments, schedules & payment tracking',
        descriptionBn: 'কিস্তিতে বিক্রয়ের মাসিক পেমেন্ট শিডিউল ও আদায়',
        keywords: ['installment', 'emi', 'hire purchase', 'monthly installment']
      },
      {
        id: 'nav-expense-ledger',
        to: '/expense-ledger',
        label: 'Expense Ledger',
        labelBn: 'খরচ খতিয়ান',
        iconName: 'DollarSign',
        permission: 'finance.ledgers',
        description: 'Categorized business expenditures, utility bills & petty cash',
        descriptionBn: 'দোকান ও অফিসের পরিচালন ব্যয়, বিল ও খরচ খতিয়ান',
        keywords: ['expense', 'spending', 'cost', 'utility', 'petty cash', 'overhead']
      },
      {
        id: 'nav-journal',
        to: '/journal',
        label: 'General Journal',
        labelBn: 'জেনারেল জার্নাল',
        iconName: 'BookOpen',
        permission: 'finance.ledgers',
        requiredFeature: 'finance.ledgers',
        description: 'Double-entry debit/credit journal vouchers and balance checks',
        descriptionBn: 'দ্বৈত-দাখিলা ভিত্তিক ডেবিট-ক্রেডিট জার্নাল ভাউচার',
        keywords: ['journal', 'double entry', 'voucher', 'debit', 'credit', 'ledger']
      },
      {
        id: 'nav-loans',
        to: '/loans',
        label: 'Loans & Debt',
        labelBn: 'ঋণ ও দায়',
        iconName: 'Landmark',
        permission: 'finance.accounts',
        badge: 'Enterprise',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        description: 'Bank borrowings, amortization schedules, principal/interest split',
        descriptionBn: 'ব্যাংক লোন ও ঋণ পরিশোধের কিস্তি শিডিউল',
        keywords: ['loan', 'debt', 'borrowing', 'amortization', 'principal', 'interest']
      },
      {
        id: 'nav-pf',
        to: '/pf',
        label: 'Provident Fund',
        labelBn: 'প্রভিডেন্ট ফান্ড',
        iconName: 'PiggyBank',
        permission: 'hr.payroll',
        badge: 'Enterprise',
        badgeColor: 'bg-purple-100 text-purple-800',
        description: 'Employee retirement savings, matching company funds & settlements',
        descriptionBn: 'কর্মীদের প্রভিডেন্ট ফান্ড ও কোম্পানি অনুদান',
        keywords: ['provident fund', 'pf', 'pension', 'gratuity', 'retirement', 'vesting']
      },
      {
        id: 'nav-payments',
        to: '/payments',
        label: 'Online Payments',
        labelBn: 'অনলাইন পেমেন্ট গেটওয়ে',
        iconName: 'CreditCard',
        permission: 'finance.cashbox',
        requiredFeature: 'finance.online_gateways',
        description: 'Configure SSLCommerz, bKash, Shurjopay & digital payment logs',
        descriptionBn: 'অনলাইন পেমেন্ট গেটওয়ে ও স্বয়ংক্রিয় ট্রানজ্যাকশন লগ',
        keywords: ['payments', 'gateway', 'sslcommerz', 'bkash gateway', 'online pay']
      },
      {
        id: 'nav-reports',
        to: '/reports',
        label: 'Financial Reports & Tax',
        labelBn: 'আর্থিক রিপোর্ট ও ট্যাক্স',
        iconName: 'FileSpreadsheet',
        permission: 'reports.view',
        description: 'Profit & Loss, Balance Sheet, Trial Balance & NBR VAT-9.1 return',
        descriptionBn: 'লাভ-ক্ষতি, ব্যালেন্স শিট, ট্রায়াল ব্যালেন্স ও ভ্যাট রিটার্ন রিপোর্ট',
        keywords: ['reports', 'profit loss', 'balance sheet', 'trial balance', 'tax', 'vat']
      },
      {
        id: 'nav-consolidation',
        to: '/consolidation',
        label: 'Consolidation',
        labelBn: 'কনসলিডেশন রিপোর্ট',
        iconName: 'Briefcase',
        permission: 'reports.view',
        requiredFeature: 'reports.consolidated',
        description: 'Multi-branch comparative analytics and aggregated P&L',
        descriptionBn: 'একাধিক শাখার সমন্বিত আর্থিক বিশ্লেষণ',
        keywords: ['consolidation', 'multi branch report', 'aggregate finance']
      }
    ]
  },
  {
    id: 'grp-hr',
    title: 'People & HR',
    titleBn: 'কর্মী ও এইচআর',
    iconName: 'Users',
    items: [
      {
        id: 'nav-employees',
        to: '/employees',
        label: 'Employees & Staff',
        labelBn: 'কর্মচারী ব্যবস্থাপনা',
        iconName: 'Briefcase',
        permission: 'hr.manage',
        requiredFeature: 'hrm',
        description: 'Staff directory, salary processing, attendance & performance',
        descriptionBn: 'কর্মীদের প্রোফাইল, উপস্থিতি, বেতন ও কমিশন হিসাব',
        keywords: ['employees', 'staff', 'salary', 'payroll', 'attendance', 'hr']
      },
      {
        id: 'nav-hr-structure',
        to: '/hr-structure',
        label: 'Departments & Designations',
        labelBn: 'বিভাগ ও পদবী',
        iconName: 'Building',
        permission: 'hr.manage',
        requiredFeature: 'hrm',
        description: 'Organizational hierarchy, departments, grades & designations',
        descriptionBn: 'প্রতিষ্ঠানের বিভাগ, পদবী ও গ্রেড কাঠামো',
        keywords: ['department', 'designation', 'organization', 'hierarchy', 'grades']
      },
      {
        id: 'nav-access',
        to: '/access',
        label: 'Role & Access Control',
        labelBn: 'অনুমতি ও এক্সেস কন্ট্রোল',
        iconName: 'ShieldCheck',
        permission: 'admin.access',
        description: 'Granular permissions, feature locks & role-based security',
        descriptionBn: 'কর্মীদের জন্য পৃথক অনুমতি ও নিরাপত্তা নির্ধারণ',
        keywords: ['access', 'roles', 'permissions', 'rbac', 'security', 'privileges']
      }
    ]
  },
  {
    id: 'grp-operations',
    title: 'Operations & Logistics',
    titleBn: 'অপারেশন ও লজিস্টিকস',
    iconName: 'Truck',
    items: [
      {
        id: 'nav-hotel',
        to: '/hotel',
        label: 'Hotel & Hospitality',
        labelBn: 'হোটেল ও রুম বুকিং',
        iconName: 'Hotel',
        permission: 'pos.sell',
        badge: 'Enterprise',
        badgeColor: 'bg-teal-100 text-teal-800',
        description: 'Room availability matrix, guest check-in, check-out & folio billing',
        descriptionBn: 'রুম বুকিং, চেক-ইন, চেক-আউট ও গেস্ট বিলিং',
        keywords: ['hotel', 'rooms', 'hospitality', 'check-in', 'guest', 'reservation']
      },
      {
        id: 'nav-vehicles',
        to: '/vehicles',
        label: 'Fleet & Vehicles',
        labelBn: 'যানবাহন ও জ্বালানি',
        iconName: 'Truck',
        permission: 'admin.settings',
        badge: 'Enterprise',
        badgeColor: 'bg-cyan-100 text-cyan-800',
        description: 'Fleet tracking, fuel logs, maintenance schedules & auto-ledger expenses',
        descriptionBn: 'গাড়ির লগ, জ্বালানি খরচ ও রক্ষণাবেক্ষণ রেজিস্টার',
        keywords: ['vehicles', 'fleet', 'transport', 'fuel', 'mileage', 'maintenance']
      },
      {
        id: 'nav-visitors',
        to: '/visitors',
        label: 'Visitors & Gatepass',
        labelBn: 'ভিজিটর ও গেটপাস',
        iconName: 'UserCheck',
        permission: 'admin.settings',
        badge: 'Security',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        description: 'Visitor pass registration, badge generation & live premises log',
        descriptionBn: 'ভিজিটর এন্ট্রি, গেটপাস ইস্যু ও নিরাপত্তা নজরদারি',
        keywords: ['visitors', 'gatepass', 'security', 'badges', 'reception', 'guest log']
      },
      {
        id: 'nav-projects',
        to: '/projects',
        label: 'Projects & Tasks',
        labelBn: 'প্রজেক্ট ও টাস্ক',
        iconName: 'FolderGit2',
        permission: 'reports.view',
        badge: 'Enterprise',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        description: 'Project milestone budgets, tasks, progress tracking & burn rate',
        descriptionBn: 'প্রজেক্ট বাজেট, মাইলস্টোন ও টাস্ক প্রগ্রেস ট্র্যাকিং',
        keywords: ['projects', 'tasks', 'milestones', 'progress', 'budget burn']
      },
      {
        id: 'nav-dealers',
        to: '/dealers',
        label: 'Dealer Targets & Quotas',
        labelBn: 'ডিলার টার্গেট ও কমিশন',
        iconName: 'Award',
        permission: 'pos.view_sales',
        badge: 'Quotas',
        badgeColor: 'bg-amber-100 text-amber-800',
        description: 'Monthly dealer sales quotas, live achievement % & tiered commissions',
        descriptionBn: 'ডিলার বিক্রয় লক্ষ্যমাত্রা ও ধাপে ধাপে কমিশন হিসাব',
        keywords: ['dealers', 'targets', 'quotas', 'commission', 'incentives', 'achievement']
      },
      {
        id: 'nav-eprocurement',
        to: '/eprocurement',
        label: 'E-Procurement Tenders',
        labelBn: 'ই-টেন্ডার ও প্রকিউরমেন্ট',
        iconName: 'Briefcase',
        permission: 'inventory.purchase',
        badge: 'QCBS',
        badgeColor: 'bg-blue-100 text-blue-800',
        description: 'RFQ tender publishing, 60/40 weighted bid scoring & award to PO',
        descriptionBn: 'দরপত্র আহ্বান, টেকনিক্যাল-ফাইন্যান্সিয়াল মূল্যায়ন ও পিও তৈরি',
        keywords: ['eprocurement', 'tender', 'rfq', 'bidding', 'vendor selection', 'qcbs']
      },
      {
        id: 'nav-lc',
        to: '/lc',
        label: 'Letters of Credit (LC)',
        labelBn: 'লেটার অব ক্রেডিট (এলসি)',
        iconName: 'Landmark',
        permission: 'finance.accounts',
        badge: 'Trade',
        badgeColor: 'bg-purple-100 text-purple-800',
        description: 'Import/export LC lifecycle, margin liens & customs clearance tracking',
        descriptionBn: 'আমদানি-রপ্তানি এলসি ট্র্যাকিং ও ব্যাংক মার্জিন হিসাব',
        keywords: ['lc', 'letter of credit', 'import', 'export', 'bank margin', 'customs']
      }
    ]
  },
  {
    id: 'grp-crm',
    title: 'CRM & Commerce',
    titleBn: 'গ্রাহক ও অনলাইন শপ',
    iconName: 'Globe',
    items: [
      {
        id: 'nav-customers',
        to: '/customers',
        label: 'Customers Directory',
        labelBn: 'গ্রাহক তালিকা',
        iconName: 'Users',
        permission: 'crm.view',
        description: 'Customer profiles, contact registry, balance & ledger statements',
        descriptionBn: 'গ্রাহকের তথ্য, যোগাযোগ, ব্যালেন্স ও লেনদেন ইতিহাস',
        keywords: ['customers', 'clients', 'crm', 'contacts', 'profiles']
      },
      {
        id: 'nav-suppliers',
        to: '/suppliers',
        label: 'Suppliers Directory',
        labelBn: 'সরবরাহকারী তালিকা',
        iconName: 'Briefcase',
        permission: 'crm.view',
        description: 'Vendor profiles, payables summary, purchase logs & contacts',
        descriptionBn: 'সরবরাহকারী প্রতিষ্ঠান, দেনা ও যোগাযোগের তথ্য',
        keywords: ['suppliers', 'vendors', 'payables', 'vendor contacts']
      },
      {
        id: 'nav-shop',
        to: '/shop',
        label: 'Online Shop Manager',
        labelBn: 'অনলাইন শপ ম্যানেজার',
        iconName: 'Globe',
        permission: 'shop.manage',
        requiredFeature: 'ecommerce',
        badge: 'Live',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        description: 'E-commerce storefront setup, inventory publishing & web orders',
        descriptionBn: 'অনলাইন ই-কমার্স স্টোরফ্রন্ট ও অর্ডার প্রসেসিং',
        keywords: ['online shop', 'ecommerce', 'storefront', 'web store', 'orders']
      },
      {
        id: 'nav-communication',
        to: '/communication',
        label: 'SMS & Email Notice',
        labelBn: 'এসএমএস ও নোটিফিকেশন',
        iconName: 'MessageSquare',
        permission: 'crm.communication',
        requiredFeature: 'crm.sms_email',
        description: 'Automated invoice SMS, payment reminders & customer messaging',
        descriptionBn: 'ইনভয়েস ও বকেয়া আদায়ের স্বয়ংক্রিয় এসএমএস অ্যালার্ট',
        keywords: ['sms', 'email', 'communication', 'messages', 'gateway']
      },
      {
        id: 'nav-marketing',
        to: '/marketing',
        label: 'Marketing & Campaigns',
        labelBn: 'মার্কেটিং ও প্রচারণা',
        iconName: 'Megaphone',
        permission: 'crm.marketing',
        requiredFeature: 'crm.marketing',
        description: 'Promotional campaigns, discount vouchers & targeted bulk SMS',
        descriptionBn: 'ডিসকাউন্ট কুপন ও প্রমোশনাল প্রচারণা ক্যাম্পেইন',
        keywords: ['marketing', 'campaigns', 'discounts', 'coupons', 'promotions']
      },
      {
        id: 'nav-support',
        to: '/support',
        label: 'Customer Support',
        labelBn: 'সাপোর্ট সেন্টার',
        iconName: 'HeadphonesIcon',
        permission: 'crm.support',
        description: 'Customer ticket management, query resolution & helpdesk',
        descriptionBn: 'গ্রাহক সহায়তা টিকিট ও সেবা কেন্দ্র',
        keywords: ['support', 'helpdesk', 'tickets', 'customer service']
      }
    ]
  },
  {
    id: 'grp-system',
    title: 'System & Tools',
    titleBn: 'সিস্টেম ও টুলস',
    iconName: 'Settings',
    items: [
      {
        id: 'nav-document-ai',
        to: '/document-ai',
        label: 'Document AI Scan',
        labelBn: 'ডকুমেন্ট এআই স্ক্যান',
        iconName: 'ScanText',
        permission: 'finance.expense.add',
        badge: 'AI OCR',
        badgeColor: 'bg-violet-100 text-violet-800',
        description: 'Scan bills and invoices with OCR and auto-generate expenses',
        descriptionBn: 'রিসিপ্ট ও বিল স্ক্যান করে সরাসরি খরচের হিসাব তৈরি',
        keywords: ['document ai', 'ocr', 'receipt scanner', 'bill scan', 'ai expense']
      },
      {
        id: 'nav-ai-chat',
        to: '/ai-chat',
        label: 'ERP AI Assistant',
        labelBn: 'ইআরপি এআই সহকারী',
        iconName: 'Bot',
        permission: 'reports.view',
        requiredFeature: 'system.ai_assistant',
        badge: 'AI',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        description: 'Bilingual natural language queries for sales, stock & dues',
        descriptionBn: 'বাংলা ও ইংরেজিতে ভয়েস/টেক্সট ভিত্তিক এআই সহকারী',
        keywords: ['ai chat', 'assistant', 'copilot', 'smart bot', 'bilingual query']
      },
      {
        id: 'nav-settings',
        to: '/settings',
        label: 'Settings & Config',
        labelBn: 'সিস্টেম সেটিংস',
        iconName: 'Settings',
        permission: 'admin.settings',
        description: 'Business profile, currency, invoices, tax VAT, backup & restore',
        descriptionBn: 'প্রতিষ্ঠানের প্রোফাইল, মুদ্রা, ভ্যাট ও ব্যাকআপ সেটিংস',
        keywords: ['settings', 'configuration', 'profile', 'tax setup', 'backup', 'restore']
      },
      {
        id: 'nav-stores',
        to: '/stores',
        label: 'Store Management',
        labelBn: 'শাখা ও আউটলেট',
        iconName: 'Store',
        permission: 'admin.stores',
        requiredFeature: 'system.multi_branch',
        description: 'Multi-branch stores, warehouse locations & branch managers',
        descriptionBn: 'একাধিক শাখা, গুদাম ও আউটলেট ব্যবস্থাপনা',
        keywords: ['stores', 'branches', 'outlets', 'warehouses', 'locations']
      },
      {
        id: 'nav-subscription',
        to: '/subscription',
        label: 'Subscription Plan',
        labelBn: 'সাবস্ক্রিপশন প্ল্যান',
        iconName: 'Crown',
        permission: 'admin.subscription',
        description: 'Plan tier limits, package features & billing renewal status',
        descriptionBn: 'প্ল্যানের মেয়াদ, ব্যবহার সীমা ও নবায়ন স্ট্যাটাস',
        keywords: ['subscription', 'plan', 'billing', 'package', 'upgrade', 'renewal']
      },
      {
        id: 'nav-printer',
        to: '/printer',
        label: 'Printer Config',
        labelBn: 'প্রিন্টার কনফিগ',
        iconName: 'Printer',
        permission: 'admin.settings',
        description: 'Thermal POS slip, 80mm/58mm page width & barcode label printers',
        descriptionBn: 'থার্মাল প্রিন্টার সাইজ, ব্লুটুথ/ইউএসবি ও পেপার সেটিংস',
        keywords: ['printer', 'thermal', 'pos receipt', 'pos slip', 'labels', 'printing']
      },
      {
        id: 'nav-training',
        to: '/training',
        label: 'Interactive Guide',
        labelBn: 'ব্যবহারকারী গাইড',
        iconName: 'BookOpen',
        description: 'Step-by-step interactive onboarding tours & documentation',
        descriptionBn: 'ধাপে ধাপে সফটওয়্যার ব্যবহারের নির্দেশিকা ও টিউটোরিয়াল',
        keywords: ['training', 'guide', 'tutorial', 'help', 'tour', 'onboarding']
      },
      {
        id: 'nav-bin',
        to: '/bin',
        label: 'Recycle Bin',
        labelBn: 'রিসাইকেল বিন',
        iconName: 'Trash2',
        permission: 'admin.recycle_bin',
        description: 'Restore soft-deleted items, sales or contacts safely',
        descriptionBn: 'মুছে ফেলা যেকোনো তথ্য ও হিসাব নিরাপদে পুনরুদ্ধার',
        keywords: ['bin', 'recycle bin', 'trash', 'restore', 'deleted items']
      },
      {
        id: 'nav-audit',
        to: '/audit',
        label: 'Security & Audit Log',
        labelBn: 'অডিট ও অ্যাক্টিভিটি লগ',
        iconName: 'ShieldAlert',
        permission: 'admin.settings',
        description: 'Track user activity, price overrides, deleted records & authentication history',
        descriptionBn: 'নিরাপত্তা সংক্রান্ত লগ, ডাটা ডিলিট ও সিস্টেম অ্যাক্টিভিটি ট্র্যাকিং',
        keywords: ['audit', 'audit log', 'activity log', 'security', 'history', 'compliance']
      }
    ]
  }
];

/**
 * Flat list of all navigable items for fast lookup and route checking.
 */
export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap(g => g.items);

/**
 * Map of canonical path to item config.
 */
export const PATH_TO_NAV_ITEM: Record<string, NavItemConfig> = Object.fromEntries(
  ALL_NAV_ITEMS.map(item => [item.to, item])
);

/**
 * Map of canonical path to parent group.
 */
export const PATH_TO_NAV_GROUP: Record<string, NavGroupConfig> = Object.fromEntries(
  NAV_GROUPS.flatMap(group => group.items.map(item => [item.to, group]))
);

// Register canonical route aliases for subroutes and alternative endpoints
if (PATH_TO_NAV_ITEM['/ai-chat']) {
  PATH_TO_NAV_ITEM['/assistant'] = PATH_TO_NAV_ITEM['/ai-chat'];
  PATH_TO_NAV_GROUP['/assistant'] = PATH_TO_NAV_GROUP['/ai-chat'];
}
if (PATH_TO_NAV_ITEM['/audit']) {
  PATH_TO_NAV_ITEM['/audit-log'] = PATH_TO_NAV_ITEM['/audit'];
  PATH_TO_NAV_GROUP['/audit-log'] = PATH_TO_NAV_GROUP['/audit'];
}

/**
 * Filter navigation groups and items based on:
 * 1. Role (isSaaSUser, etc.)
 * 2. User permissions
 * 3. Business type (e.g. restaurant)
 * 4. Subscription features (isLocked flag)
 */
export function getAuthorizedNavGroups(options: {
  user: any;
  hasPermission: (perm?: string) => boolean;
  hasFeature: (feat?: string) => boolean;
  isFullAccess?: boolean;
}): NavGroupConfig[] {
  const { user, hasPermission: checkPerm, hasFeature, isFullAccess } = options;
  if (!user) return [];

  const bType = user.businessType?.toLowerCase() || '';

  return NAV_GROUPS.map(group => {
    const filteredItems = group.items.filter(item => {
      // Check business type constraint
      if (item.businessType && item.businessType !== bType) {
        return false;
      }

      // If full access role (e.g. SHOP_OWNER), allow all permissions
      if (isFullAccess) {
        return true;
      }

      // Check granular permission
      if (item.permission && !checkPerm(item.permission)) {
        return false;
      }

      return true;
    }).map(item => {
      // Compute lock state for subscription tier gating
      const isLocked = item.requiredFeature ? !hasFeature(item.requiredFeature) : false;
      return {
        ...item,
        isLocked
      };
    });

    return {
      ...group,
      items: filteredItems
    };
  }).filter(group => group.items.length > 0);
}

/**
 * Search all navigation items by keyword or label (bilingual English / Bengali).
 */
export function searchNavigation(query: string, items: NavItemConfig[] = ALL_NAV_ITEMS): NavItemConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter(item => {
    if (item.label.toLowerCase().includes(q)) return true;
    if (item.labelBn.toLowerCase().includes(q)) return true;
    if (item.to.toLowerCase().includes(q)) return true;
    if (item.description.toLowerCase().includes(q)) return true;
    if (item.descriptionBn.toLowerCase().includes(q)) return true;
    return item.keywords.some(k => k.toLowerCase().includes(q));
  });
}

/**
 * Dynamic breadcrumb generator for any path in the ERP.
 */
export function getNavBreadcrumbs(path: string, language: string = 'en'): BreadcrumbItem[] {
  const isBn = language === 'bn';
  const cleanPath = path.split('?')[0];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: isBn ? 'হোম' : 'Home', to: '/' }
  ];

  if (cleanPath === '/' || !cleanPath) {
    return breadcrumbs;
  }

  const group = PATH_TO_NAV_GROUP[cleanPath];
  const item = PATH_TO_NAV_ITEM[cleanPath];

  if (group) {
    breadcrumbs.push({
      label: isBn ? group.titleBn : group.title
    });
  }

  if (item) {
    breadcrumbs.push({
      label: isBn ? item.labelBn : item.label,
      to: item.to
    });
  } else {
    // Fallback for paths with IDs or subroutes (e.g. /s/:slug or /legal)
    const segments = cleanPath.split('/').filter(Boolean);
    let accum = '';
    for (const seg of segments) {
      accum += `/${seg}`;
      const matched = PATH_TO_NAV_ITEM[accum];
      if (matched) {
        breadcrumbs.push({
          label: isBn ? matched.labelBn : matched.label,
          to: matched.to
        });
      } else {
        breadcrumbs.push({
          label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/[-_]/g, ' ')
        });
      }
    }
  }

  return breadcrumbs;
}

