import { getDb } from "./firebaseAdmin.js";
import { broadcastSaasStaff } from "./chatSocket.js";

export interface AuditLogEntry {
  actorId: string;
  actorRole: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  /** Present when action was taken under SaaS Login-As */
  impersonatorId?: string;
  impersonatorRole?: string;
  impersonated?: boolean;
}

// Fire-and-forget - an audit log write failing should never break the
// action it's logging. Call this from any SaaS-level endpoint that
// changes something significant (business status, plan, admin accounts,
// platform settings, ...).
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const docRef = await getDb().collection("auditLogs").add({
      ...entry,
      timestamp,
    });
    broadcastSaasStaff({
      domain: "audit",
      reason: "log_created",
      payload: { id: docRef.id, ...entry, timestamp },
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

/** Build audit fields from Express req.user (supports Login-As claims). */
export function auditActorFromReq(req: { user?: any }): Pick<
  AuditLogEntry,
  "actorId" | "actorRole" | "impersonatorId" | "impersonatorRole" | "impersonated"
> {
  const u = req.user || {};
  if (u.impersonated) {
    return {
      actorId: String(u.id || ""),
      actorRole: "SHOP_OWNER",
      impersonated: true,
      impersonatorId: u.impersonatorId ? String(u.impersonatorId) : undefined,
      impersonatorRole: u.impersonatorRole ? String(u.impersonatorRole) : undefined,
    };
  }
  return {
    actorId: String(u.id || "unknown"),
    actorRole: String(u.role || "unknown"),
    impersonated: false,
  };
}
