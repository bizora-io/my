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

function targetsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("dealerTargets");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// Helper to compute achievement
async function computeDealerAchievement(businessId: string, dealerName: string, dealerId: string | null, year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

  const snap = await transactionsCol(businessId)
    .where("type", "in", ["Sale", "Sell"])
    .get();

  let totalSales = 0;
  snap.docs.forEach((d) => {
    const tx = d.data();
    const created = tx.createdAt || tx.date;
    if (created && created >= start && created < end) {
      const matchId = dealerId && (tx.customerId === dealerId || tx.customer_id === dealerId);
      const matchName = dealerName && tx.customerName && tx.customerName.toLowerCase().trim() === dealerName.toLowerCase().trim();
      if (matchId || matchName) {
        totalSales += Number(tx.total) || 0;
      }
    }
  });

  return Math.round(totalSales * 100) / 100;
}

// GET /api/dealers/targets
router.get("/targets", requirePermission("reports.view", "pos.view_sales"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || undefined;

    let query: FirebaseFirestore.Query = targetsCol(businessId).where("year", "==", year);
    if (month) query = query.where("month", "==", month);

    const snap = await query.get();
    const targets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    targets.sort((a: any, b: any) => (b.achievedAmount || 0) - (a.achievedAmount || 0));

    res.json(targets);
  } catch (error) {
    console.error("List dealer targets error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/dealers/targets - Upsert target
router.post("/targets", requirePermission("admin.settings", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { dealerId, dealerName, year, month, targetAmount, commissionRate = 2 } = req.body || {};

    if (!dealerName || !targetAmount) {
      return res.status(400).json({ error: "dealerName and targetAmount are required" });
    }

    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || new Date().getMonth() + 1;
    const target = Number(targetAmount) || 0;
    const commRate = Number(commissionRate) || 0;

    // Calculate current achieved amount
    const achieved = await computeDealerAchievement(businessId, dealerName, dealerId || null, y, m);
    const percent = target > 0 ? Math.round((achieved / target) * 100) : 0;
    const earnedCommission = Math.round(((achieved * commRate) / 100) * 100) / 100;

    const docId = `${dealerId || dealerName.toLowerCase().replace(/\W+/g, "_")}-${y}-${m}`;
    const docRef = targetsCol(businessId).doc(docId);

    const payload = stripUndefined({
      dealerId: dealerId || null,
      dealerName: String(dealerName).trim(),
      year: y,
      month: m,
      targetAmount: target,
      commissionRate: commRate,
      achievedAmount: achieved,
      achievementPercent: percent,
      earnedCommission,
      status: percent >= 100 ? (percent > 100 ? "EXCEEDED" : "MET") : "IN_PROGRESS",
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload, { merge: true });
    res.json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Upsert dealer target error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/dealers/targets/refresh
router.post("/targets/refresh", requirePermission("admin.settings", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { dealerId, dealerName, year, month } = req.body || {};

    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || new Date().getMonth() + 1;

    const docId = `${dealerId || (dealerName || "").toLowerCase().replace(/\W+/g, "_")}-${y}-${m}`;
    const docRef = targetsCol(businessId).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Target record not found for this dealer/month" });

    const current = doc.data()!;
    const achieved = await computeDealerAchievement(businessId, current.dealerName, current.dealerId, y, m);
    const percent = current.targetAmount > 0 ? Math.round((achieved / current.targetAmount) * 100) : 0;
    const earnedCommission = Math.round(((achieved * (current.commissionRate || 0)) / 100) * 100) / 100;

    const update = {
      achievedAmount: achieved,
      achievementPercent: percent,
      earnedCommission,
      status: percent >= 100 ? (percent > 100 ? "EXCEEDED" : "MET") : "IN_PROGRESS",
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...current, ...update });
  } catch (error) {
    console.error("Refresh dealer target error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/dealers/leaderboard
router.get("/leaderboard", requirePermission("reports.view", "pos.view_sales"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const y = Number(req.query.year) || new Date().getFullYear();
    const m = Number(req.query.month) || new Date().getMonth() + 1;

    const snap = await targetsCol(businessId).where("year", "==", y).where("month", "==", m).get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    list.sort((a, b) => (b.achievedAmount || 0) - (a.achievedAmount || 0));

    res.json({
      year: y,
      month: m,
      dealers: list,
    });
  } catch (error) {
    console.error("Dealer leaderboard error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

