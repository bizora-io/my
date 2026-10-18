import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";
import { broadcastSaasStaff, broadcastBusinessSync } from "../lib/chatSocket.js";
import { sendNotification } from "../lib/notificationService.js";

const router = express.Router();
export const publicAnnouncementsRouter = express.Router();

function announcementsCollection() {
  return getDb().collection("announcements");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// --- SaaS Owner/Admin management ---
router.use(authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"));

// GET /api/admin/announcements - list all announcements
router.get("/", async (_req, res) => {
  try {
    const snapshot = await announcementsCollection().get();
    const announcements = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ announcements });
  } catch (error) {
    console.error("List announcements error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/admin/announcements - create rich announcement
router.post("/", async (req, res) => {
  try {
    const {
      title,
      message,
      body,
      type = "info",
      format = "text",
      imageUrl = "",
      ctaText = "",
      ctaLink = "",
      audience = "all",
      targetPlans = [],
      targetBusinesses = [],
      displayMode = "both",
      frequency = "until_dismissed",
      scope = "global",
      businessId,
      startsAt,
      endsAt,
      active = true,
    } = req.body;

    const contentText = (message || body || "").trim();
    if (!title || !contentText) {
      return res.status(400).json({ error: "Title and message content are required" });
    }

    const payload = stripUndefined({
      title: title.trim(),
      message: contentText,
      body: contentText,
      type: type || "info", // 'info' | 'warning' | 'update' | 'promotion' | 'maintenance'
      format: imageUrl ? "both" : format || "text",
      imageUrl: imageUrl || null,
      ctaText: ctaText || null,
      ctaLink: ctaLink || null,
      audience: audience || (scope === "business" ? "businesses" : "all"),
      targetPlans: Array.isArray(targetPlans) ? targetPlans : [],
      targetBusinesses: Array.isArray(targetBusinesses) ? targetBusinesses : businessId ? [businessId] : [],
      displayMode: displayMode || "both", // 'both' | 'popup_only' | 'notification_only'
      frequency: frequency || "until_dismissed", // 'once_per_user' | 'once_per_session' | 'until_dismissed'
      scope: scope === "business" ? "business" : "global",
      businessId: scope === "business" ? businessId : undefined,
      active: active !== false,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (req as any).user.id,
    });

    const docRef = await announcementsCollection().add(payload);
    const createdAnnouncement = { id: docRef.id, ...payload };

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Created announcement: "${title}"`,
      targetType: "announcement",
      targetId: docRef.id,
    });

    broadcastSaasStaff({ domain: "announcements", reason: "announcement_created", payload: createdAnnouncement });
    if (payload.scope === "business" && payload.businessId) {
      broadcastBusinessSync(payload.businessId, { domain: "announcements", reason: "announcement_created", payload: createdAnnouncement });
    } else {
      broadcastBusinessSync("all", { domain: "announcements", reason: "announcement_created", payload: createdAnnouncement });
    }

    // Send persistent notification if displayMode is not popup_only
    if (displayMode !== "popup_only") {
      try {
        if (payload.scope === "business" && payload.businessId) {
          sendNotification({
            businessId: payload.businessId,
            userId: payload.businessId,
            category: "announcements",
            type: payload.type === "warning" || payload.type === "maintenance" ? "warning" : "info",
            title: payload.title,
            message: payload.message,
            target: payload.ctaLink || undefined,
            metadata: { announcementId: docRef.id },
          }).catch(() => {});
        } else {
          sendNotification({
            targetRole: "ALL",
            category: "announcements",
            type: payload.type === "warning" || payload.type === "maintenance" ? "warning" : "info",
            title: payload.title,
            message: payload.message,
            target: payload.ctaLink || undefined,
            metadata: { announcementId: docRef.id },
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }

    res.status(201).json({ announcement: createdAnnouncement });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/admin/announcements/:id - update or toggle active
router.patch("/:id", async (req, res) => {
  try {
    const docRef = announcementsCollection().doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Announcement not found" });

    const updatePayload = stripUndefined({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });

    await docRef.set(updatePayload, { merge: true });
    const updated = await docRef.get();
    const updatedData = { id: updated.id, ...updated.data() };

    broadcastSaasStaff({ domain: "announcements", reason: "announcement_updated", payload: updatedData });
    broadcastBusinessSync("all", { domain: "announcements", reason: "announcement_updated", payload: updatedData });

    res.json({ announcement: updatedData });
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/admin/announcements/:id - delete
router.delete("/:id", async (req, res) => {
  try {
    const docRef = announcementsCollection().doc(req.params.id);
    await docRef.delete();
    broadcastSaasStaff({ domain: "announcements", reason: "announcement_deleted", payload: { id: req.params.id } });
    broadcastBusinessSync("all", { domain: "announcements", reason: "announcement_deleted", payload: { id: req.params.id } });
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

// --- Public/Client Active Announcements Router ---
// Mounted at /api/announcements
publicAnnouncementsRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id, role, businessId } = user;
    const actingBizId = businessId || (role === "SHOP_OWNER" ? id : null);

    const snapshot = await announcementsCollection().where("active", "==", true).get();
    const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    // Fetch business details if available to filter by plan
    let bizPlan = "";
    if (actingBizId) {
      const bizDoc = await getDb().collection("businesses").doc(actingBizId).get().catch(() => null);
      if (bizDoc && bizDoc.exists) {
        bizPlan = String(bizDoc.data()?.plan || "").toLowerCase();
      }
    }

    const now = Date.now();
    const relevant = all.filter((a) => {
      // 1. Time window check
      if (a.startsAt) {
        const s = Date.parse(a.startsAt);
        if (!Number.isNaN(s) && now < s) return false;
      }
      if (a.endsAt) {
        const e = Date.parse(a.endsAt);
        if (!Number.isNaN(e) && now > e) return false;
      }

      // 2. Audience targeting check
      const aud = a.audience || (a.scope === "business" ? "businesses" : "all");

      if (aud === "admins") {
        return role === "SAAS_OWNER" || role === "SAAS_ADMIN";
      }

      if (aud === "all" || a.scope === "global") {
        return true;
      }

      if (aud === "businesses" || a.scope === "business") {
        if (!actingBizId) return false;
        if (a.businessId && a.businessId === actingBizId) return true;
        if (Array.isArray(a.targetBusinesses) && a.targetBusinesses.includes(actingBizId)) return true;
        return false;
      }

      if (aud === "plans") {
        if (!bizPlan) return false;
        const targetPlans = Array.isArray(a.targetPlans) ? a.targetPlans.map((p: string) => String(p).toLowerCase()) : [];
        return targetPlans.some((tp: string) => bizPlan.includes(tp) || tp.includes(bizPlan));
      }

      return true;
    });

    res.json({ announcements: relevant });
  } catch (error) {
    console.error("Get active announcements error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
