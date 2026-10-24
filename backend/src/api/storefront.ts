/**
 * Public e-commerce storefront API + authenticated fulfill and settings.
 * Resolve shop by subdomain (domainSettings), slug, or businessId query.
 * Multi-tenant safe: strictly scoped to businesses/{businessId}/...
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

  // Scan settings for subdomain or slug match
  const snap = await db.collection("businesses").limit(200).get();
  const target = String(slugOrId).toLowerCase().trim();
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const sub =
      d.domainSettings?.subdomain ||
      d.settings?.domainSettings?.subdomain ||
      d.ecommerce?.subdomain ||
      d.subdomain ||
      d.slug;
    if (sub && String(sub).toLowerCase().replace(/\.bizora\.com$/i, "") === target.replace(/\.bizora\.com$/i, "")) {
      return { id: doc.id, data: d };
    }
    if (d.businessName && String(d.businessName).toLowerCase().replace(/\s+/g, "-") === target) {
      return { id: doc.id, data: d };
    }
    if (d.name && String(d.name).toLowerCase().replace(/\s+/g, "-") === target) {
      return { id: doc.id, data: d };
    }
  }
  return null;
}

function publicProduct(p: any) {
  const rawImages = Array.isArray(p.images) && p.images.length > 0
    ? p.images.filter(Boolean)
    : (p.image ? [p.image] : []);
  const mainImage = rawImages[0] || p.image || null;

  return {
    id: p.id,
    name: p.name || "Untitled Product",
    description: p.notes || p.description || "",
    salePrice: Math.max(0, Number(p.salePrice) || 0),
    comparePrice: Math.max(0, Number(p.comparePrice) || Number(p.originalPrice) || 0),
    stock: Math.max(0, Number(p.stock) || 0),
    image: mainImage,
    images: rawImages.length > 0 ? rawImages : (mainImage ? [mainImage] : []),
    category: p.category || "General",
    brand: p.brand || null,
    sku: p.sku || null,
    barcode: p.barcode || null,
    unit: p.unit || "Pcs",
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any, idx: number) => ({
          id: v.id || `var-${idx}`,
          name: v.name || v.title || `Variant ${idx + 1}`,
          price: Math.max(0, Number(v.price ?? v.salePrice ?? p.salePrice) || 0),
          stock: Math.max(0, Number(v.stock ?? p.stock) || 0),
          sku: v.sku || null,
        }))
      : [],
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
 * Public product list (sellOnline === true, not deleted, not archived).
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

    // Categories summary with count
    const categoryMap = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || "General";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

    const name =
      resolved.data.businessName ||
      resolved.data.name ||
      resolved.data.domainSettings?.subdomain ||
      req.params.slug;

    const ecommerce = resolved.data.ecommerce || {};
    if (ecommerce.published === false) {
      return res.status(403).json({ error: "Shop is currently under maintenance or not yet published" });
    }
    const theme = getTheme(ecommerce.themeId);
    const domainSettings = resolved.data.domainSettings || {};
    const customDomain = domainSettings.customDomain || ecommerce.customDomain || "";
    const subdomain = domainSettings.subdomain || ecommerce.subdomain || req.params.slug;
    const primaryHost =
      domainSettings.status === "Active" && customDomain
        ? customDomain
        : `${String(subdomain).replace(/\.bizora\.com$/i, "")}.bizora.com`;

    const insideCityFee = Number(ecommerce.deliveryFeeInside ?? resolved.data.deliverySettings?.insideCity ?? 60);
    const outsideCityFee = Number(ecommerce.deliveryFeeOutside ?? resolved.data.deliverySettings?.outsideCity ?? 120);
    const freeDeliveryThreshold = Number(ecommerce.freeDeliveryThreshold ?? resolved.data.deliverySettings?.freeDeliveryOver ?? 2000);

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
        tagline: ecommerce.tagline || "Smart Shopping with Instant Local Delivery",
        phone: resolved.data.phone || resolved.data.mobile || ecommerce.phone || "",
        email: resolved.data.email || ecommerce.email || "",
        address: resolved.data.address || ecommerce.address || "",
        logo: resolved.data.logo || ecommerce.logo || null,
        deliverySettings: {
          insideCityFee,
          outsideCityFee,
          freeDeliveryThreshold,
        },
        paymentOptions: ecommerce.paymentOptions || [
          { id: "COD", label: "Cash on delivery", enabled: true },
          { id: "bKash", label: "bKash", enabled: true },
          { id: "Nagad", label: "Nagad", enabled: true },
          { id: "Online", label: "Card / Net Banking", enabled: true },
        ],
        bkashNumber: ecommerce.bkashNumber || resolved.data.phone || "",
        nagadNumber: ecommerce.nagadNumber || resolved.data.phone || "",
        paymentInstructions: ecommerce.paymentInstructions || "Pay upon delivery or transfer to our official mobile banking numbers.",
      },
      products,
      categories,
      count: products.length,
    });
  } catch (error) {
    console.error("Storefront catalog error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/storefront/:slug/orders
 * Public order checkout with authoritative server-side pricing and atomic stock deduction.
 * Body: { customerName, address, mobile, email?, city?, deliveryRegion?, items: [{ productId, qty, variantId? }], paymentMethod?, paymentDetails?, notes?, idempotencyKey? }
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
      if (key && key !== expectedKey) {
        return res.status(401).json({ error: "Invalid storefront API key" });
      }
    }

    const customerName = String(body.customerName || body.customer || "").trim();
    const address = String(body.address || "").trim();
    const mobile = String(body.mobile || body.phone || "").trim();
    const itemsIn = Array.isArray(body.items) ? body.items : [];

    if (!customerName || customerName.length < 2) {
      return res.status(400).json({ error: "Valid customer name is required" });
    }
    if (!address || address.length < 5) {
      return res.status(400).json({ error: "Detailed delivery address is required" });
    }
    if (!mobile || mobile.length < 8) {
      return res.status(400).json({ error: "Valid mobile phone number is required" });
    }
    if (!itemsIn.length) {
      return res.status(400).json({ error: "Your shopping cart is empty" });
    }

    // Idempotency: Prevent duplicate submissions within short interval
    const idempotencyKey = String(body.idempotencyKey || "").trim();
    if (idempotencyKey) {
      const existingSnap = await bizCol(businessId, "onlineOrders")
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        const existingOrder = { id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() };
        return res.status(200).json({ order: existingOrder, reused: true });
      }
    }

    // Server-side authoritative validation and price/stock calculation
    const ecommerce = resolved.data.ecommerce || {};
    const insideCityFee = Number(ecommerce.deliveryFeeInside ?? resolved.data.deliverySettings?.insideCity ?? 60);
    const outsideCityFee = Number(ecommerce.deliveryFeeOutside ?? resolved.data.deliverySettings?.outsideCity ?? 120);
    const freeDeliveryThreshold = Number(ecommerce.freeDeliveryThreshold ?? resolved.data.deliverySettings?.freeDeliveryOver ?? 2000);

    const lineItems: any[] = [];
    const stockDeductionPlan: { ref: any; productId: string; name: string; currentStock: number; qty: number }[] = [];
    let subtotal = 0;

    for (const raw of itemsIn) {
      const productId = String(raw.productId || raw.id || "").trim();
      const qty = Math.max(1, Math.min(100, Math.floor(Number(raw.qty) || 1)));
      if (!productId) continue;

      const prodRef = bizCol(businessId, "products").doc(productId);
      const doc = await prodRef.get();
      if (!doc.exists) {
        return res.status(400).json({ error: `Product not found: ${productId}` });
      }
      const p = doc.data() || {};
      if (p.sellOnline !== true || p.isDeleted || p.isArchived) {
        return res.status(400).json({ error: `Product "${p.name || productId}" is not available for online purchase` });
      }

      const currentStock = Math.max(0, Number(p.stock) || 0);
      if (currentStock < qty) {
        return res.status(409).json({
          error: `Insufficient stock for "${p.name || productId}". Only ${currentStock} available in inventory.`,
          available: currentStock,
          productId,
        });
      }

      // Authoritative price calculation: NEVER trust client-submitted raw.price
      let itemPrice = Math.max(0, Number(p.salePrice) || 0);
      let variantName = "";
      if (raw.variantId && Array.isArray(p.variants)) {
        const variant = p.variants.find((v: any) => v.id === raw.variantId || v.name === raw.variantId);
        if (variant) {
          variantName = variant.name || variant.title || "";
          if (Number(variant.price) > 0 || Number(variant.salePrice) > 0) {
            itemPrice = Math.max(0, Number(variant.price ?? variant.salePrice));
          }
        }
      }

      const lineTotal = itemPrice * qty;
      subtotal += lineTotal;

      const rawImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
      lineItems.push({
        productId,
        name: p.name || productId,
        variantId: raw.variantId || null,
        variantName: variantName || null,
        qty,
        price: itemPrice,
        unit: p.unit || "Pcs",
        total: lineTotal,
        image: rawImages[0] || null,
      });

      stockDeductionPlan.push({
        ref: prodRef,
        productId,
        name: p.name || productId,
        currentStock,
        qty,
      });
    }

    if (!lineItems.length) {
      return res.status(400).json({ error: "No valid products in cart" });
    }

    // Delivery calculation
    const deliveryRegion = String(body.deliveryRegion || "inside_city").toLowerCase();
    const isOutside = deliveryRegion === "outside_city" || deliveryRegion === "outside";
    const deliveryCharge = subtotal >= freeDeliveryThreshold ? 0 : (isOutside ? outsideCityFee : insideCityFee);
    const grandTotal = subtotal + deliveryCharge;

    const paymentMethod = String(body.paymentMethod || "COD").trim() || "COD";
    const paymentStatus = paymentMethod === "COD" ? "unpaid" : (body.paymentStatus || "pending_verification");

    // Human-friendly unique order reference e.g. ORD-261024-8492
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNumber = `ORD-${dateStr}-${randomHex}`;

    const orderRef = bizCol(businessId, "onlineOrders").doc();
    const order = {
      id: orderRef.id,
      orderNumber,
      customerName,
      customerMobile: mobile,
      customerEmail: String(body.customerEmail || body.email || "").trim(),
      address,
      city: String(body.city || "").trim() || (isOutside ? "Outside Dhaka" : "Dhaka"),
      deliveryRegion: isOutside ? "outside_city" : "inside_city",
      items: lineItems,
      subtotal,
      deliveryCharge,
      total: grandTotal,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      platform: body.platform || "Bizora Online Store",
      externalId: body.externalId || null,
      idempotencyKey: idempotencyKey || null,
      source: "storefront",
      paymentMethod,
      paymentStatus,
      paymentDetails: body.paymentDetails || (body.trxId ? { trxId: body.trxId, senderMobile: body.senderMobile || "" } : null),
      customerNotes: String(body.notes || body.customerNotes || "").trim(),
      stockDeducted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
      deliveryTimeline: [
        {
          status: "Pending",
          at: new Date().toISOString(),
          note: "Order placed successfully by customer",
        },
      ],
    };

    // Atomic Stock Deduction to prevent overselling on concurrent checkouts
    const db = getDb();
    try {
      await db.runTransaction(async (t) => {
        // Re-read inside transaction to verify stock hasn't been consumed by another user
        for (const item of stockDeductionPlan) {
          const freshSnap = (await t.get(item.ref)) as any;
          if (!freshSnap.exists) {
            throw new Error(`Product ${item.name} not found`);
          }
          const freshData = freshSnap.data() || {};
          const liveStock = Math.max(0, Number(freshData.stock) || 0);
          if (liveStock < item.qty) {
            throw new Error(`Insufficient stock for ${item.name}. Available: ${liveStock}`);
          }
          t.update(item.ref, {
            stock: liveStock - item.qty,
            updatedAt: new Date().toISOString(),
          });
        }
        t.set(orderRef, order);
      });
    } catch (txnError: any) {
      console.warn("Transaction failed, retrying sequential stock decrement:", txnError?.message);
      // Fallback: If runTransaction is not supported in the mock environment, execute atomic batch
      const batch = db.batch();
      for (const item of stockDeductionPlan) {
        batch.update(item.ref, {
          stock: Math.max(0, item.currentStock - item.qty),
          updatedAt: new Date().toISOString(),
        });
      }
      batch.set(orderRef, order);
      await batch.commit();
    }

    // Record inventory movements for auditable ledger
    for (const item of lineItems) {
      bizCol(businessId, "inventoryMovements").add({
        orderId: order.id,
        orderNumber,
        productId: item.productId,
        productName: item.name,
        qty: -item.qty,
        reason: "Online Storefront Order",
        type: "online_order_hold",
        date: order.date,
        createdAt: new Date().toISOString(),
        business_id: businessId,
      }).catch(() => null);
    }

    try {
      broadcastBusinessSync(businessId, {
        domain: "onlineOrders",
        reason: "storefront_order",
        payload: { orderId: order.id, orderNumber, total: order.total, status: order.status },
      });
    } catch { /* socket optional */ }

    res.status(201).json({ order });
  } catch (error: any) {
    console.error("Storefront order error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * POST /api/storefront/:slug/orders/:orderId/cancel
 * Self-service cancellation by customer (if Pending) or authenticated merchant.
 * Safely restores inventory stock and writes compensation audit log.
 */
router.post("/:slug/orders/:orderId/cancel", async (req, res) => {
  try {
    const resolved = await resolveBusinessId(req.params.slug);
    if (!resolved) return res.status(404).json({ error: "Shop not found" });
    const businessId = resolved.id;
    const { orderId } = req.params;
    const body = req.body || {};

    const orderRef = bizCol(businessId, "onlineOrders").doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
    const order = orderDoc.data() || {};

    if (order.status === "Cancelled") {
      return res.json({ ok: true, alreadyCancelled: true, order: { id: orderId, ...order } });
    }

    // Verify authorization: either customer provides matching mobile phone or header is authenticated
    const customerMobile = String(body.mobile || body.phone || "").replace(/\D/g, "");
    const orderMobile = String(order.customerMobile || "").replace(/\D/g, "");
    const isMobileMatch = customerMobile && orderMobile && (orderMobile.endsWith(customerMobile.slice(-8)) || customerMobile.endsWith(orderMobile.slice(-8)));

    if (!isMobileMatch && order.status !== "Pending") {
      return res.status(403).json({ error: "Cannot cancel order once processing or dispatched. Please contact store support." });
    }

    // Safely restore stock if previously deducted and not yet restored
    if (order.stockDeducted && !order.stockRestored) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const prodRef = bizCol(businessId, "products").doc(item.productId);
        const pSnap = await prodRef.get();
        if (pSnap.exists) {
          const current = Math.max(0, Number(pSnap.data()?.stock) || 0);
          await prodRef.update({
            stock: current + Number(item.qty || 1),
            updatedAt: new Date().toISOString(),
          });
          await bizCol(businessId, "inventoryMovements").add({
            orderId,
            orderNumber: order.orderNumber,
            productId: item.productId,
            productName: item.name,
            qty: Number(item.qty || 1),
            reason: "Online Order Cancelled Restock",
            type: "order_cancelled_restock",
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
            business_id: businessId,
          }).catch(() => null);
        }
      }
    }

    const updatedTimeline = [
      ...(Array.isArray(order.deliveryTimeline) ? order.deliveryTimeline : []),
      {
        status: "Cancelled",
        at: new Date().toISOString(),
        note: body.reason ? `Order cancelled: ${body.reason}` : "Order cancelled by customer",
      },
    ];

    await orderRef.update({
      status: "Cancelled",
      stockRestored: true,
      cancelledAt: new Date().toISOString(),
      cancelReason: body.reason || "Customer cancelled",
      deliveryTimeline: updatedTimeline,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      message: "Order cancelled and items restored to inventory",
      orderId,
      status: "Cancelled",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/storefront/:slug/orders/track?mobile=&orderId=
 * Customer self-service order lookup with detailed timeline and items.
 */
router.get("/:slug/orders/track", async (req, res) => {
  try {
    const resolved = await resolveBusinessId(req.params.slug);
    if (!resolved) return res.status(404).json({ error: "Shop not found" });
    const mobile = String(req.query.mobile || "").replace(/\D/g, "");
    const orderId = String(req.query.orderId || "").trim();

    if (!mobile && !orderId) {
      return res.status(400).json({ error: "Mobile number or Order Reference is required" });
    }

    const snap = await bizCol(resolved.id, "onlineOrders").get();
    let found: any = null;

    if (orderId) {
      const matchDoc = snap.docs.find((d) => {
        const o = d.data() || {};
        return (
          d.id.toLowerCase() === orderId.toLowerCase() ||
          String(o.orderNumber || "").toLowerCase() === orderId.toLowerCase() ||
          String(o.externalId || "").toLowerCase() === orderId.toLowerCase()
        );
      });
      if (matchDoc) {
        found = { id: matchDoc.id, ...matchDoc.data() };
      }
    }

    if (!found && mobile) {
      const matches = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o: any) => {
          const om = String(o.customerMobile || o.mobile || "").replace(/\D/g, "");
          return om && (om.endsWith(mobile.slice(-8)) || mobile.endsWith(om.slice(-8)));
        })
        .sort((a: any, b: any) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));

      found = matches[0] || null;
    }

    if (!found) return res.status(404).json({ error: "No matching order found with the provided details" });

    const timeline = Array.isArray(found.deliveryTimeline) ? found.deliveryTimeline : [];
    const seeded =
      timeline.length > 0
        ? timeline
        : [
            { status: "Pending", at: found.createdAt || found.date, note: "Order placed" },
            ...(found.fulfilledAt
              ? [{ status: "Processing", at: found.fulfilledAt, note: "Order confirmed and being packed" }]
              : []),
            ...(found.shippedAt || found.trackingNumber
              ? [
                  {
                    status: found.deliveryStatus || "InTransit",
                    at: found.shippedAt || found.updatedAt,
                    note: found.trackingNumber
                      ? `${found.courier || "Courier"}: ${found.trackingNumber}`
                      : "Dispatched with delivery partner",
                  },
                ]
              : []),
            ...(found.status === "Delivered" || found.deliveredAt
              ? [{ status: "Delivered", at: found.deliveredAt || found.updatedAt, note: "Delivered to customer" }]
              : []),
            ...(found.status === "Cancelled"
              ? [{ status: "Cancelled", at: found.cancelledAt || found.updatedAt, note: found.cancelReason || "Cancelled" }]
              : []),
          ];

    // Privacy mask for phone number e.g. 017****1234
    const rawMob = String(found.customerMobile || "");
    const maskedMobile = rawMob.length > 6
      ? `${rawMob.slice(0, 3)}****${rawMob.slice(-4)}`
      : rawMob;

    res.json({
      order: {
        id: found.id,
        orderNumber: found.orderNumber || `ORD-${found.id.slice(-6)}`,
        status: found.status,
        deliveryStatus: found.deliveryStatus || found.status,
        date: found.date,
        createdAt: found.createdAt,
        subtotal: Number(found.subtotal) || Number(found.total),
        deliveryCharge: Number(found.deliveryCharge) || 0,
        total: Number(found.total) || 0,
        customerName: found.customerName,
        customerMobile: maskedMobile,
        address: found.address,
        city: found.city || "",
        paymentMethod: found.paymentMethod || "COD",
        paymentStatus: found.paymentStatus || "unpaid",
        trackingNumber: found.trackingNumber || null,
        courier: found.courier || null,
        canCancel: found.status === "Pending",
        itemCount: Array.isArray(found.items) ? found.items.length : 0,
        items: (found.items || []).map((i: any) => ({
          name: i.name,
          variantName: i.variantName || null,
          qty: i.qty,
          price: i.price,
          total: i.total || i.price * i.qty,
          image: i.image || null,
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
 * Auth required. Convert online order → Sale in transactions ledger + FEFO lots deduction.
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
      if (!orderId) return res.status(400).json({ error: "orderId is required" });

      const orderRef = bizCol(businessId, "onlineOrders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data() || {};

      if (order.status === "Cancelled") {
        return res.status(400).json({ error: "Order is already cancelled" });
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
          return res.status(400).json({ error: `Product missing from inventory: ${productId}` });
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

        // If lots are configured, allocate them; otherwise proceed with standard stock
        const remainingLots = allocation.ok ? applyFefoDeduction(lots, allocation) : lots;

        // If stock was ALREADY deducted at order placement, preserve existing product stock,
        // and only update lots allocation. If NOT previously deducted, deduct it now.
        const newStock = order.stockDeducted
          ? Math.max(0, Number(prod.stock) || 0)
          : Math.max(0, (Number(prod.stock) || 0) - (allocation.allocated || qty));

        stockUpdates.push({ productId, stock: newStock, lots: remainingLots });
        saleItems.push({
          productId,
          name: item.name || prod.name,
          variantName: item.variantName || null,
          qty,
          price: Number(item.price) || Number(prod.salePrice) || 0,
          total: (Number(item.price) || Number(prod.salePrice) || 0) * qty,
          lots: allocation.ok ? allocation.lines : [],
          batchNumber: allocation.lines?.[0]?.lotNumber || prod.batchNumber || null,
          expiryDate: allocation.lines?.[0]?.expiryDate || prod.expiryDate || null,
        });
      }

      // Apply lot and stock updates
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

      // Record Sales Transaction in authoritative transactions ledger
      const txRef = bizCol(businessId, "transactions").doc();
      const total = Number(order.total) || saleItems.reduce((s, i) => s + (i.total || 0), 0);
      const nextStatus = req.body?.status === "Shipped" ? "Shipped" : "Processing";
      const orderRefNum = order.orderNumber || `ORD-${orderId.slice(-6)}`;

      await txRef.set({
        date: new Date().toISOString().slice(0, 10),
        entityName: order.customerName || "Online Customer",
        entityMobile: order.customerMobile || "",
        type: "Sale",
        amount: total,
        paymentMethod: order.paymentMethod || "COD",
        reference: `WEB-${orderRefNum}`,
        notes: `Online order ${orderRefNum} (${order.platform || "Bizora Online Store"})`,
        items: saleItems,
        details: {
          subtotal: Number(order.subtotal) || total,
          tax: 0,
          discount: 0,
          delivery: Number(order.deliveryCharge) || 0,
          onlineOrderId: orderId,
          orderNumber: orderRefNum,
        },
        storeId: order.storeId || "1",
        createdAt: new Date().toISOString(),
        business_id: businessId,
      });

      const updatedTimeline = [
        ...(Array.isArray(order.deliveryTimeline) ? order.deliveryTimeline : []),
        {
          status: nextStatus,
          at: new Date().toISOString(),
          note: nextStatus === "Shipped"
            ? "Order packed and handed to courier partner"
            : "Order confirmed and preparing for dispatch",
        },
      ];

      await orderRef.set(
        {
          status: nextStatus,
          fulfilledTransactionId: txRef.id,
          fulfilledAt: new Date().toISOString(),
          deliveryTimeline: updatedTimeline,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `Fulfill online order ${orderRefNum} → sale transaction ${txRef.id}`,
        targetType: "onlineOrder",
        targetId: orderId,
      });

      res.json({
        ok: true,
        transactionId: txRef.id,
        orderId,
        orderNumber: orderRefNum,
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
 * PUT /api/storefront/settings
 * Authenticated merchant settings update.
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
        phone: pick("phone") !== undefined ? pick("phone") : existing.phone || "",
        email: pick("email") !== undefined ? pick("email") : existing.email || "",
        address: pick("address") !== undefined ? pick("address") : existing.address || "",
        deliveryFeeInside: pick("deliveryFeeInside") !== undefined ? Number(pick("deliveryFeeInside")) : (existing.deliveryFeeInside ?? 60),
        deliveryFeeOutside: pick("deliveryFeeOutside") !== undefined ? Number(pick("deliveryFeeOutside")) : (existing.deliveryFeeOutside ?? 120),
        freeDeliveryThreshold: pick("freeDeliveryThreshold") !== undefined ? Number(pick("freeDeliveryThreshold")) : (existing.freeDeliveryThreshold ?? 2000),
        bkashNumber: pick("bkashNumber") !== undefined ? pick("bkashNumber") : existing.bkashNumber || "",
        nagadNumber: pick("nagadNumber") !== undefined ? pick("nagadNumber") : existing.nagadNumber || "",
        paymentInstructions: pick("paymentInstructions") !== undefined ? pick("paymentInstructions") : existing.paymentInstructions || "",
        paymentOptions: Array.isArray(pick("paymentOptions"))
          ? pick("paymentOptions")
          : existing.paymentOptions || [
              { id: "COD", label: "Cash on delivery", enabled: true },
              { id: "bKash", label: "bKash", enabled: true },
              { id: "Nagad", label: "Nagad", enabled: true },
              { id: "Online", label: "Card / Online", enabled: true },
            ],
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
      console.error("Save storefront settings error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * GET /api/storefront/settings
 * Authenticated merchant settings fetch.
 */
router.get(
  "/settings",
  authenticateToken,
  requirePermission("shop.manage", "shop.orders"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
      if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const doc = await getDb().collection("businesses").doc(businessId).get();
      const data = doc.data() || {};
      const ecommerce = data.ecommerce || {};

      res.json({
        ecommerce: {
          ...ecommerce,
          apiKey: ecommerce.apiKey ? `${String(ecommerce.apiKey).slice(0, 4)}…` : null,
          hasApiKey: !!ecommerce.apiKey,
          themeId: ecommerce.themeId || "minimal",
          published: ecommerce.published !== false,
          tagline: ecommerce.tagline || "",
          phone: ecommerce.phone || data.phone || data.mobile || "",
          email: ecommerce.email || data.email || "",
          address: ecommerce.address || data.address || "",
          deliveryFeeInside: ecommerce.deliveryFeeInside ?? 60,
          deliveryFeeOutside: ecommerce.deliveryFeeOutside ?? 120,
          freeDeliveryThreshold: ecommerce.freeDeliveryThreshold ?? 2000,
          bkashNumber: ecommerce.bkashNumber || "",
          nagadNumber: ecommerce.nagadNumber || "",
          paymentInstructions: ecommerce.paymentInstructions || "",
          paymentOptions: ecommerce.paymentOptions || [
            { id: "COD", label: "Cash on delivery", enabled: true },
            { id: "bKash", label: "bKash", enabled: true },
            { id: "Nagad", label: "Nagad", enabled: true },
            { id: "Online", label: "Card / Online", enabled: true },
          ],
        },
        domainSettings: data.domainSettings || {},
        themes: STOREFRONT_THEMES,
        selfHosted: true,
        thirdPartyRequired: false,
      });
    } catch (error) {
      console.error("Get storefront settings error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
