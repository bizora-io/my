import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";
import { stampPaymentFailure, stampPaymentSuccess } from "../lib/billingSignals.js";
import { broadcastSaasStaff, broadcastBusinessSync } from "../lib/chatSocket.js";

const router = express.Router();

function paymentsCollection() {
  return getDb().collection("revenuePayments");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isPaidStatus(status: string | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === "paid" || s === "completed" || s === "success";
}

router.use(authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"));

/**
 * GET /api/admin/revenue/payments
 * Full payment history with multi-field filtering (status, plan, type, date range, search)
 */
router.get("/payments", async (req, res) => {
  try {
    const { status, plan, type, startDate, endDate, search, limit } = req.query;
    const maxLimit = Math.min(500, Math.max(10, parseInt(String(limit || "200"), 10) || 200));

    const snapshot = await paymentsCollection().get();
    let payments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // 1. Filter by Status
    if (status && String(status).toLowerCase() !== "all") {
      const qStatus = String(status).toLowerCase();
      payments = payments.filter((p: any) => {
        const pStatus = String(p.status || "").toLowerCase();
        if (qStatus === "paid") return isPaidStatus(p.status);
        return pStatus === qStatus;
      });
    }

    // 2. Filter by Plan
    if (plan && String(plan).toLowerCase() !== "all") {
      const qPlan = String(plan).toLowerCase();
      payments = payments.filter((p: any) =>
        String(p.plan || "").toLowerCase().includes(qPlan)
      );
    }

    // 3. Filter by Revenue Source / Type
    if (type && String(type).toLowerCase() !== "all") {
      const qType = String(type).toLowerCase();
      payments = payments.filter((p: any) =>
        String(p.type || "subscription").toLowerCase() === qType
      );
    }

    // 4. Filter by Date Range
    if (startDate) {
      const startMs = new Date(String(startDate)).getTime();
      if (!isNaN(startMs)) {
        payments = payments.filter((p: any) => new Date(p.createdAt).getTime() >= startMs);
      }
    }
    if (endDate) {
      const endMs = new Date(String(endDate)).getTime() + 86400000; // include end date day
      if (!isNaN(endMs)) {
        payments = payments.filter((p: any) => new Date(p.createdAt).getTime() <= endMs);
      }
    }

    // 5. Search substring across client name, invoice number, reference, or note
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      payments = payments.filter((p: any) =>
        String(p.businessName || "").toLowerCase().includes(q) ||
        String(p.invoiceNumber || "").toLowerCase().includes(q) ||
        String(p.paymentReference || p.transactionId || "").toLowerCase().includes(q) ||
        String(p.note || "").toLowerCase().includes(q) ||
        String(p.plan || "").toLowerCase().includes(q)
      );
    }

    // Sort newest first and limit
    payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const paginated = payments.slice(0, maxLimit);

    res.json({
      payments: paginated,
      totalCount: payments.length,
      returnedCount: paginated.length,
    });
  } catch (error) {
    console.error("List revenue payments error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/admin/revenue/payments
 * Record a manually collected or offline verified subscription payment.
 * Idempotent with transaction & invoice verification.
 */
router.post("/payments", async (req, res) => {
  try {
    const { businessId, businessName, amount, plan, billingCycle, method, note, invoiceNumber, paymentReference, type } = req.body;
    if (!businessId || amount === undefined || amount === null) {
      return res.status(400).json({ error: "businessId and amount are required" });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: "Valid numeric amount is required" });
    }

    const refCode = paymentReference || `MAN-${Date.now().toString().slice(-8)}`;
    const invNum = invoiceNumber || `INV-${Date.now().toString().slice(-8)}`;

    // Idempotency: verify if duplicate invoice number already exists
    if (invoiceNumber) {
      const existing = await paymentsCollection()
        .where("invoiceNumber", "==", invoiceNumber)
        .limit(1)
        .get()
        .catch(() => ({ empty: true, docs: [] } as any));
      if (!existing.empty) {
        return res.status(409).json({
          error: `Payment with invoice ${invoiceNumber} is already recorded`,
          payment: { id: existing.docs[0].id, ...existing.docs[0].data() },
        });
      }
    }

    const payload = stripUndefined({
      businessId,
      businessName: businessName || businessId,
      amount: amt,
      currency: req.body.currency || "BDT",
      plan: plan || "Custom",
      billingCycle: billingCycle || "monthly",
      type: type || "subscription",
      method: method || "Bank Transfer",
      paymentMethod: method || "Bank Transfer",
      paymentReference: refCode,
      note: note || `Manual payment recorded for ${plan || "Subscription"}`,
      invoiceNumber: invNum,
      status: "Paid",
      recordedBy: (req as any).user.id,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    const docRef = await paymentsCollection().add(payload);
    await stampPaymentSuccess(businessId);

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Recorded revenue payment of ${payload.currency} ${amt} from ${payload.businessName}`,
      targetType: "revenuePayment",
      targetId: docRef.id,
    });

    broadcastSaasStaff({
      domain: "revenue",
      reason: "payment_recorded",
      payload: { paymentId: docRef.id, businessId, amount: amt, plan },
    });

    broadcastBusinessSync(businessId, {
      domain: "subscription",
      reason: "payment_recorded",
      payload: { amount: amt, plan },
    });

    res.status(201).json({ payment: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Record revenue payment error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/admin/revenue/payments/:id/refund
 * Refund a payment and reflect in net revenue.
 */
router.patch("/payments/:id/refund", async (req, res) => {
  try {
    const docRef = paymentsCollection().doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Payment not found" });

    const currentData = doc.data()!;
    if (currentData.status === "Refunded") {
      return res.status(400).json({ error: "Payment is already marked as refunded" });
    }

    const reason = req.body?.reason || "Admin requested refund";
    const refundedAt = new Date().toISOString();

    await docRef.set(
      {
        status: "Refunded",
        refundedAt,
        refundReason: reason,
        refundedBy: (req as any).user.id,
      },
      { merge: true }
    );

    const bizId = currentData.businessId;
    if (bizId) {
      await stampPaymentFailure(bizId, {
        paymentId: req.params.id,
        amount: currentData.amount,
        reason: "refund",
      });
    }

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Refunded payment ${req.params.id} (${currentData.currency || "BDT"} ${currentData.amount}) - Reason: ${reason}`,
      targetType: "revenuePayment",
      targetId: req.params.id,
    });

    broadcastSaasStaff({
      domain: "revenue",
      reason: "payment_refunded",
      payload: { paymentId: req.params.id, amount: currentData.amount },
    });

    res.json({ success: true, paymentId: req.params.id, status: "Refunded", refundedAt });
  } catch (error) {
    console.error("Refund payment error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/admin/revenue/payments/failed
 * Log failed charge (dunning / involuntary churn risk).
 */
router.post("/payments/failed", async (req, res) => {
  try {
    const { businessId, businessName, amount, plan, method, note, reason } = req.body || {};
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    const payload = stripUndefined({
      businessId,
      businessName: businessName || businessId,
      amount: Number(amount) || 0,
      currency: req.body?.currency || "BDT",
      plan: plan || "Subscription",
      method: method || "Gateway",
      note: note || reason || "Payment processing failed",
      status: "Failed",
      recordedBy: (req as any).user.id,
      createdAt: new Date().toISOString(),
    });

    const docRef = await paymentsCollection().add(payload);
    await stampPaymentFailure(businessId, { paymentId: docRef.id, amount: payload.amount, reason: reason || "failed" });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Recorded failed payment attempt for ${payload.businessName}`,
      targetType: "revenuePayment",
      targetId: docRef.id,
    });

    res.status(201).json({ payment: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Failed payment record error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/admin/revenue/summary
 * Precision-safe aggregation of verified revenue, subscriptions vs templates,
 * plan breakdown, monthly & yearly breakdowns.
 */
router.get("/summary", async (_req, res) => {
  try {
    const snapshot = await paymentsCollection().get();
    const payments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYearKey = String(now.getFullYear());
    const todayKey = now.toISOString().slice(0, 10);

    let totalGrossRevenue = 0;
    let totalRefunded = 0;
    let monthRevenue = 0;
    let yearRevenue = 0;
    let todayRevenue = 0;
    let subscriptionRevenue = 0;
    let templateRevenue = 0;
    let otherRevenue = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let refundCount = 0;

    const byPlan: Record<string, { count: number; amount: number }> = {};
    const byMethod: Record<string, number> = {};
    const byStatus: Record<string, number> = { Paid: 0, Pending: 0, Failed: 0, Refunded: 0 };

    // 12-month rolling series
    const monthlyMap: Record<string, { amount: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { amount: 0, count: 0 };
    }

    // Yearly series (current and past 2 years)
    const yearlyMap: Record<string, { amount: number; count: number }> = {};
    for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++) {
      yearlyMap[String(y)] = { amount: 0, count: 0 };
    }

    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      const isPaid = isPaidStatus(p.status);
      const isRef = p.status === "Refunded";
      const isFail = p.status === "Failed";
      const isPend = p.status === "Pending" || p.status === "PendingVerification";

      if (isPaid) {
        paidCount++;
        byStatus.Paid = (byStatus.Paid || 0) + 1;
        totalGrossRevenue += amt;

        const pType = String(p.type || "subscription").toLowerCase();
        if (pType === "subscription") {
          subscriptionRevenue += amt;
          const planName = p.plan || "Other";
          if (!byPlan[planName]) byPlan[planName] = { count: 0, amount: 0 };
          byPlan[planName].count += 1;
          byPlan[planName].amount += amt;
        } else if (pType === "template") {
          templateRevenue += amt;
        } else {
          otherRevenue += amt;
        }

        const method = p.method || p.paymentMethod || "Other";
        byMethod[method] = (byMethod[method] || 0) + amt;

        const createdDate = new Date(p.createdAt);
        if (!isNaN(createdDate.getTime())) {
          const dateStr = p.createdAt.slice(0, 10);
          const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
          const yearKey = String(createdDate.getFullYear());

          if (dateStr === todayKey) todayRevenue += amt;
          if (monthKey === currentMonthKey) monthRevenue += amt;
          if (yearKey === currentYearKey) yearRevenue += amt;

          if (monthlyMap[monthKey]) {
            monthlyMap[monthKey].amount += amt;
            monthlyMap[monthKey].count += 1;
          }

          if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { amount: 0, count: 0 };
          yearlyMap[yearKey].amount += amt;
          yearlyMap[yearKey].count += 1;
        }
      } else if (isRef) {
        refundCount++;
        byStatus.Refunded = (byStatus.Refunded || 0) + 1;
        totalRefunded += amt;
      } else if (isFail) {
        failedCount++;
        byStatus.Failed = (byStatus.Failed || 0) + 1;
      } else if (isPend) {
        pendingCount++;
        byStatus.Pending = (byStatus.Pending || 0) + 1;
      }
    });

    const netRevenue = Math.max(0, totalGrossRevenue - totalRefunded);

    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    }));

    const yearly = Object.entries(yearlyMap).map(([year, data]) => ({
      year,
      amount: data.amount,
      count: data.count,
    }));

    res.json({
      totalRevenue: totalGrossRevenue,
      totalGrossRevenue,
      totalRefunded,
      netRevenue,
      monthRevenue,
      yearRevenue,
      todayRevenue,
      subscriptionRevenue,
      templateRevenue,
      otherRevenue,
      paymentCount: paidCount,
      pendingCount,
      failedCount,
      refundCount,
      byPlan,
      byMethod,
      byStatus,
      monthly,
      yearly,
      currency: "BDT",
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Revenue summary error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
