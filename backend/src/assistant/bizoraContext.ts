import { getDb } from "../lib/firebaseAdmin.ts";
import { FEATURE_CATALOG } from "../../../shared/lib/featureRegistry.ts";

export interface LiveSalesSummary {
  asOf: string;
  currency: string;
  todaySalesTotal: number;
  todayOrderCount: number;
  todayCashCollected: number;
  todayDueAmount: number;
  monthSalesTotal: number;
  monthOrderCount: number;
}

export interface LiveInventorySummary {
  asOf: string;
  currency: string;
  totalProductsCount: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  topLowStockItems: Array<{ name: string; stock: number; minStock: number; unit?: string }>;
}

export interface LiveCustomerDuesSummary {
  asOf: string;
  currency: string;
  totalReceivables: number;
  customersWithDueCount: number;
  topDueCustomers: Array<{ name: string; phone?: string; due: number }>;
}

export interface LiveSupplierPayablesSummary {
  asOf: string;
  currency: string;
  totalPayables: number;
  suppliersOwedCount: number;
  topPayableSuppliers: Array<{ name: string; phone?: string; payable: number }>;
}

export interface LiveCashboxSummary {
  asOf: string;
  currency: string;
  todayCashIn: number;
  todayCashOut: number;
  netCashFlowToday: number;
}

export interface LiveStaffSummary {
  asOf: string;
  totalStaffCount: number;
  staffList: Array<{ name: string; role: string; branch?: string; permissionsCount: number }>;
}

export interface LiveSubscriptionSummary {
  businessName: string;
  plan: string;
  status: string;
  currency: string;
  renewsAt?: string;
  totalFeaturesAvailable: number;
  enabledModules: string[];
}

/**
 * Fetches the authoritative business document
 */
export async function getTenantProfile(businessId: string) {
  const db = getDb();
  const snap = await db.collection("businesses").doc(businessId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Record<string, any>;
}

/**
 * Computes live sales metrics from authoritative transactions
 */
export async function getLiveSalesMetrics(businessId: string, currency = "BDT"): Promise<LiveSalesSummary> {
  const db = getDb();
  const now = new Date();
  const todayPrefix = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const monthPrefix = now.toISOString().slice(0, 7);  // YYYY-MM

  const snap = await db.collection("businesses").doc(businessId).collection("transactions")
    .where("type", "in", ["Sale", "sale", "QuickSale"])
    .limit(500)
    .get()
    .catch(() => ({ docs: [] } as any));

  let todaySalesTotal = 0;
  let todayOrderCount = 0;
  let todayCashCollected = 0;
  let todayDueAmount = 0;
  let monthSalesTotal = 0;
  let monthOrderCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const dateStr = String(data.date || data.createdAt || "");
    const amount = Number(data.total ?? data.amount) || 0;
    const paid = Number(data.paid) || 0;
    const due = Number(data.due) || 0;

    if (dateStr.startsWith(todayPrefix)) {
      todaySalesTotal += amount;
      todayOrderCount += 1;
      todayCashCollected += paid;
      todayDueAmount += due;
    }
    if (dateStr.startsWith(monthPrefix)) {
      monthSalesTotal += amount;
      monthOrderCount += 1;
    }
  }

  return {
    asOf: now.toISOString(),
    currency,
    todaySalesTotal: Math.round(todaySalesTotal * 100) / 100,
    todayOrderCount,
    todayCashCollected: Math.round(todayCashCollected * 100) / 100,
    todayDueAmount: Math.round(todayDueAmount * 100) / 100,
    monthSalesTotal: Math.round(monthSalesTotal * 100) / 100,
    monthOrderCount,
  };
}

/**
 * Computes actual inventory stock and low stock warnings
 */
export async function getLiveInventoryMetrics(businessId: string, currency = "BDT"): Promise<LiveInventorySummary> {
  const db = getDb();
  const snap = await db.collection("businesses").doc(businessId).collection("products")
    .limit(1000)
    .get()
    .catch(() => ({ docs: [] } as any));

  let totalStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockList: Array<{ name: string; stock: number; minStock: number; unit?: string }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const stock = Number(data.stock ?? data.quantity) || 0;
    const minStock = Number(data.minStock ?? data.reorderLevel ?? 5);
    totalStockUnits += stock;

    if (stock <= 0) {
      outOfStockCount++;
      lowStockList.push({ name: data.name || "Item", stock, minStock, unit: data.unit });
    } else if (stock <= minStock) {
      lowStockCount++;
      lowStockList.push({ name: data.name || "Item", stock, minStock, unit: data.unit });
    }
  }

  // Sort lowest stock first
  lowStockList.sort((a, b) => a.stock - b.stock);

  return {
    asOf: new Date().toISOString(),
    currency,
    totalProductsCount: snap.docs.length,
    totalStockUnits,
    lowStockCount,
    outOfStockCount,
    topLowStockItems: lowStockList.slice(0, 5),
  };
}

/**
 * Computes customer dues and accounts receivable
 */
export async function getLiveCustomerDues(businessId: string, currency = "BDT"): Promise<LiveCustomerDuesSummary> {
  const db = getDb();
  const snap = await db.collection("businesses").doc(businessId).collection("entities")
    .where("type", "==", "customer")
    .limit(500)
    .get()
    .catch(() => ({ docs: [] } as any));

  let totalReceivables = 0;
  const dueList: Array<{ name: string; phone?: string; due: number }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const due = Number(data.due ?? data.balance) || 0;
    if (due > 0) {
      totalReceivables += due;
      dueList.push({ name: data.name || "Customer", phone: data.phone, due });
    }
  }

  // Fallback: If entities has no due, check recent transactions
  if (totalReceivables === 0) {
    const txSnap = await db.collection("businesses").doc(businessId).collection("transactions")
      .where("due", ">", 0)
      .limit(100)
      .get()
      .catch(() => ({ docs: [] } as any));

    for (const doc of txSnap.docs) {
      const data = doc.data();
      const due = Number(data.due) || 0;
      if (due > 0) {
        totalReceivables += due;
        dueList.push({ name: data.customerName || data.customer || "Customer", due });
      }
    }
  }

  dueList.sort((a, b) => b.due - a.due);

  return {
    asOf: new Date().toISOString(),
    currency,
    totalReceivables: Math.round(totalReceivables * 100) / 100,
    customersWithDueCount: dueList.length,
    topDueCustomers: dueList.slice(0, 5),
  };
}

/**
 * Computes supplier payables
 */
export async function getLiveSupplierPayables(businessId: string, currency = "BDT"): Promise<LiveSupplierPayablesSummary> {
  const db = getDb();
  const snap = await db.collection("businesses").doc(businessId).collection("entities")
    .where("type", "==", "supplier")
    .limit(500)
    .get()
    .catch(() => ({ docs: [] } as any));

  let totalPayables = 0;
  const payableList: Array<{ name: string; phone?: string; payable: number }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const payable = Number(data.due ?? data.payable ?? data.balance) || 0;
    if (payable > 0) {
      totalPayables += payable;
      payableList.push({ name: data.name || "Supplier", phone: data.phone, payable });
    }
  }

  payableList.sort((a, b) => b.payable - a.payable);

  return {
    asOf: new Date().toISOString(),
    currency,
    totalPayables: Math.round(totalPayables * 100) / 100,
    suppliersOwedCount: payableList.length,
    topPayableSuppliers: payableList.slice(0, 5),
  };
}

/**
 * Computes today's cashbox inflow, outflow, and net balance
 */
export async function getLiveCashboxStatus(businessId: string, currency = "BDT"): Promise<LiveCashboxSummary> {
  const db = getDb();
  const todayPrefix = new Date().toISOString().slice(0, 10);

  const snap = await db.collection("businesses").doc(businessId).collection("transactions")
    .limit(200)
    .get()
    .catch(() => ({ docs: [] } as any));

  let todayCashIn = 0;
  let todayCashOut = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const dateStr = String(data.date || data.createdAt || "");
    if (!dateStr.startsWith(todayPrefix)) continue;

    const type = String(data.type || "");
    const paid = Number(data.paid ?? data.amount) || 0;

    if (type === "Sale" || type === "Income" || type === "QuickSale") {
      todayCashIn += paid;
    } else if (type === "Expense" || type === "Purchase" || type === "Return") {
      todayCashOut += paid;
    }
  }

  return {
    asOf: new Date().toISOString(),
    currency,
    todayCashIn: Math.round(todayCashIn * 100) / 100,
    todayCashOut: Math.round(todayCashOut * 100) / 100,
    netCashFlowToday: Math.round((todayCashIn - todayCashOut) * 100) / 100,
  };
}

/**
 * Retrieves staff roster without sensitive payroll data
 */
export async function getLiveStaffRoster(businessId: string): Promise<LiveStaffSummary> {
  const db = getDb();
  const snap = await db.collection("businesses").doc(businessId).collection("staff")
    .limit(100)
    .get()
    .catch(() => ({ docs: [] } as any));

  const staffList = snap.docs.map((doc) => {
    const data = doc.data();
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];
    return {
      name: String(data.name || "Staff Member"),
      role: String(data.role || "Cashier"),
      branch: data.branch || undefined,
      permissionsCount: permissions.length,
    };
  });

  return {
    asOf: new Date().toISOString(),
    totalStaffCount: staffList.length,
    staffList,
  };
}

/**
 * Returns the business's authoritative subscription & feature entitlement details
 */
export async function getLiveSubscriptionContext(businessId: string): Promise<LiveSubscriptionSummary> {
  const biz = await getTenantProfile(businessId) || {};
  const plan = biz.subscriptionPlan || biz.package || "Basic";
  const status = biz.status || biz.subscriptionStatus || "Active";
  const currency = biz.currency || "BDT";

  const enabledModules = FEATURE_CATALOG.map((mod) => mod.name);

  return {
    businessName: biz.businessName || biz.name || "Bizora Business",
    plan,
    status,
    currency,
    renewsAt: biz.renewsAt || biz.expiresAt || undefined,
    totalFeaturesAvailable: FEATURE_CATALOG.reduce((acc, m) => acc + m.features.length, 0),
    enabledModules,
  };
}
