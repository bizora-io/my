import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";
import { createSimpleCrudRouter } from "../lib/simpleCrudRouter.js";

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const journalRouter = express.Router();
journalRouter.use(authenticateToken, requireBusinessContext);

function journalCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("journalEntries");
}

// 1. GET / — List journal entries with read permission
journalRouter.get("/", requirePermission("finance.ledgers", "finance.accounts", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snapshot = await journalCol(businessId).orderBy("date", "desc").get().catch(() => journalCol(businessId).get());
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ journalEntries: items });
  } catch (error) {
    console.error("List journalEntries error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. POST / — Create journal entry (enforcing debit-credit balance and financial validity)
journalRouter.post("/", requirePermission("finance.ledgers", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { id, ...data } = req.body || {};
    const lines: any[] = Array.isArray(data.lines) ? data.lines : [];

    if (lines.length < 2) {
      return res.status(400).json({ error: "A journal entry must contain at least two lines." });
    }

    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.009) {
      return res.status(400).json({
        error: `Journal entry must be balanced. Total Debits (${totalDebit}) != Total Credits (${totalCredit}).`,
        code: "unbalanced_journal",
      });
    }

    if (totalDebit <= 0) {
      return res.status(400).json({ error: "Journal entry amount must be greater than zero." });
    }

    const payload = stripUndefined({
      ...data,
      lines,
      totalDebit,
      totalCredit,
      business_id: businessId,
      isPosted: true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const docRef = id ? journalCol(businessId).doc(id) : journalCol(businessId).doc();
    await docRef.set(payload);

    res.status(201).json({ journalEntry: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Create journalEntry error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. PATCH /:id — Prevent mutating posted lines or amounts (Financial Immutability)
// Only allows non-financial metadata updates: memo, isVoid, reversedBy, reversalOf
journalRouter.patch("/:id", requirePermission("finance.ledgers", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = journalCol(businessId).doc(String(req.params.id));
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Journal entry not found" });

    const body = req.body || {};

    // Block any tampering with financial figures or line items on posted journals
    if (body.lines !== undefined || body.totalDebit !== undefined || body.totalCredit !== undefined || body.amount !== undefined) {
      return res.status(400).json({
        error: "Posted journal entry lines and financial amounts are immutable. Post a reversing journal entry to make adjustments.",
        code: "journal_immutable",
      });
    }

    const allowedUpdates: Record<string, any> = {};
    if (body.memo !== undefined) allowedUpdates.memo = String(body.memo);
    if (body.isVoid !== undefined) allowedUpdates.isVoid = Boolean(body.isVoid);
    if (body.reversedBy !== undefined) allowedUpdates.reversedBy = String(body.reversedBy);
    if (body.reversalOf !== undefined) allowedUpdates.reversalOf = String(body.reversalOf);
    allowedUpdates.updatedAt = new Date().toISOString();

    await docRef.set(allowedUpdates, { merge: true });
    const updated = await docRef.get();
    res.json({ journalEntry: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update journalEntry error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4. DELETE /:id — Strictly forbidden (Financial Immutability)
journalRouter.delete("/:id", requirePermission("finance.ledgers", "finance.accounts"), async (_req, res) => {
  return res.status(405).json({
    error: "Posted journal entries are financially immutable and cannot be deleted. Create a reversing journal entry to void or correct the transaction.",
    code: "journal_immutable",
  });
});

// 5. POST /:id/reverse — Authorized atomic reversal creation
journalRouter.post("/:id/reverse", requirePermission("finance.ledgers", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();
    const docRef = journalCol(businessId).doc(String(req.params.id));

    let reversalEntry: any;

    await db.runTransaction(async (t) => {
      const snap = await t.get(docRef);
      if (!snap.exists) {
        const err = new Error("Journal entry not found");
        (err as any).status = 404;
        throw err;
      }

      const original = snap.data() || {};
      if (original.isVoid || original.reversedBy) {
        const err = new Error("This journal entry has already been reversed.");
        (err as any).status = 409;
        (err as any).code = "already_reversed";
        throw err;
      }

      const revLines = (original.lines || []).map((l: any) => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.credit) || 0,
        credit: Number(l.debit) || 0,
      }));

      const revId = `je-rev-${req.params.id}-${Date.now()}`;
      const revDocRef = journalCol(businessId).doc(revId);

      reversalEntry = {
        id: revId,
        date: new Date().toISOString().slice(0, 10),
        memo: `[REVERSAL] Reversal of ${original.memo || original.id}`,
        reference: `REV-${original.reference || original.id}`,
        lines: revLines,
        business_id: businessId,
        isPosted: true,
        isReversal: true,
        reversalOf: original.id || req.params.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      t.set(revDocRef, reversalEntry);
      t.update(docRef, {
        isVoid: true,
        reversedBy: revId,
        updatedAt: new Date().toISOString(),
      });
    });

    res.status(201).json({ reversal: reversalEntry });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error("Reverse journalEntry error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export const journalEntriesRouter = journalRouter;
export const leaveRequestsRouter = createSimpleCrudRouter("leaveRequests", "leaveRequest", "leaveRequests", {
  writePermissions: ["hr.manage"],
  readPermissions: ["hr.manage", "hr.payroll"],
});
