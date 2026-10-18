import express from "express";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/firebaseAdmin.js";
import { deliverOtp, generateOtpCode, checkOtpCooldown, hashOtp, verifyOtp, isOtpLocked, nextFailedOtpState, clearOtpFields } from "../lib/notify.js";
import { issueTokenPair } from "../lib/tokenPair.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { validatePhone, validatePin, sanitizePlainText } from "../lib/validation.js";

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = "7d";

// Customer Portal accounts are standalone (not connected to any one
// business the way employees/suppliers are) - one flat top-level
// collection, doc id = normalized phone number.
function customersCollection() {
  return getDb().collection("globalCustomers");
}

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").replace(/^0+/, "");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.post("/customer-signup", loginRateLimitGuard, async (req, res) => {
  try {
    const { name, phone, pin, address, photo } = req.body;
    if (!name || !phone || !pin) return res.status(400).json({ error: "name, phone and pin are required" });

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }

    const docId = normalizePhone(phone) || phone;
    const docRef = customersCollection().doc(docId);
    if ((await docRef.get()).exists) {
      return res.status(409).json({ error: "An account already exists with this mobile number." });
    }

    const pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
    await docRef.set(
      stripUndefined({
        name: sanitizePlainText(name),
        phone: docId,
        address: sanitizePlainText(address || ""),
        photo: photo || "",
        pinHash,
        createdAt: new Date().toISOString(),
      })
    );
    markLoginSuccess(res);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Customer signup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/customer-login", loginRateLimitGuard, async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) return res.status(400).json({ error: "phone and pin are required" });

    const docId = normalizePhone(phone) || phone;
    const doc = await customersCollection().doc(docId).get();
    if (!doc.exists) {
      const rl = markLoginFailed(res);
      return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rl.remaining, retryAfterSec: rl.retryAfterSec || undefined });
    }

    const data = doc.data()!;
    const match = await bcrypt.compare(pin, data.pinHash || "");
    if (!match) {
      const rl = markLoginFailed(res);
      return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rl.remaining, retryAfterSec: rl.retryAfterSec || undefined });
    }

    markLoginSuccess(res);
    try {
      await customersCollection().doc(docId).set({ lastLoginAt: new Date().toISOString() }, { merge: true });
    } catch { /* ignore */ }
    const tokens = await issueTokenPair({ id: doc.id, email: data.email || "", role: "CUSTOMER" });
    const { pinHash, resetCodeHash, resetCodeExpiresAt, ...customerOut } = data;
    res.json({ customer: { id: doc.id, ...customerOut }, ...tokens });
  } catch (error) {
    console.error("Customer login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Reset now requires a real code (see phoneVerification.ts's pattern) -
// previously resetCustomerPin() reset a PIN given only a phone number,
// with no proof of ownership at all.
router.post("/customer-reset-pin/request", loginRateLimitGuard, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    const docRef = customersCollection().doc(normalizePhone(phone) || phone);
    const existing = await docRef.get();
    if (!existing.exists) return res.json({ sent: true }); // don't reveal existence

    const cooldown = checkOtpCooldown(existing.data()?.resetCodeLastSentAt);
    if (cooldown) return res.status(429).json({ error: cooldown });

    const code = generateOtpCode(6);
    const delivery = await deliverOtp({ identifier: phone, code, purpose: "PIN reset", preferredChannel: "sms" });
    if (!delivery.ok) {
      return res.status(503).json({ error: delivery.error || "Failed to deliver verification code." });
    }

    const resetCodeHash = await hashOtp(code);
    await docRef.set({
      resetCodeHash,
      resetCodeExpiresAt: Date.now() + 10 * 60 * 1000,
      resetCodeLastSentAt: Date.now(),
      resetCodeFailedAttempts: 0,
      resetCodeLockedUntil: null,
    }, { merge: true });
    const body: Record<string, any> = { sent: true, channel: delivery.channel, provider: delivery.provider };
    if (delivery.devCode) body.devCode = delivery.devCode;
    res.json(body);
  } catch (error) {
    console.error("Customer reset-pin request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/customer-reset-pin/confirm", loginRateLimitGuard, async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;
    if (!phone || !otp || !newPin) return res.status(400).json({ error: "phone, otp and newPin are required" });

    const pinValidation = validatePin(newPin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }

    const docRef = customersCollection().doc(normalizePhone(phone) || phone);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(400).json({ error: "Invalid or expired code." });

    const data = doc.data()!;
    const locked = isOtpLocked(data.resetCodeFailedAttempts, data.resetCodeLockedUntil);
    if (locked) return res.status(429).json({ error: locked });
    if (!data.resetCodeHash || !data.resetCodeExpiresAt || Date.now() > data.resetCodeExpiresAt) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }
    const match = await verifyOtp(otp, data.resetCodeHash);
    if (!match) {
      await docRef.set(nextFailedOtpState(data.resetCodeFailedAttempts), { merge: true });
      const rl = markLoginFailed(res);
      return res.status(400).json({
        error: "Invalid or expired code.",
        remainingAttempts: rl.remaining,
      });
    }

    const pinHash = await bcrypt.hash(String(newPin).trim(), BCRYPT_ROUNDS);
    await docRef.set({ pinHash, ...clearOtpFields() }, { merge: true });
    markLoginSuccess(res);
    res.json({ success: true });
  } catch (error) {
    console.error("Customer reset-pin confirm error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
