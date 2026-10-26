import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { dispatchWebhooks } from "../lib/webhooks.js";

const router = express.Router();

function productsCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("products");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

router.get("/", requirePermission("inventory.view", "inventory.edit", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snapshot = await productsCollection(businessId).get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error) {
    console.error("List products error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requirePermission("inventory.add", "inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { id, ...data } = req.body || {};
    const payload = stripUndefined({ ...data, business_id: businessId, updatedAt: new Date().toISOString() });
    const col = productsCollection(businessId);
    const docRef = id ? col.doc(id) : col.doc();
    await docRef.set(payload);
    res.status(201).json({ product: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/products/:id
 *
 * Conflict-aware update:
 * - stockDelta / variantStockDeltas: apply relative deltas (safe for offline POS)
 * - baseUpdatedAt: if set and differs from server updatedAt, return 409 unless only deltas are sent
 * - Absolute stock/fields: last-write-wins only when baseUpdatedAt matches or is omitted
 */
router.patch("/:id", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const existing = await docRef.get();
    if (!existing.exists) return res.status(404).json({ error: "Product not found" });

    const server = existing.data() || {};
    const body = req.body || {};
    const baseUpdatedAt = body.baseUpdatedAt;
    const hasDelta =
      body.stockDelta !== undefined ||
      (body.variantStockDeltas && typeof body.variantStockDeltas === "object");

    // Absolute field writes with stale base → conflict (unless pure delta)
    if (
      baseUpdatedAt &&
      server.updatedAt &&
      String(server.updatedAt) !== String(baseUpdatedAt) &&
      !hasDelta
    ) {
      return res.status(409).json({
        error: "Conflict: product was modified on the server.",
        conflict: "stale_write",
        resolution: "reject",
        product: { id: existing.id, ...server },
      });
    }

    let next: Record<string, any> = { ...server };
    let resolution: string | undefined;

    if (hasDelta) {
      // Relative stock application — concurrent offline sales compose correctly
      if (body.stockDelta !== undefined) {
        const delta = Number(body.stockDelta) || 0;
        next.stock = Math.max(0, (Number(server.stock) || 0) + delta);
        resolution = "stock_delta_applied";
      }
      if (body.variantStockDeltas && Array.isArray(server.variants)) {
        const deltas = body.variantStockDeltas as Record<string, number>;
        next.variants = server.variants.map((v: any) => {
          const d = deltas[v.id];
          if (d === undefined) return v;
          return { ...v, stock: Math.max(0, (Number(v.stock) || 0) + Number(d)) };
        });
        // Roll up total stock from variants when variants exist
        next.stock = next.variants.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0);
        resolution = resolution ? `${resolution}+variant_deltas` : "variant_deltas_applied";
      }
      // Optional non-stock absolute fields still merge if provided without stale check
      const { stockDelta, variantStockDeltas, baseUpdatedAt: _b, stock, variants, ...rest } = body;
      Object.assign(next, stripUndefined(rest));
    } else {
      const { baseUpdatedAt: _b, stockDelta, variantStockDeltas, ...rest } = body;
      Object.assign(next, stripUndefined(rest));
      resolution = "merge";
    }

    next.updatedAt = new Date().toISOString();
    next.business_id = businessId;
    await docRef.set(stripUndefined(next), { merge: true });
    const updated = await docRef.get();
    const product = { id: updated.id, ...updated.data() };
    const min = Number((product as any).minStockLevel) || 0;
    const stock = Number((product as any).stock) || 0;
    if (min > 0 && stock <= min) {
      dispatchWebhooks(businessId, "product.low_stock", { product, stock, minStockLevel: min }).catch(() => {});
    } else {
      dispatchWebhooks(businessId, "product.updated", { product }).catch(() => {});
    }
    res.json({
      product,
      resolution,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requirePermission("inventory.delete"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    if (!(await docRef.get()).exists) return res.status(404).json({ error: "Product not found" });
    await docRef.delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Product Variants Sub-routes ---
router.get("/:id/variants", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    const p = doc.data() || {};
    res.json(Array.isArray(p.variants) ? p.variants : []);
  } catch (error) {
    console.error("List variants error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/variants", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const p = doc.data() || {};
    const { name, sku, priceDelta = 0, stock = 0, attributes = {} } = req.body || {};
    if (!name || !sku) return res.status(400).json({ error: "Variant name and sku are required" });

    const existingVariants = Array.isArray(p.variants) ? p.variants : [];
    if (existingVariants.some((v: any) => v.sku?.toLowerCase() === String(sku).toLowerCase())) {
      return res.status(409).json({ error: `Variant SKU already exists: ${sku}` });
    }

    const newVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(name).trim(),
      sku: String(sku).trim(),
      priceDelta: Number(priceDelta) || 0,
      stock: Number(stock) || 0,
      attributes,
      createdAt: new Date().toISOString(),
    };

    const nextVariants = [...existingVariants, newVariant];
    const totalStock = nextVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

    await docRef.set(
      {
        variants: nextVariants,
        stock: totalStock,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.status(201).json(newVariant);
  } catch (error) {
    console.error("Create variant error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id/variants/:variantId", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const p = doc.data() || {};
    const existingVariants = Array.isArray(p.variants) ? p.variants : [];
    const idx = existingVariants.findIndex((v: any) => v.id === req.params.variantId);
    if (idx === -1) return res.status(404).json({ error: "Variant not found" });

    const updatedVariant = { ...existingVariants[idx], ...req.body };
    existingVariants[idx] = updatedVariant;
    const totalStock = existingVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

    await docRef.set(
      {
        variants: existingVariants,
        stock: totalStock,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json(updatedVariant);
  } catch (error) {
    console.error("Update variant error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id/variants/:variantId", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const p = doc.data() || {};
    const existingVariants = Array.isArray(p.variants) ? p.variants : [];
    const nextVariants = existingVariants.filter((v: any) => v.id !== req.params.variantId);
    const totalStock = nextVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

    await docRef.set(
      {
        variants: nextVariants,
        stock: totalStock,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json({ ok: true, deletedId: req.params.variantId });
  } catch (error) {
    console.error("Delete variant error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Product Serials Sub-routes ---
router.get("/:id/serials", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const p = doc.data() || {};
    const serialUnits = Array.isArray(p.serialUnits) ? p.serialUnits : [];
    const status = req.query.status as string | undefined;

    const filtered = status ? serialUnits.filter((u: any) => u.status === status) : serialUnits;
    res.json(filtered);
  } catch (error) {
    console.error("List serials error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/serials", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = productsCollection(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const p = doc.data() || {};
    const { serials, lotNumber } = req.body || {};

    if (!Array.isArray(serials) || serials.length === 0) {
      return res.status(400).json({ error: "Array of serials is required" });
    }

    const existingUnits = Array.isArray(p.serialUnits) ? p.serialUnits : [];
    const existingSerialSet = new Set(existingUnits.map((u: any) => String(u.serial).trim().toLowerCase()));

    const newUnits: any[] = [];
    for (const raw of serials) {
      const serial = String(raw).trim();
      if (!serial) continue;
      if (existingSerialSet.has(serial.toLowerCase())) {
        return res.status(409).json({ error: `Serial already exists: ${serial}` });
      }
      existingSerialSet.add(serial.toLowerCase());
      newUnits.push({
        serial,
        lotNumber: lotNumber || null,
        status: "available",
        addedAt: new Date().toISOString(),
      });
    }

    const nextUnits = [...existingUnits, ...newUnits];
    await docRef.set(
      {
        serialUnits: nextUnits,
        trackSerial: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.status(201).json({ added: newUnits.length, serialUnits: nextUnits });
  } catch (error) {
    console.error("Add serials error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
