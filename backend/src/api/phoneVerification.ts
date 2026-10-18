import express from "express";
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

const router = express.Router();

function normalizeMobile(mobile: string): string {
  return (mobile || "").replace(/\D/g, "").replace(/^0+/, "");
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
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "mobile is required" });

    const docId = normalizeMobile(mobile) || mobile;
    const existing = await verificationsCollection().doc(docId).get();
    if (!skipCooldown()) {
      const cooldown = checkOtpCooldown(existing.data()?.lastSentAt, otpCooldownMs());
      if (cooldown) {
        return res.status(429).json({
          error: cooldown,
          code: "otp_cooldown",
          retryAfterSec: Math.ceil(
            (Number(existing.data()?.lastSentAt || 0) + otpCooldownMs() - Date.now()) / 1000
          ),
        });
      }
    }

    const code = generateOtpCode(6);
    const delivery = await deliverOtp({
      identifier: mobile,
      code,
      purpose: "phone verification",
      preferredChannel: "sms",
    });
    if (!delivery.ok) {
      return res.status(503).json({
        error: delivery.error || "Failed to deliver verification code.",
        code: "otp_delivery_failed",
      });
    }

    const codeHash = await hashOtp(code);
    await verificationsCollection().doc(docId).set({
      codeHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
      lastSentAt: Date.now(),
      failedAttempts: 0,
      lockedUntil: null,
      mobile,
    });

    const body: Record<string, unknown> = {
      sent: true,
      channel: delivery.channel,
      provider: delivery.provider,
    };
    if (delivery.devCode) body.devCode = delivery.devCode;
    res.json(body);
  } catch (error) {
    console.error("Phone verify request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/phone-verify/confirm
router.post("/confirm", async (req, res) => {
  try {
    const { mobile, otp } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ error: "mobile and otp are required", valid: false });
    }

    const docId = normalizeMobile(mobile) || mobile;
    const doc = await verificationsCollection().doc(docId).get();
    if (!doc.exists) return res.json({ valid: false, error: "No code requested for this number." });

    const data = doc.data()!;
    const locked = isOtpLocked(data.failedAttempts, data.lockedUntil);
    if (locked) return res.status(429).json({ error: locked, valid: false, code: "otp_locked" });
    if (Date.now() > Number(data.expiresAt || 0)) {
      return res.json({ valid: false, error: "Code expired. Request a new one." });
    }

    const valid = await verifyOtp(String(otp), data.codeHash);
    if (valid) {
      await verificationsCollection().doc(docId).delete();
      return res.json({ valid: true });
    }

    const next = nextFailedOtpState(data.failedAttempts);
    await verificationsCollection().doc(docId).set(
      {
        failedAttempts: next.resetCodeFailedAttempts,
        lockedUntil: next.resetCodeLockedUntil,
      },
      { merge: true }
    );
    return res.json({ valid: false, error: "Invalid verification code." });
  } catch (error) {
    console.error("Phone verify confirm error:", error);
    res.status(500).json({ error: "Internal Server Error", valid: false });
  }
});

export default router;
