import express from "express";
import crypto from "crypto";
import { getDb } from "../lib/firebaseAdmin.js";
import { loginRateLimitGuard } from "./middleware/loginRateLimit.js";
import {
  generateOtpCode,
  deliverOtp,
  hashOtp,
  verifyOtp,
  checkOtpCooldown,
  isOtpLocked,
  nextFailedOtpState,
} from "../lib/notify.js";
import { getJwtSecret } from "../lib/jwtSecret.js";

const router = express.Router();

function normalizeMobile(mobile: string): string {
  let digits = (mobile || "").replace(/\D/g, "");
  // Strip redundant leading zeroes
  digits = digits.replace(/^0+/, "");
  // If starts with 880880 (double country code from UI + code prefix)
  if (digits.startsWith("880880")) {
    digits = digits.slice(3);
  }
  // If starts with 88001 (country code + local 0)
  if (digits.startsWith("88001") && digits.length === 14) {
    digits = "880" + digits.slice(4);
  }
  // Standardize Bangladesh numbers: 10 digits starting with 1 -> prepend 880
  if (digits.length === 10 && digits.startsWith("1")) {
    digits = "880" + digits;
  }
  // Standardize 11 digits starting with 01 -> replace leading 0 with 880
  if (digits.length === 11 && digits.startsWith("01")) {
    digits = "880" + digits.slice(1);
  }
  return digits;
}

function getOtpSecret(): string {
  return getJwtSecret();
}

function signVerificationToken(payload: {
  docId: string;
  challengeId?: string;
  purpose?: string;
  codeHash: string;
  expiresAt: number;
  mobile: string;
}): string {
  const secret = getOtpSecret();
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

function verifyVerificationToken(token: string): {
  docId: string;
  challengeId?: string;
  purpose?: string;
  codeHash: string;
  expiresAt: number;
  mobile: string;
} | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, sig] = parts;
    if (!dataB64 || !sig) return null;
    const secret = getOtpSecret();
    const dataStr = Buffer.from(dataB64, "base64url").toString("utf8");
    const expectedSig = crypto.createHmac("sha256", secret).update(dataStr).digest("hex");

    // Constant-time comparison safe against buffer length mismatch
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(dataStr);
    if (Date.now() > Number(payload.expiresAt || 0)) return null;
    return payload;
  } catch {
    return null;
  }
}

function verificationsCollection() {
  return getDb().collection("phoneVerifications");
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Dev-friendly cooldown (15s). Production stays 60s. */
function otpCooldownMs(): number {
  if (!isProd()) {
    const n = parseInt(process.env.OTP_COOLDOWN_MS || "15000", 10);
    return Number.isFinite(n) && n >= 0 ? n : 15_000;
  }
  const n = parseInt(process.env.OTP_COOLDOWN_MS || "60000", 10);
  return Number.isFinite(n) && n >= 0 ? n : 60_000;
}

function skipCooldown(): boolean {
  if (isProd()) return false;
  const v = (process.env.OTP_SKIP_COOLDOWN || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

// POST /api/auth/phone-verify/request
router.post("/request", loginRateLimitGuard, async (req, res) => {
  try {
    const { mobile, email, purpose = "phone_verification" } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "mobile is required" });

    const docId = normalizeMobile(mobile) || mobile;
    const docRef = verificationsCollection().doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      const data = existing.data() || {};
      // 1. Prevent challenge recreation bypass when account is in 15-minute lockout
      const locked = isOtpLocked(data.failedAttempts, data.lockedUntil);
      if (locked) {
        return res.status(429).json({
          error: locked,
          code: "otp_locked",
          retryAfterSec: Math.max(0, Math.ceil((Number(data.lockedUntil || 0) - Date.now()) / 1000)),
        });
      }

      // 2. Dispatch cooldown enforcement
      if (!skipCooldown()) {
        const cooldown = checkOtpCooldown(data.lastSentAt, otpCooldownMs());
        if (cooldown) {
          return res.status(429).json({
            error: cooldown,
            code: "otp_cooldown",
            retryAfterSec: Math.ceil(
              (Number(data.lastSentAt || 0) + otpCooldownMs() - Date.now()) / 1000
            ),
          });
        }
      }
    }

    const challengeId = crypto.randomUUID();
    const code = generateOtpCode(6);
    const delivery = await deliverOtp({
      identifier: mobile,
      code,
      purpose,
      preferredChannel: "sms",
      fallbackEmail: typeof email === "string" ? email : undefined,
    });
    if (!delivery.ok) {
      return res.status(503).json({
        error: delivery.error || "Failed to deliver verification code.",
        code: "otp_delivery_failed",
      });
    }

    const codeHash = await hashOtp(code);
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    await docRef.set({
      challengeId,
      purpose,
      codeHash,
      expiresAt,
      lastSentAt: now,
      failedAttempts: 0,
      lockedUntil: null,
      mobile,
      isUsed: false,
      ...(email ? { email } : {}),
      updatedAt: new Date().toISOString(),
    });

    const verificationToken = signVerificationToken({
      docId,
      challengeId,
      purpose,
      codeHash,
      expiresAt,
      mobile,
    });

    const body: Record<string, unknown> = {
      sent: true,
      channel: delivery.channel,
      provider: delivery.provider,
      challengeId,
      verificationToken,
    };
    if (delivery.devCode) body.devCode = delivery.devCode;
    res.json(body);
  } catch (error) {
    console.error("Phone verify request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/phone-verify/confirm
router.post("/confirm", loginRateLimitGuard, async (req, res) => {
  try {
    const { mobile, otp, challengeId, purpose, verificationToken } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ error: "mobile and otp are required", valid: false });
    }

    const docId = normalizeMobile(mobile) || mobile;
    const db = getDb();
    const docRef = verificationsCollection().doc(docId);

    // 1. Primary verification record in Firestore with ATOMIC concurrency protection via runTransaction
    const txResult = await db.runTransaction(async (t) => {
      let snap = await t.get(docRef);
      if (!snap.exists) {
        return null; // fall through to secondary check if not found directly
      }

      const data = snap.data()!;

      // Replay prevention: cannot reuse consumed code
      if (data.isUsed === true) {
        return {
          status: 400,
          body: {
            valid: false,
            error: "Verification code has already been used. Please request a new code.",
            code: "otp_replayed",
          },
        };
      }

      // 15-minute lockout check across all serverless instances
      const locked = isOtpLocked(data.failedAttempts, data.lockedUntil);
      if (locked) {
        return {
          status: 429,
          body: {
            error: locked,
            valid: false,
            code: "otp_locked",
            retryAfterSec: Math.max(0, Math.ceil((Number(data.lockedUntil || 0) - Date.now()) / 1000)),
          },
        };
      }

      // Challenge ID binding check
      if (challengeId && data.challengeId && data.challengeId !== challengeId) {
        return {
          status: 400,
          body: { valid: false, error: "Challenge ID mismatch.", code: "challenge_mismatch" },
        };
      }

      // Verification purpose binding check
      if (purpose && data.purpose && data.purpose !== purpose) {
        return {
          status: 400,
          body: { valid: false, error: "Verification purpose mismatch.", code: "purpose_mismatch" },
        };
      }

      // Expiration check
      if (Date.now() > Number(data.expiresAt || 0)) {
        return {
          status: 400,
          body: { valid: false, error: "Code expired. Request a new one.", code: "otp_expired" },
        };
      }

      // Verify OTP code
      const valid = await verifyOtp(String(otp), data.codeHash);
      if (valid) {
        // Atomic consumption: delete challenge
        t.delete(docRef);
        return {
          status: 200,
          body: { valid: true, mobile: docId },
        };
      }

      // Atomic attempt increment & lockout transition
      const next = nextFailedOtpState(data.failedAttempts || 0);
      t.set(
        docRef,
        {
          failedAttempts: next.resetCodeFailedAttempts,
          lockedUntil: next.resetCodeLockedUntil,
          lastFailedAt: Date.now(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (next.resetCodeLockedUntil) {
        return {
          status: 429,
          body: {
            error: "Too many failed attempts. Account locked for 15 minutes.",
            valid: false,
            code: "otp_locked",
            retryAfterSec: Math.ceil((next.resetCodeLockedUntil - Date.now()) / 1000),
          },
        };
      }

      return {
        status: 400,
        body: {
          valid: false,
          error: "Invalid verification code.",
          remainingAttempts: Math.max(0, 5 - next.resetCodeFailedAttempts),
        },
      };
    });

    if (txResult) {
      return res.status(txResult.status).json(txResult.body);
    }

    // 2. Stateless Cryptographic Verification Token (with atomic serverless attempt tracking)
    if (verificationToken) {
      const payload = verifyVerificationToken(verificationToken);
      if (payload) {
        const payloadNorm = normalizeMobile(payload.mobile);
        const inputNorm = normalizeMobile(mobile);
        const payloadRaw = (payload.mobile || "").replace(/\D/g, "");
        const inputRaw = (mobile || "").replace(/\D/g, "");

        const mobileMatches =
          payloadNorm === inputNorm ||
          payloadNorm === docId ||
          payload.docId === docId ||
          payload.mobile === mobile ||
          payloadRaw === inputRaw ||
          (payloadRaw.length >= 10 && inputRaw.length >= 10 && (payloadRaw.endsWith(inputRaw.slice(-10)) || inputRaw.endsWith(payloadRaw.slice(-10))));

        if (mobileMatches) {
          if (challengeId && payload.challengeId && payload.challengeId !== challengeId) {
            return res.status(400).json({ valid: false, error: "Challenge ID mismatch.", code: "challenge_mismatch" });
          }
          if (purpose && payload.purpose && payload.purpose !== purpose) {
            return res.status(400).json({ valid: false, error: "Verification purpose mismatch.", code: "purpose_mismatch" });
          }

          const trackerDocRef = verificationsCollection().doc(`${docId}_attempts`);
          const fallbackTxResult = await db.runTransaction(async (t) => {
            const trackerSnap = await t.get(trackerDocRef);
            const trackerData = trackerSnap.data() || { failedAttempts: 0, lockedUntil: null };

            const locked = isOtpLocked(trackerData.failedAttempts, trackerData.lockedUntil);
            if (locked) {
              return {
                status: 429,
                body: {
                  error: locked,
                  valid: false,
                  code: "otp_locked",
                  retryAfterSec: Math.max(0, Math.ceil((Number(trackerData.lockedUntil || 0) - Date.now()) / 1000)),
                },
              };
            }

            const valid = await verifyOtp(String(otp), payload.codeHash);
            if (valid) {
              t.delete(trackerDocRef);
              return {
                status: 200,
                body: { valid: true, mobile: docId },
              };
            }

            const next = nextFailedOtpState(trackerData.failedAttempts || 0);
            t.set(trackerDocRef, {
              failedAttempts: next.resetCodeFailedAttempts,
              lockedUntil: next.resetCodeLockedUntil,
              lastFailedAt: Date.now(),
              mobile: docId,
              updatedAt: new Date().toISOString(),
            });

            if (next.resetCodeLockedUntil) {
              return {
                status: 429,
                body: {
                  error: "Too many failed attempts. Account locked for 15 minutes.",
                  valid: false,
                  code: "otp_locked",
                  retryAfterSec: Math.ceil((next.resetCodeLockedUntil - Date.now()) / 1000),
                },
              };
            }

            return {
              status: 400,
              body: {
                valid: false,
                error: "Invalid verification code.",
                remainingAttempts: Math.max(0, 5 - next.resetCodeFailedAttempts),
              },
            };
          });

          return res.status(fallbackTxResult.status).json(fallbackTxResult.body);
        }
      }
    }

    return res.status(400).json({ valid: false, error: "No code requested for this number." });
  } catch (error) {
    console.error("Phone verify confirm error:", error);
    res.status(500).json({ error: "Internal Server Error", valid: false });
  }
});

export default router;
