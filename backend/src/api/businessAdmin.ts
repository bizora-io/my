import express from "express";
import jwt from "jsonwebtoken";
import os from "os";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { getSchemaSummary } from "../lib/dbSchema.js";
import { exportPlatformSnapshot } from "../lib/fullTenantExport.js";
import { encryptAtRest, isAtRestEnabled } from "../lib/backupAtRest.js";
import { logAudit, auditActorFromReq } from "../lib/auditLog.js";
import { computeChurnMetrics, computeCohorts, computeNrrProxy, buildMrrSnapshot, nrrFromSnapshots } from "../lib/saasChurn.js";
import { sendTransactionalEmail } from "../lib/notify.js";
import { runReadinessChecks } from "../lib/readiness.js";
import { computeTrialUsageAnalytics } from "../lib/trialUsageAnalytics.js";
import { broadcastBusinessSync, broadcastSaasStaff } from "../lib/chatSocket.js";

const router = express.Router();

function stripSecrets(data: Record<string, any>) {
  const { passwordHash, twoFactorSecret, pendingTwoFactorSecret, resetCodeHash, resetCodeExpiresAt, ...rest } = data;
  return rest;
}


async function resolveSaaSAlertEmails(settings: Record<string, any> = {}): Promise<string[]> {
  const emails = new Set<string>();
  const configured = settings.alertEmails || settings.atRiskAlertEmails || process.env.SAAS_ALERT_EMAILS;
  if (typeof configured === "string") {
    configured.split(/[,;\s]+/).filter(Boolean).forEach((e: string) => emails.add(e.trim().toLowerCase()));
  } else if (Array.isArray(configured)) {
    configured.forEach((e) => e && emails.add(String(e).trim().toLowerCase()));
  }
  if (process.env.SAAS_OWNER_EMAIL) emails.add(process.env.SAAS_OWNER_EMAIL.trim().toLowerCase());
  try {
    const admins = await getDb().collection("saasAdmins").get();
    admins.docs.forEach((d) => {
      const em = d.data()?.email;
      if (em) emails.add(String(em).trim().toLowerCase());
    });
  } catch { /* ignore */ }
  return [...emails].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

async function sendAtRiskDigestEmail(payload: {
  threshold: number;
  atRiskMRR: number;
  atRiskCount: number;
  top: any[];
  involuntaryChurnCount?: number;
  paymentRiskCount?: number;
}) {
  const settingsDoc = await getDb().collection("platformConfig").doc("settings").get();
  const settings = settingsDoc.data() || {};
  if (settings.atRiskEmailEnabled === false) {
    return { sent: 0, skipped: true as const, reason: "disabled" };
  }
  const emails = await resolveSaaSAlertEmails(settings);
  if (!emails.length) {
    return { sent: 0, skipped: true as const, reason: "no_recipients" };
  }
  const topLines = (payload.top || [])
    .slice(0, 8)
    .map((t, i) => `${i + 1}. ${t.id} · plan ${t.plan || "—"} · MRR ${t.mrr} · ${(t.reasons || []).join(", ")}`)
    .join("\n");
  const text = [
    `Bizora SaaS at-risk digest`,
    ``,
    `At-risk MRR: ${Math.round(payload.atRiskMRR).toLocaleString()} (threshold ${payload.threshold.toLocaleString()})`,
    `At-risk accounts: ${payload.atRiskCount}`,
    payload.paymentRiskCount != null ? `Payment risk accounts: ${payload.paymentRiskCount}` : "",
    payload.involuntaryChurnCount != null ? `Involuntary churn stamps: ${payload.involuntaryChurnCount}` : "",
    ``,
    `Top at-risk:`,
    topLines || "(none listed)",
    ``,
    `Open Admin → Analytics Center for details.`,
  ]
    .filter(Boolean)
    .join("\n");

  let sent = 0;
  const errors: string[] = [];
  for (const to of emails) {
    const r = await sendTransactionalEmail({
      to,
      subject: `[Bizora] At-risk MRR ${Math.round(payload.atRiskMRR).toLocaleString()} across ${payload.atRiskCount} tenant(s)`,
      text,
    });
    if (r.ok) sent++;
    else if (r.error) errors.push(`${to}: ${r.error}`);
  }
  return { sent, skipped: false as const, recipients: emails.length, errors };
}

router.use(authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"));

// GET /api/admin/db-schema — canonical Firestore structure
router.get("/db-schema", async (_req, res) => {
  try {
    res.json(getSchemaSummary());
  } catch (e) {
    console.error("db-schema error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/admin/platform-backup — online snapshot of all shops + platform collections
router.post("/platform-backup", requireRole("SAAS_OWNER"), async (req, res) => {
  try {
    const snap = await exportPlatformSnapshot();
    const payloadStr = JSON.stringify(snap);
    const sealed = encryptAtRest(payloadStr);
    const id = `platform-${Date.now()}`;
    await getDb().collection("backups").doc(id).set({
      id,
      label: req.body?.label || `Platform backup ${new Date().toISOString().slice(0, 16)}`,
      source: "admin-platform",
      createdAt: new Date().toISOString(),
      payload: sealed.stored,
      sizeChars: payloadStr.length,
      atRestEncrypted: sealed.encrypted,
      businessCount: snap.businesses.length,
      meta: { kind: "platform", exportedAt: snap.exportedAt },
    });
    res.status(201).json({
      id,
      businessCount: snap.businesses.length,
      sizeChars: payloadStr.length,
      atRestEncrypted: sealed.encrypted,
      serverAtRestEnabled: isAtRestEnabled(),
      message: "Platform data stored in online backups collection",
    });
  } catch (e) {
    console.error("platform-backup error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/platform-backups — list platform online backups (meta only)
router.get("/platform-backups", async (_req, res) => {
  try {
    const snap = await getDb().collection("backups").orderBy("createdAt", "desc").limit(30).get().catch(async () => {
      return getDb().collection("backups").limit(30).get();
    });
    const items = snap.docs.map((d) => {
      const data = d.data() || {};
      const { payload, ...rest } = data as any;
      return { id: d.id, ...rest, sizeBytes: typeof payload === "string" ? payload.length : 0 };
    });
    res.json({ backups: items });
  } catch (e) {
    console.error("platform-backups list error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// GET /api/admin/businesses - list every registered business
router.get("/businesses", async (req, res) => {
  try {
    const snapshot = await getDb().collection("businesses").get();
    const businesses = snapshot.docs.map((doc) => ({ id: doc.id, ...stripSecrets(doc.data()) }));
    res.json({ businesses });
  } catch (error) {
    console.error("List businesses error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/businesses/:id - update status/plan/limits/features.
// This is what actually enforces suspension now (checked in the auth
// middleware on every request) - not just a local UI flag anymore.
router.patch("/businesses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "accountStatus", "subscriptionStatus", "subscriptionRenewsAt", "subscriptionEnforce", "monthlyFee", "plan", "isPremium", "storageLimit",
      "employeeLimit", "branchLimit", "features", "enabledFeatures",
      "assignedAdminId", "trialLimits", "trialUsage", "trialStartedAt",
    ];
    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    const docRef = getDb().collection("businesses").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Business not found." });

    // Churn lifecycle timestamps
    if (update.accountStatus) {
      const nowIso = new Date().toISOString();
      const prev = (doc.data() || {}).accountStatus || "Active";
      if (update.accountStatus === "Suspended" && prev !== "Suspended") {
        update.suspendedAt = nowIso;
      }
      if (update.accountStatus === "Cancelled" && prev !== "Cancelled") {
        update.cancelledAt = nowIso;
      }
      if (update.accountStatus === "Active" && prev !== "Active") {
        update.reactivatedAt = nowIso;
      }
    }
    if (update.subscriptionStatus) {
      const sub = String(update.subscriptionStatus).toLowerCase();
      if (["cancelled", "canceled", "expired", "churned"].includes(sub)) {
        update.cancelledAt = update.cancelledAt || new Date().toISOString();
      }
    }

    await docRef.set(update, { merge: true });

    await logAudit({
      ...auditActorFromReq(req as any),
      action: update.accountStatus ? `Set business status to ${update.accountStatus}` : "Updated business",
      targetType: "business",
      targetId: id,
      details: JSON.stringify(update),
    });

    const updated = await docRef.get();
    broadcastBusinessSync(id, {
      domain: "subscription",
      reason: "admin_business_patch",
      payload: update,
    });
    broadcastSaasStaff({
      domain: "all",
      reason: "admin_business_patch",
      payload: { businessId: id, ...update },
    });
    res.json({ business: { id: updated.id, ...stripSecrets(updated.data()!) } });
  } catch (error) {
    console.error("Update business error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/admin/businesses/:id - Owner only (more destructive than a status change).
router.delete("/businesses/:id", requireRole("SAAS_OWNER"), async (req, res) => {
  try {
    const id = String(req.params.id);
    await getDb().collection("businesses").doc(id).delete();

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: "Deleted business",
      targetType: "business",
      targetId: id,
    });

    broadcastSaasStaff({ domain: "all", reason: "business_deleted", payload: { businessId: id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete business error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/customers — cross-tenant customer listing for SaaS Admin
router.get("/customers", async (req, res) => {
  try {
    const search = String(req.query.search || "").toLowerCase().trim();
    const filterBusinessId = String(req.query.businessId || "").trim();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(String(req.query.limit || "50"), 10) || 50));

    // Fetch businesses map for shop context
    const bizSnap = await getDb().collection("businesses").get();
    const bizMap = new Map<string, any>();
    bizSnap.docs.forEach((d) => {
      bizMap.set(d.id, { id: d.id, name: d.data().businessName || d.data().name || d.id, ...d.data() });
    });

    const targetBizIds = filterBusinessId ? [filterBusinessId] : Array.from(bizMap.keys());
    const allCustomers: any[] = [];

    // Query entities subcollection for each business
    await Promise.all(
      targetBizIds.map(async (bId) => {
        try {
          const entSnap = await getDb()
            .collection("businesses")
            .doc(bId)
            .collection("entities")
            .where("type", "==", "Customer")
            .get();

          const bInfo = bizMap.get(bId) || { name: bId };
          entSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.isDeleted) return;
            allCustomers.push({
              id: doc.id,
              ...data,
              businessId: bId,
              businessName: bInfo.name || bInfo.businessName || bId,
              businessOwner: bInfo.ownerName || bInfo.email || "",
            });
          });
        } catch {
          // If subcollection doesn't exist or error, continue
        }
      })
    );

    // Apply search filter
    let filtered = allCustomers;
    if (search) {
      filtered = allCustomers.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const mobile = String(c.mobile || "").toLowerCase();
        const email = String(c.email || "").toLowerCase();
        const address = String(c.address || "").toLowerCase();
        const bName = String(c.businessName || "").toLowerCase();
        return name.includes(search) || mobile.includes(search) || email.includes(search) || address.includes(search) || bName.includes(search);
      });
    }

    // Sort by updatedAt desc or createdAt desc
    filtered.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      customers: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("List admin customers error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/customers/search — global customer search across all businesses by phone
router.get("/customers/search", async (req, res) => {
  try {
    const rawPhone = String(req.query.phone || req.query.q || "").trim();
    if (!rawPhone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const cleanPhone = rawPhone.replace(/\D/g, "");

    const bizSnap = await getDb().collection("businesses").get();
    const connectedBusinesses: any[] = [];
    const allTransactions: any[] = [];
    let customerProfile: any = null;
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const bDoc of bizSnap.docs) {
      const bId = bDoc.id;
      const bData = bDoc.data();
      const bName = bData.businessName || bData.name || bId;

      try {
        const entSnap = await getDb().collection("businesses").doc(bId).collection("entities").get();
        const match = entSnap.docs.find((d) => {
          const data = d.data();
          if (data.type !== "Customer" || data.isDeleted) return false;
          const m = String(data.mobile || "").replace(/\D/g, "");
          return m.includes(cleanPhone) || cleanPhone.includes(m);
        });

        if (match) {
          const cust: any = { id: match.id, ...match.data() };
          if (!customerProfile) {
            customerProfile = {
              id: cust.id,
              name: cust.name,
              mobile: cust.mobile,
              email: cust.email || "",
              address: cust.address || "",
              group: cust.groups?.[0] || cust.group || "Regular",
              loyaltyPoints: cust.loyaltyPoints || 0,
              walletBalance: cust.walletBalance || 0,
            };
          }

          // Fetch transactions for this customer in this business
          const txSnap = await getDb().collection("businesses").doc(bId).collection("transactions").get();
          const shopTxs: any[] = txSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((t: any) => {
              if (t.isDeleted) return false;
              const matchesId = t.entityId === cust.id;
              const matchesMob = t.entityMobile && String(t.entityMobile).replace(/\D/g, "").includes(cleanPhone);
              const matchesName = t.entityName && String(t.entityName).toLowerCase() === String(cust.name).toLowerCase();
              return matchesId || matchesMob || matchesName;
            });

          let bSales = 0;
          let bPaid = 0;
          let bDue = Number(cust.currentDue || 0);

          shopTxs.forEach((tx: any) => {
            const amount = Number(tx.amount || 0);
            const paid = Number(tx.amountPaid ?? tx.amount ?? 0);

            if (tx.type === "Sale") {
              bSales += amount;
              bPaid += paid;
            } else if (tx.type === "Customer Due Payment") {
              bPaid += amount;
            }
            allTransactions.push({
              ...tx,
              businessId: bId,
              businessName: bName,
            });
          });

          totalSales += bSales;
          totalPaid += bPaid;
          totalDue += bDue;

          connectedBusinesses.push({
            businessId: bId,
            businessName: bName,
            customerDue: bDue,
            salesCount: shopTxs.filter((t: any) => t.type === "Sale").length,
            totalSpent: bSales,
            lastActivity: cust.updatedAt || cust.createdAt || (shopTxs[0]?.date ? new Date(shopTxs[0].date).toISOString() : "N/A"),
          });
        }
      } catch {
        // Continue to next business
      }
    }

    if (!customerProfile && connectedBusinesses.length === 0) {
      return res.status(404).json({ error: "No customer found with that phone number" });
    }

    res.json({
      profile: customerProfile,
      connectedBusinesses,
      transactions: allTransactions.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 50),
      totalSales,
      totalPaid,
      totalDue,
    });
  } catch (error) {
    console.error("Search admin customer error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/employees — cross-tenant employee listing for SaaS Admin
router.get("/employees", async (req, res) => {
  try {
    const search = String(req.query.search || "").toLowerCase().trim();
    const roleFilter = String(req.query.role || "ALL").trim();
    const filterBusinessId = String(req.query.businessId || "").trim();

    // 1. Get all global employees
    const globalSnap = await getDb().collection("globalEmployees").get();
    const globalList: any[] = [];
    globalSnap.docs.forEach((doc) => {
      const data = doc.data();
      const { pinHash, resetCodeHash, ...safeData } = data;
      globalList.push({
        id: doc.id,
        mobile: doc.id,
        ...safeData,
      });
    });

    // 2. Also query businesses to enrich business names and ensure all staff records are included
    const bizSnap = await getDb().collection("businesses").get();
    const bizMap = new Map<string, string>();
    bizSnap.docs.forEach((d) => {
      bizMap.set(d.id, d.data().businessName || d.data().name || d.id);
    });

    // Enrich global employees with business names
    const employees = globalList.map((emp) => {
      const employments = (Array.isArray(emp.employments) ? emp.employments : []).map((empEntry: any) => ({
        ...empEntry,
        businessName: empEntry.businessName || bizMap.get(empEntry.businessId) || empEntry.businessId,
      }));

      return {
        ...emp,
        employments,
      };
    });

    // Also check for per-business staff that might not yet be in globalEmployees
    for (const bDoc of bizSnap.docs) {
      const bId = bDoc.id;
      const bName = bizMap.get(bId) || bId;
      try {
        const staffSnap = await getDb().collection("businesses").doc(bId).collection("staff").get();
        staffSnap.docs.forEach((sDoc) => {
          const sData = sDoc.data();
          const cleanMob = sData.mobile || sDoc.id;
          const existing = employees.find((e) => e.mobile === cleanMob || e.id === cleanMob);
          if (!existing) {
            employees.push({
              id: cleanMob,
              mobile: cleanMob,
              name: sData.name || "Employee",
              email: sData.email || "",
              status: sData.status || "Active",
              role: sData.role || "Salesperson",
              businessName: bName,
              employments: [
                {
                  businessId: bId,
                  businessName: bName,
                  role: sData.role || "Salesperson",
                  status: sData.status || "Active",
                  joiningDate: sData.joiningDate || "",
                  basicSalary: sData.basicSalary || 0,
                  permissions: sData.permissions || [],
                  roleTemplateId: sData.roleTemplateId || "salesperson",
                },
              ],
            });
          } else {
            if (!Array.isArray(existing.employments)) {
              existing.employments = [];
            }
            const alreadyHasBiz = existing.employments.some((emp: any) => emp.businessId === bId);
            if (!alreadyHasBiz) {
              existing.employments.push({
                businessId: bId,
                businessName: bName,
                role: sData.role || "Salesperson",
                status: sData.status || "Active",
                joiningDate: sData.joiningDate || "",
                basicSalary: sData.basicSalary || 0,
                permissions: sData.permissions || [],
                roleTemplateId: sData.roleTemplateId || "salesperson",
              });
            }
            if (!existing.role && sData.role) existing.role = sData.role;
          }
        });
      } catch {
        /* ignore */
      }
    }

    // Apply filtering
    let filtered = employees;
    if (search) {
      filtered = filtered.filter((emp) => {
        const name = String(emp.name || "").toLowerCase();
        const mobile = String(emp.mobile || "").toLowerCase();
        const hasMatchingBiz = (emp.employments || []).some((e: any) =>
          String(e.businessName || "").toLowerCase().includes(search) ||
          String(e.role || "").toLowerCase().includes(search)
        );
        return name.includes(search) || mobile.includes(search) || hasMatchingBiz;
      });
    }

    if (roleFilter !== "ALL") {
      filtered = filtered.filter((emp) =>
        (emp.employments || []).some((e: any) => String(e.role || "").toLowerCase() === roleFilter.toLowerCase())
      );
    }

    if (filterBusinessId) {
      filtered = filtered.filter((emp) =>
        (emp.employments || []).some((e: any) => e.businessId === filterBusinessId)
      );
    }

    res.json({
      employees: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("List admin employees error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/employees/:mobile/status — SaaS Admin toggle employee status
router.patch("/employees/:mobile/status", async (req, res) => {
  try {
    const mobile = String(req.params.mobile);
    const { status, businessId } = req.body;
    if (!status || !["Active", "Inactive", "Suspended"].includes(status)) {
      return res.status(400).json({ error: "Valid status (Active, Inactive, Suspended) is required" });
    }

    const docRef = getDb().collection("globalEmployees").doc(mobile);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data()!;
      let employments = Array.isArray(data.employments) ? data.employments : [];
      if (businessId) {
        employments = employments.map((e: any) => (e.businessId === businessId ? { ...e, status } : e));
      } else {
        employments = employments.map((e: any) => ({ ...e, status }));
      }
      await docRef.set({ status, employments, updatedAt: new Date().toISOString() }, { merge: true });
    }

    // Also update staff doc if businessId is specified
    if (businessId) {
      try {
        await getDb().collection("businesses").doc(businessId).collection("staff").doc(mobile).set(
          { status, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch { /* ignore */ }
    }

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Updated employee ${mobile} status to ${status}`,
      targetType: "employee",
      targetId: mobile,
    });

    res.json({ success: true, status });
  } catch (error) {
    console.error("Update employee status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/audit-logs - most recent first
// Query: ?limit=200&impersonation=1 (Login-As related only)
router.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(20, parseInt(String(req.query.limit || "200"), 10) || 200));
    const onlyImpersonation = ["1", "true", "yes"].includes(String(req.query.impersonation || "").toLowerCase());
    const snapshot = await getDb().collection("auditLogs").orderBy("timestamp", "desc").limit(limit).get().catch(
      () => getDb().collection("auditLogs").limit(limit).get()
    );
    let logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (onlyImpersonation) {
      logs = logs.filter((l: any) => {
        const action = String(l.action || "").toLowerCase();
        return (
          l.impersonated === true ||
          !!l.impersonatorId ||
          action.includes("impersonat") ||
          action.includes("login-as") ||
          action.includes("login as")
        );
      });
    }
    res.json({
      logs,
      meta: { count: logs.length, impersonationFilter: onlyImpersonation },
    });
  } catch (error) {
    console.error("List audit logs error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// GET /api/admin/readiness — production deploy checklist (env + Firestore ping)
router.get("/readiness", async (_req, res) => {
  try {
    const result = runReadinessChecks();
    try {
      await getDb().collection("platformConfig").doc("settings").get();
      result.checks.push({
        id: "firebase_ping",
        category: "Data",
        label: "Firestore reachable",
        status: "pass",
        detail: "Read platformConfig/settings OK",
        requiredForProd: true,
      });
    } catch (e: any) {
      result.checks.push({
        id: "firebase_ping",
        category: "Data",
        label: "Firestore reachable",
        status: "fail",
        detail: e?.message || "Firestore read failed",
        requiredForProd: true,
      });
    }
    result.summary.pass = result.checks.filter((c) => c.status === "pass").length;
    result.summary.warn = result.checks.filter((c) => c.status === "warn").length;
    result.summary.fail = result.checks.filter((c) => c.status === "fail").length;
    result.summary.readyForProd = result.summary.fail === 0 && result.nodeEnv === "production";
    res.json({ ...result, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Readiness error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/system-health - real Node process metrics for the
// running backend (uptime, memory, Node version). This is genuinely real
// data about this process - not a substitute for actual infrastructure
// monitoring (CPU load, disk, network) which would need your hosting
// platform's own monitoring API once you deploy somewhere.
router.get("/system-health", async (req, res) => {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpuCount = os.cpus().length || 1;
  // loadavg()[0] is the 1-minute load average; dividing by core count gives
  // a rough 0-100+ utilization estimate. This is a real OS-level number
  // (not available on Windows, where it returns [0,0,0] - shown as 0 there).
  const cpuLoadPercent = Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100));

  res.json({
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    cpuCount,
    cpuLoadPercent,
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      systemUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      systemTotalMB: Math.round(totalMem / 1024 / 1024),
      systemFreeMB: Math.round(freeMem / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});



// GET /api/admin/dashboard-stats — server-side aggregates for SaaS dashboard
router.get("/dashboard-stats", async (req, res) => {
  try {
    const db = getDb();
    const [bizSnap, ticketSnap, paySnap] = await Promise.all([
      db.collection("businesses").get(),
      db.collection("saasTickets").get().catch(() => ({ docs: [], size: 0 } as any)),
      db.collection("revenuePayments").get().catch(() => ({ docs: [], size: 0 } as any)),
    ]);

    let active = 0;
    let suspended = 0;
    let pending = 0;
    let premium = 0;
    const planCounts: Record<string, number> = {};
    const recentSignups: any[] = [];

    bizSnap.docs.forEach((doc) => {
      const d = doc.data() || {};
      const status = d.accountStatus || "Active";
      if (status === "Suspended") suspended++;
      else if (status === "PendingApproval") pending++;
      else active++;
      if (d.isPremium || ["Pro", "Nexus Pro", "Enterprise"].includes(d.plan)) premium++;
      const plan = d.plan || "Basic";
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      recentSignups.push({
        id: doc.id,
        businessName: d.businessName || d.name,
        plan,
        accountStatus: status,
        createdAt: d.createdAt || null,
      });
    });

    recentSignups.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    let openTickets = 0;
    let closedTickets = 0;
    (ticketSnap.docs || []).forEach((doc: any) => {
      const s = (doc.data() || {}).status || "Open";
      if (["Closed", "Resolved"].includes(s)) closedTickets++;
      else openTickets++;
    });

    let revenueTotal = 0;
    let revenueThisMonth = 0;
    const monthPrefix = new Date().toISOString().slice(0, 7);
    (paySnap.docs || []).forEach((doc: any) => {
      const d = doc.data() || {};
      if (d.status === "Refunded") return;
      const amt = Number(d.amount) || 0;
      revenueTotal += amt;
      if (String(d.createdAt || "").startsWith(monthPrefix)) revenueThisMonth += amt;
    });

    // Estimated MRR from active businesses × plan list prices (override via plan field amounts later)
    const PLAN_MRR: Record<string, number> = {
      Basic: 0,
      Free: 0,
      Trial: 0,
      Starter: 999,
      Growth: 2499,
      Pro: 4999,
      "Nexus Pro": 4999,
      Business: 7999,
      Enterprise: 14999,
    };
    let estimatedMRR = 0;
    bizSnap.docs.forEach((doc) => {
      const d = doc.data() || {};
      const status = d.accountStatus || "Active";
      if (status === "Suspended" || status === "PendingApproval") return;
      const plan = d.plan || "Basic";
      const custom = Number(d.monthlyFee ?? d.mrr ?? d.subscriptionAmount);
      estimatedMRR += Number.isFinite(custom) && custom > 0 ? custom : (PLAN_MRR[plan] ?? 0);
    });
    const estimatedARR = estimatedMRR * 12;
    const payingCustomers = bizSnap.docs.filter((doc) => {
      const d = doc.data() || {};
      const status = d.accountStatus || "Active";
      if (status === "Suspended" || status === "PendingApproval") return false;
      const plan = d.plan || "Basic";
      const custom = Number(d.monthlyFee ?? d.mrr ?? d.subscriptionAmount);
      const fee = Number.isFinite(custom) && custom > 0 ? custom : (PLAN_MRR[plan] ?? 0);
      return fee > 0;
    }).length;


    const churnBiz = bizSnap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        plan: d.plan,
        accountStatus: d.accountStatus,
        subscriptionStatus: d.subscriptionStatus,
        isPremium: d.isPremium,
        monthlyFee: d.monthlyFee,
        mrr: d.mrr,
        subscriptionAmount: d.subscriptionAmount,
        subscriptionRenewsAt: d.subscriptionRenewsAt,
        cancelledAt: d.cancelledAt,
        suspendedAt: d.suspendedAt,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt,
        failedPaymentCount: d.failedPaymentCount,
        lastPaymentFailedAt: d.lastPaymentFailedAt,
        lastPaymentStatus: d.lastPaymentStatus,
        involuntaryChurnAt: d.involuntaryChurnAt,
      };
    });
    const churnTickets = (ticketSnap.docs || []).map((doc: any) => {
      const d = doc.data() || {};
      return { businessId: d.businessId || d.userId, status: d.status, priority: d.priority };
    });
    const churn = computeChurnMetrics(churnBiz, churnTickets);
    const nrrProxy = computeNrrProxy(churnBiz);
    const cohortsLite = computeCohorts(churnBiz, 6);

    // Auto-capture current month MRR snapshot if missing (no overwrite)
    let autoSnapshot: { month: string; created: boolean } | null = null;
    try {
      const snap = buildMrrSnapshot(churnBiz);
      const ref = db.collection("mrrSnapshots").doc(snap.month);
      const existing = await ref.get();
      if (!existing.exists) {
        await ref.set({ ...snap, updatedAt: new Date().toISOString(), source: "auto-dashboard" }, { merge: true });
        autoSnapshot = { month: snap.month, created: true };
      } else {
        autoSnapshot = { month: snap.month, created: false };
      }
    } catch (e) {
      console.warn("Auto MRR snapshot skipped:", e);
    }

    // At-risk MRR threshold alert (deduped per day)
    let atRiskAlert: { triggered: boolean; threshold: number; atRiskMRR: number; id?: string } | null = null;
    try {
      const settingsDoc = await db.collection("platformConfig").doc("settings").get();
      const threshold = Number(settingsDoc.data()?.atRiskMrrThreshold ?? 5000);
      if (churn.atRiskMRR >= threshold && churn.atRiskCount > 0) {
        const day = new Date().toISOString().slice(0, 10);
        const alertId = `at-risk-${day}`;
        const alertRef = db.collection("saasAlerts").doc(alertId);
        const existingAlert = await alertRef.get();
        if (!existingAlert.exists) {
          const alertPayload: Record<string, any> = {
            id: alertId,
            type: "at_risk_mrr",
            severity: churn.atRiskMRR >= threshold * 2 ? "high" : "medium",
            title: "At-risk MRR threshold exceeded",
            message: `৳${Math.round(churn.atRiskMRR).toLocaleString()} MRR across ${churn.atRiskCount} tenant(s) is at risk (threshold ৳${threshold.toLocaleString()}).`,
            atRiskMRR: churn.atRiskMRR,
            atRiskCount: churn.atRiskCount,
            threshold,
            top: (churn.atRisk || []).slice(0, 5),
            createdAt: new Date().toISOString(),
            read: false,
          };
          let digestMeta: any = null;
          try {
            digestMeta = await sendAtRiskDigestEmail({
              threshold,
              atRiskMRR: churn.atRiskMRR,
              atRiskCount: churn.atRiskCount,
              top: churn.atRisk || [],
              involuntaryChurnCount: churn.involuntaryChurnCount,
              paymentRiskCount: churn.paymentRiskCount,
            });
            alertPayload.emailDigest = digestMeta;
          } catch (mailErr) {
            console.warn("At-risk email digest failed:", mailErr);
            digestMeta = { error: String(mailErr) };
          }
          await alertRef.set(alertPayload);
          atRiskAlert = { triggered: true, threshold, atRiskMRR: churn.atRiskMRR, id: alertId, emailDigest: digestMeta } as any;
        } else {
          atRiskAlert = { triggered: false, threshold, atRiskMRR: churn.atRiskMRR, id: alertId };
        }
      } else {
        atRiskAlert = { triggered: false, threshold, atRiskMRR: churn.atRiskMRR };
      }
    } catch (e) {
      console.warn("At-risk alert skipped:", e);
    }

    const trialUsageAnalytics = computeTrialUsageAnalytics(
      bizSnap.docs.map((doc) => {
        const d = doc.data() || {};
        return {
          id: doc.id,
          businessName: d.businessName || d.name,
          name: d.name,
          plan: d.plan,
          subscriptionStatus: d.subscriptionStatus,
          accountStatus: d.accountStatus,
          trialLimits: d.trialLimits,
          trialUsage: d.trialUsage,
          trialStartedAt: d.trialStartedAt,
          createdAt: d.createdAt,
          subscriptionRenewsAt: d.subscriptionRenewsAt,
        };
      })
    );

    res.json({
      stats: {
        totalBusinesses: bizSnap.size,
        activeBusinesses: active,
        suspendedBusinesses: suspended,
        pendingBusinesses: pending,
        premiumBusinesses: premium,
        payingCustomers,
        planCounts,
        trialUsageAnalytics,
        openTickets,
        closedTickets,
        revenueTotal,
        revenueThisMonth,
        estimatedMRR,
        estimatedARR,
        arpu: payingCustomers > 0 ? Math.round((estimatedMRR / payingCustomers) * 100) / 100 : 0,
        logoChurnRate: churn.logoChurnRate,
        revenueChurnRate: churn.revenueChurnRate,
        churnedCount: churn.churnedCount,
        atRiskCount: churn.atRiskCount,
        atRiskMRR: churn.atRiskMRR,
        lostMRR: churn.lostMRR,
        involuntaryChurnCount: churn.involuntaryChurnCount,
        paymentRiskCount: churn.paymentRiskCount,
        atRisk: churn.atRisk,
        churnedSample: churn.churned,
        churnNotes: churn.notes,
        nrr: nrrProxy.nrr,
        nrrDetail: nrrProxy,
        cohorts: cohortsLite,
        recentSignups: recentSignups.slice(0, 10),
        mrrSnapshot: autoSnapshot,
        atRiskAlert,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/admin/impersonate — short-lived shop token for support (audit + reason required)
router.post("/impersonate", async (req, res) => {
  try {
    const actor = (req as any).user;
    if (!actor || (actor.role !== "SAAS_OWNER" && actor.role !== "SAAS_ADMIN")) {
      return res.status(403).json({ error: "Only SaaS staff can impersonate." });
    }

    const { businessId, reason } = req.body || {};
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    const why = String(reason || "").trim();
    if (why.length < 5) {
      return res.status(400).json({
        error: "A support reason is required (min 5 characters).",
        code: "impersonate_reason_required",
      });
    }

    const doc = await getDb().collection("businesses").doc(businessId).get();
    if (!doc.exists) return res.status(404).json({ error: "Business not found" });
    const data = doc.data() || {};
    if (data.accountStatus === "Suspended") {
      return res.status(403).json({ error: "Cannot impersonate a suspended business." });
    }

    const ttl = process.env.IMPERSONATE_TTL || "15m";
    const accessToken = jwt.sign(
      {
        id: businessId,
        email: data.email || "",
        role: "SHOP_OWNER",
        typ: "access",
        impersonated: true,
        impersonatorId: actor.id,
        impersonatorRole: actor.role,
        impersonateReason: why.slice(0, 200),
      },
      getJwtSecret(),
      { expiresIn: ttl as any }
    );

    await logAudit({
      actorId: actor.id,
      actorRole: actor.role,
      action: `Impersonate start: ${data.businessName || businessId}`,
      targetType: "business",
      targetId: businessId,
      details: JSON.stringify({ reason: why, ttl }),
    });

    const userOut = {
      id: businessId,
      name: data.name || data.businessName,
      businessName: data.businessName,
      email: data.email,
      mobile: data.mobile,
      businessType: data.businessType || "Retail",
      role: "SHOP_OWNER",
      isPremium: !!data.isPremium,
      plan: data.plan || "Basic",
      features: data.features || [],
      enabledFeatures: data.enabledFeatures || data.features || [],
      isImpersonated: true,
      impersonatorId: actor.id,
      impersonateReason: why.slice(0, 200),
      accountStatus: data.accountStatus || "Active",
      subscriptionStatus: data.subscriptionStatus || "Active",
      subscriptionRenewsAt: data.subscriptionRenewsAt || null,
      autoRenew: data.autoRenew !== false,
    };

    res.json({
      token: accessToken,
      accessToken,
      user: userOut,
      expiresIn: ttl,
    });
  } catch (error) {
    console.error("Impersonate error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/admin/impersonate/exit — audit end of support session
router.post("/impersonate/exit", async (req, res) => {
  try {
    const actor = (req as any).user;
    const { businessId, reason } = req.body || {};
    await logAudit({
      actorId: actor?.id || "unknown",
      actorRole: actor?.role || actor?.impersonatorRole || "SAAS",
      action: `Impersonate end: ${businessId || "unknown"}`,
      targetType: "business",
      targetId: businessId || "unknown",
      details: JSON.stringify({ reason: reason || "exit", wasImpersonated: !!actor?.impersonated }),
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Impersonate exit error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/businesses/:id/subscription — plan, renew date, autoRenew, status
router.patch("/businesses/:id/subscription", async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, isPremium, subscriptionStatus, subscriptionRenewsAt, autoRenew, subscriptionEnforce, features, enabledFeatures } =
      req.body || {};

    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (plan !== undefined) update.plan = plan;
    if (isPremium !== undefined) update.isPremium = !!isPremium;
    if (subscriptionStatus !== undefined) update.subscriptionStatus = subscriptionStatus;
    if (subscriptionRenewsAt !== undefined) update.subscriptionRenewsAt = subscriptionRenewsAt;
    if (autoRenew !== undefined) update.autoRenew = !!autoRenew;
    if (subscriptionEnforce !== undefined) update.subscriptionEnforce = !!subscriptionEnforce;
    if (features !== undefined) update.features = features;
    if (enabledFeatures !== undefined) update.enabledFeatures = enabledFeatures;

    // Derive isPremium from plan when plan set
    if (plan && isPremium === undefined) {
      update.isPremium = ["Pro", "Nexus Pro", "Enterprise"].includes(plan);
    }

    await getDb().collection("businesses").doc(id).set(update, { merge: true });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Updated subscription for business ${id}`,
      targetType: "businessSubscription",
      targetId: id,
    });

    const doc = await getDb().collection("businesses").doc(id).get();
    broadcastBusinessSync(id, {
      domain: "subscription",
      reason: "subscription_updated",
      payload: { plan: update.plan, subscriptionStatus: update.subscriptionStatus },
    });
    broadcastSaasStaff({
      domain: "businesses",
      reason: "subscription_updated",
      payload: { businessId: id },
    });
    res.json({ business: { id: doc.id, ...stripSecrets(doc.data() || {}) } });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// POST /api/admin/mrr-snapshots — capture current MRR snapshot (idempotent per calendar month)
router.post("/mrr-snapshots", async (req, res) => {
  try {
    const db = getDb();
    const bizSnap = await db.collection("businesses").get();
    const businesses = bizSnap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        plan: d.plan,
        accountStatus: d.accountStatus,
        subscriptionStatus: d.subscriptionStatus,
        monthlyFee: d.monthlyFee,
        mrr: d.mrr,
        subscriptionAmount: d.subscriptionAmount,
        createdAt: d.createdAt,
      };
    });
    const snap = buildMrrSnapshot(businesses);
    const force = req.query.force === "1" || req.body?.force === true;
    const docId = snap.month; // one snapshot per month
    const ref = db.collection("mrrSnapshots").doc(docId);
    const existing = await ref.get();
    if (existing.exists && !force) {
      return res.json({ snapshot: { id: existing.id, ...existing.data() }, created: false });
    }
    await ref.set({ ...snap, updatedAt: new Date().toISOString() }, { merge: true });
    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Captured MRR snapshot ${snap.month} (MRR ${snap.totalMrr})`,
      targetType: "mrrSnapshot",
      targetId: docId,
    });
    res.status(existing.exists ? 200 : 201).json({ snapshot: { id: docId, ...snap }, created: !existing.exists });
  } catch (error) {
    console.error("MRR snapshot error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/mrr-snapshots — list snapshots + optional historical NRR between last two
router.get("/mrr-snapshots", async (_req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection("mrrSnapshots").get();
    const snapshots = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(a.month).localeCompare(String(b.month)));

    let historicalNrr = null;
    if (snapshots.length >= 2) {
      const a = snapshots[snapshots.length - 2] as any;
      const b = snapshots[snapshots.length - 1] as any;
      try {
        historicalNrr = nrrFromSnapshots(a, b);
      } catch (e) {
        console.warn("historicalNrr calculation error:", e);
      }
    }

    res.json({ snapshots, historicalNrr, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("List MRR snapshots error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// POST /api/admin/alerts/digest — force send at-risk email digest now
router.post("/alerts/digest", async (_req, res) => {
  try {
    const db = getDb();
    const [bizSnap, ticketSnap] = await Promise.all([
      db.collection("businesses").get(),
      db.collection("saasTickets").get().catch(() => ({ docs: [] } as any)),
    ]);
    const businesses = bizSnap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        plan: d.plan,
        accountStatus: d.accountStatus,
        subscriptionStatus: d.subscriptionStatus,
        monthlyFee: d.monthlyFee,
        mrr: d.mrr,
        subscriptionAmount: d.subscriptionAmount,
        subscriptionRenewsAt: d.subscriptionRenewsAt,
        cancelledAt: d.cancelledAt,
        suspendedAt: d.suspendedAt,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt,
        failedPaymentCount: d.failedPaymentCount,
        lastPaymentFailedAt: d.lastPaymentFailedAt,
        involuntaryChurnAt: d.involuntaryChurnAt,
      };
    });
    const tickets = (ticketSnap.docs || []).map((doc: any) => {
      const d = doc.data() || {};
      return { businessId: d.businessId || d.userId, status: d.status, priority: d.priority };
    });
    const churn = computeChurnMetrics(businesses, tickets);
    const settingsDoc = await db.collection("platformConfig").doc("settings").get();
    const threshold = Number(settingsDoc.data()?.atRiskMrrThreshold ?? 5000);
    const result = await sendAtRiskDigestEmail({
      threshold,
      atRiskMRR: churn.atRiskMRR,
      atRiskCount: churn.atRiskCount,
      top: churn.atRisk || [],
      involuntaryChurnCount: churn.involuntaryChurnCount,
      paymentRiskCount: churn.paymentRiskCount,
    });
    res.json({ ok: true, churn: { atRiskMRR: churn.atRiskMRR, atRiskCount: churn.atRiskCount }, digest: result });
  } catch (error) {
    console.error("Digest error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/alerts — SaaS operational alerts (at-risk, etc.)
router.get("/alerts", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "1";
    const snap = await getDb().collection("saasAlerts").get();
    let alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    alerts.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    if (unreadOnly) alerts = alerts.filter((a) => !a.read);
    res.json({ alerts: alerts.slice(0, 50) });
  } catch (error) {
    console.error("List alerts error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/alerts/:id/read
router.patch("/alerts/:id/read", async (req, res) => {
  try {
    const ref = getDb().collection("saasAlerts").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });
    await ref.set({ read: true, readAt: new Date().toISOString() }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark alert read error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/platform-settings — lightweight thresholds (also used by platform settings UI)
router.patch("/platform-settings", async (req, res) => {
  try {
    const allowed = ["atRiskMrrThreshold", "atRiskEmailEnabled", "alertEmails", "atRiskAlertEmails"];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    if (!Object.keys(update).length) return res.status(400).json({ error: "No valid fields" });
    await getDb().collection("platformConfig").doc("settings").set(update, { merge: true });
    res.json({ settings: update });
  } catch (error) {
    console.error("Platform settings error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/churn-export — CSV for cohorts + at-risk + churned
router.get("/churn-export", async (_req, res) => {
  try {
    const db = getDb();
    const [bizSnap, ticketSnap] = await Promise.all([
      db.collection("businesses").get(),
      db.collection("saasTickets").get().catch(() => ({ docs: [] } as any)),
    ]);
    const businesses = bizSnap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        plan: d.plan,
        accountStatus: d.accountStatus,
        subscriptionStatus: d.subscriptionStatus,
        monthlyFee: d.monthlyFee,
        mrr: d.mrr,
        subscriptionAmount: d.subscriptionAmount,
        subscriptionRenewsAt: d.subscriptionRenewsAt,
        cancelledAt: d.cancelledAt,
        suspendedAt: d.suspendedAt,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt,
        businessName: d.businessName || d.name,
        failedPaymentCount: d.failedPaymentCount,
        lastPaymentFailedAt: d.lastPaymentFailedAt,
        lastPaymentStatus: d.lastPaymentStatus,
        involuntaryChurnAt: d.involuntaryChurnAt,
      };
    });
    const tickets = (ticketSnap.docs || []).map((doc: any) => {
      const d = doc.data() || {};
      return { businessId: d.businessId || d.userId, status: d.status, priority: d.priority };
    });
    const metrics = computeChurnMetrics(businesses, tickets);
    const cohorts = computeCohorts(businesses, 12);
    const nrr = computeNrrProxy(businesses);

    const esc = (v: any) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines: string[] = [];
    lines.push("section,key,value");
    lines.push(`summary,logoChurnRate,${metrics.logoChurnRate}`);
    lines.push(`summary,revenueChurnRate,${metrics.revenueChurnRate}`);
    lines.push(`summary,currentPaying,${metrics.currentPaying}`);
    lines.push(`summary,churnedCount,${metrics.churnedCount}`);
    lines.push(`summary,currentMRR,${metrics.currentMRR}`);
    lines.push(`summary,lostMRR,${metrics.lostMRR}`);
    lines.push(`summary,atRiskCount,${metrics.atRiskCount}`);
    lines.push(`summary,atRiskMRR,${metrics.atRiskMRR}`);
    lines.push(`summary,nrrProxy,${nrr.nrr}`);

    lines.push("");
    lines.push("cohort,signups,stillActive,stillPaying,churned,retentionRate,remainingMrr");
    cohorts.forEach((c) => {
      lines.push([c.cohort, c.signups, c.stillActive, c.stillPaying, c.churned, c.retentionRate, c.remainingMrr].join(","));
    });

    lines.push("");
    lines.push("atRiskId,plan,mrr,reasons");
    metrics.atRisk.forEach((a) => {
      lines.push([esc(a.id), esc(a.plan), a.mrr, esc((a.reasons || []).join("; "))].join(","));
    });

    lines.push("");
    lines.push("churnedId,plan,mrr,status");
    metrics.churned.forEach((c) => {
      lines.push([esc(c.id), esc(c.plan), c.mrr, esc(c.status)].join(","));
    });

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bizora-churn-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Churn export error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/churn-metrics — detailed churn / at-risk breakdown
router.get("/churn-metrics", async (_req, res) => {
  try {
    const db = getDb();
    const [bizSnap, ticketSnap] = await Promise.all([
      db.collection("businesses").get(),
      db.collection("saasTickets").get().catch(() => ({ docs: [] } as any)),
    ]);
    const { planMrr: pm } = await import("../lib/saasChurn.js");
    const businesses = bizSnap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        plan: d.plan,
        accountStatus: d.accountStatus,
        subscriptionStatus: d.subscriptionStatus,
        isPremium: d.isPremium,
        monthlyFee: d.monthlyFee,
        mrr: d.mrr,
        subscriptionAmount: d.subscriptionAmount,
        subscriptionRenewsAt: d.subscriptionRenewsAt,
        cancelledAt: d.cancelledAt,
        suspendedAt: d.suspendedAt,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt,
        businessName: d.businessName || d.name,
        failedPaymentCount: d.failedPaymentCount,
        lastPaymentFailedAt: d.lastPaymentFailedAt,
        lastPaymentStatus: d.lastPaymentStatus,
        involuntaryChurnAt: d.involuntaryChurnAt,
      };
    });
    const tickets = (ticketSnap.docs || []).map((doc: any) => {
      const d = doc.data() || {};
      return { businessId: d.businessId || d.userId, status: d.status, priority: d.priority };
    });
    const metrics = computeChurnMetrics(businesses, tickets);
    const cohorts = computeCohorts(businesses, 12);
    const nrr = computeNrrProxy(businesses);
    res.json({
      ...metrics,
      cohorts,
      nrr,
      roster: businesses.map((b) => ({
        id: b.id,
        businessName: (b as any).businessName,
        plan: b.plan,
        accountStatus: b.accountStatus,
        subscriptionStatus: b.subscriptionStatus,
        computedMrr: pm(b),
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Churn metrics error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/** PATCH /api/admin/businesses/:id/trial-limits — SaaS can raise trial caps */
router.patch("/businesses/:id/trial-limits", async (req, res) => {
  try {
    const { trialLimits, trialUsage, subscriptionStatus, extendDays } = req.body || {};
    const db = getDb();
    const ref = db.collection("businesses").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Business not found" });
    const patch: Record<string, unknown> = {};
    if (trialLimits && typeof trialLimits === "object") {
      patch.trialLimits = {
        products: Number(trialLimits.products) || 0,
        customers: Number(trialLimits.customers) || 0,
        buys: Number(trialLimits.buys) || 0,
        sells: Number(trialLimits.sells) || 0,
        expenses: Number(trialLimits.expenses) || 0,
        quickSales: Number(trialLimits.quickSales) || 0,
      };
    }
    if (trialUsage && typeof trialUsage === "object") {
      patch.trialUsage = trialUsage;
    }
    if (subscriptionStatus) patch.subscriptionStatus = subscriptionStatus;
    if (extendDays && Number(extendDays) > 0) {
      const data = snap.data() || {};
      const base = data.subscriptionRenewsAt ? new Date(data.subscriptionRenewsAt) : new Date();
      const from = base.getTime() > Date.now() ? base : new Date();
      from.setDate(from.getDate() + Number(extendDays));
      patch.subscriptionRenewsAt = from.toISOString();
      patch.subscriptionStatus = "Trial";
      patch.plan = "Trial";
    }
    await ref.set(patch, { merge: true });
    const updated = await ref.get();
    broadcastBusinessSync(req.params.id, {
      domain: "trial",
      reason: "saas_trial_limits_patch",
      payload: {
        trialLimits: patch.trialLimits,
        trialUsage: patch.trialUsage,
        subscriptionStatus: patch.subscriptionStatus,
        subscriptionRenewsAt: patch.subscriptionRenewsAt,
      },
    });
    res.json({ business: { id: updated.id, ...updated.data() } });
  } catch (e) {
    console.error("trial-limits patch error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
