import type { Request, Response, NextFunction } from "express";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  rateLimitKey,
  loginRateLimitConfig,
} from "../../lib/loginRateLimit.js";

export function clientIp(req: Request): string {
  const xf = (req.headers["x-forwarded-for"] as string) || "";
  if (xf) return xf.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/** Reject early if this IP+identifier is locked. Attach helpers on res.locals. */
export function loginRateLimitGuard(req: Request, res: Response, next: NextFunction) {
  const identifier =
    (req.body?.identifier as string) ||
    (req.body?.email as string) ||
    (req.body?.mobile as string) ||
    (req.body?.phone as string) ||
    "";
  const key = rateLimitKey(clientIp(req), identifier);
  const status = checkLoginRateLimit(key);
  res.locals.loginRateKey = key;
  res.locals.loginRateStatus = status;
  if (!status.allowed) {
    res.setHeader("Retry-After", String(status.retryAfterSec));
    return res.status(429).json({
      error: "too_many_attempts",
      message: `Too many failed login attempts. Try again in ${status.retryAfterSec} seconds.`,
      retryAfterSec: status.retryAfterSec,
      ...loginRateLimitConfig(),
    });
  }
  next();
}

export function markLoginFailed(res: Response) {
  const key = res.locals.loginRateKey as string | undefined;
  if (!key) return checkLoginRateLimit("unknown");
  return recordLoginFailure(key);
}

export function markLoginSuccess(res: Response) {
  const key = res.locals.loginRateKey as string | undefined;
  if (key) clearLoginFailures(key);
}
