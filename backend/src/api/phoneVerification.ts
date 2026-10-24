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
  return process.env.JWT_SECRET || process.env.OTP_PEPPER || "bizora_otp_secret_key_fixed_hmac_2026";
}

function signVerificationToken(payload: { docId: string; codeHash: string; expiresAt: number; mobile: string }): string {
  const secret = getOtpSecret();
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

function verifyVerificationToken(token: string): { docId: string; codeHash: string; expiresAt: number; mobile: string } | null {
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
    const { mobile, email } = req.body || {};
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
      fallbackEmail: typeof email === "string" ? email : undefined,
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
      ...(email ? { email } : {}),
    });

    const verificationToken = signVerificationToken({
      docId,
      codeHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
      mobile,
    });

    const body: Record<string, unknown> = {
      sent: true,
      channel: delivery.channel,
      provider: delivery.provider,
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
router.post("/confirm", async (req, res) => {
  try {
    const { mobile, otp, verificationToken } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ error: "mobile and otp are required", valid: false });
    }

    const docId = normalizeMobile(mobile) || mobile;
    const rawDigits = (mobile || "").replace(/\D/g, "").replace(/^0+/, "");

    // 1. Check database document (if available in this serverless instance)
    let doc = await verificationsCollection().doc(docId).get();
    if (!doc.exists && rawDigits !== docId) {
      doc = await verificationsCollection().doc(rawDigits).get();
    }
    if (!doc.exists) {
      const snap = await verificationsCollection().where("mobile", "==", mobile).limit(1).get();
      if (!snap.empty) doc = snap.docs[0];
    }

    if (doc.exists) {
      const data = doc.data()!;
      const locked = isOtpLocked(data.failedAttempts, data.lockedUntil);
      if (locked) return res.status(429).json({ error: locked, valid: false, code: "otp_locked" });
      if (Date.now() > Number(data.expiresAt || 0)) {
        return res.json({ valid: false, error: "Code expired. Request a new one." });
      }

      const valid = await verifyOtp(String(otp), data.codeHash);
      if (valid) {
        await verificationsCollection().doc(doc.id).delete().catch(() => {});
        return res.json({ valid: true });
      }

      const next = nextFailedOtpState(data.failedAttempts);
      await verificationsCollection().doc(doc.id).set(
        {
          failedAttempts: next.resetCodeFailedAttempts,
          lockedUntil: next.resetCodeLockedUntil,
        },
        { merge: true }
      );
      return res.json({ valid: false, error: "Invalid verification code." });
    }

    // 2. Stateless Cryptographic Verification Token (handles serverless instance desync)
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
          const valid = await verifyOtp(String(otp), payload.codeHash);
          if (valid) {
            await verificationsCollection().doc(docId).delete().catch(() => {});
            return res.json({ valid: true });
          }
          return res.json({ valid: false, error: "Invalid verification code." });
        }
      }
    }

    return res.json({ valid: false, error: "No code requested for this number." });
  } catch (error) {
    console.error("Phone verify confirm error:", error);
    res.status(500).json({ error: "Internal Server Error", valid: false });
  }
});

export default router;
