import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole, getActingBusinessId } from "./middleware/auth.js";
import { logAudit, auditActorFromReq } from "../lib/auditLog.js";

const router = express.Router();

export interface InvoiceTemplateItem {
  id: string;
  numericId?: number;
  name: string;
  description: string;
  layout: "classic" | "modern" | "dark" | "creative" | "formal" | "minimal";
  price: number;
  status: "active" | "inactive";
  availability: "all" | "subscription" | "paid";
  requiredPlan: "all" | "basic" | "pro" | "enterprise";
  config: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: "sans" | "serif" | "mono";
    paperSize?: "A4" | "A5" | "Letter" | "80mm" | "58mm";
    showLogo?: boolean;
    showWatermark?: boolean;
    showQrCode?: boolean;
    showTerms?: boolean;
    termsText?: string;
    footerNote?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_INVOICE_TEMPLATES: InvoiceTemplateItem[] = [
  {
    id: "tpl-01",
    numericId: 1,
    name: "Classic Simple",
    description: "Standard clean black & white layout with high readability. Best for daily grocery and general retail sales.",
    layout: "classic",
    price: 0,
    status: "active",
    availability: "all",
    requiredPlan: "all",
    config: {
      primaryColor: "#0f172a",
      accentColor: "#64748b",
      fontFamily: "sans",
      paperSize: "A4",
      showLogo: true,
      showWatermark: false,
      showQrCode: true,
      showTerms: true,
      termsText: "Thank you for your business. Returns accepted within 7 days with original invoice.",
      footerNote: "Powered by Bizora ERP",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl-02",
    numericId: 2,
    name: "Modern Indigo",
    description: "Contemporary design with bold indigo header banner and structured summary cards. Perfect for fashion & lifestyle stores.",
    layout: "modern",
    price: 999,
    status: "active",
    availability: "subscription",
    requiredPlan: "pro",
    config: {
      primaryColor: "#4f46e5",
      accentColor: "#818cf8",
      fontFamily: "sans",
      paperSize: "A4",
      showLogo: true,
      showWatermark: true,
      showQrCode: true,
      showTerms: true,
      termsText: "Payment is due upon receipt. For warranty claims, preserve serial number records.",
      footerNote: "Thank you for shopping with us!",
    },
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "tpl-03",
    numericId: 3,
    name: "Dark Professional",
    description: "High-contrast executive slate header with bold product grid and highlighted tax subtotals. Ideal for electronics & B2B distributors.",
    layout: "dark",
    price: 1499,
    status: "active",
    availability: "subscription",
    requiredPlan: "pro",
    config: {
      primaryColor: "#0f172a",
      accentColor: "#334155",
      fontFamily: "sans",
      paperSize: "A4",
      showLogo: true,
      showWatermark: false,
      showQrCode: true,
      showTerms: true,
      termsText: "Goods sold under manufacturer warranty. Computer generated tax invoice.",
      footerNote: "Visit our website for support and documentation.",
    },
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "tpl-04",
    numericId: 4,
    name: "Creative Amber",
    description: "Warm amber accents with prominent installment ledger and customer due tracking tables. Best for furniture, appliances, and installments.",
    layout: "creative",
    price: 1299,
    status: "active",
    availability: "paid",
    requiredPlan: "enterprise",
    config: {
      primaryColor: "#d97706",
      accentColor: "#f59e0b",
      fontFamily: "sans",
      paperSize: "A4",
      showLogo: true,
      showWatermark: false,
      showQrCode: true,
      showTerms: true,
      termsText: "Installment payments must be settled by the agreed scheduled due dates.",
      footerNote: "Customer satisfaction is our highest priority.",
    },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "tpl-05",
    numericId: 5,
    name: "Formal Serif",
    description: "Classic double-bordered formal typography with serif styling. Designed for jewelry, luxury goods, and corporate contracts.",
    layout: "formal",
    price: 1999,
    status: "active",
    availability: "paid",
    requiredPlan: "enterprise",
    config: {
      primaryColor: "#1e293b",
      accentColor: "#475569",
      fontFamily: "serif",
      paperSize: "A4",
      showLogo: true,
      showWatermark: true,
      showQrCode: true,
      showTerms: true,
      termsText: "Authenticity certified. Certified appraisal upon customer request.",
      footerNote: "Authorized Signature & Stamp",
    },
    createdAt: "2026-01-20T00:00:00.000Z",
    updatedAt: "2026-01-20T00:00:00.000Z",
  },
  {
    id: "tpl-06",
    numericId: 6,
    name: "Minimalist Thermal POS",
    description: "Compact roll-style 80mm / 58mm thermal receipt layout with zero wasteful margins. Fast printing on POS receipt hardware.",
    layout: "minimal",
    price: 0,
    status: "active",
    availability: "all",
    requiredPlan: "all",
    config: {
      primaryColor: "#000000",
      accentColor: "#333333",
      fontFamily: "mono",
      paperSize: "80mm",
      showLogo: false,
      showWatermark: false,
      showQrCode: true,
      showTerms: false,
      termsText: "",
      footerNote: "*** PLEASE KEEP THIS RECEIPT ***",
    },
    createdAt: "2026-01-25T00:00:00.000Z",
    updatedAt: "2026-01-25T00:00:00.000Z",
  },
];

async function ensureDefaultTemplatesSeeded(): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection("invoiceTemplates").get();
  if (snapshot.empty) {
    for (const tpl of DEFAULT_INVOICE_TEMPLATES) {
      await db.collection("invoiceTemplates").doc(tpl.id).set(tpl);
    }
  }
}

/**
 * GET /api/invoice-templates
 * Public / Shop list — returns active templates with entitlement resolution for current business.
 */
router.get("/", async (req, res) => {
  try {
    await ensureDefaultTemplatesSeeded();
    const db = getDb();

    // Check optional auth for business entitlement
    let business: any = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret_change_me";
        const jwt = (await import("jsonwebtoken")).default;
        const decoded = jwt.verify(token, jwtSecret) as any;
        const bizId = decoded.businessId || decoded.actingBusinessId;
        if (bizId) {
          const bDoc = await db.collection("businesses").doc(bizId).get();
          if (bDoc.exists) business = { id: bDoc.id, ...bDoc.data() };
        }
      } catch { /* token may be unverified or expired */ }
    }

    const snapshot = await db.collection("invoiceTemplates").get();
    let templates: any[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter to active templates for client facing
    templates = templates.filter((t) => t.status !== "inactive");

    const bizPlan = String(business?.plan || "").toLowerCase();
    const isPremium = Boolean(business?.isPremium || bizPlan.includes("pro") || bizPlan.includes("enterprise"));
    const unlockedIds = new Set<string | number>([
      1, "1", "tpl-01",
      ...(Array.isArray(business?.unlockedTemplates) ? business.unlockedTemplates : []),
    ]);

    const enriched = templates.map((tmpl) => {
      let isUnlocked = false;
      let unlockReason = "locked";

      if (tmpl.price === 0 || tmpl.availability === "all") {
        isUnlocked = true;
        unlockReason = "free";
      } else if (
        (tmpl.availability === "subscription" || tmpl.requiredPlan === "pro") &&
        (bizPlan.includes("pro") || bizPlan.includes("enterprise") || isPremium)
      ) {
        isUnlocked = true;
        unlockReason = "included_in_plan";
      } else if (
        tmpl.requiredPlan === "enterprise" &&
        bizPlan.includes("enterprise")
      ) {
        isUnlocked = true;
        unlockReason = "included_in_plan";
      } else if (
        unlockedIds.has(tmpl.id) ||
        (tmpl.numericId && unlockedIds.has(tmpl.numericId)) ||
        (tmpl.numericId && unlockedIds.has(String(tmpl.numericId)))
      ) {
        isUnlocked = true;
        unlockReason = "purchased";
      }

      return {
        ...tmpl,
        isUnlocked,
        unlockReason,
        isPurchased: unlockReason === "purchased",
      };
    });

    res.json({ templates: enriched });
  } catch (error) {
    console.error("List invoice templates error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/invoice-templates/admin/all
 * SaaS Admin only — returns all templates including inactive, with purchase counts.
 */
router.get("/admin/all", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (_req, res) => {
  try {
    await ensureDefaultTemplatesSeeded();
    const db = getDb();
    const [tmplSnap, purchasesSnap] = await Promise.all([
      db.collection("invoiceTemplates").get(),
      db.collection("templatePurchases").get().catch(() => ({ docs: [] })),
    ]);

    const purchaseCounts: Record<string, number> = {};
    const purchaseRevenue: Record<string, number> = {};

    purchasesSnap.docs.forEach((doc: any) => {
      const p = doc.data();
      const tid = p.templateId || (p.templateNumericId ? `tpl-0${p.templateNumericId}` : null);
      if (tid) {
        purchaseCounts[tid] = (purchaseCounts[tid] || 0) + 1;
        purchaseRevenue[tid] = (purchaseRevenue[tid] || 0) + (Number(p.amount) || 0);
      }
    });

    const templates = tmplSnap.docs.map((doc) => {
      const t = { id: doc.id, ...doc.data() };
      return {
        ...t,
        totalPurchases: purchaseCounts[t.id] || 0,
        totalRevenue: purchaseRevenue[t.id] || 0,
      };
    });

    res.json({ templates });
  } catch (error) {
    console.error("Admin list invoice templates error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/invoice-templates
 * SaaS Admin only — create a new template
 */
router.post("/", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const {
      name,
      description = "",
      layout = "modern",
      price = 0,
      status = "active",
      availability = "subscription",
      requiredPlan = "pro",
      config = {},
    } = req.body || {};

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Template name is required." });
      return;
    }

    const db = getDb();
    const countSnap = await db.collection("invoiceTemplates").get();
    const numericId = countSnap.size + 1;
    const templateId = `tpl-${String(numericId).padStart(2, "0")}`;

    const newTemplate: InvoiceTemplateItem = {
      id: templateId,
      numericId,
      name,
      description,
      layout,
      price: Number(price) || 0,
      status: status === "inactive" ? "inactive" : "active",
      availability: availability || "subscription",
      requiredPlan: requiredPlan || "pro",
      config: {
        primaryColor: config.primaryColor || "#4f46e5",
        accentColor: config.accentColor || "#818cf8",
        fontFamily: config.fontFamily || "sans",
        paperSize: config.paperSize || "A4",
        showLogo: config.showLogo ?? true,
        showWatermark: config.showWatermark ?? false,
        showQrCode: config.showQrCode ?? true,
        showTerms: config.showTerms ?? true,
        termsText: config.termsText || "Thank you for your business.",
        footerNote: config.footerNote || "Powered by Bizora ERP",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("invoiceTemplates").doc(templateId).set(newTemplate);

    await logAudit({
      ...auditActorFromReq(req as any),
      action: `Created invoice template: ${name}`,
      targetType: "invoiceTemplate",
      targetId: templateId,
    });

    res.status(201).json({ success: true, template: newTemplate });
  } catch (error) {
    console.error("Create invoice template error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PUT /api/invoice-templates/:id
 * SaaS Admin only — update template
 */
router.put("/:id", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const db = getDb();
    const docRef = db.collection("invoiceTemplates").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Template '${id}' not found.` });
      return;
    }

    const current = doc.data() as InvoiceTemplateItem;
    const updatePayload = {
      ...current,
      ...req.body,
      id: current.id,
      numericId: current.numericId,
      updatedAt: new Date().toISOString(),
    };

    if (req.body.price !== undefined) updatePayload.price = Number(req.body.price) || 0;
    if (req.body.config) {
      updatePayload.config = {
        ...current.config,
        ...req.body.config,
      };
    }

    await docRef.set(updatePayload);

    await logAudit({
      ...auditActorFromReq(req as any),
      action: `Updated invoice template: ${updatePayload.name}`,
      targetType: "invoiceTemplate",
      targetId: id,
    });

    res.json({ success: true, template: updatePayload });
  } catch (error) {
    console.error("Update invoice template error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/invoice-templates/:id/duplicate
 * SaaS Admin only — duplicate existing template
 */
router.post("/:id/duplicate", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const db = getDb();
    const docRef = db.collection("invoiceTemplates").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Template '${id}' not found.` });
      return;
    }

    const current = doc.data() as InvoiceTemplateItem;
    const countSnap = await db.collection("invoiceTemplates").get();
    const numericId = countSnap.size + 1;
    const duplicateId = `tpl-${String(numericId).padStart(2, "0")}`;

    const duplicateTmpl: InvoiceTemplateItem = {
      ...current,
      id: duplicateId,
      numericId,
      name: `${current.name} (Copy)`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("invoiceTemplates").doc(duplicateId).set(duplicateTmpl);

    await logAudit({
      ...auditActorFromReq(req as any),
      action: `Duplicated invoice template ${current.name} -> ${duplicateTmpl.name}`,
      targetType: "invoiceTemplate",
      targetId: duplicateId,
    });

    res.status(201).json({ success: true, template: duplicateTmpl });
  } catch (error) {
    console.error("Duplicate invoice template error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/invoice-templates/:id/status
 * SaaS Admin only — toggle active/inactive status
 */
router.patch("/:id/status", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body || {};
    const db = getDb();
    const docRef = db.collection("invoiceTemplates").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Template '${id}' not found.` });
      return;
    }

    const current = doc.data() as InvoiceTemplateItem;
    const newStatus = status || (current.status === "active" ? "inactive" : "active");

    await docRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Toggle template status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /api/invoice-templates/:id
 * SaaS Admin only — delete a template (protect default template 1)
 */
router.delete("/:id", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === "tpl-01" || id === "1") {
      res.status(400).json({ error: "The default system template cannot be deleted." });
      return;
    }

    const db = getDb();
    const docRef = db.collection("invoiceTemplates").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Template '${id}' not found.` });
      return;
    }

    await docRef.delete();

    await logAudit({
      ...auditActorFromReq(req as any),
      action: `Deleted invoice template: ${id}`,
      targetType: "invoiceTemplate",
      targetId: id,
    });

    res.json({ success: true, message: `Template '${id}' deleted.` });
  } catch (error) {
    console.error("Delete template error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/invoice-templates/:id/purchase
 * Client Shop Owner — complete template purchase workflow with payment record
 */
router.post("/:id/purchase", authenticateToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const businessId = getActingBusinessId(req as any);

    if (!businessId) {
      res.status(403).json({ error: "No active business context for this account." });
      return;
    }

    const db = getDb();
    const [bizDoc, tmplDoc] = await Promise.all([
      db.collection("businesses").doc(businessId).get(),
      db.collection("invoiceTemplates").doc(id).get(),
    ]);

    if (!bizDoc.exists) {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (!tmplDoc.exists) {
      res.status(404).json({ error: `Template '${id}' not found.` });
      return;
    }

    const biz = bizDoc.data() || {};
    const tmpl = tmplDoc.data() as InvoiceTemplateItem;
    const currentUnlocked = Array.isArray(biz.unlockedTemplates) ? biz.unlockedTemplates : [];

    // Check if already unlocked
    if (
      currentUnlocked.includes(tmpl.id) ||
      (tmpl.numericId && currentUnlocked.includes(tmpl.numericId)) ||
      (tmpl.numericId && currentUnlocked.includes(String(tmpl.numericId)))
    ) {
      res.json({
        success: true,
        alreadyOwned: true,
        message: "This template is already unlocked for your business.",
        template: tmpl,
      });
      return;
    }

    const { paymentMethod = "bKash", paymentReference } = req.body || {};
    const templatePrice = Number(tmpl.price) || 0;
    if (templatePrice > 0) {
      if (!paymentReference || typeof paymentReference !== "string" || paymentReference.trim().length < 6) {
        return res.status(400).json({ error: "A valid transaction/payment reference (minimum 6 characters) is required for paid templates." });
      }
    }
    const safeRef = paymentReference ? String(paymentReference).trim() : `FREE-${Date.now()}`;
    const purchaseId = `tp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const purchaseRecord = {
      id: purchaseId,
      businessId,
      businessName: biz.name || biz.businessName || "Unknown Shop",
      templateId: tmpl.id,
      templateNumericId: tmpl.numericId || null,
      templateName: tmpl.name,
      amount: Number(tmpl.price) || 0,
      currency: biz.currency || "BDT",
      paymentMethod,
      paymentReference: safeRef,
      status: "completed",
      purchasedBy: (req as any).user?.name || (req as any).user?.email || "Shop Owner",
      purchasedById: (req as any).user?.id,
      purchasedAt: nowIso,
    };

    // Save purchase record
    await db.collection("templatePurchases").doc(purchaseId).set(purchaseRecord);

    // Update business unlockedTemplates array
    const updatedUnlocked = Array.from(new Set([
      ...currentUnlocked,
      tmpl.id,
      tmpl.numericId,
    ])).filter(Boolean);

    await db.collection("businesses").doc(businessId).update({
      unlockedTemplates: updatedUnlocked,
      updatedAt: nowIso,
    });

    // Record in audit log
    await logAudit({
      ...auditActorFromReq(req as any),
      action: `Purchased invoice template: ${tmpl.name} (${tmpl.price} ${biz.currency || "BDT"})`,
      targetType: "invoiceTemplatePurchase",
      targetId: purchaseId,
      details: JSON.stringify({ businessId, templateId: tmpl.id, amount: tmpl.price }),
    });

    res.json({
      success: true,
      message: `Template '${tmpl.name}' unlocked successfully!`,
      purchase: purchaseRecord,
      unlockedTemplates: updatedUnlocked,
    });
  } catch (error) {
    console.error("Purchase invoice template error:", error);
    res.status(500).json({ error: "Internal Server Error during template purchase" });
  }
});

/**
 * GET /api/invoice-templates/mine/purchases
 * Client Shop Owner — get list of template purchases for current business
 */
router.get("/mine/purchases", authenticateToken, async (req, res) => {
  try {
    const businessId = getActingBusinessId(req as any);
    if (!businessId) {
      res.status(403).json({ error: "No active business context." });
      return;
    }

    const db = getDb();
    const snapshot = await db
      .collection("templatePurchases")
      .where("businessId", "==", businessId)
      .get();

    const purchases = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime());

    res.json({ purchases });
  } catch (error) {
    console.error("Get my template purchases error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
