import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { logAudit, auditActorFromReq } from "../lib/auditLog.js";
import { broadcastBusinessSync, broadcastSaasStaff } from "../lib/chatSocket.js";

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/admin/subscriptions/migrations
 * List migration history across businesses.
 */
router.get("/migrations", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const { businessId } = req.query;
    let query: any = getDb().collection("subscriptionMigrations");

    if (businessId && typeof businessId === "string") {
      query = query.where("businessId", "==", businessId);
    }

    const snapshot = await query.get();
    const migrations = snapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ migrations });
  } catch (error) {
    console.error("List migrations error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/admin/subscriptions/subscribers
 * Group all active businesses by subscription plan and return breakdown.
 */
router.get("/subscribers", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (_req, res) => {
  try {
    const snapshot = await getDb().collection("businesses").get();
    const subscribersByPlan: Record<string, any[]> = {};

    snapshot.docs.forEach((doc: any) => {
      const b = { id: doc.id, ...doc.data() };
      const planName = b.plan || "Basic";
      if (!subscribersByPlan[planName]) {
        subscribersByPlan[planName] = [];
      }
      subscribersByPlan[planName].push({
        id: b.id,
        name: b.name || b.businessName || "Unnamed Shop",
        ownerName: b.ownerName || "—",
        email: b.email || "—",
        mobile: b.mobile || "—",
        accountStatus: b.accountStatus || "Active",
        subscriptionStatus: b.subscriptionStatus || "Active",
        subscriptionRenewsAt: b.subscriptionRenewsAt || null,
        monthlyFee: b.monthlyFee || 0,
        branchLimit: b.branchLimit || 1,
        employeeLimit: b.employeeLimit || 5,
        storageLimit: b.storageLimit || 1024,
      });
    });

    res.json({ subscribersByPlan });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/admin/subscriptions/migrate
 * Perform a transactional migration for a business between subscription plans.
 */
router.post("/migrate", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const {
      businessId,
      targetPlanId,
      targetPlanName,
      effectiveImmediately = true,
      billingAdjustment = 0,
      reason,
      adjustRenewalDate = false,
      customRenewsAt,
    } = req.body || {};

    if (!businessId) {
      res.status(400).json({ error: "businessId is required." });
      return;
    }

    if (!targetPlanId && !targetPlanName) {
      res.status(400).json({ error: "Target plan (targetPlanId or targetPlanName) is required." });
      return;
    }

    const db = getDb();
    const bizDocRef = db.collection("businesses").doc(businessId);
    const bizDoc = await bizDocRef.get();

    if (!bizDoc.exists) {
      res.status(404).json({ error: "Business not found." });
      return;
    }

    const currentBiz = bizDoc.data() || {};
    const previousPlan = currentBiz.plan || "Basic";

    // Retrieve plans list from platformConfig
    const plansDoc = await db.collection("platformConfig").doc("subscriptionPlans").get();
    const rawPlans = plansDoc.exists ? (plansDoc.data()?.list || plansDoc.data()?.plans || []) : [];

    // Find the target plan definition
    const targetPlan = rawPlans.find(
      (p: any) =>
        (targetPlanId && String(p.id).toLowerCase() === String(targetPlanId).toLowerCase()) ||
        (targetPlanName && String(p.name).toLowerCase() === String(targetPlanName).toLowerCase())
    ) || {
      id: targetPlanId || String(targetPlanName).toLowerCase().replace(/\s+/g, "-"),
      name: targetPlanName || targetPlanId,
      price: req.body.targetPrice ?? 0,
      interval: "month",
      features: req.body.targetFeatures || [],
      limitStores: req.body.targetLimitStores ?? 1,
      limitUsers: req.body.targetLimitUsers ?? 5,
      limitEmployees: req.body.targetLimitEmployees ?? 10,
      limitStorageMb: req.body.targetLimitStorageMb ?? 1024,
      modules: req.body.targetModules || ["pos", "inventory", "reports"],
    };

    const now = new Date();
    const nowIso = now.toISOString();

    // Calculate renewal date
    let newRenewsAt = currentBiz.subscriptionRenewsAt || null;
    if (customRenewsAt) {
      newRenewsAt = new Date(customRenewsAt).toISOString();
    } else if (adjustRenewalDate) {
      const daysToAdd = targetPlan.interval === "year" ? 365 : (targetPlan.interval === "14 days" ? 14 : 30);
      newRenewsAt = new Date(now.getTime() + daysToAdd * 86400000).toISOString();
    }

    const isTargetPremium = String(targetPlan.id).toLowerCase() !== "basic" &&
      String(targetPlan.id).toLowerCase() !== "trial" &&
      Number(targetPlan.price) > 0;

    // Build migration record
    const migrationId = `mig-${Date.now()}`;
    const actor = auditActorFromReq(req as any);
    const migrationRecord = {
      id: migrationId,
      businessId,
      businessName: currentBiz.name || currentBiz.businessName || "Unknown Shop",
      previousPlan,
      newPlan: targetPlan.name,
      previousFee: currentBiz.monthlyFee ?? 0,
      newFee: Number(targetPlan.price) || 0,
      previousRenewsAt: currentBiz.subscriptionRenewsAt || null,
      newRenewsAt,
      billingAdjustment: Number(billingAdjustment) || 0,
      reason: reason || `Migrated from ${previousPlan} to ${targetPlan.name}`,
      migratedBy: (req as any).user?.name || (req as any).user?.email || "SaaS Admin",
      migratedById: actor.actorId,
      effectiveImmediately: Boolean(effectiveImmediately),
      effectiveDate: nowIso,
      createdAt: nowIso,
    };

    // Prepare update payload for business
    const businessUpdate: Record<string, any> = {
      plan: targetPlan.name,
      monthlyFee: Number(targetPlan.price) || 0,
      isPremium: isTargetPremium,
      branchLimit: targetPlan.limitStores ?? targetPlan.maxBranches ?? currentBiz.branchLimit ?? 1,
      employeeLimit: targetPlan.limitEmployees ?? targetPlan.maxEmployees ?? currentBiz.employeeLimit ?? 5,
      storageLimit: targetPlan.limitStorageMb ?? targetPlan.maxStorage ?? currentBiz.storageLimit ?? 1024,
      updatedAt: nowIso,
      lastMigratedAt: nowIso,
    };

    if (Array.isArray(targetPlan.features) && targetPlan.features.length) {
      businessUpdate.features = targetPlan.features;
    }
    if (Array.isArray(targetPlan.modules) && targetPlan.modules.length) {
      businessUpdate.enabledFeatures = targetPlan.modules;
    }
    if (newRenewsAt) {
      businessUpdate.subscriptionRenewsAt = newRenewsAt;
    }
    if (String(currentBiz.subscriptionStatus).toLowerCase() === "expired" || String(currentBiz.subscriptionStatus).toLowerCase() === "pastdue") {
      businessUpdate.subscriptionStatus = "Active";
    }

    // Persist migration record and update business
    await db.collection("subscriptionMigrations").doc(migrationId).set(migrationRecord);
    await bizDocRef.set(businessUpdate, { merge: true });

    // Log platform audit
    await logAudit({
      ...actor,
      action: `Migrated business ${currentBiz.name || businessId} from ${previousPlan} to ${targetPlan.name}`,
      targetType: "subscriptionMigration",
      targetId: migrationId,
      details: JSON.stringify({
        previousPlan,
        newPlan: targetPlan.name,
        adjustment: billingAdjustment,
        reason,
      }),
    });

    // Realtime notification
    broadcastBusinessSync(businessId, {
      domain: "subscription",
      reason: "subscription_migration",
      payload: {
        plan: targetPlan.name,
        isPremium: isTargetPremium,
        renewsAt: newRenewsAt,
      },
    });

    broadcastSaasStaff({
      domain: "subscription",
      reason: "subscription_migration",
      payload: migrationRecord,
    });

    const refreshedBiz = await bizDocRef.get();

    res.json({
      success: true,
      message: `Successfully migrated ${currentBiz.name || businessId} to ${targetPlan.name}`,
      migration: migrationRecord,
      business: { id: refreshedBiz.id, ...refreshedBiz.data() },
    });
  } catch (error) {
    console.error("Subscription migration error:", error);
    res.status(500).json({ error: "Internal Server Error during subscription migration" });
  }
});

export default router;

