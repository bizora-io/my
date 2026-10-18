import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { allocateFefo, applyFefoDeduction, upsertLot, type FefoLot } from "../lib/fefo.js";
import { logAudit } from "../lib/auditLog.js";

const router = express.Router();

function bizCol(businessId: string, name: string) {
  return getDb().collection("businesses").doc(businessId).collection(name);
}

router.use(authenticateToken, requireBusinessContext);

/**
 * GET /api/fefo/preview?productId=&qty=
 * Suggest lot allocation without mutating stock.
 */
router.get("/preview", requirePermission("inventory.view", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const productId = String(req.query.productId || "");
    const qty = Math.max(0, Number(req.query.qty) || 0);
    if (!productId || qty <= 0) return res.status(400).json({ error: "productId and qty>0 required" });

    const doc = await bizCol(businessId, "products").doc(productId).get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    const prod = doc.data() || {};
    let lots: FefoLot[] = Array.isArray(prod.lots) ? prod.lots : [];
    // Fallback: single synthetic lot from product-level fields
    if (!lots.length && (Number(prod.stock) || 0) > 0) {
      lots = [
        {
          lotNumber: prod.batchNumber || "DEFAULT",
          qty: Number(prod.stock) || 0,
          expiryDate: prod.expiryDate,
        },
      ];
    }
    const allowExpired = req.query.allowExpired === "1" || req.query.allowExpired === "true";
    const warehouseId = req.body?.warehouseId || req.query.warehouseId || prod.warehouseId;
    const allocation = allocateFefo(lots, qty, { allowExpired, warehouseId: warehouseId ? String(warehouseId) : undefined });
    res.json({ productId, productName: prod.name, ...allocation });
  } catch (error) {
    console.error("FEFO preview error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/fefo/allocate
 * Body: { productId, qty, allowExpired?, commit?: true }
 * When commit=true, reduces product.lots and stock.
 */
router.post("/allocate", requirePermission("inventory.edit", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { productId, qty, allowExpired, commit } = req.body || {};
    if (!productId || !(Number(qty) > 0)) {
      return res.status(400).json({ error: "productId and qty>0 required" });
    }
    const prodRef = bizCol(businessId, "products").doc(productId);
    const doc = await prodRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    const prod = doc.data() || {};
    let lots: FefoLot[] = Array.isArray(prod.lots) ? prod.lots : [];
    if (!lots.length && (Number(prod.stock) || 0) > 0) {
      lots = [
        {
          lotNumber: prod.batchNumber || "DEFAULT",
          qty: Number(prod.stock) || 0,
          expiryDate: prod.expiryDate,
        },
      ];
    }
    const warehouseId = (req.body as any)?.warehouseId || prod.warehouseId;
    const allocation = allocateFefo(lots, Number(qty), {
      allowExpired: !!allowExpired,
      warehouseId: warehouseId ? String(warehouseId) : undefined,
    });
    if (!allocation.ok) {
      return res.status(409).json({ error: "Insufficient non-expired stock", ...allocation });
    }

    if (commit) {
      const remainingLots = applyFefoDeduction(lots, allocation);
      const newStock = Math.max(0, (Number(prod.stock) || 0) - allocation.allocated);
      // Keep product-level expiry as earliest remaining lot
      const nextExpiry = remainingLots
        .filter((l) => l.expiryDate)
        .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
      await prodRef.set(
        {
          lots: remainingLots,
          stock: newStock,
          expiryDate: nextExpiry || prod.expiryDate || null,
          batchNumber: remainingLots[0]?.lotNumber || prod.batchNumber || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await logAudit({
        actorId: (req as any).user.id,
        actorRole: (req as any).user.role,
        action: `FEFO allocate ${allocation.allocated} of ${productId}`,
        targetType: "product",
        targetId: productId,
      });
      return res.json({ committed: true, productId, stock: newStock, lots: remainingLots, ...allocation });
    }

    res.json({ committed: false, productId, ...allocation });
  } catch (error) {
    console.error("FEFO allocate error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * POST /api/fefo/adjust
 * Body: { productId, lotNumber, qtyDelta, reason?, expiryDate?, setQty? }
 * qtyDelta: positive receive / negative write-off. setQty: absolute override for that lot.
 */
router.post("/adjust", requirePermission("inventory.edit", "inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { productId, lotNumber, qtyDelta, setQty, reason, expiryDate } = req.body || {};
    if (!productId || !lotNumber) {
      return res.status(400).json({ error: "productId and lotNumber required" });
    }

    const prodRef = bizCol(businessId, "products").doc(productId);
    const doc = await prodRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    const prod = doc.data() || {};

    let lots: FefoLot[] = Array.isArray(prod.lots) ? [...prod.lots] : [];
    if (!lots.length && (Number(prod.stock) || 0) > 0) {
      lots = [
        {
          lotNumber: prod.batchNumber || "DEFAULT",
          qty: Number(prod.stock) || 0,
          expiryDate: prod.expiryDate,
        },
      ];
    }

    const idx = lots.findIndex((l) => String(l.lotNumber) === String(lotNumber));
    let beforeQty = 0;
    if (idx >= 0) {
      beforeQty = Number(lots[idx].qty) || 0;
      let after = beforeQty;
      if (setQty != null && setQty !== "") {
        after = Math.max(0, Number(setQty) || 0);
      } else {
        after = Math.max(0, beforeQty + (Number(qtyDelta) || 0));
      }
      if (after <= 0) {
        lots.splice(idx, 1);
      } else {
        lots[idx] = {
          ...lots[idx],
          qty: after,
          expiryDate: expiryDate || lots[idx].expiryDate,
        };
      }
    } else {
      // New lot (positive only)
      const add = setQty != null ? Number(setQty) : Number(qtyDelta) || 0;
      if (add <= 0) {
        return res.status(400).json({ error: "Lot not found; use positive qty to create" });
      }
      lots = upsertLot(lots, {
        lotNumber: String(lotNumber),
        qty: add,
        expiryDate: expiryDate || undefined,
        receivedAt: new Date().toISOString().slice(0, 10),
      });
      beforeQty = 0;
    }

    const lotQtySum = lots.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    // Prefer lot sum as stock when lots exist
    const newStock = lots.length ? lotQtySum : Math.max(0, (Number(prod.stock) || 0) + (Number(qtyDelta) || 0));
    const nextExpiry = lots
      .filter((l) => l.expiryDate)
      .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;

    await prodRef.set(
      {
        lots,
        stock: newStock,
        expiryDate: nextExpiry || prod.expiryDate || null,
        batchNumber: lots[0]?.lotNumber || prod.batchNumber || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const afterQty = lots.find((l) => String(l.lotNumber) === String(lotNumber))?.qty ?? 0;
    const delta = afterQty - beforeQty;

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Lot adjust ${lotNumber} on ${productId}: ${beforeQty} → ${afterQty} (${reason || "n/a"})`,
      targetType: "product",
      targetId: productId,
    });

    // Ledger stock movement for reports
    let adjustmentId: string | null = null;
    if (delta !== 0) {
      const txRef = bizCol(businessId, "transactions").doc();
      adjustmentId = txRef.id;
      const unitCost = Number(prod.purchasePrice) || Number(prod.cost) || 0;
      await txRef.set({
        date: new Date().toISOString().slice(0, 10),
        entityName: "Lot Adjustment",
        type: "Stock Adjustment",
        amount: Math.abs(delta) * unitCost,
        paymentMethod: "Adjustment",
        reference: `LOT-ADJ-${lotNumber}`.slice(0, 40),
        notes: `Lot ${lotNumber}: ${beforeQty} → ${afterQty} (${reason || "n/a"})`,
        items: [
          {
            productId,
            name: prod.name || productId,
            qty: Math.abs(delta),
            price: unitCost,
            total: Math.abs(delta) * unitCost,
            batchNumber: lotNumber,
            expiryDate: expiryDate || lots.find((l) => String(l.lotNumber) === String(lotNumber))?.expiryDate,
            adjustmentDirection: delta > 0 ? "in" : "out",
          },
        ],
        details: { subtotal: 0, tax: 0, discount: 0, delivery: 0, lotAdjust: true, qtyDelta: delta },
        timeline: [
          {
            status: "Lot Adjusted",
            date: new Date().toISOString(),
            user: (req as any).user.id,
            note: reason || "",
          },
        ],
        createdAt: new Date().toISOString(),
        business_id: businessId,
      });
    }

    res.json({
      productId,
      lotNumber,
      beforeQty,
      afterQty,
      qtyDelta: delta,
      stock: newStock,
      lots,
      reason: reason || null,
      adjustmentId,
    });
  } catch (error) {
    console.error("Lot adjust error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * POST /api/fefo/write-off-expired
 * Body: { productIds?: string[], asOf?: YYYY-MM-DD, reason?: string }
 * Zeros all lots with expiryDate < asOf (default today). Posts one Stock Adjustment per product.
 */
router.post("/write-off-expired", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const asOf = String(req.body?.asOf || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const reason = req.body?.reason || "expired";
    const onlyIds: string[] | null = Array.isArray(req.body?.productIds) ? req.body.productIds.map(String) : null;

    const snap = await bizCol(businessId, "products").get();
    const results: any[] = [];
    let totalLots = 0;
    let totalQty = 0;

    for (const doc of snap.docs) {
      if (onlyIds && !onlyIds.includes(doc.id)) continue;
      const prod = doc.data() || {};
      if (prod.isDeleted || prod.type === "Service") continue;
      let lots: FefoLot[] = Array.isArray(prod.lots) ? [...prod.lots] : [];
      if (!lots.length && (Number(prod.stock) || 0) > 0 && prod.expiryDate) {
        lots = [
          {
            lotNumber: prod.batchNumber || "DEFAULT",
            qty: Number(prod.stock) || 0,
            expiryDate: prod.expiryDate,
          },
        ];
      }
      if (!lots.length) continue;

      const kept: FefoLot[] = [];
      const removed: FefoLot[] = [];
      for (const lot of lots) {
        const exp = lot.expiryDate ? String(lot.expiryDate).slice(0, 10) : null;
        const qty = Number(lot.qty) || 0;
        if (exp && exp < asOf && qty > 0) {
          removed.push(lot);
          totalLots += 1;
          totalQty += qty;
        } else if (qty > 0) {
          kept.push(lot);
        }
      }
      if (!removed.length) continue;

      const newStock = kept.reduce((s, l) => s + (Number(l.qty) || 0), 0);
      const nextExpiry = kept
        .filter((l) => l.expiryDate)
        .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;

      await doc.ref.set(
        {
          lots: kept,
          stock: newStock,
          expiryDate: nextExpiry || null,
          batchNumber: kept[0]?.lotNumber || prod.batchNumber || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const unitCost = Number(prod.purchasePrice) || Number(prod.cost) || 0;
      const removedQty = removed.reduce((s, l) => s + (Number(l.qty) || 0), 0);
      const txRef = bizCol(businessId, "transactions").doc();
      await txRef.set({
        date: asOf,
        entityName: "Expired Lot Write-off",
        type: "Stock Adjustment",
        amount: removedQty * unitCost,
        paymentMethod: "Adjustment",
        reference: `EXP-WO-${doc.id.slice(-6)}`,
        notes: `Write-off ${removed.length} expired lot(s) as of ${asOf} (${reason})`,
        items: removed.map((l) => ({
          productId: doc.id,
          name: prod.name || doc.id,
          qty: Number(l.qty) || 0,
          price: unitCost,
          total: (Number(l.qty) || 0) * unitCost,
          batchNumber: l.lotNumber,
          expiryDate: l.expiryDate,
          adjustmentDirection: "out",
        })),
        details: { subtotal: 0, tax: 0, discount: 0, delivery: 0, expiredWriteOff: true },
        createdAt: new Date().toISOString(),
        business_id: businessId,
      });

      results.push({
        productId: doc.id,
        productName: prod.name,
        removedLots: removed.length,
        removedQty,
        stock: newStock,
        adjustmentId: txRef.id,
      });
    }

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Write-off expired lots as of ${asOf}: ${totalLots} lots / ${totalQty} units across ${results.length} products`,
      targetType: "product",
      targetId: "bulk",
    });

    res.json({
      asOf,
      reason,
      productsAffected: results.length,
      lotsRemoved: totalLots,
      qtyRemoved: totalQty,
      results,
    });
  } catch (error) {
    console.error("Write-off expired error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/fefo/movements?lotNumber=&productId=&limit=
 * Scan transactions for lines referencing this lot (batchNumber or lots[]).
 */
router.get("/movements", requirePermission("inventory.view", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const lotNumber = String(req.query.lotNumber || "").trim();
    const productId = req.query.productId ? String(req.query.productId) : null;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    if (!lotNumber) return res.status(400).json({ error: "lotNumber required" });

    const snap = await bizCol(businessId, "transactions").get();
    const movements: any[] = [];

    for (const doc of snap.docs) {
      const tx = doc.data() || {};
      const items = Array.isArray(tx.items) ? tx.items : [];
      for (const item of items) {
        if (productId && String(item.productId) !== productId) continue;
        const lotMatch =
          String(item.batchNumber || "") === lotNumber ||
          (Array.isArray(item.lots) &&
            item.lots.some((l: any) => String(l.lotNumber) === lotNumber));
        if (!lotMatch) continue;

        let qty = Number(item.qty) || 0;
        if (Array.isArray(item.lots)) {
          const line = item.lots.find((l: any) => String(l.lotNumber) === lotNumber);
          if (line) qty = Number(line.qty) || qty;
        }

        const type = String(tx.type || "");
        let direction: "in" | "out" | "unknown" = "unknown";
        if (item.adjustmentDirection === "in" || item.adjustmentDirection === "out") {
          direction = item.adjustmentDirection;
        } else if (["Purchase", "Sales Return", "Stock Adjustment"].includes(type)) {
          direction = type === "Stock Adjustment" && item.adjustmentDirection === "out" ? "out" : "in";
          if (type === "Stock Adjustment" && !item.adjustmentDirection) {
            // use details.qtyDelta if present
            const d = Number(tx.details?.qtyDelta);
            direction = d < 0 ? "out" : "in";
          }
          if (type === "Purchase" || type === "Sales Return") direction = "in";
        } else if (["Sale", "Purchase Return"].includes(type)) {
          direction = "out";
        }

        movements.push({
          transactionId: doc.id,
          date: tx.date,
          type,
          direction,
          qty,
          entityName: tx.entityName,
          reference: tx.reference,
          productId: item.productId,
          productName: item.name,
          lotNumber,
          expiryDate: item.expiryDate,
          notes: tx.notes,
        });
      }
    }

    movements.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    res.json({
      lotNumber,
      productId,
      count: Math.min(movements.length, limit),
      totalMatched: movements.length,
      movements: movements.slice(0, limit),
    });
  } catch (error) {
    console.error("Lot movements error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;



