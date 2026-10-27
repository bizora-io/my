import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken } from "./middleware/auth.js";

const router = express.Router();

function rootNotificationsCollection() {
  return getDb().collection("notifications");
}

function tenantNotificationsCollection(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("notifications");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken);

// GET /api/notifications - List user's notifications (Tenant Isolated + SaaS Staff support)
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.businessId;
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";

    let notifications: any[] = [];
    if (isSaasStaff) {
      const [userSnap, adminSnap, saasRoleSnap] = await Promise.all([
        rootNotificationsCollection().where("userId", "in", [userId, "saas-owner", "system"].filter(Boolean)).get(),
        rootNotificationsCollection().where("targetRole", "==", "SAAS_ADMIN").get(),
        rootNotificationsCollection().where("targetRole", "==", "ALL").get(),
      ]);

      const map = new Map<string, any>();
      [...userSnap.docs, ...adminSnap.docs, ...saasRoleSnap.docs].forEach((doc) => {
        map.set(doc.id, { id: doc.id, ...doc.data() });
      });
      notifications = Array.from(map.values());
    } else if (businessId) {
      // 1. Primary: Subcollection businesses/{businessId}/notifications (Canonical Tenant Isolation)
      // 2. Secondary: Root collection where userId == userId (Backward Compatibility)
      const [tenantSnap, rootSnap] = await Promise.all([
        tenantNotificationsCollection(businessId).get().catch(() => ({ docs: [] })),
        rootNotificationsCollection().where("userId", "==", userId).get().catch(() => ({ docs: [] })),
      ]);

      const map = new Map<string, any>();
      (tenantSnap.docs || []).forEach((doc: any) => {
        map.set(doc.id, { id: doc.id, ...doc.data() });
      });
      (rootSnap.docs || []).forEach((doc: any) => {
        if (!map.has(doc.id)) {
          map.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });
      notifications = Array.from(map.values());
    } else {
      const snapshot = await rootNotificationsCollection()
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
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
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
      id: notifId,
      userId,
      businessId: businessId || null,
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

    // Write to tenant subcollection if businessId is present
    if (businessId) {
      await tenantNotificationsCollection(businessId).doc(notifId).set(payload);
    }
    // Also record in root collection for staff/audit lookup
    await rootNotificationsCollection().doc(notifId).set(payload);

    res.status(201).json({ notification: payload });
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
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
    const { id } = req.params;

    const updates = {
      read: true,
      updatedAt: new Date().toISOString(),
    };

    let updated = false;

    // Check tenant subcollection first
    if (businessId) {
      const tenantRef = tenantNotificationsCollection(businessId).doc(id);
      const tenantDoc = await tenantRef.get();
      if (tenantDoc.exists) {
        await tenantRef.update(updates);
        updated = true;
      }
    }

    // Check root collection
    const rootRef = rootNotificationsCollection().doc(id);
    const rootDoc = await rootRef.get();
    if (rootDoc.exists) {
      const data = rootDoc.data();
      const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
      if (data?.userId && data.userId !== userId && !isSaasStaff && data.targetRole !== "ALL") {
        if (!updated) return res.status(403).json({ error: "Forbidden" });
      } else {
        await rootRef.update(updates);
        updated = true;
      }
    }

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

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
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
    const batch = getDb().batch();
    const seen = new Set<string>();
    const now = new Date().toISOString();

    if (isSaasStaff) {
      const [uSnap, aSnap] = await Promise.all([
        rootNotificationsCollection().where("userId", "in", [userId, "saas-owner", "system"].filter(Boolean)).where("read", "==", false).get(),
        rootNotificationsCollection().where("targetRole", "==", "SAAS_ADMIN").where("read", "==", false).get(),
      ]);
      [...uSnap.docs, ...aSnap.docs].forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          batch.update(doc.ref, { read: true, updatedAt: now });
        }
      });
    } else {
      if (businessId) {
        const tenantSnap = await tenantNotificationsCollection(businessId).where("read", "==", false).get().catch(() => ({ docs: [] }));
        (tenantSnap.docs || []).forEach((doc: any) => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            batch.update(doc.ref, { read: true, updatedAt: now });
          }
        });
      }
      const rootSnap = await rootNotificationsCollection().where("userId", "==", userId).where("read", "==", false).get().catch(() => ({ docs: [] }));
      (rootSnap.docs || []).forEach((doc: any) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          batch.update(doc.ref, { read: true, updatedAt: now });
        }
      });
    }

    if (seen.size > 0) {
      await batch.commit();
    }

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
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
    const { id } = req.params;

    let deleted = false;

    if (businessId) {
      const tenantRef = tenantNotificationsCollection(businessId).doc(id);
      const tenantDoc = await tenantRef.get();
      if (tenantDoc.exists) {
        await tenantRef.delete();
        deleted = true;
      }
    }

    const rootRef = rootNotificationsCollection().doc(id);
    const rootDoc = await rootRef.get();
    if (rootDoc.exists) {
      const data = rootDoc.data();
      const isSaasStaff = user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
      if (data?.userId && data.userId !== userId && !isSaasStaff && data.targetRole !== "ALL") {
        if (!deleted) return res.status(403).json({ error: "Forbidden" });
      } else {
        await rootRef.delete();
        deleted = true;
      }
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
    const businessId = user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : null);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user ID" });
    }

    const batch = getDb().batch();
    let count = 0;

    if (businessId) {
      const tenantSnap = await tenantNotificationsCollection(businessId).get().catch(() => ({ docs: [] }));
      (tenantSnap.docs || []).forEach((doc: any) => {
        batch.delete(doc.ref);
        count++;
      });
    }

    const rootSnap = await rootNotificationsCollection().where("userId", "==", userId).get().catch(() => ({ docs: [] }));
    (rootSnap.docs || []).forEach((doc: any) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
