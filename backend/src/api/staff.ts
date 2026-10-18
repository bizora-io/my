import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";

const router = express.Router();

// Per-business staff records only (mirrors DataContext's `staff` state).
// The cross-business "global employee registry" used for employee login
// (bizora_global_employee_registry in localStorage) is a separate, more
// involved piece and is NOT migrated yet - see README.
function staffCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("staff");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

// GET /api/staff
router.get("/", requirePermission("hr.manage", "hr.payroll"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snapshot = await staffCollection(businessId).get();
    const staff = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ staff });
  } catch (error) {
    console.error("List staff error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/staff
router.post("/", requirePermission("hr.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { id, ...data } = req.body;
    const payload = stripUndefined({ ...data, business_id: businessId, updatedAt: new Date().toISOString() });

    const col = staffCollection(businessId);
    const docRef = id ? col.doc(id) : col.doc();
    await docRef.set(payload);

    res.status(201).json({ staffMember: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/staff/:id
router.patch("/:id", requirePermission("hr.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const payload = stripUndefined({ ...req.body, updatedAt: new Date().toISOString() });
    const docRef = staffCollection(businessId).doc(String(req.params.id));
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    res.json({ staffMember: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/staff/:id
router.delete("/:id", requirePermission("hr.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    await staffCollection(businessId).doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
