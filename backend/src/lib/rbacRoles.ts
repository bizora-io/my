/** Backend copy of shop RBAC role → permission mapping (keep in sync with shared/utils/rbacRoles.ts). */

export type RbacRoleId =
  | "manager"
  | "cashier"
  | "salesperson"
  | "stock_manager"
  | "accountant"
  | "hr_manager"
  | "kitchen"
  | "viewer"
  | "custom";

const TEMPLATES: Record<string, string[]> = {
  manager: ["__ALL_SHOP__"],
  cashier: [
    "pos.sell",
    "pos.quick_sale",
    "pos.returns",
    "pos.discount",
    "pos.view_sales",
    "inventory.view",
    "crm.view",
    "finance.cashbox",
  ],
  salesperson: [
    "pos.sell",
    "pos.quick_sale",
    "pos.view_sales",
    "pos.discount",
    "inventory.view",
    "crm.view",
    "crm.manage",
  ],
  stock_manager: [
    "inventory.view",
    "inventory.add",
    "inventory.edit",
    "inventory.delete",
    "inventory.purchase",
    "inventory.transfer",
    "inventory.adjustment",
    "inventory.production",
    "pos.view_sales",
    "crm.view",
  ],
  accountant: [
    "finance.ledgers",
    "finance.expense.add",
    "finance.cashbox",
    "finance.accounts",
    "reports.view",
    "reports.export",
    "pos.view_sales",
    "crm.view",
  ],
  hr_manager: ["hr.manage", "hr.payroll", "crm.view", "reports.view"],
  kitchen: ["pos.view_sales", "pos.sell", "inventory.view"],
  viewer: [
    "pos.view_sales",
    "inventory.view",
    "finance.ledgers",
    "finance.cashbox",
    "crm.view",
    "reports.view",
    "hr.payroll",
  ],
  custom: [],
};

const ALL_SHOP = [
  "pos.sell",
  "pos.quick_sale",
  "pos.returns",
  "pos.discount",
  "pos.view_sales",
  "inventory.view",
  "inventory.add",
  "inventory.edit",
  "inventory.delete",
  "inventory.purchase",
  "inventory.transfer",
  "inventory.adjustment",
  "inventory.production",
  "finance.ledgers",
  "finance.expense.add",
  "finance.cashbox",
  "finance.accounts",
  "reports.view",
  "reports.export",
  "hr.manage",
  "hr.payroll",
  "admin.settings",
  "admin.access",
  "admin.stores",
  "admin.subscription",
  "admin.recycle_bin",
  "shop.manage",
  "shop.orders",
  "crm.view",
  "crm.manage",
  "crm.support",
  "crm.marketing",
  "crm.communication",
];

export function matchRoleTemplateId(roleLabel: string | undefined | null): string {
  const r = (roleLabel || "").trim().toLowerCase();
  if (!r) return "custom";
  if (r.includes("manager") && r.includes("hr")) return "hr_manager";
  if (r.includes("stock") || r.includes("inventory") || r.includes("warehouse")) return "stock_manager";
  if (r.includes("account") || r.includes("finance")) return "accountant";
  if (r.includes("kitchen") || r.includes("chef")) return "kitchen";
  if (r.includes("cashier")) return "cashier";
  if (r.includes("sales")) return "salesperson";
  if (r.includes("manager") || r.includes("admin") || r === "owner") return "manager";
  if (r.includes("view") || r.includes("read")) return "viewer";
  if (TEMPLATES[r]) return r;
  return "custom";
}

export function resolveStaffPermissions(opts: {
  role?: string;
  permissions?: string[];
  roleTemplateId?: string;
}): string[] {
  const explicit = Array.isArray(opts.permissions) ? opts.permissions : [];
  if (explicit.includes("all")) return [...ALL_SHOP];

  const templateId = opts.roleTemplateId || matchRoleTemplateId(opts.role);
  const base = TEMPLATES[templateId] || [];

  if (base.includes("__ALL_SHOP__")) {
    return [...new Set([...ALL_SHOP, ...explicit.filter((k) => k !== "all")])];
  }

  if (templateId === "custom") {
    return [...new Set(explicit)];
  }

  return [...new Set([...base, ...explicit])];
}
