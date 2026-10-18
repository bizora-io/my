/**
 * Cloud-first backup with local fallback + multi-device conflict awareness.
 *
 * Priority:
 *  1. Try cloud (when online + authenticated)
 *  2. Always keep a local rolling snapshot
 *  3. On restore: compare revision / deviceId to avoid silent clobber
 */

export type BackupPayload = Record<string, unknown> & {
  version?: number;
  exportedAt?: string;
  meta?: BackupMeta;
};

export type BackupMeta = {
  businessId: string;
  deviceId: string;
  deviceLabel?: string;
  revision: number;
  contentHash: string;
  exportedAt: string;
  source: 'manual' | 'auto' | 'local' | 'cloud' | string;
  /** True when payload body is EncryptedBlob */
  encrypted?: boolean;
  crypto?: 'AES-GCM-256';
};

export type LocalBackupEnvelope = {
  at: string;
  meta: BackupMeta;
  data: BackupPayload;
};

export type ConflictInfo = {
  hasConflict: boolean;
  reason?: string;
  local?: BackupMeta;
  incoming?: BackupMeta;
  /** Prefer 'incoming' if remote revision higher; 'local' if local newer */
  suggestion: 'incoming' | 'local' | 'merge' | 'ask';
};

const DEVICE_KEY = 'bizora_device_id';
const REVISION_KEY = (businessId: string) => `bizora_backup_revision_${businessId}`;
const LOCAL_BACKUP_KEY = (businessId: string) => `bizora_local_backup_${businessId}`;
const LOCAL_HISTORY_KEY = (businessId: string) => `bizora_local_backup_history_${businessId}`;
const PENDING_CLOUD_KEY = (businessId: string) => `bizora_backup_pending_cloud_${businessId}`;

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-tmp-${Date.now()}`;
  }
}

export function getDeviceLabel(): string {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const short = nav.slice(0, 48) || 'unknown-device';
    return short;
  } catch {
    return 'unknown-device';
  }
}

export function getBackupRevision(businessId: string): number {
  try {
    return Math.max(0, Number(localStorage.getItem(REVISION_KEY(businessId))) || 0);
  } catch {
    return 0;
  }
}

export function bumpBackupRevision(businessId: string): number {
  const next = getBackupRevision(businessId) + 1;
  try {
    localStorage.setItem(REVISION_KEY(businessId), String(next));
  } catch { /* ignore */ }
  return next;
}

/** Simple stable hash for conflict detection (not cryptographic). */
export function contentHash(payload: unknown): string {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function wrapBackupPayload(
  data: Record<string, unknown>,
  opts: { businessId: string; source: string }
): BackupPayload {
  const revision = bumpBackupRevision(opts.businessId);
  const exportedAt = new Date().toISOString();
  const version = typeof data.version === 'number' ? data.version : 2;
  const body = { ...data, version, exportedAt };
  const meta: BackupMeta = {
    businessId: opts.businessId,
    deviceId: getOrCreateDeviceId(),
    deviceLabel: getDeviceLabel(),
    revision,
    contentHash: contentHash(body),
    exportedAt,
    source: opts.source,
  };
  return { ...body, meta };
}

/** Async wrap with optional AES-GCM encryption of the data body. */
export async function wrapBackupPayloadSecure(
  data: Record<string, unknown>,
  opts: { businessId: string; source: string; passphrase?: string }
): Promise<BackupPayload> {
  const base = wrapBackupPayload(data, opts);
  if (!opts.passphrase) return base;
  const { encryptBackupPayload } = await import('./backupCrypto.ts');
  const { meta, ...rest } = base;
  const blob = await encryptBackupPayload(rest, opts.passphrase);
  const secureMeta: BackupMeta = {
    ...meta!,
    encrypted: true,
    crypto: 'AES-GCM-256',
    contentHash: contentHash(blob),
  };
  return { encrypted: true, blob, meta: secureMeta, version: 2, exportedAt: secureMeta.exportedAt };
}

export function saveLocalBackup(
  businessId: string,
  payload: BackupPayload,
  keepHistory = 5
): LocalBackupEnvelope {
  const meta = payload.meta || {
    businessId,
    deviceId: getOrCreateDeviceId(),
    revision: getBackupRevision(businessId),
    contentHash: contentHash(payload),
    exportedAt: new Date().toISOString(),
    source: 'local',
  };
  const envelope: LocalBackupEnvelope = {
    at: meta.exportedAt,
    meta,
    data: payload,
  };
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY(businessId), JSON.stringify(envelope));
    const histRaw = localStorage.getItem(LOCAL_HISTORY_KEY(businessId));
    let hist: LocalBackupEnvelope[] = [];
    if (histRaw) {
      try { hist = JSON.parse(histRaw); } catch { hist = []; }
    }
    hist.unshift(envelope);
    hist = hist.slice(0, Math.max(1, keepHistory));
    localStorage.setItem(LOCAL_HISTORY_KEY(businessId), JSON.stringify(hist));
  } catch (e) {
    console.warn('Local backup storage failed (quota?)', e);
  }
  return envelope;
}

export function readLocalBackup(businessId: string): LocalBackupEnvelope | null {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY(businessId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function listLocalBackupHistory(businessId: string): LocalBackupEnvelope[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY(businessId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function detectBackupConflict(
  localMeta: BackupMeta | undefined | null,
  incomingMeta: BackupMeta | undefined | null
): ConflictInfo {
  if (!localMeta || !incomingMeta) {
    return { hasConflict: false, suggestion: incomingMeta ? 'incoming' : 'local' };
  }
  if (localMeta.contentHash === incomingMeta.contentHash) {
    return { hasConflict: false, local: localMeta, incoming: incomingMeta, suggestion: 'incoming' };
  }
  // Same device sequential → prefer higher revision
  if (localMeta.deviceId === incomingMeta.deviceId) {
    const suggestion = incomingMeta.revision >= localMeta.revision ? 'incoming' : 'local';
    return {
      hasConflict: incomingMeta.revision !== localMeta.revision,
      reason: 'same_device_revision_diff',
      local: localMeta,
      incoming: incomingMeta,
      suggestion,
    };
  }
  // Different devices with different content
  const localTime = Date.parse(localMeta.exportedAt) || 0;
  const inTime = Date.parse(incomingMeta.exportedAt) || 0;
  let suggestion: ConflictInfo['suggestion'] = 'ask';
  if (incomingMeta.revision > localMeta.revision && inTime >= localTime) suggestion = 'incoming';
  else if (localMeta.revision > incomingMeta.revision && localTime >= inTime) suggestion = 'local';
  else suggestion = 'ask';

  return {
    hasConflict: true,
    reason: 'multi_device_divergence',
    local: localMeta,
    incoming: incomingMeta,
    suggestion,
  };
}

export type BackupRunResult = {
  ok: boolean;
  mode: 'cloud' | 'local';
  message: string;
  messageBn: string;
  meta?: BackupMeta;
  cloudError?: string;
};

/**
 * Cloud-first backup: try remote POST, always write local.
 * `cloudPost` should throw or return { ok, error }.
 */
export async function runPriorityBackup(opts: {
  businessId: string;
  getData: () => Record<string, unknown>;
  source?: string;
  keepLocalHistory?: number;
  cloudPost?: (payload: BackupPayload) => Promise<{ ok: boolean; error?: string }>;
  isOnline?: () => boolean;
  /** Optional client-side AES-GCM passphrase (never sent as plaintext) */
  passphrase?: string;
}): Promise<BackupRunResult> {
  const source = opts.source || 'manual';
  const payload = await wrapBackupPayloadSecure(opts.getData(), {
    businessId: opts.businessId,
    source,
    passphrase: opts.passphrase,
  });
  const online = opts.isOnline ? opts.isOnline() : (typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (online && opts.cloudPost) {
    try {
      const res = await opts.cloudPost(payload);
      if (res.ok) {
        saveLocalBackup(opts.businessId, payload, opts.keepLocalHistory ?? 5);
        markPendingCloudSync(opts.businessId, false);
        return {
          ok: true,
          mode: 'cloud',
          message: 'Backup saved to cloud (local mirror kept).',
          messageBn: 'ক্লাউডে ব্যাকআপ সেভ হয়েছে (লোকাল কপিও রাখা হয়েছে)।',
          meta: payload.meta,
        };
      }
      saveLocalBackup(opts.businessId, { ...payload, meta: { ...payload.meta!, source: 'local' } }, opts.keepLocalHistory ?? 5);
      markPendingCloudSync(opts.businessId, true);
      return {
        ok: true,
        mode: 'local',
        message: `Cloud failed (${res.error || 'error'}); saved local backup instead.`,
        messageBn: `ক্লাউড ব্যর্থ (${res.error || 'error'}); লোকাল ব্যাকআপ সেভ হয়েছে।`,
        meta: payload.meta,
        cloudError: res.error,
      };
    } catch (e: any) {
      saveLocalBackup(opts.businessId, { ...payload, meta: { ...payload.meta!, source: 'local' } }, opts.keepLocalHistory ?? 5);
      markPendingCloudSync(opts.businessId, true);
      return {
        ok: true,
        mode: 'local',
        message: `Offline/network error; local backup saved.`,
        messageBn: 'নেটওয়ার্ক নেই; লোকাল ব্যাকআপ সেভ হয়েছে।',
        meta: payload.meta,
        cloudError: e?.message || String(e),
      };
    }
  }

  saveLocalBackup(opts.businessId, { ...payload, meta: { ...payload.meta!, source: 'local' } }, opts.keepLocalHistory ?? 5);
  markPendingCloudSync(opts.businessId, true);
  return {
    ok: true,
    mode: 'local',
    message: 'No network — local backup saved.',
    messageBn: 'নেট নেই — লোকাল ব্যাকআপ সেভ হয়েছে।',
    meta: payload.meta,
  };
}

export function markPendingCloudSync(businessId: string, pending: boolean) {
  try {
    if (pending) localStorage.setItem(PENDING_CLOUD_KEY(businessId), new Date().toISOString());
    else localStorage.removeItem(PENDING_CLOUD_KEY(businessId));
  } catch { /* ignore */ }
}

export function isPendingCloudSync(businessId: string): boolean {
  try {
    return !!localStorage.getItem(PENDING_CLOUD_KEY(businessId));
  } catch {
    return false;
  }
}

const FLUSH_COOLDOWN_KEY = (businessId: string) => `bizora_backup_flush_cooldown_${businessId}`;

export function isFlushInCooldown(businessId: string): boolean {
  try {
    const raw = localStorage.getItem(FLUSH_COOLDOWN_KEY(businessId));
    if (!raw) return false;
    return Date.now() < Number(raw);
  } catch {
    return false;
  }
}

export function setFlushCooldown(businessId: string, durationMs = 60_000) {
  try {
    localStorage.setItem(FLUSH_COOLDOWN_KEY(businessId), String(Date.now() + durationMs));
  } catch { /* ignore */ }
}

/** When back online: upload latest local envelope to cloud if pending. */
export async function flushPendingCloudBackup(opts: {
  businessId: string;
  cloudPost: (payload: BackupPayload) => Promise<{ ok: boolean; error?: string }>;
}): Promise<{ flushed: boolean; message: string }> {
  if (!isPendingCloudSync(opts.businessId)) {
    return { flushed: false, message: 'No pending cloud sync' };
  }
  if (isFlushInCooldown(opts.businessId)) {
    return { flushed: false, message: 'Sync in cooldown; backing off' };
  }
  const local = readLocalBackup(opts.businessId);
  if (!local?.data) {
    markPendingCloudSync(opts.businessId, false);
    return { flushed: false, message: 'No local backup to flush' };
  }
  try {
    const res = await opts.cloudPost(local.data);
    if (res.ok) {
      markPendingCloudSync(opts.businessId, false);
      try { localStorage.removeItem(FLUSH_COOLDOWN_KEY(opts.businessId)); } catch { /* */ }
      return { flushed: true, message: 'Pending local backup synced to cloud.' };
    }
    // If payload too large (413), clear pending sync so we never loop infinitely!
    const errLower = String(res.error || '').toLowerCase();
    if (errLower.includes('too large') || errLower.includes('413') || errLower.includes('payload too large')) {
      markPendingCloudSync(opts.businessId, false);
      return { flushed: false, message: 'Local backup is too large for cloud sync; preserved locally.' };
    }
    setFlushCooldown(opts.businessId, 60_000);
    return { flushed: false, message: res.error || 'Cloud flush failed' };
  } catch (e: any) {
    setFlushCooldown(opts.businessId, 60_000);
    return { flushed: false, message: e?.message || 'Flush error' };
  }
}

export function extractMetaFromPayload(data: any): BackupMeta | null {
  if (!data) return null;
  if (data.meta && data.meta.revision != null) return data.meta as BackupMeta;
  if (data.data?.meta) return data.data.meta as BackupMeta;
  return null;
}

export type IntegrityResult = {
  ok: boolean;
  reason: string;
  reasonBn: string;
  expectedHash?: string;
  actualHash?: string;
  encrypted?: boolean;
  revision?: number;
  deviceId?: string;
  exportedAt?: string;
};

/**
 * Verify contentHash over the payload body (excluding meta.hash itself).
 * For encrypted payloads, hash is over the ciphertext blob.
 */
export function verifyBackupIntegrity(payload: any): IntegrityResult {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      reason: 'Invalid backup payload',
      reasonBn: 'ব্যাকআপ ডেটা অবৈধ',
    };
  }
  const meta = extractMetaFromPayload(payload) || payload.meta;
  if (!meta?.contentHash) {
    return {
      ok: true,
      reason: 'No contentHash present — skipped strict verify (legacy backup)',
      reasonBn: 'পুরনো ব্যাকআপে hash নেই — স্কিপ',
      encrypted: !!(meta?.encrypted || payload.encrypted),
      revision: meta?.revision,
      deviceId: meta?.deviceId,
      exportedAt: meta?.exportedAt,
    };
  }

  let bodyForHash: unknown;
  if (payload.encrypted && payload.blob) {
    bodyForHash = payload.blob;
  } else {
    const { meta: _m, ...rest } = payload;
    bodyForHash = rest;
  }
  const actual = contentHash(bodyForHash);
  const expected = String(meta.contentHash);
  if (actual !== expected) {
    return {
      ok: false,
      reason: 'Integrity check failed — backup may be corrupted or tampered',
      reasonBn: 'ইন্টিগ্রিটি ব্যর্থ — ব্যাকআপ ক্ষতিগ্রস্ত বা পরিবর্তিত হতে পারে',
      expectedHash: expected,
      actualHash: actual,
      encrypted: !!(meta.encrypted || payload.encrypted),
      revision: meta.revision,
      deviceId: meta.deviceId,
      exportedAt: meta.exportedAt,
    };
  }
  return {
    ok: true,
    reason: 'Integrity OK',
    reasonBn: 'ইন্টিগ্রিটি ঠিক আছে',
    expectedHash: expected,
    actualHash: actual,
    encrypted: !!(meta.encrypted || payload.encrypted),
    revision: meta.revision,
    deviceId: meta.deviceId,
    exportedAt: meta.exportedAt,
  };
}
