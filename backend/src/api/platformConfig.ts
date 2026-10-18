import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";
import { getIO } from "../lib/chatSocket.js";

const router = express.Router();

const SETTINGS_DOC = () => getDb().collection("platformConfig").doc("settings");
const PLANS_DOC = () => getDb().collection("platformConfig").doc("subscriptionPlans");

const DEFAULT_SETTINGS = {
  brandingName: "Bizora ERP",
  smtpHost: "",
  smsGatewayUrl: "",
  supportedCurrencies: ["BDT", "USD", "EUR", "GBP", "INR"],
  defaultCurrency: "BDT",
  defaultTimezone: "Asia/Dhaka",
  logoUrl: "",
  faviconUrl: "",
  seoTitle: "Bizora ERP - All-in-one Business Management",
  seoDescription: "",
};

/** Canonical list used by Admin UI + shop subscription page */
export const DEFAULT_PLANS_LIST = [
  {
    id: "trial",
    name: "Trial",
    badge: "Free Trial",
    price: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "BDT",
    features: [
      "Single store POS operations",
      "Barcode scanning & receipt print",
      "Basic sales reports",
      "Cashbox balance log",
    ],
    modules: ["pos", "inventory", "reports"],
    interval: "14 days",
    limitStores: 1,
    limitUsers: 2,
    limitEmployees: 3,
    limitProducts: 50,
    limitInvoices: 100,
    limitWarehouses: 1,
    limitStorageMb: 256,
    status: "active",
    isPopular: false,
    trialDays: 14,
    description: "Ideal for testing Bizora ERP risk-free with zero commitment.",
  },
  {
    id: "basic",
    name: "Basic",
    badge: "Starter",
    price: 999,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: "BDT",
    features: [
      "Single store POS & inventory",
      "Barcode label printing",
      "Offline sales & cloud sync",
      "Basic profit/loss & tax report",
      "Cashbox & shift registers",
    ],
    modules: ["pos", "inventory", "reports"],
    interval: "month",
    limitStores: 1,
    limitUsers: 5,
    limitEmployees: 10,
    limitProducts: 1000,
    limitInvoices: 2500,
    limitWarehouses: 1,
    limitStorageMb: 1024,
    status: "active",
    isPopular: false,
    trialDays: 0,
    description: "Designed for single retail stores, groceries, and small boutiques.",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most Popular",
    price: 2499,
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    currency: "BDT",
    features: [
      "Multi-branch inventory sync",
      "FEFO batch & expiration tracking",
      "Online e-commerce storefront",
      "Pathao & Steadfast courier booking",
      "Advanced analytics & VAT reports",
      "Bizora AI ERP Assistant",
    ],
    modules: ["pos", "inventory", "hrm", "ecommerce", "reports"],
    interval: "month",
    limitStores: 5,
    limitUsers: 25,
    limitEmployees: 50,
    limitProducts: 10000,
    limitInvoices: 25000,
    limitWarehouses: 5,
    limitStorageMb: 5120,
    status: "active",
    isPopular: true,
    trialDays: 14,
    description: "Best for growing retail chains, wholesale distribution, and multi-staff shops.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Enterprise",
    price: 4999,
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    currency: "BDT",
    features: [
      "Unlimited branches & warehouses",
      "Manufacturing / BOM explosion",
      "Custom domain & white-label",
      "REST API & automated webhooks",
      "Dedicated account SLA & audit log",
      "Priority 24/7 hotline support",
    ],
    modules: ["pos", "inventory", "hrm", "accounting", "manufacturing", "ecommerce", "multi_branch", "api", "reports"],
    interval: "month",
    limitStores: 99,
    limitUsers: 999,
    limitEmployees: 500,
    limitProducts: 100000,
    limitInvoices: 500000,
    limitWarehouses: 99,
    limitStorageMb: 25600,
    status: "active",
    isPopular: false,
    trialDays: 0,
    description: "For large retail chains, manufacturing enterprises, and franchised networks.",
  },
];

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Sanitize and format plan for public landing page consumption */
export function formatPublicPlan(p: any): any {
  const mPrice = Number(p.monthlyPrice !== undefined ? p.monthlyPrice : p.price) || 0;
  const yPrice = Number(p.yearlyPrice !== undefined ? p.yearlyPrice : (mPrice > 0 ? mPrice * 10 : 0));
  return {
    id: String(p.id || "").toLowerCase(),
    name: String(p.name || ""),
    code: String(p.code || p.id || ""),
    badge: p.badge || (p.isPopular ? "Most Popular" : ""),
    icon: p.icon || "Crown",
    color: p.color || "indigo",
    price: mPrice,
    monthlyPrice: mPrice,
    yearlyPrice: yPrice,
    currency: p.currency || "BDT",
    interval: p.interval || "month",
    features: Array.isArray(p.features)
      ? p.features
      : String(p.features || "")
          .split(/[,\n]/)
          .map((s: string) => s.trim())
          .filter(Boolean),
    modules: Array.isArray(p.modules) ? p.modules : ["pos", "inventory", "reports"],
    limitStores: Number(p.limitStores ?? 1),
    limitUsers: Number(p.limitUsers ?? 5),
    limitEmployees: Number(p.limitEmployees ?? 10),
    limitProducts: Number(p.limitProducts ?? 500),
    limitInvoices: Number(p.limitInvoices ?? 1000),
    limitWarehouses: Number(p.limitWarehouses ?? 1),
    limitStorageMb: Number(p.limitStorageMb ?? 1024),
    status: p.status || "active",
    trialDays: Number(p.trialDays ?? 0),
    isPopular: Boolean(p.isPopular),
    description: String(p.description || ""),
  };
}

/** Normalize Firestore doc → always an array for clients */
function toPlansArray(data: any): any[] {
  if (!data) return DEFAULT_PLANS_LIST;
  let rawList: any[] = [];
  if (Array.isArray(data.list) && data.list.length) rawList = data.list;
  else if (Array.isArray(data.plans) && data.plans.length) rawList = data.plans;
  else {
    // Legacy map: { Basic: { price, limitStores }, ... }
    const keys = Object.keys(data).filter((k) => k !== "list" && k !== "plans" && k !== "updatedAt");
    if (keys.length && typeof data[keys[0]] === "object" && !Array.isArray(data[keys[0]])) {
      rawList = keys.map((name) => ({
        id: String(name).toLowerCase().replace(/\s+/g, "-"),
        name,
        price: Number(data[name]?.price) || 0,
        monthlyPrice: Number(data[name]?.monthlyPrice ?? data[name]?.price) || 0,
        yearlyPrice: Number(data[name]?.yearlyPrice) || 0,
        features: Array.isArray(data[name]?.features)
          ? data[name].features
          : String(data[name]?.features || "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
        interval: data[name]?.interval || "month",
        limitStores: data[name]?.limitStores ?? 1,
        limitUsers: data[name]?.limitUsers ?? 5,
        status: data[name]?.status || "active",
        isPopular: Boolean(data[name]?.isPopular),
      }));
    }
  }

  if (!rawList.length) return DEFAULT_PLANS_LIST;

  return rawList.map((p) => {
    const mPrice = Number(p.monthlyPrice !== undefined ? p.monthlyPrice : p.price) || 0;
    const yPrice = Number(p.yearlyPrice !== undefined ? p.yearlyPrice : (mPrice > 0 ? mPrice * 10 : 0));
    return {
      ...p,
      price: mPrice,
      monthlyPrice: mPrice,
      yearlyPrice: yPrice,
      currency: p.currency || "BDT",
      status: p.status || "active",
      isPopular: Boolean(p.isPopular),
      badge: p.badge || (p.isPopular ? "Popular" : ""),
      features: Array.isArray(p.features)
        ? p.features
        : String(p.features || "")
            .split(/[,\n]/)
            .map((s: string) => s.trim())
            .filter(Boolean),
      modules: Array.isArray(p.modules) ? p.modules : ["pos", "inventory", "reports"],
    };
  });
}

export async function getSubscriptionPlans(): Promise<any[]> {
  try {
    const doc = await PLANS_DOC().get();
    return toPlansArray(doc.exists ? doc.data() : null);
  } catch (e) {
    return DEFAULT_PLANS_LIST;
  }
}

// Public reads
router.get("/settings", async (_req, res) => {
  try {
    const doc = await SETTINGS_DOC().get();
    res.json({ settings: doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : DEFAULT_SETTINGS });
  } catch (error) {
    console.error("Get platform settings error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/platform/plans — supports ?public=true
router.get("/plans", async (req, res) => {
  try {
    const doc = await PLANS_DOC().get();
    let plans = toPlansArray(doc.exists ? doc.data() : null);

    const isPublic = req.query.public === "true" || req.query.published === "true";
    if (isPublic) {
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
      // Filter out draft, archived, or inactive packages
      plans = plans
        .filter((p) => p.status === "active" || (!p.status && p.status !== "draft" && p.status !== "archived" && p.status !== "inactive"))
        .map(formatPublicPlan);
    }

    res.json({ plans });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/platform/public-plans — dedicated public endpoint for website pricing section
router.get("/public-plans", async (_req, res) => {
  try {
    const doc = await PLANS_DOC().get();
    const allPlans = toPlansArray(doc.exists ? doc.data() : null);
    const publicPlans = allPlans
      .filter((p) => p.status === "active" || (!p.status && p.status !== "draft" && p.status !== "archived" && p.status !== "inactive"))
      .map(formatPublicPlan);

    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    res.json({ plans: publicPlans });
  } catch (error) {
    console.error("Get public plans error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SaaS only writes
router.use(authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"));

router.put("/settings", async (req, res) => {
  try {
    await SETTINGS_DOC().set(stripUndefined(req.body), { merge: true });
    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: "Updated platform system settings",
      targetType: "platformSettings",
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Update platform settings error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/plans", async (req, res) => {
  try {
    const incoming = req.body?.plans ?? req.body?.list ?? req.body;
    const list = Array.isArray(incoming) ? toPlansArray({ list: incoming }) : toPlansArray(incoming);
    const payload = stripUndefined({
      list,
      updatedAt: new Date().toISOString(),
    });
    await PLANS_DOC().set(payload);
    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: "Updated subscription plans",
      targetType: "subscriptionPlans",
      details: `${list.length} plans`,
    });

    try {
      getIO()?.emit("platform:plans_updated", { action: "sync", timestamp: new Date().toISOString() });
    } catch {}

    res.json({ success: true, plans: list });
  } catch (error) {
    console.error("Update plans error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/platform/plans — create a single new plan
router.post("/plans", async (req, res) => {
  try {
    const doc = await PLANS_DOC().get();
    const currentList = toPlansArray(doc.exists ? doc.data() : null);

    const {
      name,
      code,
      badge = "",
      icon = "Crown",
      color = "indigo",
      price = 0,
      monthlyPrice,
      yearlyPrice,
      currency = "BDT",
      interval = "month",
      features = [],
      modules = ["pos", "inventory", "reports"],
      limitStores = 1,
      limitUsers = 5,
      limitEmployees = 10,
      limitProducts = 500,
      limitInvoices = 1000,
      limitWarehouses = 1,
      limitStorageMb = 1024,
      status = "active",
      trialDays = 0,
      renewalGraceDays = 7,
      isPopular = false,
      description = "",
    } = req.body || {};

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Plan name is required." });
      return;
    }

    const planId = (req.body.id || req.body.code || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

    if (currentList.some((p) => String(p.id).toLowerCase() === planId.toLowerCase())) {
      res.status(409).json({ error: `A plan with ID '${planId}' already exists.` });
      return;
    }

    const mPrice = Number(monthlyPrice !== undefined ? monthlyPrice : price) || 0;
    const yPrice = Number(yearlyPrice !== undefined ? yearlyPrice : (mPrice > 0 ? mPrice * 10 : 0));

    const newPlan = {
      id: planId,
      name,
      code: code || planId,
      badge: badge || (isPopular ? "Popular" : ""),
      icon: icon || "Crown",
      color: color || "indigo",
      price: mPrice,
      monthlyPrice: mPrice,
      yearlyPrice: yPrice,
      currency: currency || "BDT",
      interval,
      features: Array.isArray(features) ? features : String(features).split(/[,\n]/).map(s => s.trim()).filter(Boolean),
      modules: Array.isArray(modules) ? modules : ["pos", "inventory", "reports"],
      limitStores: Number(limitStores) || 1,
      limitUsers: Number(limitUsers) || 5,
      limitEmployees: Number(limitEmployees) || 10,
      limitProducts: Number(limitProducts) || 500,
      limitInvoices: Number(limitInvoices) || 1000,
      limitWarehouses: Number(limitWarehouses) || 1,
      limitStorageMb: Number(limitStorageMb) || 1024,
      status: status || "active",
      trialDays: Number(trialDays) || 0,
      renewalGraceDays: Number(renewalGraceDays) || 7,
      isPopular: Boolean(isPopular),
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [...currentList, newPlan];
    await PLANS_DOC().set({
      list: updatedList,
      updatedAt: new Date().toISOString(),
    });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Created subscription plan: ${name}`,
      targetType: "subscriptionPlans",
      targetId: planId,
    });

    try {
      getIO()?.emit("platform:plans_updated", { action: "create", planId, timestamp: new Date().toISOString() });
    } catch {}

    res.status(201).json({ success: true, plan: newPlan, plans: updatedList });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/platform/plans/:id — update or toggle active state of a plan
router.patch("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PLANS_DOC().get();
    const currentList = toPlansArray(doc.exists ? doc.data() : null);

    const index = currentList.findIndex((p) => String(p.id).toLowerCase() === String(id).toLowerCase() || String(p.name).toLowerCase() === String(id).toLowerCase());
    if (index === -1) {
      res.status(404).json({ error: `Plan '${id}' not found.` });
      return;
    }

    const existing = currentList[index];
    const updated = {
      ...existing,
      ...stripUndefined(req.body),
      id: existing.id, // prevent changing ID
      updatedAt: new Date().toISOString(),
    };

    if (req.body.price !== undefined) {
      updated.price = Number(req.body.price) || 0;
      updated.monthlyPrice = Number(req.body.price) || 0;
    }
    if (req.body.monthlyPrice !== undefined) {
      updated.price = Number(req.body.monthlyPrice) || 0;
      updated.monthlyPrice = Number(req.body.monthlyPrice) || 0;
    }
    if (req.body.yearlyPrice !== undefined) updated.yearlyPrice = Number(req.body.yearlyPrice) || 0;
    if (req.body.currency !== undefined) updated.currency = String(req.body.currency);
    if (req.body.limitStores !== undefined) updated.limitStores = Number(req.body.limitStores) || 1;
    if (req.body.limitUsers !== undefined) updated.limitUsers = Number(req.body.limitUsers) || 5;
    if (req.body.limitEmployees !== undefined) updated.limitEmployees = Number(req.body.limitEmployees) || 10;
    if (req.body.limitProducts !== undefined) updated.limitProducts = Number(req.body.limitProducts) || 500;
    if (req.body.limitInvoices !== undefined) updated.limitInvoices = Number(req.body.limitInvoices) || 1000;
    if (req.body.limitWarehouses !== undefined) updated.limitWarehouses = Number(req.body.limitWarehouses) || 1;
    if (req.body.limitStorageMb !== undefined) updated.limitStorageMb = Number(req.body.limitStorageMb) || 1024;
    if (req.body.trialDays !== undefined) updated.trialDays = Number(req.body.trialDays) || 0;
    if (req.body.renewalGraceDays !== undefined) updated.renewalGraceDays = Number(req.body.renewalGraceDays) || 7;
    if (req.body.isPopular !== undefined) updated.isPopular = Boolean(req.body.isPopular);
    if (req.body.status !== undefined) updated.status = req.body.status;
    if (req.body.features && !Array.isArray(req.body.features)) {
      updated.features = String(req.body.features).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    }
    if (req.body.modules && !Array.isArray(req.body.modules)) {
      updated.modules = String(req.body.modules).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    }

    currentList[index] = updated;

    await PLANS_DOC().set({
      list: currentList,
      updatedAt: new Date().toISOString(),
    });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Updated subscription plan: ${updated.name}`,
      targetType: "subscriptionPlans",
      targetId: id,
    });

    try {
      getIO()?.emit("platform:plans_updated", { action: "update", planId: id, timestamp: new Date().toISOString() });
    } catch {}

    res.json({ success: true, plan: updated, plans: currentList });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/platform/plans/:id — safe delete or archive plan
router.delete("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";
    const doc = await PLANS_DOC().get();
    const currentList = toPlansArray(doc.exists ? doc.data() : null);

    const index = currentList.findIndex((p) => String(p.id).toLowerCase() === String(id).toLowerCase() || String(p.name).toLowerCase() === String(id).toLowerCase());
    if (index === -1) {
      res.status(404).json({ error: `Plan '${id}' not found.` });
      return;
    }

    const targetPlan = currentList[index];

    // Check active subscribers count across businesses
    let subscriberCount = 0;
    try {
      const bizSnap = await getDb().collection("businesses").get();
      const planKey = (targetPlan.id || "").toLowerCase();
      const planNameKey = (targetPlan.name || "").toLowerCase();
      bizSnap.forEach((bDoc) => {
        const data = bDoc.data();
        const p = String(data.plan || data.subscription?.planId || "").toLowerCase().trim();
        if (p === planKey || p === planNameKey) {
          subscriberCount++;
        }
      });
    } catch (bizErr) {
      console.warn("Could not check subscriber count for plan:", bizErr);
    }

    // If active subscribers exist and force is not set, safely archive to prevent breaking subscriber access
    if (subscriberCount > 0 && !force) {
      targetPlan.status = "archived";
      targetPlan.updatedAt = new Date().toISOString();
      currentList[index] = targetPlan;

      await PLANS_DOC().set({
        list: currentList,
        updatedAt: new Date().toISOString(),
      });

      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `Archived plan with active subscribers: ${targetPlan.name}`,
        targetType: "subscriptionPlans",
        targetId: targetPlan.id,
        details: `${subscriberCount} active subscriber(s) preserved`,
      });

      try {
        getIO()?.emit("platform:plans_updated", { action: "archive", planId: targetPlan.id, timestamp: new Date().toISOString() });
      } catch {}

      res.json({
        success: true,
        archived: true,
        subscriberCount,
        message: `Plan '${targetPlan.name}' has ${subscriberCount} active subscriber(s). It has been safely archived instead of deleted to protect customer access and billing integrity.`,
        plans: currentList,
      });
      return;
    }

    // Permanently remove when no active subscribers or force=true
    const filtered = currentList.filter((_, idx) => idx !== index);
    await PLANS_DOC().set({
      list: filtered,
      updatedAt: new Date().toISOString(),
    });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Deleted subscription plan: ${targetPlan.name}`,
      targetType: "subscriptionPlans",
      targetId: targetPlan.id,
    });

    try {
      getIO()?.emit("platform:plans_updated", { action: "delete", planId: targetPlan.id, timestamp: new Date().toISOString() });
    } catch {}

    res.json({
      success: true,
      archived: false,
      subscriberCount,
      message: `Plan '${targetPlan.name}' deleted successfully.`,
      plans: filtered,
    });
  } catch (error) {
    console.error("Delete plan error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
