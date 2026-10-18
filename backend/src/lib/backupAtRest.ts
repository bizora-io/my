/**
 * Server-side at-rest encryption for cloud backup payloads.
 * AES-256-GCM with key from BACKUP_AT_REST_KEY (32-byte hex or any string → SHA-256).
 * When env is unset, stores plaintext (dev mode) and sets encrypted: false.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "bizora-b64:";

function getKey(): Buffer | null {
  const raw = process.env.BACKUP_AT_REST_KEY || process.env.BACKUP_ENCRYPTION_KEY || "";
  if (!raw.trim()) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    return Buffer.from(raw.trim(), "hex");
  }
  return createHash("sha256").update(raw).digest();
}

export function isAtRestEnabled(): boolean {
  return getKey() !== null;
}

/** Encrypt UTF-8 payload string → storable string */
export function encryptAtRest(plain: string): { stored: string; encrypted: boolean } {
  const key = getKey();
  if (!key) return { stored: plain, encrypted: false };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString("base64");
  return { stored: PREFIX + packed, encrypted: true };
}

/** Decrypt stored value; passthrough if not encrypted prefix */
export function decryptAtRest(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) {
    throw new Error("Backup is encrypted at rest but BACKUP_AT_REST_KEY is not configured on this server");
  }
  const packed = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const data = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isStoredEncrypted(stored: unknown): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}
