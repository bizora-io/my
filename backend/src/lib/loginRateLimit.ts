/**
 * In-memory login rate limiter (per process).
 * Keyed by IP + optional identifier so spraying one account is limited.
 *
 * Env:
 *   LOGIN_RATE_WINDOW_MS   default 15 minutes
 *   LOGIN_RATE_MAX_ATTEMPTS default 8 failures per window
 *   LOGIN_RATE_LOCK_MS     extra lock after max (default = window)
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  lockedUntil?: number;
};

type Bucket = {
  failures: number;
  windowStart: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = Math.max(60_000, Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000);
const MAX_ATTEMPTS = Math.max(3, Number(process.env.LOGIN_RATE_MAX_ATTEMPTS) || 8);
const LOCK_MS = Math.max(60_000, Number(process.env.LOGIN_RATE_LOCK_MS) || WINDOW_MS);

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.lockedUntil < now && b.windowStart + WINDOW_MS < now) buckets.delete(k);
  }
}

export function rateLimitKey(ip: string, identifier?: string): string {
  const id = (identifier || "").toString().trim().toLowerCase().slice(0, 120);
  return `${ip || "unknown"}|${id}`;
}

/** Check before attempting auth. */
export function checkLoginRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSec: 0 };
  }
  if (b.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000),
      lockedUntil: b.lockedUntil,
    };
  }
  if (now - b.windowStart > WINDOW_MS) {
    buckets.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSec: 0 };
  }
  if (b.failures >= MAX_ATTEMPTS) {
    b.lockedUntil = now + LOCK_MS;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(LOCK_MS / 1000),
      lockedUntil: b.lockedUntil,
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - b.failures),
    retryAfterSec: 0,
  };
}

/** Call after a failed login. */
export function recordLoginFailure(key: string): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { failures: 0, windowStart: now, lockedUntil: 0 };
  }
  b.failures += 1;
  if (b.failures >= MAX_ATTEMPTS) {
    b.lockedUntil = now + LOCK_MS;
  }
  buckets.set(key, b);
  return checkLoginRateLimit(key);
}

/** Call after successful login — clears the bucket. */
export function clearLoginFailures(key: string): void {
  buckets.delete(key);
}

export function loginRateLimitConfig() {
  return { WINDOW_MS, MAX_ATTEMPTS, LOCK_MS };
}
