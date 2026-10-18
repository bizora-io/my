import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function entitiesCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("entities");
}

router.use(authenticateToken, requireBusinessContext);

router.get("/", requirePermission("crm.view", "crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snapshot = await entitiesCollection(businessId).get();
    const entities = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ entities });
  } catch (error) {
    console.error("List entities error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requirePermission("crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { id, ...data } = req.body || {};
    const payload = stripUndefined({ ...data, business_id: businessId, updatedAt: new Date().toISOString() });
    const col = entitiesCollection(businessId);
    const docRef = id ? col.doc(id) : col.doc();
    await docRef.set(payload);
    res.status(201).json({ entity: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Create entity error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id", requirePermission("crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const payload = stripUndefined({ ...req.body, updatedAt: new Date().toISOString() });
    const docRef = entitiesCollection(businessId).doc(String(req.params.id));
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    res.json({ entity: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update entity error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requirePermission("crm.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    await entitiesCollection(businessId).doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete entity error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
