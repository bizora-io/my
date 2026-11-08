import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { dispatchWebhooks } from "../lib/webhooks.js";
import { broadcastBusinessSync } from "../lib/chatSocket.js";
import { validatePositiveMoney } from "../lib/validation.js";

const router = express.Router();

function transactionsCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

router.get("/", requirePermission("pos.view_sales", "finance.ledgers", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snapshot = await transactionsCollection(businessId).orderBy("date", "desc").get().catch(
      () => transactionsCollection(businessId).get()
    );
    const transactions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ transactions });
  } catch (error) {
    console.error("List transactions error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST — idempotent by client id: if the same id already exists, return it (200) instead of overwriting.
router.post("/", requirePermission("pos.sell", "pos.view_sales", "finance.expense.add", "inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { id, ...data } = req.body || {};

    if (data.amount !== undefined) {
      const v = validatePositiveMoney(data.amount, "amount");
      if (!v.valid) return res.status(400).json({ error: v.error });
      data.amount = v.value;
    }
    if (data.total !== undefined) {
      const v = validatePositiveMoney(data.total, "total");
      if (!v.valid) return res.status(400).json({ error: v.error });
      data.total = v.value;
    }
    if (data.paid !== undefined) {
      const v = validatePositiveMoney(data.paid, "paid");
      if (!v.valid) return res.status(400).json({ error: v.error });
      data.paid = v.value;
    }

    const col = transactionsCollection(businessId);

    if (id) {
      const existing = await col.doc(id).get();
      if (existing.exists) {
        // Idempotent replay of offline create — do not overwrite server record
        return res.status(200).json({
          transaction: { id: existing.id, ...existing.data() },
          conflict: "already_exists",
          resolution: "kept_server",
        });
      }
    }

    const payload = stripUndefined({
      ...data,
      business_id: businessId,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientId: id || null,
    });

    const docRef = id ? col.doc(id) : col.doc();

    // ATOMIC POS INVENTORY DEDUCTION & VALIDATION (P0 / BZ-F01)
    // For Sale transactions with physical catalog items, verify and deduct stock atomically in Firestore
    const isSale = String(payload.type || "").toLowerCase() === "sale";
    const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];
    const stockItems = rawItems.filter(
      (it: any) => it && (it.productId || it.id) && Number(it.qty || it.quantity || 0) > 0
    );

    const db = getDb();

    if (isSale && stockItems.length > 0 && payload.stockDeducted !== true) {
      const updatedProductsSummary: { id: string; name: string; remainingStock: number }[] = [];

      try {
        await db.runTransaction(async (t) => {
          // Idempotency re-check inside transaction lock
          if (id) {
            const checkFresh = await t.get(docRef);
            if (checkFresh.exists) {
              return;
            }
          }

          // 1. Authoritative stock check across all items in sale
          const deductions: {
            ref: FirebaseFirestore.DocumentReference;
            prodId: string;
            prodName: string;
            qty: number;
            nextStock: number;
            variants?: any[];
          }[] = [];

          for (const item of stockItems) {
            const prodId = String(item.productId || item.id);
            const qty = Math.max(0, Number(item.qty || item.quantity || 0));
            const prodRef = db.collection("businesses").doc(businessId).collection("products").doc(prodId);
            const prodSnap = await t.get(prodRef);

            if (!prodSnap.exists) {
              // Custom or non-catalog item
              continue;
            }

            const prodData = prodSnap.data() || {};
            if (prodData.isDeleted) {
              const err: any = new Error(`Product "${prodData.name || prodId}" has been deleted.`);
              err.code = "product_deleted";
              throw err;
            }
            if (prodData.type === "Service") {
              // Services don't decrement physical inventory
              continue;
            }

            const variantId = item.variantId;
            let currentStock = Number(prodData.stock) || 0;
            let variants = Array.isArray(prodData.variants) ? [...prodData.variants] : undefined;

            if (variantId && variants) {
              const vIdx = variants.findIndex((v: any) => v.id === variantId || v.name === variantId);
              if (vIdx >= 0) {
                const vStock = Number(variants[vIdx].stock) || 0;
                if (vStock < qty) {
                  const err: any = new Error(
                    `Insufficient stock for ${prodData.name} (${variants[vIdx].name || variantId}). Available: ${vStock}, requested: ${qty}`
                  );
                  err.code = "insufficient_stock";
                  err.available = vStock;
                  err.productId = prodId;
                  throw err;
                }
                variants[vIdx] = {
                  ...variants[vIdx],
                  stock: vStock - qty,
                };
                currentStock = variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
              }
            } else {
              if (currentStock < qty) {
                const err: any = new Error(
                  `Insufficient stock for "${prodData.name || prodId}". Available: ${currentStock}, requested: ${qty}`
                );
                err.code = "insufficient_stock";
                err.available = currentStock;
                err.productId = prodId;
                throw err;
              }
              currentStock = currentStock - qty;
            }

            deductions.push({
              ref: prodRef,
              prodId,
              prodName: prodData.name || prodId,
              qty,
              nextStock: currentStock,
              variants,
            });

            updatedProductsSummary.push({
              id: prodId,
              name: prodData.name || prodId,
              remainingStock: currentStock,
            });
          }

          // 2. Perform atomic updates
          for (const d of deductions) {
            const updatePayload: Record<string, any> = {
              stock: d.nextStock,
              updatedAt: new Date().toISOString(),
            };
            if (d.variants) {
              updatePayload.variants = d.variants;
            }
            t.update(d.ref, updatePayload);
          }

          // 3. Save sale record inside the same atomic commit
          t.set(docRef, { ...payload, stockDeducted: true });
        });
      } catch (txErr: any) {
        if (txErr.code === "insufficient_stock") {
          return res.status(409).json({
            error: txErr.message,
            code: "insufficient_stock",
            available: txErr.available,
            productId: txErr.productId,
          });
        }
        if (txErr.code === "product_deleted") {
          return res.status(400).json({ error: txErr.message, code: "product_deleted" });
        }
        console.error("Atomic sale transaction failed:", txErr);
        return res.status(500).json({ error: txErr.message || "Failed to process sale inventory atomically." });
      }
    } else {
      await docRef.set(payload);
    }

    const full = { id: docRef.id, ...payload, stockDeducted: isSale ? true : payload.stockDeducted };
    // Outbound webhooks (non-blocking)
    const evt = payload.type === "Sale" ? "sale.created" : "transaction.created";
    dispatchWebhooks(businessId, evt as any, { transaction: full }).catch(() => {});
    broadcastBusinessSync(businessId, {
      domain: "transactions",
      reason: "transaction_created",
      payload: { transaction: full },
    });
    res.status(201).json({ transaction: full });
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id", requirePermission("pos.view_sales", "finance.ledgers"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const docRef = transactionsCollection(businessId).doc(String(req.params.id));
    const existing = await docRef.get();
    if (!existing.exists) return res.status(404).json({ error: "Transaction not found" });

    const baseUpdatedAt = req.body?.baseUpdatedAt || req.headers["if-match-updated-at"];
    const serverUpdatedAt = existing.data()?.updatedAt;
    if (baseUpdatedAt && serverUpdatedAt && String(serverUpdatedAt) !== String(baseUpdatedAt)) {
      return res.status(409).json({
        error: "Conflict: transaction was modified on the server.",
        conflict: "stale_write",
        resolution: "reject",
        transaction: { id: existing.id, ...existing.data() },
      });
    }

    const { baseUpdatedAt: _b, ...rest } = req.body || {};
    if (rest.amount !== undefined) {
      const v = validatePositiveMoney(rest.amount, "amount");
      if (!v.valid) return res.status(400).json({ error: v.error });
      rest.amount = v.value;
    }
    if (rest.total !== undefined) {
      const v = validatePositiveMoney(rest.total, "total");
      if (!v.valid) return res.status(400).json({ error: v.error });
      rest.total = v.value;
    }
    if (rest.paid !== undefined) {
      const v = validatePositiveMoney(rest.paid, "paid");
      if (!v.valid) return res.status(400).json({ error: v.error });
      rest.paid = v.value;
    }
    const payload = stripUndefined({ ...rest, updatedAt: new Date().toISOString() });
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    broadcastBusinessSync(businessId, {
      domain: "transactions",
      reason: "transaction_updated",
      payload: { transactionId: updated.id },
    });
    res.json({ transaction: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
