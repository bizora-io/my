import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

function wastageCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("wastage");
}

function productsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("products");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// GET /api/wastage
router.get("/", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status, type } = req.query;

    let query: FirebaseFirestore.Query = wastageCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);
    if (type && typeof type === "string") query = query.where("type", "==", type);

    const snap = await query.get();
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort descending by createdAt
    records.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(records);
  } catch (error) {
    console.error("List wastage error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/wastage/summary
router.get("/summary", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await wastageCol(businessId).get();

    let totalCost = 0;
    let totalItems = 0;
    const byType: Record<string, { count: number; cost: number }> = {};
    const byStatus: Record<string, number> = { DRAFT: 0, POSTED: 0, REVERSED: 0 };

    snap.docs.forEach((doc) => {
      const d = doc.data();
      const cost = Number(d.totalCost) || 0;
      const status = d.status || "DRAFT";
      const type = d.type || "DAMAGE";

      byStatus[status] = (byStatus[status] || 0) + 1;

      if (status === "POSTED") {
        totalCost += cost;
        totalItems += Array.isArray(d.lines)
          ? d.lines.reduce((s: number, l: any) => s + (Number(l.quantity) || 0), 0)
          : 0;
      }

      if (!byType[type]) byType[type] = { count: 0, cost: 0 };
      byType[type].count += 1;
      if (status === "POSTED") byType[type].cost += cost;
    });

    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalItems,
      byType,
      byStatus,
      totalRecords: snap.size,
    });
  } catch (error) {
    console.error("Wastage summary error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/wastage/:id
router.get("/:id", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const doc = await wastageCol(businessId).doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: "Wastage record not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Get wastage error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/wastage
router.post("/", requirePermission("inventory.adjustment"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { warehouseId, type = "DAMAGE", reason, notes, lines } = req.body || {};

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "At least one line item is required." });
    }

    const processedLines = [];
    let totalCost = 0;

    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!line.productId || !(qty > 0)) {
        return res.status(400).json({ error: "Each line requires productId and positive quantity" });
      }

      const pDoc = await productsCol(businessId).doc(line.productId).get();
      if (!pDoc.exists) {
        return res.status(404).json({ error: `Product ${line.productId} not found` });
      }
      const pData = pDoc.data() || {};
      const unitCost = line.unitCost != null && Number(line.unitCost) >= 0
        ? Number(line.unitCost)
        : Number(pData.buyPrice || pData.costPrice || 0);

      const lineCost = Math.round(unitCost * qty * 100) / 100;
      totalCost += lineCost;

      processedLines.push({
        productId: line.productId,
        productName: line.productName || pData.name || "Product",
        variantId: line.variantId || null,
        quantity: qty,
        unitCost,
        lineCost,
        lotNumber: line.lotNumber || null,
        serials: Array.isArray(line.serials) ? line.serials : [],
        reason: line.reason || reason || type,
      });
    }

    const docRef = wastageCol(businessId).doc();
    const payload = stripUndefined({
      warehouseId: warehouseId || "default",
      type,
      reason: reason || "",
      notes: notes || "",
      lines: processedLines,
      totalCost: Math.round(totalCost * 100) / 100,
      status: "DRAFT",
      createdById: (req as any).user?.id || null,
      createdByName: (req as any).user?.name || "User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create wastage error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/wastage/:id/post
router.post("/:id/post", requirePermission("inventory.adjustment"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();
    const wastageRef = wastageCol(businessId).doc(String(req.params.id));

    const doc = await wastageRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Wastage record not found" });
    const wastage = doc.data()!;

    if (wastage.status === "POSTED") {
      return res.status(400).json({ error: "Wastage record is already posted." });
    }

    // Atomically deduct inventory for each line
    await db.runTransaction(async (t) => {
      for (const line of wastage.lines || []) {
        const pRef = productsCol(businessId).doc(line.productId);
        const pDoc = await t.get(pRef);
        if (pDoc.exists) {
          const p = pDoc.data()!;
          const currentStock = Number(p.stock) || 0;
          const nextStock = Math.max(0, currentStock - line.quantity);
          const update: Record<string, any> = {
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };

          // If variantId is given, deduct variant stock
          if (line.variantId && Array.isArray(p.variants)) {
            update.variants = p.variants.map((v: any) =>
              v.id === line.variantId
                ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) - line.quantity) }
                : v
            );
          }
          t.update(pRef, update);
        }
      }

      // Record damage transaction
      const txRef = transactionsCol(businessId).doc();
      const txPayload = stripUndefined({
        business_id: businessId,
        type: "Expense",
        subType: "Wastage / Loss",
        category: "Damage & Wastage Loss",
        total: Number(wastage.totalCost) || 0,
        paid: Number(wastage.totalCost) || 0,
        reference: `WASTAGE-${doc.id}`,
        notes: `Wastage posted: ${wastage.type} (${wastage.reason || ""})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      t.set(txRef, txPayload);

      t.update(wastageRef, {
        status: "POSTED",
        postedAt: new Date().toISOString(),
        postedById: (req as any).user?.id || null,
        transactionId: txRef.id,
        updatedAt: new Date().toISOString(),
      });
    });

    const updated = await wastageRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Post wastage error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/wastage/:id/reverse
router.post("/:id/reverse", requirePermission("inventory.adjustment"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();
    const wastageRef = wastageCol(businessId).doc(String(req.params.id));

    const doc = await wastageRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Wastage record not found" });
    const wastage = doc.data()!;

    if (wastage.status !== "POSTED") {
      return res.status(400).json({ error: "Only POSTED wastage records can be reversed." });
    }

    await db.runTransaction(async (t) => {
      // Restore stock for lines
      for (const line of wastage.lines || []) {
        const pRef = productsCol(businessId).doc(line.productId);
        const pDoc = await t.get(pRef);
        if (pDoc.exists) {
          const p = pDoc.data()!;
          const currentStock = Number(p.stock) || 0;
          const nextStock = currentStock + line.quantity;
          const update: Record<string, any> = {
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };

          if (line.variantId && Array.isArray(p.variants)) {
            update.variants = p.variants.map((v: any) =>
              v.id === line.variantId
                ? { ...v, stock: (Number(v.stock) || 0) + line.quantity }
                : v
            );
          }
          t.update(pRef, update);
        }
      }

      // Mark transaction reversed
      if (wastage.transactionId) {
        const txRef = transactionsCol(businessId).doc(wastage.transactionId);
        t.update(txRef, {
          notes: "REVERSED WASTAGE ADJUSTMENT",
          isReversed: true,
          updatedAt: new Date().toISOString(),
        });
      }

      t.update(wastageRef, {
        status: "REVERSED",
        reversedAt: new Date().toISOString(),
        reversedById: (req as any).user?.id || null,
        updatedAt: new Date().toISOString(),
      });
    });

    const updated = await wastageRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Reverse wastage error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
