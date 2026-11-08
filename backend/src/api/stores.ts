import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

function storesCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("stores");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

// GET /api/stores — List all branch locations for this business
router.get("/", requirePermission("pos.sell", "inventory.view", "inventory.transfer", "shop.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });

    const snapshot = await storesCollection(businessId).get();
    const stores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // If no stores exist in cloud yet, ensure default head office store is provisioned
    if (stores.length === 0) {
      const bizDoc = await getDb().collection("businesses").doc(businessId).get();
      const bizData = bizDoc.data() || {};
      const defaultStore = {
        id: "1",
        name: bizData.businessName || "Main Branch",
        location: bizData.location || "Not Specified",
        phone: bizData.mobile || "",
        isHeadOffice: true,
        business_id: businessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storesCollection(businessId).doc("1").set(defaultStore);
      return res.json({ stores: [defaultStore] });
    }

    res.json({ stores });
  } catch (error) {
    console.error("List stores error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/stores — Create a new branch location
router.post("/", requirePermission("shop.manage", "settings.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });

    const { id, name, location, phone, isHeadOffice } = req.body || {};
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ error: "Store name is required." });
    }

    const col = storesCollection(businessId);
    const storeId = id ? String(id) : col.doc().id;
    const payload = stripUndefined({
      id: storeId,
      name: String(name).trim(),
      location: String(location || "Not Specified").trim(),
      phone: String(phone || "").trim(),
      isHeadOffice: Boolean(isHeadOffice),
      business_id: businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await col.doc(storeId).set(payload);
    res.status(201).json({ store: payload });
  } catch (error) {
    console.error("Create store error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/stores/:id — Update branch location details
router.patch("/:id", requirePermission("shop.manage", "settings.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });

    const storeId = String(req.params.id);
    const docRef = storesCollection(businessId).doc(storeId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Store not found." });
    }

    const { name, location, phone, isHeadOffice } = req.body || {};
    const payload = stripUndefined({
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(location !== undefined ? { location: String(location).trim() } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      ...(isHeadOffice !== undefined ? { isHeadOffice: Boolean(isHeadOffice) } : {}),
      updatedAt: new Date().toISOString(),
    });

    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    res.json({ store: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update store error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/stores/:id — Remove branch location (cannot delete head office or sole store)
router.delete("/:id", requirePermission("shop.manage", "settings.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });

    const storeId = String(req.params.id);
    const col = storesCollection(businessId);
    const docRef = col.doc(storeId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Store not found." });
    }

    const data = existing.data() || {};
    if (data.isHeadOffice) {
      return res.status(400).json({ error: "Cannot delete the Head Office branch." });
    }

    const allSnap = await col.get();
    if (allSnap.size <= 1) {
      return res.status(400).json({ error: "Cannot delete the only branch of a business." });
    }

    await docRef.delete();
    res.json({ success: true, deletedStoreId: storeId });
  } catch (error) {
    console.error("Delete store error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/stores/sync — Safe migration of offline / localStorage stores to cloud
router.post("/sync", requirePermission("shop.manage", "settings.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });

    const clientStores: any[] = Array.isArray(req.body?.stores) ? req.body.stores : [];
    const col = storesCollection(businessId);
    const existingSnap = await col.get();
    const existingMap = new Map(existingSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));

    const batch = getDb().batch();
    let writeCount = 0;

    for (const cs of clientStores) {
      if (!cs || !cs.id || !cs.name) continue;
      const storeId = String(cs.id);
      if (!existingMap.has(storeId)) {
        const payload = stripUndefined({
          id: storeId,
          name: String(cs.name).trim(),
          location: String(cs.location || "Not Specified").trim(),
          phone: String(cs.phone || "").trim(),
          isHeadOffice: Boolean(cs.isHeadOffice),
          business_id: businessId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        batch.set(col.doc(storeId), payload);
        existingMap.set(storeId, payload);
        writeCount++;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }

    res.json({ stores: Array.from(existingMap.values()), syncedCount: writeCount });
  } catch (error) {
    console.error("Sync stores error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
