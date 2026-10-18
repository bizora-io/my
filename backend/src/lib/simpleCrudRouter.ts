import express from "express";
import { getDb } from "./firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "../api/middleware/auth.js";

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export interface SimpleCrudOptions {
  /** Permission keys required for POST/PATCH/DELETE (EMPLOYEE must have one). */
  writePermissions?: string[];
  /** Permission keys required for GET (optional; empty = any authenticated user of the business). */
  readPermissions?: string[];
}

/**
 * GET/POST/PATCH/DELETE for businesses/{businessId}/{collectionName}/{id}.
 * Write routes optionally gated by requirePermission.
 */
export function createSimpleCrudRouter(
  collectionName: string,
  responseKey: string,
  listKey: string,
  options: SimpleCrudOptions = {}
) {
  const router = express.Router();
  const writePerms = options.writePermissions || [];
  const readPerms = options.readPermissions || [];

  function col(businessId: string) {
    return getDb().collection("businesses").doc(businessId).collection(collectionName);
  }

  const writeGuard =
    writePerms.length > 0 ? requirePermission(...writePerms) : ((_req: any, _res: any, next: any) => next());
  const readGuard =
    readPerms.length > 0 ? requirePermission(...readPerms) : ((_req: any, _res: any, next: any) => next());

  router.use(authenticateToken, requireBusinessContext);

  router.get("/", readGuard, async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
      const snapshot = await col(businessId).get();
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ [listKey]: items });
    } catch (error) {
      console.error(`List ${collectionName} error:`, error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/", writeGuard, async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
      const { id, ...data } = req.body || {};
      const payload = stripUndefined({ ...data, business_id: businessId, updatedAt: new Date().toISOString() });
      const collection = col(businessId);
      const docRef = id ? collection.doc(id) : collection.doc();
      await docRef.set(payload);
      res.status(201).json({ [responseKey]: { id: docRef.id, ...payload } });
    } catch (error) {
      console.error(`Create ${collectionName} error:`, error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.patch("/:id", writeGuard, async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
      const payload = stripUndefined({ ...req.body, updatedAt: new Date().toISOString() });
      const docRef = col(businessId).doc(String(req.params.id));
      await docRef.set(payload, { merge: true });
      const updated = await docRef.get();
      res.json({ [responseKey]: { id: updated.id, ...updated.data() } });
    } catch (error) {
      console.error(`Update ${collectionName} error:`, error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.delete("/:id", writeGuard, async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
      await col(businessId).doc(String(req.params.id)).delete();
      res.json({ success: true });
    } catch (error) {
      console.error(`Delete ${collectionName} error:`, error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
