import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";

const router = express.Router();

// These settings groups are all small, edited together, and change
// infrequently - bundled into one document on businesses/{id} itself
// instead of separate sub-collections/round trips per field.
const SETTINGS_FIELDS = [
  "courierSettings",
  "domainSettings",
  "shopPolicies",
  "promoCodes",
  "categories",
  "brands",
  "units",
  "expenseCategories",
  "loyaltyConfig",
  "referralConfig",
  "leavePolicy",
] as const;

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

// GET /api/business-settings
router.get("/", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const doc = await getDb().collection("businesses").doc(businessId).get();
    const data = doc.data() || {};
    const settings: Record<string, any> = {};
    for (const field of SETTINGS_FIELDS) settings[field] = data[field] ?? null;
    res.json({ settings });
  } catch (error) {
    console.error("Get business settings error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/business-settings - partial update, only the fields provided are touched.
router.put("/", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const update: Record<string, any> = {};
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    await getDb().collection("businesses").doc(businessId).set(stripUndefined(update), { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Update business settings error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
