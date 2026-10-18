import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import type { WebhookEndpoint } from "../lib/webhooks.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext, requirePermission("admin.settings"));

router.get("/", async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const doc = await getDb().collection("businesses").doc(businessId).get();
    const webhooks = (doc.data()?.webhooks as WebhookEndpoint[]) || [];
    // Never return full secrets in list — mask
    res.json({
      webhooks: webhooks.map((w) => ({
        ...w,
        secret: w.secret ? "••••••••" : undefined,
        hasSecret: !!w.secret,
      })),
    });
  } catch (error) {
    console.error("List webhooks error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const incoming = Array.isArray(req.body?.webhooks) ? req.body.webhooks : [];
    const webhooks = incoming.map((w: any, i: number) =>
      stripUndefined({
        id: w.id || `wh_${Date.now()}_${i}`,
        url: String(w.url || "").trim(),
        secret: w.secret && w.secret !== "••••••••" ? w.secret : w.secret === "••••••••" ? undefined : w.secret,
        events: Array.isArray(w.events) && w.events.length ? w.events : ["*"],
        active: w.active !== false,
        createdAt: w.createdAt || new Date().toISOString(),
      })
    ).filter((w: WebhookEndpoint) => w.url.startsWith("http"));

    // Preserve secrets when masked
    const doc = await getDb().collection("businesses").doc(businessId).get();
    const existing = (doc.data()?.webhooks as WebhookEndpoint[]) || [];
    const merged = webhooks.map((w: WebhookEndpoint) => {
      if (!w.secret) {
        const prev = existing.find((e) => e.id === w.id);
        if (prev?.secret) return { ...w, secret: prev.secret };
      }
      return w;
    });

    await getDb().collection("businesses").doc(businessId).set({ webhooks: merged }, { merge: true });
    res.json({ webhooks: merged.map((w) => ({ ...w, secret: w.secret ? "••••••••" : undefined, hasSecret: !!w.secret })) });
  } catch (error) {
    console.error("Save webhooks error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/** POST /api/webhooks/test — send a test event to all active endpoints */
router.post("/test", async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { dispatchWebhooks } = await import("../lib/webhooks.js");
    await dispatchWebhooks(businessId, "transaction.created", {
      test: true,
      message: "Bizora webhook test ping",
    });
    res.json({ ok: true, message: "Test event dispatched" });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
