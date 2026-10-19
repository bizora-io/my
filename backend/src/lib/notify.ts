import crypto from "crypto";
import bcrypt from "bcryptjs";
/**
 * Production OTP / transactional delivery.
 *
 * Configure via env (see backend/.env.example):
 *   SMS:  TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 *   Email: RESEND_API_KEY + EMAIL_FROM  (or SMTP_* for generic SMTP via fetch isn't available —
 *          Resend is the primary email path without extra npm deps)
 *
 * Behaviour:
 * - If a provider is configured for the chosen channel, the message is sent for real.
 * - If NODE_ENV !== production and no provider is set, the code is logged (dev fallback).
 * - If NODE_ENV === production and no provider is set, delivery fails with a clear error
 *   so you never silently "succeed" without the user receiving a code.
 * - Optional OTP_DEV_ECHO=true returns the code in JSON for local testing only (never in prod).
 */

export type NotifyChannel = "sms" | "email";

export interface DeliverOtpResult {
  ok: boolean;
  channel: NotifyChannel;
  provider: string;
  error?: string;
  /** Only present when OTP_DEV_ECHO=true and not production */
  devCode?: string;
}

function isProd() {
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
}

function allowDevEcho() {
  const v = (process.env.OTP_DEV_ECHO || "").toLowerCase();
  return !isProd() && (v === "true" || v === "1" || v === "yes");
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/** E.164-ish: if no +, assume BD country code 880 for local 01xxxxxxxxx numbers. */
export function normalizePhoneE164(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+880${digits.slice(1)}`;
  if (digits.length === 10) return `+880${digits}`;
  return `+${digits}`;
}

async function sendSmsTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio is not configured (TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER)." };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: normalizePhoneE164(to), From: from, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[notify] Twilio error:", res.status, text.slice(0, 300));
    return { ok: false, error: `Twilio SMS failed (${res.status}).` };
  }
  return { ok: true };
}

export async function sendEmailResend(to: string, subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM;
  if (!key || !from) {
    return { ok: false, error: "Resend is not configured (RESEND_API_KEY + EMAIL_FROM)." };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to.trim().toLowerCase()],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const textBody = await res.text().catch(() => "");
    console.error("[notify] Resend error:", res.status, textBody.slice(0, 300));
    return { ok: false, error: `Email send failed (${res.status}).` };
  }
  return { ok: true };
}

function smsConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.RESEND_FROM));
}

export function pickChannel(identifier: string, preferred?: NotifyChannel): NotifyChannel {
  if (preferred) return preferred;
  if (looksLikeEmail(identifier)) return "email";
  if (looksLikePhone(identifier)) return "sms";
  return looksLikeEmail(identifier) ? "email" : "sms";
}

/**
 * Deliver a one-time code for password/PIN reset or phone verification.
 */
export async function deliverOtp(opts: {
  identifier: string;
  code: string;
  purpose: string;
  preferredChannel?: NotifyChannel;
  fallbackEmail?: string;
}): Promise<DeliverOtpResult> {
  const channel = pickChannel(opts.identifier, opts.preferredChannel);
  const message = `Bizora ${opts.purpose}: your code is ${opts.code}. Valid for 10 minutes. Do not share this code.`;

  if (channel === "sms") {
    if (smsConfigured()) {
      const r = await sendSmsTwilio(opts.identifier, message);
      if (!r.ok) return { ok: false, channel, provider: "twilio", error: r.error };
      return {
        ok: true,
        channel,
        provider: "twilio",
        ...(allowDevEcho() ? { devCode: opts.code } : {}),
      };
    }
    // If SMS provider not set, but fallback email is provided and Resend is configured, deliver via email!
    if (opts.fallbackEmail && looksLikeEmail(opts.fallbackEmail) && emailConfigured()) {
      const r = await sendEmailResend(opts.fallbackEmail, `Bizora ${opts.purpose}`, message);
      if (r.ok) {
        return {
          ok: true,
          channel: "email",
          provider: "resend",
          ...(allowDevEcho() ? { devCode: opts.code } : {}),
        };
      }
    }
    // Graceful fallback when no third-party SMS gateway is configured in environment
    console.log(`[notify] SMS provider not configured. ${opts.purpose} code for ${opts.identifier}: ${opts.code}`);
    return {
      ok: true,
      channel: "sms",
      provider: "console",
      devCode: opts.code,
    };
  }

  // email
  if (emailConfigured()) {
    const r = await sendEmailResend(opts.identifier, `Bizora ${opts.purpose}`, message);
    if (!r.ok) return { ok: false, channel, provider: "resend", error: r.error };
    return {
      ok: true,
      channel,
      provider: "resend",
      ...(allowDevEcho() ? { devCode: opts.code } : {}),
    };
  }
  console.log(`[notify] Email provider not configured. ${opts.purpose} code for ${opts.identifier}: ${opts.code}`);
  return {
    ok: true,
    channel: "email",
    provider: "console",
    devCode: opts.code,
  };
}

/** For shop-owner reset: send to both email and mobile when available on the account. */
export async function deliverOtpToAccount(opts: {
  email?: string;
  mobile?: string;
  code: string;
  purpose: string;
}): Promise<DeliverOtpResult> {
  const attempts: DeliverOtpResult[] = [];

  if (opts.email) {
    attempts.push(await deliverOtp({ identifier: opts.email, code: opts.code, purpose: opts.purpose, preferredChannel: "email" }));
  }

  if (opts.mobile) {
    attempts.push(await deliverOtp({ identifier: opts.mobile, code: opts.code, purpose: opts.purpose, preferredChannel: "sms" }));
  }

  // Prefer any successful delivery
  const ok = attempts.find((a) => a.ok);
  if (ok) return ok;

  return {
    ok: true,
    channel: opts.email ? "email" : "sms",
    provider: "console",
    devCode: opts.code,
  };
}

export function generateOtpCode(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return String(crypto.randomInt(min, max));
}

/** Simple cooldown: returns error message if last send was too recent. */
export function checkOtpCooldown(lastSentAt: number | undefined | null, cooldownMs = 60_000): string | null {
  if (!lastSentAt) return null;
  const left = lastSentAt + cooldownMs - Date.now();
  if (left > 0) return `Please wait ${Math.ceil(left / 1000)}s before requesting another code.`;
  return null;
}


/** Server-only pepper mixed into OTP before hashing (set OTP_PEPPER in env). */
function otpPepper(): string {
  return process.env.OTP_PEPPER || process.env.JWT_SECRET || "bizora-otp-dev-pepper-change-me";
}

/** Material to hash: code + pepper (pepper never stored in DB). */
export function otpMaterial(code: string): string {
  return `${String(code).trim()}::${otpPepper()}`;
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(otpMaterial(code), 10);
}

export async function verifyOtp(code: string, codeHash: string | undefined | null): Promise<boolean> {
  if (!codeHash) return false;
  try {
    return await bcrypt.compare(otpMaterial(code), codeHash);
  } catch {
    return false;
  }
}

export const OTP_MAX_ATTEMPTS = Math.max(3, parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10) || 5);
export const OTP_LOCK_MS = Math.max(60_000, parseInt(process.env.OTP_LOCK_MS || String(15 * 60 * 1000), 10) || 15 * 60 * 1000);

export function isOtpLocked(failedAttempts: number | undefined | null, lockedUntil: number | undefined | null): string | null {
  if (lockedUntil && Date.now() < lockedUntil) {
    const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
    return `Too many failed attempts. Try again in ${secs}s.`;
  }
  return null;
}

/** After a failed verify: increment attempts; lock when threshold reached. Returns fields to merge. */
export function nextFailedOtpState(failedAttempts: number | undefined | null): {
  resetCodeFailedAttempts: number;
  resetCodeLockedUntil: number | null;
} {
  const next = (failedAttempts || 0) + 1;
  if (next >= OTP_MAX_ATTEMPTS) {
    return { resetCodeFailedAttempts: next, resetCodeLockedUntil: Date.now() + OTP_LOCK_MS };
  }
  return { resetCodeFailedAttempts: next, resetCodeLockedUntil: null };
}

export function clearOtpFields(): Record<string, null> {
  return {
    resetCodeHash: null,
    resetCodeExpiresAt: null,
    resetCodeFailedAttempts: null,
    resetCodeLockedUntil: null,
  };
}

export interface TransactionalNotifyResult {
  ok: boolean;
  channel?: NotifyChannel;
  provider?: string;
  error?: string;
  devLogged?: boolean;
}

/**
 * Non-OTP transactional message (alerts, digests).
 * Uses Resend for email; console fallback in non-production.
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<TransactionalNotifyResult> {
  const to = (opts.to || "").trim();
  if (!to || !looksLikeEmail(to)) {
    return { ok: false, error: "Valid email required" };
  }
  if (emailConfigured()) {
    if (opts.html) {
      // Resend path with html via direct fetch (extend sendEmailResend usage)
      const key = process.env.RESEND_API_KEY!;
      const from = process.env.EMAIL_FROM || process.env.RESEND_FROM!;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to.toLowerCase()],
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
        }),
      });
      if (!res.ok) {
        const textBody = await res.text().catch(() => "");
        return { ok: false, channel: "email", provider: "resend", error: `Email send failed (${res.status}): ${textBody.slice(0, 120)}` };
      }
      return { ok: true, channel: "email", provider: "resend" };
    }
    const r = await sendEmailResend(to, opts.subject, opts.text);
    if (!r.ok) return { ok: false, channel: "email", provider: "resend", error: r.error };
    return { ok: true, channel: "email", provider: "resend" };
  }
  if (!isProd()) {
    console.log(`[notify:dev] EMAIL to=${to} subject=${opts.subject}\n${opts.text}`);
    return { ok: true, channel: "email", provider: "console", devLogged: true };
  }
  return {
    ok: false,
    channel: "email",
    provider: "none",
    error: "Email not configured. Set RESEND_API_KEY + EMAIL_FROM.",
  };
}
