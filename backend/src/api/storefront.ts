/**
 * Public e-commerce storefront API + authenticated fulfill.
 * Resolve shop by subdomain (domainSettings) or businessId query.
 */
import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { allocateFefo, applyFefoDeduction, type FefoLot } from "../lib/fefo.js";
import { logAudit } from "../lib/auditLog.js";
import { broadcastBusinessSync } from "../lib/chatSocket.js";
import { STOREFRONT_THEMES, getTheme } from "../lib/storefrontThemes.js";

const router = express.Router();

function bizCol(businessId: string, name: string) {
  return getDb().collection("businesses").doc(businessId).collection(name);
}

async function resolveBusinessId(slugOrId: string): Promise<{ id: string; data: any } | null> {
  const db = getDb();
  const direct = await db.collection("businesses").doc(slugOrId).get();
  if (direct.exists) return { id: direct.id, data: direct.data() };

  // Scan settings for subdomain match (small deployments; index later)
  const snap = await db.collection("businesses").limit(200).get();
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const sub =
      d.domainSettings?.subdomain ||
      d.settings?.domainSettings?.subdomain ||
      d.subdomain ||
      d.slug;
    if (sub && String(sub).toLowerCase() === slugOrId.toLowerCase()) {
      return { id: doc.id, data: d };
    }
    if (d.businessName && String(d.businessName).toLowerCase().replace(/\s+/g, "-") === slugOrId.toLowerCase()) {
      return { id: doc.id, data: d };
    }
  }
  return null;
}

function publicProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.notes || p.description || "",
    salePrice: Number(p.salePrice) || 0,
    stock: Math.max(0, Number(p.stock) || 0),
    image: p.image || (Array.isArray(p.images) && p.images[0]) || null,
    category: p.category || null,
    sku: p.sku || null,
    unit: p.unit || "Pcs",
  };
}

/**
 * GET /api/storefront/themes — list ready templates
 */
router.get("/themes", (_req, res) => {
  res.json({ themes: STOREFRONT_THEMES });
});

/**
 * GET /api/storefront/:slug/catalog
 * Public product list (sellOnline === true, in stock optional).
 */
router.get("/:slug/catalog", async (req, res) => {
  try {
    const resolved = await resolveBusinessId(req.params.slug);
    if (!resolved) return res.status(404).json({ error: "Shop not found" });

    const snap = await bizCol(resolved.id, "products").get();
    const products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => !p.isDeleted && !p.isArchived && p.sellOnline === true)
      .map(publicProduct);

    const name =
      resolved.data.businessName ||
      resolved.data.name ||
      resolved.data.domainSettings?.subdomain ||
      req.params.slug;

    const ecommerce = resolved.data.ecommerce || {};
    if (ecommerce.published === false) {
      return res.status(403).json({ error: "Shop is not published yet" });
    }
    const theme = getTheme(ecommerce.themeId);
    const domainSettings = resolved.data.domainSettings || {};
    const customDomain = domainSettings.customDomain || ecommerce.customDomain || "";
    const subdomain = domainSettings.subdomain || ecommerce.subdomain || req.params.slug;
    const primaryHost =
      domainSettings.status === "Active" && customDomain
        ? customDomain
        : `${String(subdomain).replace(/\.bizora\.com$/i, "")}.bizora.com`;

    res.json({
      shop: {
        id: resolved.id,
        name,
        slug: req.params.slug,
        currency: resolved.data.settings?.currency || resolved.data.currency || "BDT",
        theme,
        published: ecommerce.published !== false,
        host: primaryHost,
        customDomain: customDomain || null,
        subdomain: subdomain || null,
        tagline: ecommerce.tagline || "Shop with us",
        paymentOptions: ecommerce.paymentOptions || [
          { id: "COD", label: "Cash on delivery" },
          { id: "bKash", label: "bKash" },
          { id: "Nagad", label: "Nagad" },
          { id: "Online", label: "Card / Online" },
        ],
      },
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Storefront catalog error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/storefront/:slug/orders
 * Public place order from website / marketplace connector.
 * Body: { customerName, address, mobile?, items: [{ productId, qty }], platform?, externalId? }
 */
router.post("/:slug/orders", async (req, res) => {
  try {
    const resolved = await resolveBusinessId(req.params.slug);
    if (!resolved) return res.status(404).json({ error: "Shop not found" });
    const businessId = resolved.id;
    const body = req.body || {};

    // Optional shared secret for channel connectors
    const expectedKey =
      resolved.data.ecommerce?.apiKey ||
      resolved.data.settings?.ecommerceApiKey ||
      null;
    if (expectedKey) {
      const key = req.header("x-storefront-key") || body.apiKey;
      if (key !== expectedKey) {
        return res.status(401).json({ error: "Invalid storefront API key" });
      }
    }

    const customerName = String(body.customerName || body.customer || "").trim();
    const address = String(body.address || "").trim();
    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (!customerName || !itemsIn.length) {
      return res.status(400).json({ error: "customerName and items required" });
    }

    const lineItems: any[] = [];
    let total = 0;
    for (const raw of itemsIn) {
      const productId = String(raw.productId || raw.id || "");
      const qty = Math.max(1, Number(raw.qty) || 1);
      if (!productId) continue;
      const doc = await bizCol(businessId, "products").doc(productId).get();
      if (!doc.exists) {
        return res.status(400).json({ error: `Product not found: ${productId}` });
      }
      const p = doc.data() || {};
      if (p.sellOnline !== true) {
        return res.status(400).json({ error: `Product not available online: ${p.name || productId}` });
      }
      const stock = Number(p.stock) || 0;
      if (stock < qty) {
        return res.status(409).json({
          error: `Insufficient stock for ${p.name || productId}`,
          available: stock,
        });
      }
      const price = Number(raw.price) || Number(p.salePrice) || 0;
      const lineTotal = price * qty;
      total += lineTotal;
      lineItems.push({
        productId,
        name: p.name || productId,
        qty,
        price,
        total: lineTotal,
      });
    }
    if (!lineItems.length) return res.status(400).json({ error: "No valid items" });

    const orderRef = bizCol(businessId, "onlineOrders").doc();
    const paymentMethod = String(body.paymentMethod || "COD").trim() || "COD";
    const order = {
      id: orderRef.id,
      customerName,
      customerMobile: body.mobile || body.phone || "",
      address,
      items: lineItems,
      total,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      platform: body.platform || "Bizora",
      externalId: body.externalId || body.orderId || null,
      source: "storefront",
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "unpaid" : "pending",
      createdAt: new Date().toISOString(),
      business_id: businessId,
    };
    await orderRef.set(order);

    try {
      broadcastBusinessSync(businessId, {
        domain: "onlineOrders",
        reason: "storefront_order",
        payload: { orderId: order.id, total: order.total, status: order.status },
      });
    } catch { /* socket optional */ }

    res.status(201).json({ order });
  } catch (error) {
    console.error("Storefront order error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/storefront/:slug/orders/track?mobile=&orderId=
 * Customer self-service status — no third party, no auth.
 */
router.get("/:slug/orders/track", async (req, res) => {
  try {
    const resolved = await resolveBusinessId(req.params.slug);
    if (!resolved) return res.status(404).json({ error: "Shop not found" });
    const mobile = String(req.query.mobile || "").replace(/\D/g, "");
    const orderId = String(req.query.orderId || "").trim();
    if (!mobile && !orderId) {
      return res.status(400).json({ error: "mobile or orderId required" });
    }
    const snap = await bizCol(resolved.id, "onlineOrders").get();
    let found: any = null;
    for (const doc of snap.docs) {
      const o: any = { id: doc.id, ...doc.data() };
      const om = String(o.customerMobile || o.mobile || "").replace(/\D/g, "");
      if (orderId && (doc.id === orderId || String(o.externalId) === orderId)) {
        if (!mobile || !om || om.endsWith(mobile.slice(-8)) || mobile.endsWith(om.slice(-8))) {
          found = o;
          break;
        }
      }
      if (!orderId && mobile && om && (om.endsWith(mobile.slice(-8)) || mobile.endsWith(om.slice(-8)))) {
        found = o; // latest match — keep scanning for most recent
        if (!found || String(o.createdAt || "") > String(found.createdAt || "")) found = o;
      }
    }
    // second pass for latest by mobile
    if (!orderId && mobile) {
      const matches = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o: any) => {
          const om = String(o.customerMobile || o.mobile || "").replace(/\D/g, "");
          return om && (om.endsWith(mobile.slice(-8)) || mobile.endsWith(om.slice(-8)));
        })
        .sort((a: any, b: any) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
      found = matches[0] || null;
    }
    if (!found) return res.status(404).json({ error: "Order not found" });
    const timeline = Array.isArray(found.deliveryTimeline) ? found.deliveryTimeline : [];
    // Seed timeline from known fields if empty
    const seeded =
      timeline.length > 0
        ? timeline
        : [
            { status: "Pending", at: found.createdAt || found.date, note: "Order placed" },
            ...(found.fulfilledAt
              ? [{ status: "Processing", at: found.fulfilledAt, note: "Stock fulfilled" }]
              : []),
            ...(found.shippedAt || found.trackingNumber
              ? [
                  {
                    status: found.deliveryStatus || "InTransit",
                    at: found.shippedAt || found.updatedAt,
                    note: found.trackingNumber
                      ? `${found.courier || "Courier"}: ${found.trackingNumber}`
                      : "Shipped",
                  },
                ]
              : []),
            ...(found.status === "Delivered" || found.deliveredAt
              ? [{ status: "Delivered", at: found.deliveredAt || found.updatedAt, note: "Delivered" }]
              : []),
          ];

    res.json({
      order: {
        id: found.id,
        status: found.status,
        deliveryStatus: found.deliveryStatus || found.status,
        date: found.date,
        total: found.total,
        paymentMethod: found.paymentMethod || "COD",
        paymentStatus: found.paymentStatus || "unpaid",
        trackingNumber: found.trackingNumber || null,
        courier: found.courier || null,
        itemCount: Array.isArray(found.items) ? found.items.length : 0,
        items: (found.items || []).map((i: any) => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
        deliveryTimeline: seeded,
      },
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/storefront/fulfill
 * Auth required. Convert online order → Sale + FEFO stock + mark Processing/Shipped.
 * Body: { orderId, status?: 'Processing'|'Shipped' }
 */
router.post(
  "/fulfill",
  authenticateToken,
  requirePermission("shop.orders", "shop.manage", "pos.sell"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const orderId = String(req.body?.orderId || "");
      if (!orderId) return res.status(400).json({ error: "orderId required" });

      const orderRef = bizCol(businessId, "onlineOrders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data() || {};

      if (order.status === "Cancelled") {
        return res.status(400).json({ error: "Order is cancelled" });
      }
      if (order.fulfilledTransactionId) {
        return res.json({
          ok: true,
          alreadyFulfilled: true,
          transactionId: order.fulfilledTransactionId,
          order: { id: orderId, ...order },
        });
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const saleItems: any[] = [];
      const stockUpdates: { productId: string; stock: number; lots: any[] }[] = [];

      for (const item of items) {
        const productId = String(item.productId);
        const qty = Number(item.qty) || 0;
        if (!productId || qty <= 0) continue;
        const prodRef = bizCol(businessId, "products").doc(productId);
        const prodDoc = await prodRef.get();
        if (!prodDoc.exists) {
          return res.status(400).json({ error: `Product missing: ${productId}` });
        }
        const prod = prodDoc.data() || {};
        let lots: FefoLot[] = Array.isArray(prod.lots) ? prod.lots : [];
        if (!lots.length && (Number(prod.stock) || 0) > 0) {
          lots = [
            {
              lotNumber: prod.batchNumber || "DEFAULT",
              qty: Number(prod.stock) || 0,
              expiryDate: prod.expiryDate,
              warehouseId: prod.warehouseId,
            },
          ];
        }
        const allocation = allocateFefo(lots, qty, {
          warehouseId: prod.warehouseId ? String(prod.warehouseId) : undefined,
        });
        if (!allocation.ok) {
          return res.status(409).json({
            error: `Insufficient stock for ${prod.name || productId}`,
            ...allocation,
          });
        }
        const remainingLots = applyFefoDeduction(lots, allocation);
        const newStock = Math.max(0, (Number(prod.stock) || 0) - allocation.allocated);
        stockUpdates.push({ productId, stock: newStock, lots: remainingLots });
        saleItems.push({
          productId,
          name: item.name || prod.name,
          qty,
          price: Number(item.price) || Number(prod.salePrice) || 0,
          total: (Number(item.price) || Number(prod.salePrice) || 0) * qty,
          lots: allocation.lines,
          batchNumber: allocation.lines[0]?.lotNumber,
          expiryDate: allocation.lines[0]?.expiryDate,
        });
      }

      // Apply stock
      for (const u of stockUpdates) {
        const nextExpiry = u.lots
          .filter((l) => l.expiryDate)
          .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
        await bizCol(businessId, "products").doc(u.productId).set(
          {
            stock: u.stock,
            lots: u.lots,
            expiryDate: nextExpiry || null,
            batchNumber: u.lots[0]?.lotNumber || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      const txRef = bizCol(businessId, "transactions").doc();
      const total = Number(order.total) || saleItems.reduce((s, i) => s + (i.total || 0), 0);
      const nextStatus = req.body?.status === "Shipped" ? "Shipped" : "Processing";
      await txRef.set({
        date: new Date().toISOString().slice(0, 10),
        entityName: order.customerName || "Online Customer",
        entityMobile: order.customerMobile || "",
        type: "Sale",
        amount: total,
        paymentMethod: order.paymentMethod || "Online",
        reference: `WEB-${orderId.slice(-6)}`,
        notes: `Online order ${orderId} (${order.platform || "Custom"})`,
        items: saleItems,
        details: { subtotal: total, tax: 0, discount: 0, delivery: 0, onlineOrderId: orderId },
        storeId: order.storeId || "1",
        createdAt: new Date().toISOString(),
        business_id: businessId,
      });

      await orderRef.set(
        {
          status: nextStatus,
          fulfilledTransactionId: txRef.id,
          fulfilledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `Fulfill online order ${orderId} → sale ${txRef.id}`,
        targetType: "onlineOrder",
        targetId: orderId,
      });

      res.json({
        ok: true,
        transactionId: txRef.id,
        orderId,
        status: nextStatus,
        items: saleItems.length,
      });
    } catch (error) {
      console.error("Storefront fulfill error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * PATCH ecommerce settings (API key, enabled platforms)
 * PUT /api/storefront/settings
 */
router.put(
  "/settings",
  authenticateToken,
  requirePermission("shop.manage"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const existing = (await getDb().collection("businesses").doc(businessId).get()).data()?.ecommerce || {};
      const body = req.body || {};
      const nested = body.ecommerce && typeof body.ecommerce === "object" ? body.ecommerce : {};
      const pick = (key: string) =>
        nested[key] !== undefined ? nested[key] : body[key] !== undefined ? body[key] : undefined;
      const ecommerce = {
        ...existing,
        apiKey: pick("apiKey") !== undefined ? pick("apiKey") || null : existing.apiKey || null,
        enabledPlatforms: Array.isArray(pick("enabledPlatforms"))
          ? pick("enabledPlatforms")
          : existing.enabledPlatforms || ["Custom", "WooCommerce", "Shopify"],
        webhookUrl: pick("webhookUrl") !== undefined ? pick("webhookUrl") : existing.webhookUrl || null,
        themeId: pick("themeId") || existing.themeId || "minimal",
        published: pick("published") !== undefined ? !!pick("published") : existing.published !== false,
        tagline: pick("tagline") !== undefined ? pick("tagline") : existing.tagline || "",
        paymentOptions: Array.isArray(pick("paymentOptions"))
          ? pick("paymentOptions")
          : existing.paymentOptions || undefined,
        updatedAt: new Date().toISOString(),
      };
      const domainPatch: any = {};
      if (req.body?.subdomain != null) {
        domainPatch.subdomain = String(req.body.subdomain)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/\.bizora\.com$/i, "");
        if (domainPatch.subdomain && !domainPatch.subdomain.includes(".")) {
          domainPatch.subdomain = `${domainPatch.subdomain}.bizora.com`;
        }
      }
      if (req.body?.customDomain != null) {
        domainPatch.customDomain = String(req.body.customDomain).trim().toLowerCase();
        domainPatch.status = domainPatch.customDomain ? "Pending" : "Not Connected";
        if (req.body?.domainStatus) domainPatch.status = req.body.domainStatus;
      }
      const payload: any = { ecommerce };
      if (Object.keys(domainPatch).length) {
        payload.domainSettings = domainPatch;
      }
      await getDb().collection("businesses").doc(businessId).set(payload, { merge: true });
      res.json({ ecommerce, domainSettings: domainPatch });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get(
  "/settings",
  authenticateToken,
  requirePermission("shop.manage", "shop.orders"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const doc = await getDb().collection("businesses").doc(businessId).get();
      const ecommerce = doc.data()?.ecommerce || {};
      res.json({
        ecommerce: {
          ...ecommerce,
          apiKey: ecommerce.apiKey ? `${String(ecommerce.apiKey).slice(0, 4)}…` : null,
          hasApiKey: !!ecommerce.apiKey,
          themeId: ecommerce.themeId || "minimal",
          published: ecommerce.published !== false,
          tagline: ecommerce.tagline || "",
        },
        domainSettings: doc.data()?.domainSettings || {},
        themes: STOREFRONT_THEMES,
        selfHosted: true,
        thirdPartyRequired: false,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
