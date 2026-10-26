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

function loansCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("loans");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// GET /api/loans
router.get("/", requirePermission("finance.ledgers", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { type } = req.query;

    let query: FirebaseFirestore.Query = loansCol(businessId);
    if (type && typeof type === "string") query = query.where("type", "==", type);

    const snap = await query.get();
    const loans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    loans.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(loans);
  } catch (error) {
    console.error("List loans error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/loans/:id
router.get("/:id", requirePermission("finance.ledgers", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const doc = await loansCol(businessId).doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: "Loan not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Get loan error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/loans
router.post("/", requirePermission("finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const {
      partyName,
      partyId,
      type = "PAYABLE",
      principal,
      interestRate = 0,
      tenureMonths = 12,
      startDate,
      currency = "BDT",
      notes,
    } = req.body || {};

    const numPrincipal = Number(principal);
    if (!partyName || !(numPrincipal > 0)) {
      return res.status(400).json({ error: "partyName and positive principal are required" });
    }

    const rate = Number(interestRate) || 0;
    const months = Math.max(1, Math.floor(Number(tenureMonths) || 12));
    const start = startDate ? new Date(startDate) : new Date();

    const monthlyPrincipal = Math.round((numPrincipal / months) * 100) / 100;
    const monthlyInterest = Math.round(((numPrincipal * rate) / 100 / 12) * 100) / 100;
    const totalDuePerMonth = Math.round((monthlyPrincipal + monthlyInterest) * 100) / 100;

    const schedule = [];
    for (let i = 1; i <= months; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      schedule.push({
        installmentNo: i,
        dueDate: due.toISOString().slice(0, 10),
        principal: i === months ? Math.round((numPrincipal - monthlyPrincipal * (months - 1)) * 100) / 100 : monthlyPrincipal,
        interest: monthlyInterest,
        totalDue: totalDuePerMonth,
        status: "PENDING",
      });
    }

    const docRef = loansCol(businessId).doc();
    const payload = stripUndefined({
      partyName: String(partyName).trim(),
      partyId: partyId || null,
      type: type.toUpperCase() === "RECEIVABLE" ? "RECEIVABLE" : "PAYABLE",
      principal: numPrincipal,
      interestRate: rate,
      tenureMonths: months,
      startDate: start.toISOString(),
      endDate: schedule[schedule.length - 1].dueDate,
      outstanding: numPrincipal,
      currency: currency.toUpperCase(),
      notes: notes || "",
      schedule,
      payments: [],
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);

    // Record initial ledger transaction
    try {
      const isReceivable = payload.type === "RECEIVABLE";
      await transactionsCol(businessId).add({
        business_id: businessId,
        type: isReceivable ? "Expense" : "Income",
        subType: "Loan Disbursement",
        category: isReceivable ? "Loans Receivable" : "Loans Payable",
        total: numPrincipal,
        paid: numPrincipal,
        reference: `LOAN-${docRef.id}`,
        notes: `Loan ${payload.type}: ${payload.partyName} (Principal: ${numPrincipal} ${payload.currency})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Loan initial transaction logging notice:", e);
    }

    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create loan error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/loans/:id/payments
router.post("/:id/payments", requirePermission("finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = loansCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Loan not found" });

    const loan = doc.data()!;
    const { amount, principalPaid, interestPaid, paymentMethod = "Cash", reference, notes } = req.body || {};

    const totalPaid = Number(amount) || ((Number(principalPaid) || 0) + (Number(interestPaid) || 0));
    if (!(totalPaid > 0)) {
      return res.status(400).json({ error: "Positive payment amount required" });
    }

    const pPaid = principalPaid != null ? Number(principalPaid) : Math.min(totalPaid, loan.outstanding);
    const iPaid = interestPaid != null ? Number(interestPaid) : Math.max(0, totalPaid - pPaid);

    const nextOutstanding = Math.max(0, Math.round(((Number(loan.outstanding) || 0) - pPaid) * 100) / 100);
    const isFullyPaid = nextOutstanding <= 0;

    const paymentRecord = {
      id: `pmt-${Date.now()}`,
      paidAt: new Date().toISOString(),
      amount: totalPaid,
      principalPaid: pPaid,
      interestPaid: iPaid,
      paymentMethod,
      reference: reference || "",
      notes: notes || "",
    };

    // Update schedule items status
    let remainingPrincipalToApply = pPaid;
    const updatedSchedule = (loan.schedule || []).map((item: any) => {
      if (item.status === "PENDING" && remainingPrincipalToApply >= item.principal) {
        remainingPrincipalToApply -= item.principal;
        return { ...item, status: "PAID", paidAt: new Date().toISOString() };
      }
      return item;
    });

    const update = {
      outstanding: nextOutstanding,
      status: isFullyPaid ? "CLOSED" : loan.status,
      payments: [...(loan.payments || []), paymentRecord],
      schedule: updatedSchedule,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(stripUndefined(update), { merge: true });

    // Record repayment transaction
    try {
      const isReceivable = loan.type === "RECEIVABLE";
      await transactionsCol(businessId).add({
        business_id: businessId,
        type: isReceivable ? "Income" : "Expense",
        subType: "Loan Repayment",
        category: isReceivable ? "Loan Recovery" : "Loan Repayment",
        total: totalPaid,
        paid: totalPaid,
        reference: `LOAN-PMT-${doc.id}`,
        notes: `Loan payment for ${loan.partyName}: Principal ${pPaid}, Interest ${iPaid}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Loan payment transaction logging notice:", e);
    }

    res.json({ id: doc.id, ...loan, ...update });
  } catch (error) {
    console.error("Record loan payment error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
