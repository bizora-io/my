import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission, forbidImpersonation } from "./middleware/auth.js";
import { encryptAtRest, decryptAtRest, isAtRestEnabled, isStoredEncrypted } from "../lib/backupAtRest.js";
import { exportFullTenant } from "../lib/fullTenantExport.js";

const router = express.Router();
router.use(authenticateToken, requireBusinessContext);

// Firestore doc limit is 1 MiB in production, relaxed in dev/resilientDb mode
const MAX_PAYLOAD_CHARS = process.env.NODE_ENV === "production" ? 950_000 : 3_500_000;
const DEFAULT_KEEP = 10;

function col(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("backups");
}

async function pruneOld(businessId: string, keep: number) {
  try {
    const snap = await col(businessId).orderBy("createdAt", "desc").get();
    const docs = snap?.docs || [];
    if (docs.length <= keep) return;
    const toDelete = docs.slice(keep);
    for (const d of toDelete) {
      if (d.ref && typeof d.ref.delete === "function") {
        await d.ref.delete().catch(() => {});
      } else if (d.id) {
        await col(businessId).doc(d.id).delete().catch(() => {});
      }
    }
  } catch (err) {
    console.warn("[backups] pruneOld failed non-fatally:", err);
  }
}

// GET /api/backups — metadata only (no full payload)
router.get("/", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await col(businessId).orderBy("createdAt", "desc").limit(50).get();
    const backups = snap.docs.map((d) => {
      const data = d.data();
      const { payload, ...restMeta } = data;
      return {
        id: d.id,
        ...restMeta,
        sizeBytes: typeof payload === "string" ? payload.length : 0,
        atRestEncrypted: isStoredEncrypted(payload) || !!restMeta.atRestEncrypted,
        serverAtRestEnabled: isAtRestEnabled(),
      };
    });
    res.json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/backups/latest-meta — newest cloud backup metadata (for multi-device check)
router.get("/latest-meta", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await col(businessId).orderBy("createdAt", "desc").limit(1).get();
    if (snap.empty) return res.json({ meta: null });
    const data = snap.docs[0].data();
    const { payload, ...rest } = data;
    res.json({
      id: snap.docs[0].id,
      meta: data.meta || {
        deviceId: data.deviceId,
        revision: data.revision,
        contentHash: data.contentHash,
        exportedAt: data.createdAt,
        source: data.source,
        businessId,
      },
      createdAt: data.createdAt,
      label: data.label,
      sizeChars: data.sizeChars,
    });
  } catch (error) {
    console.error("latest-meta error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// GET /api/backups/online-status — ensure at least one online backup exists; report coverage
router.get("/online-status", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await col(businessId).orderBy("createdAt", "desc").limit(20).get().catch(() => col(businessId).limit(20).get());
    const items = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        source: data.source,
        createdAt: data.createdAt,
        sizeChars: data.sizeChars,
        kind: data.meta?.kind || (String(data.source || "").includes("full") ? "full-tenant" : "client"),
        atRestEncrypted: !!data.atRestEncrypted,
      };
    });
    const hasOnline = items.length > 0;
    const hasFull = items.some((i) => i.kind === "full-tenant" || i.source === "server-export-full");
    res.json({
      hasOnlineBackup: hasOnline,
      hasFullFirestoreExport: hasFull,
      serverAtRestEnabled: isAtRestEnabled(),
      count: items.length,
      latest: items[0] || null,
      backups: items,
      recommendation: !hasOnline
        ? "No online backup yet — run POST /api/backups/export-full or Settings → Cloud backup"
        : !hasFull
          ? "Client backups exist; run export-full once so all Firestore collections are covered online"
          : "Online backup OK",
    });
  } catch (error) {
    console.error("online-status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/backups/:id — full snapshot including payload
router.get("/:id", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const doc = await col(businessId).doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: "Backup not found" });
    const data = doc.data() || {};
    let payload = data.payload;
    try {
      if (typeof payload === "string") payload = decryptAtRest(payload);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Failed to decrypt backup at rest" });
    }
    // Parse JSON string back so client gets object when original was object-serialized
    let payloadOut: unknown = payload;
    try {
      payloadOut = JSON.parse(payload as string);
    } catch {
      payloadOut = payload;
    }
    res.json({
      backup: {
        id: doc.id,
        ...data,
        payload: payloadOut,
        atRestEncrypted: isStoredEncrypted(data.payload),
      },
    });
  } catch (error) {
    console.error("Get backup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/backups/export-full — server builds snapshot from ALL Firestore tenant data (online-safe)
router.post("/export-full", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const full = await exportFullTenant(businessId);
    const payloadStr = JSON.stringify(full);
    if (payloadStr.length > MAX_PAYLOAD_CHARS) {
      return res.status(413).json({
        error: `Full export too large (${payloadStr.length} chars). Archive old transactions first.`,
        maxChars: MAX_PAYLOAD_CHARS,
        counts: full.counts,
      });
    }
    const id = `bk-full-${Date.now()}`;
    const sealed = encryptAtRest(payloadStr);
    const record = {
      id,
      label: req.body?.label || `Full Firestore export ${new Date().toISOString().slice(0, 16)}`,
      source: "server-export-full",
      createdAt: new Date().toISOString(),
      payload: sealed.stored,
      sizeChars: payloadStr.length,
      atRestEncrypted: sealed.encrypted,
      meta: {
        kind: "full-tenant",
        businessId,
        counts: full.counts,
        exportedAt: full.exportedAt,
      },
    };
    await col(businessId).doc(id).set(record);
    await pruneOld(businessId, Math.min(Math.max(Number(req.body?.keep) || DEFAULT_KEEP, 1), 30));
    const { payload: _p, ...metaOut } = record;
    res.status(201).json({
      backup: metaOut,
      counts: full.counts,
      serverAtRestEnabled: isAtRestEnabled(),
      message: "All tenant collections exported to online cloud backup",
    });
  } catch (error) {
    console.error("export-full error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/backups — create snapshot { payload: object|string, label?, source? }
router.post("/", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { payload, label, source, keep, meta: bodyMeta, deviceId, revision, contentHash } = req.body || {};
    if (payload === undefined || payload === null) {
      return res.status(400).json({ error: "payload is required" });
    }
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (payloadStr.length > MAX_PAYLOAD_CHARS) {
      return res.status(413).json({
        error: `Backup too large (${payloadStr.length} chars). Download a local JSON backup instead, or archive old transactions first.`,
        maxChars: MAX_PAYLOAD_CHARS,
      });
    }
    const id = `bk-${Date.now()}`;
    const payloadMeta = typeof payload === "object" && payload && (payload as any).meta
      ? (payload as any).meta
      : null;
    const sealed = encryptAtRest(payloadStr);
    const record = {
      id,
      label: label || `Auto backup ${new Date().toISOString().slice(0, 16)}`,
      source: source || "manual",
      createdAt: new Date().toISOString(),
      payload: sealed.stored,
      sizeChars: payloadStr.length,
      atRestEncrypted: sealed.encrypted,
      deviceId: deviceId || payloadMeta?.deviceId || null,
      revision: revision ?? payloadMeta?.revision ?? null,
      contentHash: contentHash || payloadMeta?.contentHash || null,
      meta: bodyMeta || payloadMeta || null,
    };
    await col(businessId).doc(id).set(record);
    await pruneOld(businessId, Math.min(Math.max(Number(keep) || DEFAULT_KEEP, 1), 30));
    const { payload: _p, ...metaOut } = record;
    res.status(201).json({ backup: metaOut, serverAtRestEnabled: isAtRestEnabled() });
  } catch (error) {
    console.error("Create backup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/backups/:id
router.delete("/:id", forbidImpersonation, requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    await col(businessId).doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete backup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;
