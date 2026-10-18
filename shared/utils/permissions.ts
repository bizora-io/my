
export const PERMISSIONS = {
  // Sales & POS
  POS: {
    id: 'pos',
    label: 'Point of Sale (POS)',
    description: 'Access to sell products and manage sales.',
    subFeatures: {
      SELL: { key: 'pos.sell', label: 'Create Sale' },
      QUICK_SALE: { key: 'pos.quick_sale', label: 'Quick Sale' },
      RETURNS: { key: 'pos.returns', label: 'Process Returns' },
      DISCOUNT: { key: 'pos.discount', label: 'Apply Discount' },
      VIEW_SALES: { key: 'pos.view_sales', label: 'View Sales History' },
    }
  },
  // Inventory
  INVENTORY: {
    id: 'inventory',
    label: 'Inventory Management',
    description: 'Manage products, stock levels, and transfers.',
    subFeatures: {
      VIEW_STOCK: { key: 'inventory.view', label: 'View Stock' },
      ADD_PRODUCT: { key: 'inventory.add', label: 'Add Product' },
      EDIT_PRODUCT: { key: 'inventory.edit', label: 'Edit Product' },
      DELETE_PRODUCT: { key: 'inventory.delete', label: 'Delete Product' },
      PURCHASE: { key: 'inventory.purchase', label: 'Purchase Stock' },
      TRANSFER: { key: 'inventory.transfer', label: 'Transfer Stock' },
      ADJUSTMENT: { key: 'inventory.adjustment', label: 'Stock Adjustment' },
      PRODUCTION: { key: 'inventory.production', label: 'Production' },
    }
  },
  // Finance
  FINANCE: {
    id: 'finance',
    label: 'Finance & Accounts',
    description: 'Manage ledgers, expenses, and cashbox.',
    subFeatures: {
      VIEW_LEDGERS: { key: 'finance.ledgers', label: 'View Ledgers' },
      ADD_EXPENSE: { key: 'finance.expense.add', label: 'Add Expense' },
      VIEW_CASHBOX: { key: 'finance.cashbox', label: 'View Cashbox' },
      MANAGE_ACCOUNTS: { key: 'finance.accounts', label: 'Manage Accounts' },
    }
  },
  // Reports
  REPORTS: {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'Access business reports and insights.',
    subFeatures: {
      VIEW_REPORTS: { key: 'reports.view', label: 'View Reports' },
      EXPORT_DATA: { key: 'reports.export', label: 'Export Data' },
    }
  },
  // HR
  HR: {
    id: 'hr',
    label: 'HR & Employees',
    description: 'Manage staff and payroll.',
    subFeatures: {
      MANAGE_STAFF: { key: 'hr.manage', label: 'Manage Staff' },
      VIEW_PAYROLL: { key: 'hr.payroll', label: 'View Payroll' },
    }
  },
  // Admin
  ADMIN: {
    id: 'admin',
    label: 'Administration',
    description: 'System settings and configurations.',
    subFeatures: {
      SETTINGS: { key: 'admin.settings', label: 'Settings' },
      ACCESS_CONTROL: { key: 'admin.access', label: 'Access Control' },
      MANAGE_STORES: { key: 'admin.stores', label: 'Manage Stores' },
      SUBSCRIPTION: { key: 'admin.subscription', label: 'Subscription' },
      RECYCLE_BIN: { key: 'admin.recycle_bin', label: 'Recycle Bin' },
    }
  },
  // Online Shop
  ONLINE_SHOP: {
    id: 'online_shop',
    label: 'Online Shop',
    description: 'Manage e-commerce settings.',
    subFeatures: {
      MANAGE_SHOP: { key: 'shop.manage', label: 'Manage Shop' },
      PROCESS_ORDERS: { key: 'shop.orders', label: 'Process Orders' },
    }
  },
  // CRM
  CRM: {
    id: 'crm',
    label: 'Customer Management',
    description: 'Manage customers and support.',
    subFeatures: {
      VIEW_CUSTOMERS: { key: 'crm.view', label: 'View Customers' },
      MANAGE_CUSTOMERS: { key: 'crm.manage', label: 'Manage Customers' },
      SUPPORT: { key: 'crm.support', label: 'Customer Support' },
      MARKETING: { key: 'crm.marketing', label: 'Marketing' },
      COMMUNICATION: { key: 'crm.communication', label: 'Communication' },
    }
  },
  // SaaS Level
  SAAS: {
    id: 'saas',
    label: 'SaaS Platform',
    description: 'Platform level administration and management.',
    subFeatures: {
      DASHBOARD: { key: 'saas.dashboard', label: 'SaaS Dashboard' },
      MANAGE_BUSINESSES: { key: 'saas.businesses', label: 'Manage Businesses' },
      MANAGE_USERS: { key: 'saas.users', label: 'Manage Users' },
      SUBSCRIPTIONS: { key: 'saas.subscriptions', label: 'Manage Subscriptions' },
      ANALYTICS: { key: 'saas.analytics', label: 'Revenue Analytics' },
      SUPPORT: { key: 'saas.support', label: 'Support System' },
      SETTINGS: { key: 'saas.settings', label: 'System Settings' }
    }
  }
};

export const getAllPermissions = () => {
  return Object.values(PERMISSIONS).flatMap(module => 
    Object.values(module.subFeatures).map(sf => sf.key)
  );
};

export const hasPermission = (userPermissions: string[] | undefined, requiredPermission: string) => {
  if (!userPermissions) return false;
  if (userPermissions.includes('all')) return true;
  return userPermissions.includes(requiredPermission);
};

/** Roles that bypass per-key ACL (full shop access). */
export function isFullAccessRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const r = String(role);
  return (
    r === 'SHOP_OWNER' ||
    r === 'ShopOwner' ||
    r === 'SuperAdmin' ||
    r === 'Admin' ||
    r === 'OWNER' ||
    r === 'SAAS_OWNER' ||
    r === 'SAAS_ADMIN'
  );
}

/** True if employee/staff has any operational shop permission. */
export function hasOperationalPermissions(userPermissions: string[] | undefined): boolean {
  if (!userPermissions || !userPermissions.length) return false;
  if (userPermissions.includes('all')) return true;
  const opsPrefixes = ['pos.', 'inventory.', 'finance.', 'reports.', 'crm.', 'hr.', 'shop.'];
  return userPermissions.some((p) => opsPrefixes.some((pre) => p.startsWith(pre)));
}

export function canAccessPermission(
  role: string | undefined | null,
  userPermissions: string[] | undefined,
  requiredPermission: string,
  opts?: { impersonated?: boolean }
): boolean {
  if (opts?.impersonated) return true;
  if (isFullAccessRole(role)) return true;
  // Shop owner with empty permissions array (legacy accounts)
  if ((role === 'SHOP_OWNER' || role === 'ShopOwner') && (!userPermissions || userPermissions.length === 0)) {
    return true;
  }
  return hasPermission(userPermissions, requiredPermission);
}
