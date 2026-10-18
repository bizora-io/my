import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function col(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("warehouses");
}

router.use(authenticateToken, requireBusinessContext);

// GET /api/warehouses
router.get("/", requirePermission("inventory.view", "inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await col(businessId).get();
    const warehouses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ warehouses });
  } catch (error) {
    console.error("List warehouses error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/warehouses
router.post("/", requirePermission("inventory.edit", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const body = req.body || {};
    const id = body.id || `wh-${Date.now()}`;
    const warehouse = stripUndefined({
      id,
      name: body.name,
      storeId: body.storeId || null,
      address: body.address || null,
      isDefault: !!body.isDefault,
      createdAt: new Date().toISOString(),
    });
    await col(businessId).doc(id).set(warehouse);
    res.status(201).json({ warehouse });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/warehouses/:id
router.put("/:id", requirePermission("inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const id = String(req.params.id);
    const body = stripUndefined({ ...req.body, id, updatedAt: new Date().toISOString() });
    await col(businessId).doc(id).set(body, { merge: true });
    res.json({ warehouse: body });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/warehouses/:id
router.delete("/:id", requirePermission("inventory.delete", "inventory.edit"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    await col(businessId).doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
