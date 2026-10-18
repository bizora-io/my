import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { COURIER_PROVIDERS, createShipment, steadfastFetchStatus, pathaoGetToken, pathaoFetchStatus, redxFetchStatus, mapSteadfastStatus, mapRedxStatus, type CourierCredentials, type CourierProvider } from "../lib/couriers.js";
import { logAudit } from "../lib/auditLog.js";

const router = express.Router();

function bizDoc(businessId: string) {
  return getDb().collection("businesses").doc(businessId);
}
function ordersCol(businessId: string) {
  return bizDoc(businessId).collection("onlineOrders");
}

router.get("/providers", authenticateToken, (_req, res) => {
  res.json({ providers: COURIER_PROVIDERS });
});

router.get(
  "/settings",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.manage", "shop.orders"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const doc = await bizDoc(businessId).get();
      const list = doc.data()?.courierSettings || [];
      // mask secrets
      const masked = (Array.isArray(list) ? list : []).map((c: any) => ({
        ...c,
        apiKey: c.apiKey ? `${String(c.apiKey).slice(0, 4)}…` : "",
        apiSecret: c.apiSecret ? "••••" : "",
        hasKeys: !!(c.apiKey && c.apiSecret),
      }));
      res.json({ courierSettings: masked, providers: COURIER_PROVIDERS });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.put(
  "/settings",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const incoming = Array.isArray(req.body?.courierSettings) ? req.body.courierSettings : null;
      const single = req.body?.provider ? req.body : null;
      const doc = await bizDoc(businessId).get();
      let list: any[] = Array.isArray(doc.data()?.courierSettings) ? [...doc.data()!.courierSettings] : [];

      // Ensure Manual always present
      if (!list.find((c) => c.provider === "Manual")) {
        list.unshift({ provider: "Manual", apiKey: "", apiSecret: "", enabled: true });
      }

      if (incoming) {
        list = incoming.map((c: any) => ({
          provider: c.provider,
          apiKey: c.apiKey || "",
          apiSecret: c.apiSecret || "",
          enabled: !!c.enabled,
          storeId: c.storeId || "",
          baseUrl: c.baseUrl || "",
        }));
      } else if (single) {
        const idx = list.findIndex((c) => c.provider === single.provider);
        const prev = idx >= 0 ? list[idx] : {};
        const next = {
          provider: single.provider,
          apiKey: single.apiKey !== undefined && single.apiKey !== "••••" && !String(single.apiKey).includes("…")
            ? single.apiKey
            : prev.apiKey || "",
          apiSecret:
            single.apiSecret !== undefined && single.apiSecret !== "••••"
              ? single.apiSecret
              : prev.apiSecret || "",
          enabled: single.enabled !== undefined ? !!single.enabled : !!prev.enabled,
          storeId: single.storeId !== undefined ? single.storeId : prev.storeId || "",
          baseUrl: single.baseUrl !== undefined ? single.baseUrl : prev.baseUrl || "",
          username: single.username !== undefined ? single.username : prev.username || "",
          password:
            single.password !== undefined && single.password !== "••••"
              ? single.password
              : prev.password || "",
          areaId: single.areaId !== undefined ? single.areaId : prev.areaId || "",
        };
        if (idx >= 0) list[idx] = next;
        else list.push(next);
      }

      await bizDoc(businessId).set({ courierSettings: list }, { merge: true });
      res.json({ ok: true, count: list.length });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * POST /api/couriers/ship
 * Body: { orderId, provider? }
 * Creates courier consignment, updates online order tracking + status Shipped.
 */
router.post(
  "/ship",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.orders", "shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const orderId = String(req.body?.orderId || "");
      if (!orderId) return res.status(400).json({ error: "orderId required" });

      const orderRef = ordersCol(businessId).doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data() || {};

      const biz = (await bizDoc(businessId).get()).data() || {};
      let list: any[] = Array.isArray(biz.courierSettings) ? biz.courierSettings : [];
      if (!list.find((c) => c.provider === "Manual")) {
        list = [{ provider: "Manual", enabled: true, apiKey: "", apiSecret: "" }, ...list];
      }

      const provider = (req.body?.provider ||
        list.find((c) => c.enabled && c.provider !== "Manual")?.provider ||
        "Manual") as CourierProvider;

      const cred = list.find((c) => c.provider === provider) || {
        provider,
        enabled: true,
        apiKey: "",
        apiSecret: "",
      };

      const amountToCollect =
        String(order.paymentMethod || "COD").toUpperCase() === "COD" ||
        order.paymentStatus === "unpaid"
          ? Number(order.total) || 0
          : 0;

      const result = await createShipment(cred as CourierCredentials, {
        orderId,
        recipientName: order.customerName || "Customer",
        recipientPhone: order.customerMobile || order.mobile || "",
        recipientAddress: order.address || "",
        amountToCollect,
        itemDescription: (order.items || []).map((i: any) => `${i.name} x${i.qty}`).join(", ").slice(0, 200),
        note: `Bizora order ${orderId}`,
      });

      if (!result.ok) {
        return res.status(502).json({ error: result.message || "Courier failed", result });
      }

      // Cache Pathao OAuth token on business courier settings when issued
      if (result.provider === "Pathao" && result.raw?._tokenExpiresIn && result.raw?._refresh !== undefined) {
        try {
          const tokenFromRaw = result.raw?.data ? null : null;
        } catch { /* ignore */ }
      }
      // Re-fetch token was inside create; if live Pathao, store access on settings if we got expires
      if (result.provider === "Pathao" && result.mode === "live") {
        const updatedList = list.map((c: any) => {
          if (c.provider !== "Pathao") return c;
          return c;
        });
        // Token caching requires pathaoGetToken to return and ship to call it — skip if not in raw
      }

      const shippedAt = new Date().toISOString();
      const prevTimeline = Array.isArray(order.deliveryTimeline) ? order.deliveryTimeline : [];
      await orderRef.set(
        {
          status: "Shipped",
          deliveryStatus: "InTransit",
          courier: result.provider,
          trackingNumber: result.trackingNumber,
          consignmentId: result.consignmentId || null,
          courierMode: result.mode,
          shippedAt,
          deliveryTimeline: [
            ...prevTimeline,
            {
              status: "InTransit",
              at: shippedAt,
              note: `${result.provider}: ${result.trackingNumber}`,
              by: (req as any).user.id,
            },
          ],
          updatedAt: shippedAt,
        },
        { merge: true }
      );

      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `Ship order ${orderId} via ${result.provider} (${result.trackingNumber})`,
        targetType: "onlineOrder",
        targetId: orderId,
      });

      res.json({
        ok: true,
        trackingNumber: result.trackingNumber,
        provider: result.provider,
        mode: result.mode,
        message: result.message,
        orderId,
        status: "Shipped",
      });
    } catch (error) {
      console.error("Courier ship error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


/** Delivery pipeline statuses */
export const DELIVERY_STATUSES = [
  "Pending",
  "Processing",
  "PickedUp",
  "InTransit",
  "OutForDelivery",
  "Delivered",
  "Failed",
  "Returned",
  "Cancelled",
] as const;

/**
 * POST /api/couriers/delivery-status
 * Body: { orderId, deliveryStatus, note? }
 * Appends to deliveryTimeline and syncs order.status where relevant.
 */
router.post(
  "/delivery-status",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.orders", "shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const orderId = String(req.body?.orderId || "");
      const deliveryStatus = String(req.body?.deliveryStatus || "").trim();
      const note = String(req.body?.note || "").trim();
      if (!orderId || !deliveryStatus) {
        return res.status(400).json({ error: "orderId and deliveryStatus required" });
      }
      if (!(DELIVERY_STATUSES as readonly string[]).includes(deliveryStatus)) {
        return res.status(400).json({ error: "Invalid deliveryStatus", allowed: DELIVERY_STATUSES });
      }

      const orderRef = ordersCol(businessId).doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data() || {};
      const timeline = Array.isArray(order.deliveryTimeline) ? [...order.deliveryTimeline] : [];
      const entry = {
        status: deliveryStatus,
        note: note || null,
        at: new Date().toISOString(),
        by: (req as any).user.id,
      };
      timeline.push(entry);

      // Map delivery → public order.status
      let status = order.status;
      if (deliveryStatus === "Pending") status = "Pending";
      else if (deliveryStatus === "Processing" || deliveryStatus === "PickedUp") status = "Processing";
      else if (
        deliveryStatus === "InTransit" ||
        deliveryStatus === "OutForDelivery" ||
        deliveryStatus === "Shipped"
      ) {
        status = "Shipped";
      } else if (deliveryStatus === "Delivered") status = "Delivered";
      else if (deliveryStatus === "Cancelled") status = "Cancelled";
      else if (deliveryStatus === "Returned" || deliveryStatus === "Failed") status = "Shipped";

      await orderRef.set(
        {
          deliveryStatus,
          deliveryTimeline: timeline,
          status,
          ...(deliveryStatus === "Delivered" ? { deliveredAt: entry.at } : {}),
          updatedAt: entry.at,
        },
        { merge: true }
      );

      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `Delivery ${orderId} → ${deliveryStatus}`,
        targetType: "onlineOrder",
        targetId: orderId,
      });

      res.json({
        ok: true,
        orderId,
        deliveryStatus,
        status,
        timeline,
      });
    } catch (error) {
      console.error("Delivery status error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/delivery-statuses", authenticateToken, (_req, res) => {
  res.json({
    statuses: [
      { id: "Pending", label: "Order placed", labelBn: "অর্ডার হয়েছে" },
      { id: "Processing", label: "Processing", labelBn: "প্রসেসিং" },
      { id: "PickedUp", label: "Picked up", labelBn: "পিকআপ" },
      { id: "InTransit", label: "In transit", labelBn: "রওনা" },
      { id: "OutForDelivery", label: "Out for delivery", labelBn: "ডেলিভারিতে" },
      { id: "Delivered", label: "Delivered", labelBn: "ডেলিভারড" },
      { id: "Failed", label: "Failed attempt", labelBn: "ব্যর্থ" },
      { id: "Returned", label: "Returned", labelBn: "রিটার্ন" },
      { id: "Cancelled", label: "Cancelled", labelBn: "বাতিল" },
    ],
  });
});


/**
 * POST /api/couriers/sync-status
 * Body: { orderId }
 * Pull live status from courier (Steadfast first) and append delivery timeline.
 */
router.post(
  "/sync-status",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.orders", "shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const orderId = String(req.body?.orderId || "");
      if (!orderId) return res.status(400).json({ error: "orderId required" });

      const orderRef = ordersCol(businessId).doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data() || {};

      const provider = String(order.courier || req.body?.provider || "Steadfast");
      const biz = (await bizDoc(businessId).get()).data() || {};
      const list: any[] = Array.isArray(biz.courierSettings) ? biz.courierSettings : [];
      const cred = list.find((c) => c.provider === provider) || list.find((c) => c.provider === "Steadfast");

      const courierName = String(order.courier || provider);
      let result;
      if (courierName === "Steadfast" || provider === "Steadfast") {
        const stCred = list.find((c) => c.provider === "Steadfast") || cred;
        if (!stCred?.apiKey || !stCred?.apiSecret) {
          return res.status(400).json({ error: "Steadfast API keys not configured" });
        }
        result = await steadfastFetchStatus(stCred as CourierCredentials, {
          trackingNumber: order.trackingNumber,
          invoice: orderId,
          consignmentId: order.consignmentId,
        });
      } else if (courierName === "RedX" || provider === "RedX") {
        const rxCred = list.find((c) => c.provider === "RedX") || cred;
        if (!rxCred?.apiKey && !rxCred?.accessToken) {
          return res.status(400).json({ error: "RedX API token not configured" });
        }
        if (!order.trackingNumber) {
          return res.status(400).json({ error: "No tracking number on order" });
        }
        result = await redxFetchStatus(rxCred as CourierCredentials, order.trackingNumber);
      } else if (courierName === "Pathao" || provider === "Pathao") {
        const pCred = list.find((c) => c.provider === "Pathao") || cred;
        const cid = order.consignmentId || order.trackingNumber;
        if (!cid) {
          return res.status(400).json({ error: "No Pathao consignment id on order" });
        }
        if (!pCred?.apiKey || !pCred?.apiSecret) {
          return res.status(400).json({ error: "Pathao credentials not configured" });
        }
        result = await pathaoFetchStatus(pCred as CourierCredentials, String(cid));
      } else {
        return res.status(400).json({
          error: "Live status sync supports Steadfast, RedX, and Pathao. Use Delivery status for others.",
          provider: courierName,
        });
      }

      if (!result.ok) {
        return res.status(502).json({ error: result.message || "Sync failed", result });
      }

      const atIso = new Date().toISOString();
      const timeline = Array.isArray(order.deliveryTimeline) ? [...order.deliveryTimeline] : [];
      const last = timeline[timeline.length - 1];
      if (!last || last.status !== result.deliveryStatus) {
        timeline.push({
          status: result.deliveryStatus,
          at: atIso,
          note: result.rawStatus
            ? `Steadfast: ${result.rawStatus}`
            : "Synced from Steadfast",
          by: "steadfast-sync",
        });
      }

      let status = order.status;
      if (result.deliveryStatus === "Delivered") status = "Delivered";
      else if (result.deliveryStatus === "Cancelled") status = "Cancelled";
      else if (["InTransit", "OutForDelivery", "PickedUp", "Failed", "Returned"].includes(result.deliveryStatus)) {
        status = "Shipped";
      } else if (result.deliveryStatus === "Processing") status = "Processing";

      await orderRef.set(
        {
          deliveryStatus: result.deliveryStatus,
          deliveryTimeline: timeline,
          status,
          lastCourierSyncAt: atIso,
          ...(result.deliveryStatus === "Delivered" ? { deliveredAt: atIso } : {}),
          updatedAt: atIso,
        },
        { merge: true }
      );

      res.json({
        ok: true,
        orderId,
        deliveryStatus: result.deliveryStatus,
        rawStatus: result.rawStatus,
        status,
        timeline,
        mode: result.mode,
      });
    } catch (error) {
      console.error("Courier sync-status error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


/**
 * POST /api/couriers/pathao/test-auth — verify Pathao OAuth credentials
 */
router.post(
  "/pathao/test-auth",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const biz = (await bizDoc(businessId).get()).data() || {};
      const list: any[] = Array.isArray(biz.courierSettings) ? biz.courierSettings : [];
      let cred = list.find((c) => c.provider === "Pathao") || {};
      // Allow body override for testing before save
      if (req.body?.apiKey) cred = { ...cred, ...req.body, provider: "Pathao" };
      const tok = await pathaoGetToken(cred as CourierCredentials);
      if (!tok.token) {
        return res.status(400).json({ ok: false, error: tok.error || "Auth failed" });
      }
      // Optionally persist token
      const expiresAt = Date.now() + (tok.expiresIn || 3600) * 1000;
      const nextList = list.some((c) => c.provider === "Pathao")
        ? list.map((c) =>
            c.provider === "Pathao"
              ? { ...c, accessToken: tok.token, refreshToken: tok.refresh, tokenExpiresAt: expiresAt }
              : c
          )
        : [
            ...list,
            {
              provider: "Pathao",
              enabled: true,
              accessToken: tok.token,
              refreshToken: tok.refresh,
              tokenExpiresAt: expiresAt,
            },
          ];
      await bizDoc(businessId).set({ courierSettings: nextList }, { merge: true });
      res.json({ ok: true, message: "Pathao token issued", expiresIn: tok.expiresIn });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Internal Server Error" });
    }
  }
);


/**
 * Apply inbound courier webhook / status to an online order by tracking or invoice.
 */
async function applyCourierWebhookUpdate(
  businessId: string,
  opts: {
    provider: string;
    trackingNumber?: string;
    invoice?: string;
    consignmentId?: string;
    rawStatus: string;
    mappedStatus: string;
    note?: string;
  }
) {
  const snap = await ordersCol(businessId).get();
  let match: any = null;
  for (const doc of snap.docs) {
    const o = doc.data() || {};
    if (opts.trackingNumber && String(o.trackingNumber) === String(opts.trackingNumber)) {
      match = doc;
      break;
    }
    if (opts.consignmentId && String(o.consignmentId) === String(opts.consignmentId)) {
      match = doc;
      break;
    }
    if (opts.invoice && (doc.id === opts.invoice || String(o.externalId) === opts.invoice)) {
      match = doc;
      break;
    }
  }
  if (!match) return { ok: false as const, error: "Order not found for tracking/invoice" };

  const order = match.data() || {};
  const atIso = new Date().toISOString();
  const timeline = Array.isArray(order.deliveryTimeline) ? [...order.deliveryTimeline] : [];
  const last = timeline[timeline.length - 1];
  if (!last || last.status !== opts.mappedStatus) {
    timeline.push({
      status: opts.mappedStatus,
      at: atIso,
      note: opts.note || `${opts.provider} webhook: ${opts.rawStatus}`,
      by: `${opts.provider.toLowerCase()}-webhook`,
    });
  }

  let status = order.status;
  if (opts.mappedStatus === "Delivered") status = "Delivered";
  else if (opts.mappedStatus === "Cancelled") status = "Cancelled";
  else if (["InTransit", "OutForDelivery", "PickedUp", "Failed", "Returned"].includes(opts.mappedStatus)) {
    status = "Shipped";
  } else if (opts.mappedStatus === "Processing") status = "Processing";

  await match.ref.set(
    {
      deliveryStatus: opts.mappedStatus,
      deliveryTimeline: timeline,
      status,
      lastCourierSyncAt: atIso,
      ...(opts.mappedStatus === "Delivered" ? { deliveredAt: atIso } : {}),
      updatedAt: atIso,
    },
    { merge: true }
  );

  return {
    ok: true as const,
    orderId: match.id,
    deliveryStatus: opts.mappedStatus,
    status,
  };
}

/**
 * POST /api/couriers/webhook/:provider/:businessId
 * Public endpoint — courier platforms POST status updates.
 * Optional header x-webhook-secret must match business ecommerce.apiKey or courier webhookSecret.
 *
 * Steadfast-style body: { invoice, tracking_code, delivery_status, consignment_id }
 * RedX-style: { tracking_id, status, status_message }
 * Pathao-style: { consignment_id, merchant_order_id, order_status }
 */
router.post("/webhook/:provider/:businessId", async (req, res) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    const businessId = String(req.params.businessId || "");
    if (!businessId) return res.status(400).json({ error: "businessId required" });

    const bizDocSnap = await bizDoc(businessId).get();
    if (!bizDocSnap.exists) return res.status(404).json({ error: "Business not found" });
    const biz = bizDocSnap.data() || {};

    const expected =
      biz.ecommerce?.webhookSecret ||
      biz.ecommerce?.apiKey ||
      (Array.isArray(biz.courierSettings)
        ? biz.courierSettings.find((c: any) => String(c.provider).toLowerCase() === provider)?.webhookSecret
        : null);
    if (expected) {
      const got =
        req.header("x-webhook-secret") ||
        req.header("x-pathao-merchant-webhook-integration-secret") ||
        req.body?.secret ||
        "";
      if (got !== expected) {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }
    }

    const body = req.body || {};
    let trackingNumber =
      body.tracking_code || body.tracking_id || body.trackingNumber || body.trackingId || body.consignment_id;
    let invoice = body.invoice || body.merchant_order_id || body.merchant_invoice_id || body.order_id;
    let consignmentId = body.consignment_id || body.consignmentId || trackingNumber;
    let rawStatus =
      body.delivery_status ||
      body.status_message ||
      body.order_status ||
      body.status ||
      body.parcel_status ||
      "";

    let mapped = "InTransit";
    let providerLabel = "Courier";
    if (provider === "steadfast") {
      providerLabel = "Steadfast";
      mapped = mapSteadfastStatus(String(rawStatus));
    } else if (provider === "redx") {
      providerLabel = "RedX";
      mapped = mapRedxStatus(String(rawStatus));
    } else if (provider === "pathao") {
      providerLabel = "Pathao";
      mapped = mapSteadfastStatus(String(rawStatus)); // similar keywords
    } else if (provider === "paperfly") {
      providerLabel = "Paperfly";
      mapped = mapSteadfastStatus(String(rawStatus));
    } else {
      mapped = mapSteadfastStatus(String(rawStatus));
      providerLabel = provider || "Courier";
    }

    if (!trackingNumber && !invoice && !consignmentId) {
      return res.status(400).json({ error: "Need tracking_code, invoice, or consignment_id" });
    }

    const result = await applyCourierWebhookUpdate(businessId, {
      provider: providerLabel,
      trackingNumber: trackingNumber ? String(trackingNumber) : undefined,
      invoice: invoice ? String(invoice) : undefined,
      consignmentId: consignmentId ? String(consignmentId) : undefined,
      rawStatus: String(rawStatus),
      mappedStatus: mapped,
    });

    if (!result.ok) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Courier webhook error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/couriers/webhook-info — authenticated, shows webhook URLs for this business
 */
router.get(
  "/webhook-info",
  authenticateToken,
  requireBusinessContext,
  requirePermission("shop.manage", "shop.orders"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const base = `${req.protocol}://${req.get("host")}`;
      res.json({
        businessId,
        endpoints: {
          steadfast: `${base}/api/couriers/webhook/steadfast/${businessId}`,
          redx: `${base}/api/couriers/webhook/redx/${businessId}`,
          pathao: `${base}/api/couriers/webhook/pathao/${businessId}`,
          paperfly: `${base}/api/couriers/webhook/paperfly/${businessId}`,
        },
        header: "x-webhook-secret: <your storefront API key or webhook secret>",
        note: "Register these URLs in the courier merchant panel. Secret optional but recommended.",
      });
    } catch {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


export default router;



