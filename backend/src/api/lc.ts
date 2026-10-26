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

function lcCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("lettersOfCredit");
}

// GET /api/lc
router.get("/", requirePermission("inventory.purchase", "finance.ledgers"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status } = req.query;

    let query: FirebaseFirestore.Query = lcCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);

    const snap = await query.get();
    const lcs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    lcs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(lcs);
  } catch (error) {
    console.error("List LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/lc/expiring
router.get("/expiring", requirePermission("inventory.purchase", "finance.ledgers"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await lcCol(businessId).where("status", "in", ["OPENED", "AMENDED"]).get();

    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiring = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((lc) => {
        if (!lc.expiryDate) return false;
        const exp = new Date(lc.expiryDate);
        return exp >= now && exp <= thirtyDaysOut;
      });

    res.json(expiring);
  } catch (error) {
    console.error("Expiring LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/lc/:id
router.get("/:id", requirePermission("inventory.purchase", "finance.ledgers"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const doc = await lcCol(businessId).doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Get LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc
router.post("/", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const {
      lcNumber,
      bankName,
      branch,
      supplierId,
      supplierName,
      amount,
      currency = "BDT",
      marginPercent = 10,
      issuingDate,
      expiryDate,
      shipmentDate,
      notes,
    } = req.body || {};

    if (!lcNumber || !bankName || !amount) {
      return res.status(400).json({ error: "lcNumber, bankName, and amount are required" });
    }

    const numAmount = Number(amount) || 0;
    const numMargin = Number(marginPercent) || 0;
    const marginAmount = Math.round((numAmount * numMargin) / 100 * 100) / 100;

    const docRef = lcCol(businessId).doc();
    const payload = stripUndefined({
      lcNumber: String(lcNumber).trim(),
      bankName: String(bankName).trim(),
      branch: branch?.trim() || "",
      supplierId: supplierId || null,
      supplierName: supplierName?.trim() || "",
      amount: numAmount,
      currency: currency.toUpperCase(),
      marginPercent: numMargin,
      marginAmount,
      utilizedAmount: 0,
      remainingAmount: numAmount,
      issuingDate: issuingDate || new Date().toISOString(),
      expiryDate: expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      shipmentDate: shipmentDate || null,
      notes: notes || "",
      status: "DRAFT",
      documents: [],
      amendments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc/:id/open
router.post("/:id/open", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = lcCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });

    const update = {
      status: "OPENED",
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Open LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc/:id/amend
router.post("/:id/amend", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = lcCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });

    const data = doc.data()!;
    const { amount, expiryDate, description } = req.body || {};

    const amendment = {
      id: `amd-${Date.now()}`,
      date: new Date().toISOString(),
      description: description || "LC terms amended",
      oldAmount: data.amount,
      newAmount: amount != null ? Number(amount) : data.amount,
      oldExpiry: data.expiryDate,
      newExpiry: expiryDate || data.expiryDate,
    };

    const newAmount = amendment.newAmount;
    const newMargin = Math.round((newAmount * (data.marginPercent || 0)) / 100 * 100) / 100;
    const newRemaining = Math.max(0, newAmount - (data.utilizedAmount || 0));

    const update = {
      amount: newAmount,
      expiryDate: amendment.newExpiry,
      marginAmount: newMargin,
      remainingAmount: newRemaining,
      status: "AMENDED",
      amendments: [...(data.amendments || []), amendment],
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: doc.id, ...data, ...update });
  } catch (error) {
    console.error("Amend LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc/:id/utilize
router.post("/:id/utilize", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = lcCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });

    const data = doc.data()!;
    const utilizationAmount = Number(req.body?.amount) || 0;
    if (utilizationAmount <= 0) {
      return res.status(400).json({ error: "Positive utilization amount required" });
    }

    const nextUtilized = (Number(data.utilizedAmount) || 0) + utilizationAmount;
    const nextRemaining = Math.max(0, (Number(data.amount) || 0) - nextUtilized);
    const nextStatus = nextRemaining === 0 ? "UTILIZED" : data.status;

    const update = {
      utilizedAmount: nextUtilized,
      remainingAmount: nextRemaining,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...data, ...update });
  } catch (error) {
    console.error("Utilize LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc/:id/documents
router.post("/:id/documents", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = lcCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });

    const data = doc.data()!;
    const { name, type, refNo, url } = req.body || {};
    if (!name) return res.status(400).json({ error: "Document name is required" });

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: String(name).trim(),
      type: type || "Commercial Invoice",
      refNo: refNo || "",
      url: url || "",
      addedAt: new Date().toISOString(),
    };

    const update = {
      documents: [...(data.documents || []), newDoc],
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...data, ...update });
  } catch (error) {
    console.error("Add LC document error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/lc/:id/close
router.post("/:id/close", requirePermission("inventory.purchase", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = lcCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Letter of Credit not found" });

    const update = {
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Close LC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
