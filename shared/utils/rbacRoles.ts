/**
 * RBAC role templates — maps staff role labels to permission key sets.
 * Used by Access Control UI and employee-login JWT enrichment.
 */

import { getAllPermissions } from './permissions';

export type RbacRoleId =
  | 'manager'
  | 'cashier'
  | 'salesperson'
  | 'stock_manager'
  | 'accountant'
  | 'hr_manager'
  | 'kitchen'
  | 'viewer'
  | 'custom';

export interface RbacRoleTemplate {
  id: RbacRoleId;
  label: string;
  description: string;
  /** Permission keys. Empty + useAllShop = all non-saas keys. */
  permissions: string[];
  useAllShop?: boolean;
}

const SHOP_PERMISSIONS = () => getAllPermissions().filter((k) => !k.startsWith('saas.'));

export const RBAC_ROLE_TEMPLATES: RbacRoleTemplate[] = [
  {
    id: 'manager',
    label: 'Manager',
    description: 'Full shop access except SaaS platform controls.',
    permissions: [],
    useAllShop: true,
  },
  {
    id: 'cashier',
    label: 'Cashier',
    description: 'POS sales, returns, view stock & customers.',
    permissions: [
      'pos.sell',
      'pos.quick_sale',
      'pos.returns',
      'pos.discount',
      'pos.view_sales',
      'inventory.view',
      'crm.view',
      'finance.cashbox',
    ],
  },
  {
    id: 'salesperson',
    label: 'Salesperson',
    description: 'Create sales and view customers; limited stock.',
    permissions: [
      'pos.sell',
      'pos.quick_sale',
      'pos.view_sales',
      'pos.discount',
      'inventory.view',
      'crm.view',
      'crm.manage',
    ],
  },
  {
    id: 'stock_manager',
    label: 'Stock Manager',
    description: 'Inventory, purchases, warehouses, production.',
    permissions: [
      'inventory.view',
      'inventory.add',
      'inventory.edit',
      'inventory.delete',
      'inventory.purchase',
      'inventory.transfer',
      'inventory.adjustment',
      'inventory.production',
      'pos.view_sales',
      'crm.view',
    ],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Ledgers, expenses, cashbox, reports, journal.',
    permissions: [
      'finance.ledgers',
      'finance.expense.add',
      'finance.cashbox',
      'finance.accounts',
      'reports.view',
      'reports.export',
      'pos.view_sales',
      'crm.view',
    ],
  },
  {
    id: 'hr_manager',
    label: 'HR Manager',
    description: 'Staff, payroll, leave, shifts, attendance.',
    permissions: [
      'hr.manage',
      'hr.payroll',
      'crm.view',
      'reports.view',
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Kitchen order tickets and related sales view.',
    permissions: [
      'pos.view_sales',
      'pos.sell',
      'inventory.view',
    ],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only across common modules.',
    permissions: [
      'pos.view_sales',
      'inventory.view',
      'finance.ledgers',
      'finance.cashbox',
      'crm.view',
      'reports.view',
      'hr.payroll',
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Manually pick permissions (no preset).',
    permissions: [],
  },
];

/** Normalize free-text role from older staff records to a template id. */
export function matchRoleTemplateId(roleLabel: string | undefined | null): RbacRoleId {
  const r = (roleLabel || '').trim().toLowerCase();
  if (!r) return 'custom';
  if (r.includes('manager') && r.includes('hr')) return 'hr_manager';
  if (r.includes('stock') || r.includes('inventory') || r.includes('warehouse')) return 'stock_manager';
  if (r.includes('account') || r.includes('finance')) return 'accountant';
  if (r.includes('kitchen') || r.includes('chef')) return 'kitchen';
  if (r.includes('cashier')) return 'cashier';
  if (r.includes('sales')) return 'salesperson';
  if (r.includes('manager') || r.includes('admin') || r === 'owner') return 'manager';
  if (r.includes('view') || r.includes('read')) return 'viewer';
  const byLabel = RBAC_ROLE_TEMPLATES.find((t) => t.label.toLowerCase() === r || t.id === r);
  return byLabel ? byLabel.id : 'custom';
}

export function getRoleTemplate(id: RbacRoleId | string): RbacRoleTemplate {
  return RBAC_ROLE_TEMPLATES.find((t) => t.id === id) || RBAC_ROLE_TEMPLATES.find((t) => t.id === 'custom')!;
}

/**
 * Resolve effective permission keys for a staff member.
 * Explicit permissions (if non-empty and not role-only) win; otherwise role template.
 * Special: permissions includes 'all' → all shop keys.
 */
export function resolveStaffPermissions(opts: {
  role?: string;
  permissions?: string[];
  roleTemplateId?: string;
}): string[] {
  const explicit = opts.permissions || [];
  if (explicit.includes('all')) return SHOP_PERMISSIONS();

  // If explicit list is non-empty and user chose custom, use it
  const templateId = (opts.roleTemplateId as RbacRoleId) || matchRoleTemplateId(opts.role);
  const template = getRoleTemplate(templateId);

  if (templateId === 'custom' && explicit.length > 0) {
    return [...new Set(explicit)];
  }

  if (template.useAllShop) {
    return SHOP_PERMISSIONS();
  }

  // Prefer template keys; if explicit was customized on top of a role, union
  if (explicit.length > 0 && templateId === 'custom') {
    return [...new Set(explicit)];
  }

  // Role template is source of truth when role is not custom
  if (templateId !== 'custom') {
    // Allow extra grants on top of template
    return [...new Set([...template.permissions, ...explicit])];
  }

  return [...new Set(explicit)];
}

export function listRoleOptions(): { id: RbacRoleId; label: string; description: string }[] {
  return RBAC_ROLE_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
  }));
}
