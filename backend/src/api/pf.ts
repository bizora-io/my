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

function pfCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("providentFund");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// GET /api/pf
router.get("/", requirePermission("hr.manage", "hr.payroll"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await pfCol(businessId).get();
    const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    accounts.sort((a: any, b: any) => String(a.employeeName || "").localeCompare(String(b.employeeName || "")));
    res.json(accounts);
  } catch (error) {
    console.error("List PF accounts error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/pf - Enroll employee
router.post("/", requirePermission("hr.manage"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const {
      employeeId,
      employeeName,
      designation,
      department,
      basicSalary = 0,
      employeeContributionRate = 10,
      employerContributionRate = 10,
      notes,
    } = req.body || {};

    if (!employeeId || !employeeName) {
      return res.status(400).json({ error: "employeeId and employeeName are required" });
    }

    // Check if account already exists
    const existing = await pfCol(businessId).where("employeeId", "==", employeeId).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: "Provident fund account already exists for this employee" });
    }

    const docRef = pfCol(businessId).doc();
    const payload = stripUndefined({
      employeeId,
      employeeName: String(employeeName).trim(),
      designation: designation || "",
      department: department || "",
      basicSalary: Number(basicSalary) || 0,
      employeeContributionRate: Number(employeeContributionRate) || 10,
      employerContributionRate: Number(employerContributionRate) || 10,
      totalEmployeeContributed: 0,
      totalEmployerContributed: 0,
      totalInterestAccrued: 0,
      totalBalance: 0,
      status: "ACTIVE",
      contributions: [],
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Enroll PF error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/pf/:id/contribute
router.post("/:id/contribute", requirePermission("hr.manage", "hr.payroll"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = pfCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "PF account not found" });

    const account = doc.data()!;
    if (account.status !== "ACTIVE") {
      return res.status(400).json({ error: "Cannot contribute to an inactive or settled PF account" });
    }

    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      basicSalary = account.basicSalary,
      employeeAmount,
      employerAmount,
    } = req.body || {};

    const base = Number(basicSalary) || Number(account.basicSalary) || 0;
    const empRate = Number(account.employeeContributionRate) || 10;
    const compRate = Number(account.employerContributionRate) || 10;

    const empContrib = employeeAmount != null ? Number(employeeAmount) : Math.round((base * empRate) / 100);
    const compContrib = employerAmount != null ? Number(employerAmount) : Math.round((base * compRate) / 100);
    const totalMonth = empContrib + compContrib;

    const contributionRecord = {
      id: `pfc-${Date.now()}`,
      month: Number(month),
      year: Number(year),
      basicSalary: base,
      employeeAmount: empContrib,
      employerAmount: compContrib,
      totalAmount: totalMonth,
      date: new Date().toISOString(),
    };

    const nextEmpTotal = (Number(account.totalEmployeeContributed) || 0) + empContrib;
    const nextCompTotal = (Number(account.totalEmployerContributed) || 0) + compContrib;
    const nextTotalBalance = nextEmpTotal + nextCompTotal + (Number(account.totalInterestAccrued) || 0);

    const update = {
      totalEmployeeContributed: nextEmpTotal,
      totalEmployerContributed: nextCompTotal,
      totalBalance: nextTotalBalance,
      contributions: [...(account.contributions || []), contributionRecord],
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(stripUndefined(update), { merge: true });

    // Record employer expense in transactions
    try {
      if (compContrib > 0) {
        await transactionsCol(businessId).add({
          business_id: businessId,
          type: "Expense",
          subType: "HR / Payroll",
          category: "Provident Fund Employer Contribution",
          total: compContrib,
          paid: compContrib,
          reference: `PF-${doc.id}-${month}-${year}`,
          notes: `Employer PF contribution for ${account.employeeName} (${month}/${year})`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("PF transaction logging notice:", e);
    }

    res.status(201).json({ id: doc.id, ...account, ...update });
  } catch (error) {
    console.error("PF contribute error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/pf/:id/remit
router.post("/:id/remit", requirePermission("hr.manage", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = pfCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "PF account not found" });

    const account = doc.data()!;
    const { amount, bankName, reference, notes } = req.body || {};
    const remitAmount = Number(amount) || 0;

    const remittance = {
      id: `remit-${Date.now()}`,
      date: new Date().toISOString(),
      amount: remitAmount,
      bankName: bankName || "",
      reference: reference || "",
      notes: notes || "",
    };

    const update = {
      remittances: [...(account.remittances || []), remittance],
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...account, ...update });
  } catch (error) {
    console.error("PF remit error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/pf/:id/close - Settlement
router.post("/:id/close", requirePermission("hr.manage", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = pfCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "PF account not found" });

    const account = doc.data()!;
    const { interestAmount = 0, payoutAmount, remarks } = req.body || {};

    const accruedInterest = Number(interestAmount) || 0;
    const finalPayout = payoutAmount != null ? Number(payoutAmount) : (Number(account.totalBalance) || 0) + accruedInterest;

    const settlement = {
      settledAt: new Date().toISOString(),
      employeeContributed: account.totalEmployeeContributed || 0,
      employerContributed: account.totalEmployerContributed || 0,
      interestAmount: accruedInterest,
      finalPayout,
      remarks: remarks || "Resignation/Retirement Settlement",
    };

    const update = {
      status: "SETTLED",
      totalInterestAccrued: accruedInterest,
      totalBalance: 0,
      settlement,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });

    // Record payout transaction
    try {
      await transactionsCol(businessId).add({
        business_id: businessId,
        type: "Expense",
        subType: "HR Settlement",
        category: "Provident Fund Settlement Payout",
        total: finalPayout,
        paid: finalPayout,
        reference: `PF-SETTLE-${doc.id}`,
        notes: `Provident Fund final settlement for ${account.employeeName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("PF settlement transaction logging notice:", e);
    }

    res.json({ id: doc.id, ...account, ...update });
  } catch (error) {
    console.error("PF settlement error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
