import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";

const router = express.Router();

function groupsCol() {
  return getDb().collection("consolidationGroups");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

type Member = { businessId: string; businessName?: string; ownershipPct?: number };

async function assertCanManageGroup(req: any, group: any) {
  const role = req.user.role;
  if (role === "SAAS_OWNER" || role === "SAAS_ADMIN") return true;
  const actorId = (req as any).businessId || getActingBusinessId(req);
  if (!actorId) throw new Error("missing_business_context");
  if (group.ownerBusinessId === actorId) return true;
  if (Array.isArray(group.members) && group.members.some((m: Member) => m.businessId === actorId)) {
    // members can read only — manage only owner
    return false;
  }
  return false;
}

async function assertCanReadGroup(req: any, group: any) {
  const role = req.user.role;
  if (role === "SAAS_OWNER" || role === "SAAS_ADMIN") return true;
  const actorId = (req as any).businessId || getActingBusinessId(req);
  if (!actorId) throw new Error("missing_business_context");
  if (group.ownerBusinessId === actorId) return true;
  if (Array.isArray(group.members) && group.members.some((m: Member) => m.businessId === actorId)) return true;
  return false;
}

/** Classify transaction amounts for consolidation P&amp;L style totals */
function classifyTx(tx: any): { sales: number; purchases: number; expenses: number; other: number } {
  const amount = Math.abs(Number(tx.total ?? tx.amount ?? 0)) || 0;
  const type = String(tx.type || tx.txnType || "").toLowerCase();
  const out = { sales: 0, purchases: 0, expenses: 0, other: 0 };
  if (["sale", "sales", "invoice", "pos", "income", "receipt"].some((k) => type.includes(k))) {
    out.sales = amount;
  } else if (["purchase", "buy", "bill", "po"].some((k) => type.includes(k))) {
    out.purchases = amount;
  } else if (["expense", "payroll", "salary", "payment"].some((k) => type.includes(k))) {
    out.expenses = amount;
  } else {
    out.other = amount;
  }
  return out;
}

router.use(authenticateToken, requireBusinessContext);

// GET /api/consolidation/groups
router.get("/groups", requirePermission("reports.view", "finance.ledgers", "admin.settings"), async (req, res) => {
  try {
    const role = (req as any).user.role;
    const actorId = (req as any).businessId || getActingBusinessId(req as any);
    if (!actorId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await groupsCol().get();
    let groups = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    if (role !== "SAAS_OWNER" && role !== "SAAS_ADMIN") {
      groups = groups.filter(
        (g) =>
          g.ownerBusinessId === actorId ||
          (Array.isArray(g.members) && g.members.some((m: Member) => m.businessId === actorId))
      );
    }
    res.json({ groups });
  } catch (error) {
    console.error("List consolidation groups error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/consolidation/groups
router.post("/groups", requirePermission("admin.settings", "reports.view"), async (req, res) => {
  try {
    const role = (req as any).user.role;
    const actorId = (req as any).businessId || getActingBusinessId(req as any);
    if (!actorId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { name, members, ownerBusinessId } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name is required" });

    const owner =
      role === "SAAS_OWNER" || role === "SAAS_ADMIN"
        ? ownerBusinessId || actorId
        : actorId;

    const memberList: Member[] = Array.isArray(members) ? members : [];
    // Owner always included
    if (!memberList.some((m) => m.businessId === owner)) {
      memberList.unshift({ businessId: owner, businessName: "Owner", ownershipPct: 100 });
    }

    // Non-SaaS: can only add own business id (link request for others is future work)
    if (role !== "SAAS_OWNER" && role !== "SAAS_ADMIN") {
      for (const m of memberList) {
        if (m.businessId !== owner) {
          // Allow if business doc has parentBusinessId === owner
          const b = await getDb().collection("businesses").doc(m.businessId).get();
          if (!b.exists || (b.data() || {}).parentBusinessId !== owner) {
            return res.status(403).json({
              error: `Cannot add business ${m.businessId}. Set parentBusinessId to your business id first (or ask SaaS admin).`,
            });
          }
        }
      }
    }

    const payload = stripUndefined({
      name: String(name).trim(),
      ownerBusinessId: owner,
      members: memberList,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (req as any).user.id,
    });
    const ref = await groupsCol().add(payload);
    await logAudit({
      actorId: (req as any).user.id,
      actorRole: role,
      action: `Created consolidation group ${payload.name}`,
      targetType: "consolidationGroup",
      targetId: ref.id,
    });
    res.status(201).json({ group: { id: ref.id, ...payload } });
  } catch (error) {
    console.error("Create consolidation group error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/consolidation/groups/:id
router.patch("/groups/:id", requirePermission("admin.settings", "reports.view"), async (req, res) => {
  try {
    const ref = groupsCol().doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Group not found" });
    const group = doc.data()!;
    if (!(await assertCanManageGroup(req, group))) {
      return res.status(403).json({ error: "Only group owner or SaaS admin can update this group" });
    }
    const update: any = { updatedAt: new Date().toISOString() };
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (Array.isArray(req.body.members)) update.members = req.body.members;
    await ref.set(stripUndefined(update), { merge: true });
    const updated = await ref.get();
    res.json({ group: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update consolidation group error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/consolidation/groups/:id
router.delete("/groups/:id", requirePermission("admin.settings"), async (req, res) => {
  try {
    const ref = groupsCol().doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Group not found" });
    if (!(await assertCanManageGroup(req, doc.data()))) {
      return res.status(403).json({ error: "Only group owner or SaaS admin can delete" });
    }
    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete consolidation group error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

function isIntercompanyTx(tx: any, memberIds: Set<string>): boolean {
  if (tx.intercompany === true || tx.isIntercompany === true) return true;
  const counterparty =
    tx.counterpartyBusinessId ||
    tx.relatedBusinessId ||
    tx.intercompanyBusinessId ||
    tx.toBusinessId ||
    tx.fromBusinessId ||
    null;
  if (counterparty && memberIds.has(String(counterparty))) return true;
  const note = String(tx.notes || tx.note || tx.description || "").toLowerCase();
  if (note.includes("intercompany") || note.includes("inter-company") || note.includes("ic sale") || note.includes("ic purchase")) {
    return true;
  }
  // Entity linked to another member business id
  if (tx.entityBusinessId && memberIds.has(String(tx.entityBusinessId))) return true;
  return false;
}

/**
 * GET /api/consolidation/groups/:id/report
 * Query: from, to, eliminate=1 (default), weight=1 (ownership-weighted)
 */
router.get("/groups/:id/report", requirePermission("reports.view", "finance.ledgers"), async (req, res) => {
  try {
    const ref = groupsCol().doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Group not found" });
    const group = doc.data()!;
    if (!(await assertCanReadGroup(req, group))) {
      return res.status(403).json({ error: "Not a member of this consolidation group" });
    }

    const from = req.query.from ? Date.parse(String(req.query.from)) : NaN;
    const to = req.query.to ? Date.parse(String(req.query.to)) : NaN;
    const eliminate = req.query.eliminate !== "0" && req.query.eliminate !== "false";
    const weight = req.query.weight !== "0" && req.query.weight !== "false";
    const members: Member[] = Array.isArray(group.members) ? group.members : [];
    const memberIds = new Set(members.map((m) => m.businessId));

    const byCompany: any[] = [];
    let gross = { sales: 0, purchases: 0, expenses: 0, other: 0, net: 0, txnCount: 0 };
    let eliminated = { sales: 0, purchases: 0, expenses: 0, other: 0, txnCount: 0 };
    const eliminations: any[] = [];

    for (const m of members) {
      const pct = m.ownershipPct != null && Number.isFinite(Number(m.ownershipPct)) ? Number(m.ownershipPct) / 100 : 1;
      const company = {
        businessId: m.businessId,
        businessName: m.businessName || m.businessId,
        ownershipPct: m.ownershipPct ?? 100,
        sales: 0,
        purchases: 0,
        expenses: 0,
        other: 0,
        net: 0,
        txnCount: 0,
        intercompanySales: 0,
        intercompanyPurchases: 0,
        weightedSales: 0,
        weightedPurchases: 0,
        weightedExpenses: 0,
        weightedNet: 0,
      };
      try {
        const snap = await getDb()
          .collection("businesses")
          .doc(m.businessId)
          .collection("transactions")
          .get();
        snap.docs.forEach((d) => {
          const tx = { id: d.id, ...d.data() } as any;
          const dt = Date.parse(String(tx.date || tx.createdAt || ""));
          if (!Number.isNaN(from) && !Number.isNaN(dt) && dt < from) return;
          if (!Number.isNaN(to) && !Number.isNaN(dt) && dt > to) return;
          const c = classifyTx(tx);
          const ic = isIntercompanyTx(tx, memberIds);
          if (ic && eliminate) {
            eliminated.sales += c.sales;
            eliminated.purchases += c.purchases;
            eliminated.expenses += c.expenses;
            eliminated.other += c.other;
            eliminated.txnCount += 1;
            if (c.sales) company.intercompanySales += c.sales;
            if (c.purchases) company.intercompanyPurchases += c.purchases;
            if (eliminations.length < 50) {
              eliminations.push({
                businessId: m.businessId,
                txnId: d.id,
                type: tx.type,
                amount: c.sales || c.purchases || c.expenses || c.other,
                reason: "intercompany",
              });
            }
            return; // exclude from company operating totals when eliminating
          }
          company.sales += c.sales;
          company.purchases += c.purchases;
          company.expenses += c.expenses;
          company.other += c.other;
          company.txnCount += 1;
        });
      } catch (e) {
        console.warn("Consolidation member read failed", m.businessId, e);
      }
      company.net = company.sales - company.purchases - company.expenses;
      const w = weight ? pct : 1;
      company.weightedSales = Math.round(company.sales * w * 100) / 100;
      company.weightedPurchases = Math.round(company.purchases * w * 100) / 100;
      company.weightedExpenses = Math.round(company.expenses * w * 100) / 100;
      company.weightedNet = Math.round(company.net * w * 100) / 100;

      gross.sales += company.sales;
      gross.purchases += company.purchases;
      gross.expenses += company.expenses;
      gross.other += company.other;
      gross.txnCount += company.txnCount;
      byCompany.push(company);
    }
    gross.net = gross.sales - gross.purchases - gross.expenses;

    const consolidated = {
      sales: gross.sales,
      purchases: gross.purchases,
      expenses: gross.expenses,
      other: gross.other,
      net: gross.net,
      txnCount: gross.txnCount,
      eliminatedSales: eliminated.sales,
      eliminatedPurchases: eliminated.purchases,
      eliminatedExpenses: eliminated.expenses,
      eliminatedTxnCount: eliminated.txnCount,
    };

    const weighted = {
      sales: Math.round(byCompany.reduce((s, c) => s + c.weightedSales, 0) * 100) / 100,
      purchases: Math.round(byCompany.reduce((s, c) => s + c.weightedPurchases, 0) * 100) / 100,
      expenses: Math.round(byCompany.reduce((s, c) => s + c.weightedExpenses, 0) * 100) / 100,
      net: Math.round(byCompany.reduce((s, c) => s + c.weightedNet, 0) * 100) / 100,
    };

    res.json({
      group: { id: doc.id, name: group.name, ownerBusinessId: group.ownerBusinessId },
      period: { from: req.query.from || null, to: req.query.to || null },
      options: { eliminate, weight },
      byCompany,
      consolidated,
      weighted,
      eliminations,
      generatedAt: new Date().toISOString(),
      notes: [
        "Operating totals exclude intercompany txs when eliminate=1.",
        "IC detection: intercompany flag, counterpartyBusinessId in group, or notes containing intercompany.",
        "weighted.* applies ownershipPct (default 100%) per member.",
        "Full matching of IC sale↔purchase pairs is best-effort; unmatched IC still eliminated per flag.",
      ],
    });
  } catch (error) {
    console.error("Consolidation report error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/consolidation/groups/:id/export.csv
router.get("/groups/:id/export.csv", requirePermission("reports.view", "finance.ledgers", "reports.export"), async (req, res) => {
  try {
    // Reuse report by internal call pattern — fetch same data
    const ref = groupsCol().doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Group not found" });
    const group = doc.data()!;
    if (!(await assertCanReadGroup(req, group))) {
      return res.status(403).json({ error: "Not a member of this consolidation group" });
    }

    // Build query string passthrough
    const q = new URLSearchParams();
    if (req.query.from) q.set("from", String(req.query.from));
    if (req.query.to) q.set("to", String(req.query.to));
    if (req.query.eliminate != null) q.set("eliminate", String(req.query.eliminate));
    if (req.query.weight != null) q.set("weight", String(req.query.weight));

    // Inline minimal: redirect logic by calling handlers is awkward; duplicate light export from report fields via fetch self
    // Instead run simplified: call the report route logic by requesting JSON from same process is hard —
    // Use a shared helper by re-invoking classify through a second internal request is overkill.
    // Simplest: set Accept and return CSV built from a sub-request simulation —
    // We'll attach export after computing via duplicated thin wrapper:
    (req as any).url = `/groups/${req.params.id}/report?${q}`;
    // Fall through: implement export by requiring client to use report — build CSV here with same loop

    const from = req.query.from ? Date.parse(String(req.query.from)) : NaN;
    const to = req.query.to ? Date.parse(String(req.query.to)) : NaN;
    const eliminate = req.query.eliminate !== "0" && req.query.eliminate !== "false";
    const members: Member[] = Array.isArray(group.members) ? group.members : [];
    const memberIds = new Set(members.map((m) => m.businessId));
    const lines = ["section,businessId,businessName,ownershipPct,sales,purchases,expenses,net,txnCount,intercompanySales,intercompanyPurchases"];

    let ts = 0, tp = 0, te = 0, tn = 0;
    for (const m of members) {
      let sales = 0, purchases = 0, expenses = 0, other = 0, txnCount = 0, ics = 0, icp = 0;
      try {
        const snap = await getDb().collection("businesses").doc(m.businessId).collection("transactions").get();
        snap.docs.forEach((d) => {
          const tx = d.data() || {};
          const dt = Date.parse(String(tx.date || tx.createdAt || ""));
          if (!Number.isNaN(from) && !Number.isNaN(dt) && dt < from) return;
          if (!Number.isNaN(to) && !Number.isNaN(dt) && dt > to) return;
          const c = classifyTx(tx);
          if (eliminate && isIntercompanyTx(tx, memberIds)) {
            ics += c.sales;
            icp += c.purchases;
            return;
          }
          sales += c.sales;
          purchases += c.purchases;
          expenses += c.expenses;
          other += c.other;
          txnCount += 1;
        });
      } catch { /* skip */ }
      const net = sales - purchases - expenses;
      ts += sales; tp += purchases; te += expenses; tn += net;
      const name = (m.businessName || "").replace(/"/g, '""');
      lines.push(`company,${m.businessId},"${name}",${m.ownershipPct ?? 100},${sales},${purchases},${expenses},${net},${txnCount},${ics},${icp}`);
    }
    lines.push(`consolidated,ALL,"Consolidated",,${ts},${tp},${te},${tn},,,`);
    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="consolidation-${req.params.id}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Consolidation export error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/consolidation/link-parent — set parentBusinessId on a child (SaaS or child owner)
router.patch("/link-parent", requirePermission("admin.settings"), async (req, res) => {
  try {
    const { businessId, parentBusinessId } = req.body || {};
    if (!businessId) return res.status(400).json({ error: "businessId required" });
    const role = (req as any).user.role;
    const actorId = (req as any).businessId || getActingBusinessId(req as any);
    if (!actorId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    if (role !== "SAAS_OWNER" && role !== "SAAS_ADMIN" && businessId !== actorId) {
      return res.status(403).json({ error: "Only SaaS or the business itself can set parent" });
    }
    await getDb()
      .collection("businesses")
      .doc(businessId)
      .set({ parentBusinessId: parentBusinessId || null, updatedAt: new Date().toISOString() }, { merge: true });
    res.json({ success: true, businessId, parentBusinessId: parentBusinessId || null });
  } catch (error) {
    console.error("Link parent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
