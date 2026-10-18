import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken } from "./middleware/auth.js";

const router = express.Router();

function notificationsCollection() {
  return getDb().collection("notifications");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken);

// GET /api/notifications - List user's notifications
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";

    let notifications: any[] = [];
    if (isSaasStaff) {
      const [userSnap, adminSnap, saasRoleSnap] = await Promise.all([
        notificationsCollection().where("userId", "in", [userId, "saas-owner", "system"].filter(Boolean)).get(),
        notificationsCollection().where("targetRole", "==", "SAAS_ADMIN").get(),
        notificationsCollection().where("targetRole", "==", "ALL").get(),
      ]);

      const map = new Map<string, any>();
      [...userSnap.docs, ...adminSnap.docs, ...saasRoleSnap.docs].forEach((doc) => {
        map.set(doc.id, { id: doc.id, ...doc.data() });
      });
      notifications = Array.from(map.values());
    } else {
      const snapshot = await notificationsCollection()
        .where("userId", "==", userId)
        .get();
      notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    notifications.sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    res.json({ notifications });
  } catch (error) {
    console.error("List notifications error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/notifications - Create notification
router.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const { title, message, type = "info", category = "general", target, id: customId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const notifId = customId || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const payload = stripUndefined({
      userId,
      title,
      message,
      type,
      category,
      target: target || null,
      read: false,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    });

    await notificationsCollection().doc(notifId).set(payload);
    res.status(201).json({ notification: { id: notifId, ...payload } });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch("/:id/read", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    const { id } = req.params;

    const docRef = notificationsCollection().doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const data = doc.data();
    const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
    if (data?.userId && data.userId !== userId && !isSaasStaff && data.targetRole !== "ALL") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await docRef.update({
      read: true,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post("/read-all", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";

    let docsToUpdate: any[] = [];
    if (isSaasStaff) {
      const [uSnap, aSnap] = await Promise.all([
        notificationsCollection().where("userId", "in", [userId, "saas-owner", "system"].filter(Boolean)).where("read", "==", false).get(),
        notificationsCollection().where("targetRole", "==", "SAAS_ADMIN").where("read", "==", false).get(),
      ]);
      docsToUpdate = [...uSnap.docs, ...aSnap.docs];
    } else {
      const snapshot = await notificationsCollection()
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();
      docsToUpdate = snapshot.docs;
    }

    const batch = getDb().batch();
    const seen = new Set<string>();
    docsToUpdate.forEach((doc) => {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        batch.update(doc.ref, { read: true, updatedAt: new Date().toISOString() });
      }
    });
    await batch.commit();

    res.json({ success: true, count: seen.size });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    const { id } = req.params;

    const docRef = notificationsCollection().doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
      if (data?.userId && data.userId !== userId && !isSaasStaff && data.targetRole !== "ALL") {
        return res.status(403).json({ error: "Forbidden" });
      }
      await docRef.delete();
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/notifications - Clear all notifications
router.delete("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const snapshot = await notificationsCollection()
      .where("userId", "==", userId)
      .get();

    const batch = getDb().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, count: snapshot.size });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

