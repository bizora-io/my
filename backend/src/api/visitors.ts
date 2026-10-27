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

function visitorsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("visitors");
}

// GET /api/visitors
router.get("/", requirePermission("hr.manage", "crm.view", "admin.settings", "admin.stores", "crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status } = req.query;

    let query: FirebaseFirestore.Query = visitorsCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);

    const snap = await query.get();
    const visitors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    visitors.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(visitors);
  } catch (error) {
    console.error("List visitors error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/visitors/on-site
router.get("/on-site", requirePermission("hr.manage", "crm.view", "admin.settings", "admin.stores", "crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await visitorsCol(businessId).where("status", "==", "CHECKED_IN").get();
    const onSite = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(onSite);
  } catch (error) {
    console.error("List on-site visitors error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/visitors - Pre-register or register
router.post("/", requirePermission("hr.manage", "crm.manage", "admin.settings", "admin.stores", "crm.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { visitorName, phone, email, company, hostEmployeeName, hostEmployeeId, purpose, expectedDate, notes } = req.body || {};

    if (!visitorName || !phone) {
      return res.status(400).json({ error: "visitorName and phone are required" });
    }

    const docRef = visitorsCol(businessId).doc();
    const payload = stripUndefined({
      visitorName: String(visitorName).trim(),
      phone: String(phone).trim(),
      email: email?.trim() || "",
      company: company?.trim() || "",
      hostEmployeeName: hostEmployeeName?.trim() || "Front Desk",
      hostEmployeeId: hostEmployeeId || null,
      purpose: purpose?.trim() || "Meeting",
      expectedDate: expectedDate || new Date().toISOString(),
      badgeNumber: null,
      status: "REGISTERED",
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create visitor error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/visitors/:id/check-in
router.post("/:id/check-in", requirePermission("hr.manage", "crm.manage", "admin.settings", "crm.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = visitorsCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Visitor record not found" });

    const badgeNo = req.body?.badgeNumber || `B-${Date.now().toString().slice(-4)}`;
    const update = {
      badgeNumber: String(badgeNo).trim(),
      status: "CHECKED_IN",
      checkedInAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Visitor check-in error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/visitors/:id/check-out
router.post("/:id/check-out", requirePermission("hr.manage", "crm.manage", "admin.settings", "crm.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = visitorsCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Visitor record not found" });

    const update = {
      status: "CHECKED_OUT",
      checkedOutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Visitor check-out error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/visitors/:id/cancel
router.post("/:id/cancel", requirePermission("hr.manage", "crm.manage", "admin.settings", "crm.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = visitorsCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Visitor record not found" });

    const update = {
      status: "CANCELLED",
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Cancel visitor error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
