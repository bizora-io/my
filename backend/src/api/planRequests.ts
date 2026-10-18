/**
 * Shop subscription upgrade / plan-change requests.
 * Collection: platformConfig is separate; requests live in `planRequests`.
 * Supports server-side price validation, currency, billing cycles,
 * idempotent revenue synchronization, and approval workflow.
 */
import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";
import { stampPaymentSuccess } from "../lib/billingSignals.js";
import { broadcastSaasStaff, broadcastBusinessSync } from "../lib/chatSocket.js";
import { getSubscriptionPlans, DEFAULT_PLANS_LIST } from "./platformConfig.js";
import { sendNotification } from "../lib/notificationService.js";

const router = express.Router();
const col = () => getDb().collection("planRequests");
const paymentsCol = () => getDb().collection("revenuePayments");

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isSaas(role: string) {
  return role === "SAAS_OWNER" || role === "SAAS_ADMIN";
}

/**
 * Resolve plan details and server-authoritative price from database.
 * Never trust client-supplied prices.
 */
async function resolvePlanPrice(planIdOrName: string, billingCycle: string = "monthly"): Promise<{
  planId: string;
  planName: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  isFree: boolean;
  planObj: any;
} | null> {
  const plans = await getSubscriptionPlans();
  const query = String(planIdOrName || "").trim().toLowerCase();
  
  const found = plans.find((p: any) =>
    String(p.id || "").toLowerCase() === query ||
    String(p.name || "").toLowerCase() === query ||
    query.includes(String(p.name || "").toLowerCase()) ||
    String(p.name || "").toLowerCase().includes(query)
  );

  if (!found) return null;

  const cycle = String(billingCycle || "").toLowerCase() === "yearly" ? "yearly" : "monthly";
  const baseMonthly = Number(found.price) || 0;
  const isFree = baseMonthly === 0 || found.id === "trial" || String(found.name).toLowerCase() === "trial";
  
  // Calculate price: monthly base or configured yearly price (fallback to 10 months for 2 months free)
  const amount = isFree
    ? 0
    : cycle === "yearly"
      ? (Number(found.yearlyPrice) > 0 ? Number(found.yearlyPrice) : baseMonthly * 10)
      : baseMonthly;

  return {
    planId: String(found.id || found.name).toLowerCase().replace(/\s+/g, "-"),
    planName: found.name || "Pro",
    amount,
    billingCycle: cycle,
    isFree,
    planObj: found,
  };
}

/**
 * Compute business limits based on plan name & configured plan object.
 */
function planLimits(planName: string, planObj?: any) {
  const p = String(planName || "Basic").toLowerCase();
  
  if (planObj) {
    const isEnt = p.includes("enterprise");
    const isPro = p.includes("pro") || p.includes("nexus");
    const isTrial = p.includes("trial") || Number(planObj.price) === 0;
    
    return {
      plan: planObj.name || planName,
      isPremium: !isTrial && (isEnt || isPro || Number(planObj.price) > 0),
      storageLimit: Number(planObj.limitStorageMb) || (isEnt ? 5120 : isPro ? 1024 : 200),
      employeeLimit: Number(planObj.limitEmployees) || (isEnt ? 50 : isPro ? 15 : 5),
      branchLimit: Number(planObj.limitStores) || (isEnt ? 20 : isPro ? 5 : 1),
      userLimit: Number(planObj.limitUsers) || (isEnt ? 999 : isPro ? 25 : 5),
      modules: Array.isArray(planObj.modules) ? planObj.modules : ["pos", "inventory", "reports"],
      features: Array.isArray(planObj.features) ? planObj.features : [],
      accountStatus: "Active",
      subscriptionStatus: isTrial ? "Trial" : "Active",
    };
  }

  if (p.includes("enterprise")) {
    return {
      plan: planName,
      isPremium: true,
      storageLimit: 5120,
      employeeLimit: 50,
      branchLimit: 20,
      userLimit: 999,
      modules: ["pos", "inventory", "reports", "hrm", "accounting", "e-commerce", "api", "crm"],
      accountStatus: "Active",
      subscriptionStatus: "Active",
    };
  }
  if (p.includes("pro") || p.includes("nexus")) {
    return {
      plan: planName,
      isPremium: true,
      storageLimit: 1024,
      employeeLimit: 15,
      branchLimit: 5,
      userLimit: 25,
      modules: ["pos", "inventory", "reports", "hrm", "e-commerce"],
      accountStatus: "Active",
      subscriptionStatus: "Active",
    };
  }
  if (p.includes("trial")) {
    return {
      plan: planName,
      isPremium: false,
      storageLimit: 100,
      employeeLimit: 3,
      branchLimit: 1,
      userLimit: 2,
      modules: ["pos", "inventory", "reports"],
      subscriptionStatus: "Trial",
    };
  }
  return {
    plan: planName || "Basic",
    isPremium: false,
    storageLimit: 200,
    employeeLimit: 5,
    branchLimit: 1,
    userLimit: 5,
    modules: ["pos", "inventory", "reports"],
    accountStatus: "Active",
    subscriptionStatus: "Active",
  };
}

router.use(authenticateToken);

/** Shop: list my requests · SaaS: list all requests with accurate amounts */
router.get("/", async (req, res) => {
  try {
    const u = (req as any).user;
    let snap;
    if (isSaas(u.role)) {
      snap = await col().orderBy("createdAt", "desc").limit(200).get().catch(() => col().get());
    } else {
      snap = await col().where("userId", "==", u.id).limit(50).get().catch(() => col().get());
    }

    const plans = await getSubscriptionPlans();

    const requests = snap.docs.map((d: any) => {
      const data = d.data() || {};
      let amt = data.amount ?? data.price ?? data.details?.amount;
      
      // If amount is not set or 0 on an older record, resolve actual price for audit/display
      if ((amt === undefined || amt === null) && data.plan) {
        const found = plans.find((p: any) =>
          String(p.id || '').toLowerCase() === String(data.planId || data.plan).toLowerCase() ||
          String(p.name || '').toLowerCase() === String(data.plan).toLowerCase()
        );
        if (found) {
          const isYearly = String(data.billingCycle || data.details?.billingCycle || '').toLowerCase() === 'yearly';
          amt = Number(found.price) === 0 ? 0 : isYearly ? (found.yearlyPrice || found.price * 10) : found.price;
        }
      }

      return {
        id: d.id,
        ...data,
        amount: amt,
        price: amt,
        currency: data.currency || data.details?.currency || "BDT",
        billingCycle: data.billingCycle || data.details?.billingCycle || "monthly",
      };
    });

    // Client-side sort if no index for shop query
    requests.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    res.json({ requests });
  } catch (error) {
    console.error("List plan requests error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Shop owner creates upgrade / change request.
 * Server validates the plan and derives the authoritative price.
 */
router.post("/", async (req, res) => {
  try {
    const u = (req as any).user;
    if (isSaas(u.role)) {
      return res.status(400).json({ error: "SaaS staff cannot create shop plan requests" });
    }

    const requestedPlan = req.body?.plan || req.body?.details?.plan || req.body?.requestedPlan || req.body?.planId;
    if (!requestedPlan) {
      return res.status(400).json({ error: "Plan identifier or name is required" });
    }

    const billingCycle = req.body?.billingCycle || req.body?.details?.billingCycle || "monthly";

    // Resolve authoritative plan details & price from database
    const resolved = await resolvePlanPrice(requestedPlan, billingCycle);
    if (!resolved) {
      const available = (await getSubscriptionPlans()).map((p: any) => p.name).join(", ");
      return res.status(400).json({
        error: `Invalid subscription plan "${requestedPlan}". Available plans: ${available}`,
      });
    }

    const biz = await getDb().collection("businesses").doc(u.id).get();
    const bizData = biz.exists ? biz.data() || {} : {};

    // Check if a pending request already exists for this business
    const pendingSnap = await col()
      .where("userId", "==", u.id)
      .where("status", "==", "pending")
      .limit(5)
      .get()
      .catch(() => ({ docs: [], empty: true } as any));

    const currency = req.body?.currency || bizData.currency || "BDT";
    const paymentMethod = req.body?.paymentMethod || req.body?.details?.paymentMethod || "bKash Merchant";
    const paymentReference = req.body?.paymentReference || req.body?.details?.paymentReference || req.body?.trxId || "";
    const note = req.body?.note || req.body?.details?.note || "";

    const payload = stripUndefined({
      type: "subscription",
      status: "pending",
      userId: u.id,
      businessId: u.id,
      userName: bizData.ownerName || bizData.name || u.email || u.id,
      businessName: bizData.businessName || bizData.name || "Business",
      planId: resolved.planId,
      plan: resolved.planName,
      amount: resolved.amount,
      price: resolved.amount,
      currency,
      billingCycle: resolved.billingCycle,
      paymentMethod,
      paymentReference,
      paymentStatus: resolved.isFree ? "Free" : (paymentReference ? "PendingVerification" : "Unpaid"),
      note,
      details: {
        plan: resolved.planName,
        planId: resolved.planId,
        amount: resolved.amount,
        price: resolved.amount,
        currency,
        billingCycle: resolved.billingCycle,
        paymentMethod,
        paymentReference,
        ...(req.body?.details || {}),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let targetDocRef;
    if (!pendingSnap.empty) {
      // Update existing pending request instead of failing with 409
      targetDocRef = pendingSnap.docs[0].ref;
      await targetDocRef.set(payload, { merge: true });
    } else {
      targetDocRef = col().doc();
      await targetDocRef.set(payload);
    }

    const request = { id: targetDocRef.id, ...payload };

    try {
      broadcastSaasStaff({ domain: "plan_requests", reason: "created", payload: request });
      broadcastBusinessSync(u.id, { domain: "subscription", reason: "request_submitted", payload: request });
      await sendNotification({
        targetRole: "SAAS_ADMIN",
        category: "subscription",
        type: "info",
        title: "New Subscription Request",
        message: `${payload.businessName || "A client"} requested upgrade to ${payload.plan} (${payload.currency} ${payload.amount})`,
        target: "/admin?tab=requests",
        metadata: { requestId: request.id, businessId: u.id, plan: payload.plan },
      });
    } catch { /* ignore */ }

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("Create plan request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * SaaS Admin: Approve subscription request.
 * Connects verified payments to recognized revenue and activates subscription.
 * Idempotent: Never creates duplicate revenue payments.
 */
router.post("/:id/approve", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Plan request not found" });

    const data = snap.data() || {};
    if (data.status === "approved" && data.paymentStatus === "Paid") {
      return res.status(400).json({ error: "Request has already been approved and paid" });
    }

    const planName = data.plan || data.details?.plan || "Pro";
    const billingCycle = data.billingCycle || data.details?.billingCycle || "monthly";
    const businessId = data.userId || data.businessId;

    // Resolve plan configuration & authoritative price
    const resolved = await resolvePlanPrice(planName, billingCycle);
    const amount = Number(data.amount ?? data.price ?? resolved?.amount ?? 0);
    const isFree = amount === 0 || resolved?.isFree || planName.toLowerCase().includes("trial");
    const currency = data.currency || data.details?.currency || "BDT";
    const limits = planLimits(planName, resolved?.planObj);

    const markPaid = req.body?.markPaid !== false;
    const paymentMethod = req.body?.paymentMethod || data.paymentMethod || data.details?.paymentMethod || "Bank/Gateway";
    const paymentReference = req.body?.paymentReference || data.paymentReference || data.details?.paymentReference || `TRX-${Date.now().toString().slice(-8)}`;

    let revenuePaymentDocId: string | null = null;

    // Record verified payment in revenuePayments ONLY if paid plan and markPaid
    if (!isFree && markPaid && amount > 0) {
      // Idempotency check: see if a revenue record with this requestId or subscriptionId already exists
      const existingPaySnap = await paymentsCol()
        .where("requestId", "==", id)
        .limit(1)
        .get()
        .catch(() => ({ empty: true, docs: [] } as any));

      if (existingPaySnap.empty) {
        const invNum = `SUB-INV-${Date.now().toString().slice(-8)}`;
        const revPayload = stripUndefined({
          businessId,
          businessName: data.businessName || businessId,
          amount,
          currency,
          plan: planName,
          billingCycle,
          method: paymentMethod,
          paymentMethod,
          paymentReference,
          invoiceNumber: invNum,
          note: req.body?.note || data.note || `Subscription upgrade to ${planName} (${billingCycle})`,
          status: "Paid",
          type: "subscription",
          subscriptionId: id,
          requestId: id,
          recordedBy: (req as any).user.id,
          createdAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });

        const revDoc = await paymentsCol().add(revPayload);
        revenuePaymentDocId = revDoc.id;

        try {
          broadcastSaasStaff({
            domain: "revenue",
            reason: "payment_recorded",
            payload: { paymentId: revDoc.id, businessId, amount, plan: planName },
          });
        } catch { /* ignore */ }
      } else {
        revenuePaymentDocId = existingPaySnap.docs[0].id;
      }
    }

    // Activate the subscription on business document
    const renewalDays = billingCycle === "yearly" ? 365 : 30;
    const renewsAt = new Date(Date.now() + renewalDays * 86400000).toISOString();

    if (businessId) {
      await getDb()
        .collection("businesses")
        .doc(businessId)
        .set(
          stripUndefined({
            ...limits,
            plan: planName,
            isPremium: !isFree,
            accountStatus: "Active",
            subscriptionStatus: isFree ? "Trial" : "Active",
            subscriptionRenewsAt: renewsAt,
            monthlyFee: isFree ? 0 : billingCycle === "yearly" ? Math.round(amount / 12) : amount,
            subscriptionAmount: amount,
            currency,
            planUpdatedAt: new Date().toISOString(),
            planUpdatedBy: (req as any).user.id,
          }),
          { merge: true }
        );

      if (!isFree && markPaid) {
        await stampPaymentSuccess(businessId);
      }
    }

    // Update the plan request document
    const finalPaymentStatus = isFree ? "Free" : markPaid ? "Paid" : "PendingPayment";
    await ref.set(
      {
        status: "approved",
        amount,
        price: amount,
        currency,
        billingCycle,
        paymentStatus: finalPaymentStatus,
        paymentVerifiedAt: (!isFree && markPaid) ? new Date().toISOString() : null,
        paymentVerifiedBy: (!isFree && markPaid) ? (req as any).user.id : null,
        revenuePaymentId: revenuePaymentDocId,
        paymentReference,
        updatedAt: new Date().toISOString(),
        reviewedBy: (req as any).user.id,
        reviewedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: isFree
        ? `Approved free tier request → ${planName}`
        : `Approved & verified payment of ${currency} ${amount} for plan → ${planName}`,
      targetType: "planRequest",
      targetId: id,
      details: businessId,
    });

    const updated = {
      id: ref.id,
      ...data,
      status: "approved",
      paymentStatus: finalPaymentStatus,
      amount,
      price: amount,
      currency,
      billingCycle,
      plan: planName,
      revenuePaymentId: revenuePaymentDocId,
    };

    try {
      broadcastSaasStaff({ domain: "plan_requests", reason: "approved", payload: updated });
      if (businessId) {
        broadcastBusinessSync(businessId, {
          domain: "subscription",
          reason: "plan_approved",
          payload: { plan: planName, renewsAt, amount, isFree },
        });
        await sendNotification({
          businessId,
          userId: businessId,
          category: "subscription",
          type: "success",
          title: "Subscription Approved!",
          message: `Your ${planName} subscription has been approved and activated. Valid until ${new Date(renewsAt).toLocaleDateString()}.`,
          target: "/subscription",
          metadata: { plan: planName, renewsAt, amount },
        });
      }
    } catch { /* ignore */ }

    res.json({ success: true, request: updated, applied: limits });
  } catch (error) {
    console.error("Approve plan request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Dedicated endpoint: Verify payment and activate paid subscription.
 */
router.post("/:id/verify-payment", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Plan request not found" });

    const data = snap.data() || {};
    const planName = data.plan || data.details?.plan || "Pro";
    const billingCycle = data.billingCycle || data.details?.billingCycle || "monthly";
    const businessId = data.userId || data.businessId;

    const resolved = await resolvePlanPrice(planName, billingCycle);
    const amount = Number(data.amount ?? data.price ?? resolved?.amount ?? 0);
    const currency = data.currency || data.details?.currency || "BDT";
    const paymentMethod = req.body?.paymentMethod || data.paymentMethod || "Bank Transfer";
    const paymentReference = req.body?.paymentReference || data.paymentReference || `TXN-VERIFIED-${Date.now()}`;

    // Idempotent revenue payment recording
    const existingPaySnap = await paymentsCol()
      .where("requestId", "==", id)
      .limit(1)
      .get()
      .catch(() => ({ empty: true, docs: [] } as any));

    let revDocId: string;
    if (existingPaySnap.empty) {
      const invNum = `SUB-INV-${Date.now().toString().slice(-8)}`;
      const revPayload = stripUndefined({
        businessId,
        businessName: data.businessName || businessId,
        amount,
        currency,
        plan: planName,
        billingCycle,
        method: paymentMethod,
        paymentMethod,
        paymentReference,
        invoiceNumber: invNum,
        note: req.body?.note || `Verified payment for ${planName} subscription`,
        status: "Paid",
        type: "subscription",
        subscriptionId: id,
        requestId: id,
        recordedBy: (req as any).user.id,
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
      const revDoc = await paymentsCol().add(revPayload);
      revDocId = revDoc.id;
    } else {
      revDocId = existingPaySnap.docs[0].id;
    }

    // Activate subscription
    const limits = planLimits(planName, resolved?.planObj);
    const renewalDays = billingCycle === "yearly" ? 365 : 30;
    const renewsAt = new Date(Date.now() + renewalDays * 86400000).toISOString();

    if (businessId) {
      await getDb()
        .collection("businesses")
        .doc(businessId)
        .set(
          stripUndefined({
            ...limits,
            plan: planName,
            isPremium: true,
            accountStatus: "Active",
            subscriptionStatus: "Active",
            subscriptionRenewsAt: renewsAt,
            monthlyFee: billingCycle === "yearly" ? Math.round(amount / 12) : amount,
            subscriptionAmount: amount,
            currency,
            planUpdatedAt: new Date().toISOString(),
            planUpdatedBy: (req as any).user.id,
          }),
          { merge: true }
        );
      await stampPaymentSuccess(businessId);
    }

    await ref.set(
      {
        status: "approved",
        paymentStatus: "Paid",
        paymentVerifiedAt: new Date().toISOString(),
        paymentVerifiedBy: (req as any).user.id,
        paymentReference,
        revenuePaymentId: revDocId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Verified subscription payment of ${currency} ${amount} for ${data.businessName}`,
      targetType: "planRequest",
      targetId: id,
      details: businessId,
    });

    if (businessId) {
      try {
        await sendNotification({
          businessId,
          userId: businessId,
          category: "subscription",
          type: "success",
          title: "Payment Verified!",
          message: `Payment of ${currency} ${amount} for ${planName} has been verified and your subscription is active.`,
          target: "/subscription",
          metadata: { plan: planName, amount, currency },
        });
      } catch { /* ignore */ }
    }

    res.json({ success: true, paymentStatus: "Paid", revenuePaymentId: revDocId });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * SaaS Admin: Reject subscription request.
 */
router.post("/:id/reject", requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Request not found" });

    const data = snap.data() || {};
    if (data.status === "rejected") {
      return res.status(400).json({ error: "Request is already rejected" });
    }

    await ref.set(
      {
        status: "rejected",
        paymentStatus: "Rejected",
        updatedAt: new Date().toISOString(),
        reviewedBy: (req as any).user.id,
        reviewedAt: new Date().toISOString(),
        rejectReason: req.body?.reason || "",
      },
      { merge: true }
    );

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: "Rejected plan request",
      targetType: "planRequest",
      targetId: id,
      details: req.body?.reason,
    });

    const updated = { id: ref.id, ...data, status: "rejected", paymentStatus: "Rejected" };
    const bizId = data.userId || data.businessId;

    try {
      broadcastSaasStaff({ domain: "plan_requests", reason: "rejected", payload: updated });
      if (bizId) {
        broadcastBusinessSync(bizId, { domain: "subscription", reason: "request_rejected", payload: updated });
        await sendNotification({
          businessId: bizId,
          userId: bizId,
          category: "subscription",
          type: "warning",
          title: "Subscription Request Update",
          message: `Your upgrade request to ${data.plan || "plan"} could not be approved.${req.body?.reason ? ` Reason: ${req.body.reason}` : ""}`,
          target: "/subscription",
          metadata: { plan: data.plan, reason: req.body?.reason },
        });
      }
    } catch { /* ignore */ }

    res.json({ success: true, request: updated });
  } catch (error) {
    console.error("Reject plan request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
