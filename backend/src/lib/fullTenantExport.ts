/**
 * Export all Firestore data for one tenant business into a single JSON snapshot
 * suitable for cloud backup (online) storage.
 */
import { getDb } from "./firebaseAdmin.js";
import { TENANT_SUBCOLLECTIONS } from "./dbSchema.js";

const SUBS = TENANT_SUBCOLLECTIONS.map((c) => c.name).filter((n) => n !== "settings" && n !== "backups");

export async function exportFullTenant(businessId: string): Promise<{
  version: number;
  exportedAt: string;
  businessId: string;
  business: Record<string, unknown> | null;
  collections: Record<string, any[]>;
  counts: Record<string, number>;
}> {
  const db = getDb();
  const bizRef = db.collection("businesses").doc(businessId);
  const bizDoc = await bizRef.get();
  let business: Record<string, unknown> | null = null;
  if (bizDoc.exists) {
    const data = bizDoc.data() || {};
    const { passwordHash, ...rest } = data as any;
    business = { id: bizDoc.id, ...rest };
  }

  const collections: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  // Parallel-ish sequential to avoid overwhelming Firestore
  for (const name of SUBS) {
    try {
      const snap = await bizRef.collection(name).get();
      collections[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      counts[name] = collections[name].length;
    } catch (e) {
      collections[name] = [];
      counts[name] = 0;
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    businessId,
    business,
    collections,
    counts,
  };
}

/** Platform-level snapshot (metadata of all shops + key platform cols) */
export async function exportPlatformSnapshot(): Promise<{
  version: number;
  exportedAt: string;
  businesses: any[];
  platform: Record<string, any[]>;
}> {
  const db = getDb();
  const bizSnap = await db.collection("businesses").get();
  const businesses = bizSnap.docs.map((d) => {
    const data = d.data() || {};
    const { passwordHash, ...rest } = data as any;
    return { id: d.id, ...rest };
  });

  const platformNames = [
    "saasTickets",
    "announcements",
    "saasAlerts",
    "revenuePayments",
    "mrrSnapshots",
    "auditLogs",
  ];
  const platform: Record<string, any[]> = {};
  for (const name of platformNames) {
    try {
      const snap = await db.collection(name).limit(500).get();
      platform[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      platform[name] = [];
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    businesses,
    platform,
  };
}
