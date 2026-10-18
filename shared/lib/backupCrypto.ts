/**
 * Backup encryption helpers (client-side).
 *
 * Method used in Bizora:
 *   - Key derivation: PBKDF2-SHA-256 (150k iterations) from user passphrase + random salt
 *   - Cipher: AES-256-GCM (authenticated encryption)
 *   - Payload stored as base64: salt | iv | ciphertext+tag
 *
 * Alternatives (not used here, for reference):
 *   - AES-256-CBC + HMAC (encrypt-then-MAC) — more moving parts
 *   - ChaCha20-Poly1305 — great on mobile; Web Crypto support varies
 *   - Server-side envelope encryption (KMS) — best for SaaS multi-tenant at rest
 *   - Password-only XOR / weak ciphers — do not use
 */

export type EncryptedBlob = {
  v: 1;
  alg: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 ciphertext includes GCM tag
};

const ITERATIONS = 150_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 256;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (typeof btoa !== 'undefined') {
    let s = '';
    bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s);
  }
  return Buffer.from(bytes).toString('base64');
}

function b64decode(s: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(s, 'base64'));
}

function getSubtle(): SubtleCrypto {
  const c = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (!c?.subtle) {
    throw new Error('Web Crypto API not available — cannot encrypt backups in this environment');
  }
  return c.subtle as SubtleCrypto;
}

function randomBytes(n: number): Uint8Array {
  const c = (globalThis as any).crypto;
  const out = new Uint8Array(n);
  if (c?.getRandomValues) c.getRandomValues(out);
  else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iter = ITERATIONS): Promise<CryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt JSON-serializable backup body with a passphrase. */
export async function encryptBackupPayload(
  data: unknown,
  passphrase: string
): Promise<EncryptedBlob> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Backup passphrase must be at least 6 characters');
  }
  const subtle = getSubtle();
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = await deriveKey(passphrase, salt);
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return {
    v: 1,
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iter: ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
  };
}

/** Decrypt blob produced by encryptBackupPayload. */
export async function decryptBackupPayload(
  blob: EncryptedBlob,
  passphrase: string
): Promise<unknown> {
  if (!blob || blob.v !== 1 || blob.alg !== 'AES-GCM-256') {
    throw new Error('Unsupported encrypted backup format');
  }
  const subtle = getSubtle();
  const salt = b64decode(blob.salt);
  const iv = b64decode(blob.iv);
  const ct = b64decode(blob.ct);
  const key = await deriveKey(passphrase, salt, blob.iter || ITERATIONS);
  try {
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('Wrong passphrase or corrupted backup');
  }
}

export function isEncryptedBlob(x: unknown): x is EncryptedBlob {
  return !!x && typeof x === 'object' && (x as any).v === 1 && (x as any).alg === 'AES-GCM-256' && !!(x as any).ct;
}

export const BACKUP_CRYPTO_INFO = {
  primary: {
    name: 'AES-256-GCM + PBKDF2-SHA256',
    why: 'Authenticated encryption; passphrase never sent to server; detects tampering.',
  },
  alternatives: [
    { name: 'AES-256-CBC + HMAC-SHA256', note: 'Valid if encrypt-then-MAC; prefer GCM when available.' },
    { name: 'ChaCha20-Poly1305', note: 'Strong on mobile; check Web Crypto support.' },
    { name: 'Server KMS envelope (AES DEK + KMS-wrapped key)', note: 'Best multi-tenant cloud at-rest; needs key management.' },
    { name: 'TLS only (no client encrypt)', note: 'Protects in transit only; operator can read payloads.' },
  ],
  notRecommended: ['XOR', 'Base64-only', 'Client MD5 “encryption”', 'Hardcoded shared key in app bundle'],
};
