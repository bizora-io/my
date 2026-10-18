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

export default router;


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
