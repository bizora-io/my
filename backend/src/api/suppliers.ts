import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireBusinessContext } from "./middleware/auth.js";
import { deliverOtp, generateOtpCode, checkOtpCooldown, hashOtp, verifyOtp, isOtpLocked, nextFailedOtpState, clearOtpFields } from "../lib/notify.js";
import { issueTokenPair } from "../lib/tokenPair.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import { validatePhone, validatePin, validateEmail, sanitizePlainText } from "../lib/validation.js";

const router = express.Router();
export const supplierAuthRouter = express.Router();

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = "7d";

// One supplier profile can be connected to several businesses (same shape
// as globalEmployees in employees.ts) - top-level collection, doc id =
// normalized mobile number.
function suppliersCollection() {
  return getDb().collection("globalSuppliers");
}

function normalizeMobile(mobile: string): string {
  return (mobile || "").replace(/\D/g, "").replace(/^0+/, "");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function stripSecrets(data: Record<string, any>) {
  const { pinHash, resetCodeHash, resetCodeExpiresAt, ...rest } = data;
  return rest;
}

// --- Business-owner-authenticated: link/update a supplier connection ---
// Called from DataContext's registerSupplierProfile()/updateSupplierProfile().

router.use(authenticateToken, requireBusinessContext);

router.post("/link", async (req, res) => {
  try {
    const user = (req as any).user;
    const businessId = (req as any).businessId || user.businessId || user.id;

    if (user.role === "EMPLOYEE") {
      const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      if (!perms.includes("all") && !perms.includes("suppliers.manage") && !perms.includes("purchases.manage")) {
        return res.status(403).json({ error: "Insufficient permissions to manage suppliers" });
      }
    }

    const { mobile, name, pin, businessName, ...profileFields } = req.body;
    if (!mobile || !name) return res.status(400).json({ error: "mobile and name are required" });

    const phoneValidation = validatePhone(mobile);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    if (pin) {
      const pinValidation = validatePin(pin);
      if (!pinValidation.valid) {
        return res.status(400).json({ error: pinValidation.error });
      }
    }

    const docId = normalizeMobile(mobile) || mobile;
    const docRef = suppliersCollection().doc(docId);
    const existing = await docRef.get();
    const connection = stripUndefined({ businessId, businessName: sanitizePlainText(businessName || "Business"), connectedAt: new Date().toISOString() });

    if (existing.exists) {
      const data = existing.data()!;
      const businesses = Array.isArray(data.businesses) ? data.businesses : [];
      const idx = businesses.findIndex((b: any) => b.businessId === businessId);
      if (idx > -1) businesses[idx] = { ...businesses[idx], ...connection };
      else businesses.push(connection);

      const update: Record<string, any> = stripUndefined({ name: sanitizePlainText(name), mobile: docId, businesses, ...profileFields });
      if (pin) update.pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
      await docRef.set(update, { merge: true });
    } else {
      const create: Record<string, any> = stripUndefined({
        name: sanitizePlainText(name),
        mobile: docId,
        businesses: [connection],
        ...profileFields,
      });
      if (pin) create.pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
      await docRef.set(create);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Link supplier error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

// --- Public: Supplier Portal self-service auth ---

supplierAuthRouter.post("/supplier-signup", loginRateLimitGuard, async (req, res) => {
  try {
    const { name, mobile, pin, companyName, email } = req.body;
    if (!name || !mobile || !pin) return res.status(400).json({ error: "name, mobile and pin are required" });

    const phoneValidation = validatePhone(mobile);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }
    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
      }
    }

    const docId = normalizeMobile(mobile) || mobile;
    const docRef = suppliersCollection().doc(docId);
    if ((await docRef.get()).exists) {
      return res.status(409).json({ error: "A supplier already exists with this mobile number." });
    }

    const pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
    await docRef.set(
      stripUndefined({
        name: sanitizePlainText(name),
        mobile: docId,
        companyName: sanitizePlainText(companyName || ""),
        email: email ? String(email).trim().toLowerCase() : "",
        pinHash,
        businesses: [],
        createdAt: new Date().toISOString(),
      })
    );
    markLoginSuccess(res);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Supplier signup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

supplierAuthRouter.post("/supplier-login", loginRateLimitGuard, async (req, res) => {
  try {
    const { mobile, pin } = req.body;
    if (!mobile || !pin) return res.status(400).json({ error: "mobile and pin are required" });

    const docId = normalizeMobile(mobile) || mobile;
    const doc = await suppliersCollection().doc(docId).get();
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
      await doc.ref.set({ lastLoginAt: new Date().toISOString() }, { merge: true });
    } catch { /* ignore */ }
    const tokens = await issueTokenPair({ id: doc.id, email: data.email || "", role: "SUPPLIER" });
    res.json({ supplier: { id: doc.id, ...stripSecrets(data) }, ...tokens });
  } catch (error) {
    console.error("Supplier login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PIN reset now requires a real emailed/SMS'd code, same pattern as
// backend/src/api/auth.ts's reset-pin - previously resetSupplierPin()
// would reset a supplier's PIN given nothing but their mobile number, with
// no proof of ownership at all.
supplierAuthRouter.post("/supplier-reset-pin/request", loginRateLimitGuard, async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: "mobile is required" });
    const phoneValidation = validatePhone(mobile);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    const docRef = suppliersCollection().doc(normalizeMobile(mobile) || mobile);
    const doc = await docRef.get();
    if (!doc.exists) return res.json({ sent: true }); // don't reveal existence

    const cooldown = checkOtpCooldown(doc.data()?.resetCodeLastSentAt);
    if (cooldown) return res.status(429).json({ error: cooldown });

    const code = generateOtpCode(6);
    const delivery = await deliverOtp({ identifier: mobile, code, purpose: "PIN reset", preferredChannel: "sms" });
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
    console.error("Supplier reset-pin request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

supplierAuthRouter.post("/supplier-reset-pin/confirm", loginRateLimitGuard, async (req, res) => {
  try {
    const { mobile, otp, newPin } = req.body;
    if (!mobile || !otp || !newPin) return res.status(400).json({ error: "mobile, otp and newPin are required" });

    const pinValidation = validatePin(newPin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }

    const docRef = suppliersCollection().doc(normalizeMobile(mobile) || mobile);
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
    console.error("Supplier reset-pin confirm error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
