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

function eprocCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("eprocurement");
}

function poCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("purchaseOrders");
}

// GET /api/eprocurement
router.get("/", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status } = req.query;

    let query: FirebaseFirestore.Query = eprocCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);

    const snap = await query.get();
    const rfqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rfqs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(rfqs);
  } catch (error) {
    console.error("List RFQs error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/eprocurement/:id
router.get("/:id", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const doc = await eprocCol(businessId).doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: "RFQ not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Get RFQ error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/eprocurement - Create RFQ
router.post("/", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { title, description, category, deadline, items } = req.body || {};

    if (!title) return res.status(400).json({ error: "Title is required" });

    const docRef = eprocCol(businessId).doc();
    const payload = stripUndefined({
      title: String(title).trim(),
      description: description?.trim() || "",
      category: category?.trim() || "General Goods",
      deadline: deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
      items: Array.isArray(items) ? items : [],
      bids: [],
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create RFQ error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/eprocurement/:id/publish
router.post("/:id/publish", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = eprocCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "RFQ not found" });

    const update = {
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Publish RFQ error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/eprocurement/:id/bids
router.post("/:id/bids", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = eprocCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "RFQ not found" });

    const rfq = doc.data()!;
    const { supplierId, supplierName, bidAmount, deliveryDays, notes } = req.body || {};

    if (!supplierName || !(Number(bidAmount) > 0)) {
      return res.status(400).json({ error: "supplierName and positive bidAmount are required" });
    }

    const bid = {
      id: `bid-${Date.now()}`,
      supplierId: supplierId || null,
      supplierName: String(supplierName).trim(),
      bidAmount: Number(bidAmount),
      deliveryDays: Number(deliveryDays) || 7,
      notes: notes || "",
      submittedAt: new Date().toISOString(),
      status: "SUBMITTED",
    };

    const update = {
      bids: [...(rfq.bids || []), bid],
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.status(201).json({ id: doc.id, ...rfq, ...update });
  } catch (error) {
    console.error("Submit bid error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/eprocurement/:id/award
router.post("/:id/award", requirePermission("inventory.purchase"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = eprocCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "RFQ not found" });

    const rfq = doc.data()!;
    const { bidId, createPurchaseOrder = true, warehouseId = "default" } = req.body || {};

    const winningBid = (rfq.bids || []).find((b: any) => b.id === bidId);
    if (!winningBid) {
      return res.status(404).json({ error: "Selected bid not found in this RFQ" });
    }

    const updatedBids = (rfq.bids || []).map((b: any) => ({
      ...b,
      status: b.id === bidId ? "ACCEPTED" : "REJECTED",
    }));

    let poId = null;
    if (createPurchaseOrder) {
      const poDoc = poCol(businessId).doc();
      const poPayload = stripUndefined({
        business_id: businessId,
        supplierName: winningBid.supplierName,
        supplierId: winningBid.supplierId || null,
        warehouseId,
        items: (rfq.items || []).map((item: any) => ({
          name: item.productName || item.name || "Item",
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "pcs",
          cost: Math.round(((winningBid.bidAmount || 0) / Math.max(1, (rfq.items || []).length)) * 100) / 100,
        })),
        totalAmount: winningBid.bidAmount,
        status: "Pending",
        notes: `Auto-generated from awarded RFQ: ${rfq.title}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await poDoc.set(poPayload);
      poId = poDoc.id;
    }

    const update = {
      status: "AWARDED",
      awardedBidId: winningBid.id,
      awardedSupplierName: winningBid.supplierName,
      awardedAmount: winningBid.bidAmount,
      awardedAt: new Date().toISOString(),
      purchaseOrderId: poId,
      bids: updatedBids,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...rfq, ...update });
  } catch (error) {
    console.error("Award RFQ error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
