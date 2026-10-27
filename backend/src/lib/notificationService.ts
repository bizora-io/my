import { getDb } from "./firebaseAdmin.js";
import { getIO, broadcastSaasStaff, broadcastBusinessSync } from "./chatSocket.js";

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationCategory =
  | "subscription"
  | "support"
  | "announcements"
  | "system"
  | "sales"
  | "inventory"
  | "finance";

export interface CreateNotificationParams {
  userId?: string;
  businessId?: string;
  targetRole?: "SAAS_ADMIN" | "SHOP_OWNER" | "ALL";
  type?: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  target?: string;
  metadata?: Record<string, any>;
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function sendNotification(params: CreateNotificationParams): Promise<any> {
  const {
    userId,
    businessId,
    targetRole,
    type = "info",
    category = "system",
    title,
    message,
    target,
    metadata = {},
  } = params;

  const now = new Date().toISOString();
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const payload = stripUndefined({
    id: notifId,
    userId: userId || (targetRole === "SAAS_ADMIN" ? "saas-owner" : businessId || "system"),
    businessId: businessId || null,
    targetRole: targetRole || null,
    type,
    category,
    title,
    message,
    target: target || null,
    read: false,
    metadata,
    createdAt: now,
    timestamp: now,
    updatedAt: now,
  });

  try {
    if (businessId) {
      await getDb().collection("businesses").doc(businessId).collection("notifications").doc(notifId).set(payload);
    }
    await getDb().collection("notifications").doc(notifId).set(payload);
  } catch (err) {
    console.error("[notificationService] Error writing notification to DB:", err);
  }

  // Socket.IO real-time emission
  try {
    const io = getIO();
    if (io) {
      if (targetRole === "SAAS_ADMIN" || (!businessId && !userId)) {
        io.to("saas-staff").emit("notification:new", payload);
      }
      if (businessId) {
        io.to(`business:${businessId}`).emit("notification:new", payload);
      }
      if (userId) {
        io.to(`user:${userId}`).emit("notification:new", payload);
      }
    }

    // Also trigger business sync pulse
    if (businessId) {
      broadcastBusinessSync(businessId, {
        domain: "notifications",
        reason: "notification_created",
        payload,
      });
    } else if (targetRole === "SAAS_ADMIN") {
      broadcastSaasStaff({
        domain: "notifications",
        reason: "notification_created",
        payload,
      });
    }
  } catch (socketErr) {
    console.warn("[notificationService] Socket broadcast failed:", socketErr);
  }

  return payload;
}

