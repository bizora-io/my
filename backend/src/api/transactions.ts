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
    await docRef.set(payload);
    const full = { id: docRef.id, ...payload };
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
