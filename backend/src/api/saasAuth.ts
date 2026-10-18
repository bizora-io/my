import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";
import { issueTokenPair } from "../lib/tokenPair.js";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { validatePassword, validateEmail } from "../lib/validation.js";

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = "7d";

function signToken(payload: { id: string; email: string; role: string }) {
  // typ: access so socket + REST middleware treat SaaS tokens like shop tokens
  return jwt.sign({ ...payload, typ: "access" }, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

async function tokenResponse(user: { id: string; email: string; role: string }, extra: Record<string, unknown> = {}) {
  // Prefer shared pair (refresh + typ:access) so middleware accepts SaaS JWTs consistently
  try {
    const pair = await issueTokenPair({ id: user.id, email: user.email, role: user.role, permissions: ["all"] });
    return { user, token: pair.token, accessToken: pair.accessToken, refreshToken: pair.refreshToken, ...extra };
  } catch {
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return { user, token, accessToken: token, ...extra };
  }
}

function saasAdminsCollection() {
  return getDb().collection("saasAdmins");
}

// SECURITY: this route replaces a hardcoded master password + a hardcoded
// second admin password that used to live directly in the frontend bundle
// (readable by anyone who opened devtools). The owner's credentials now
// live only in backend env vars; additional SaaS Admins are Firestore
// documents with bcrypt-hashed passwords, managed via the endpoints below.
//
// Required env vars (see .env.example):
//   SAAS_OWNER_EMAIL, SAAS_OWNER_MOBILE, SAAS_OWNER_PASSWORD_HASH
// Generate a hash with: node backend/scripts/generate-password-hash.mjs "your password"

// POST /api/auth/saas-login
router.post("/saas-login", loginRateLimitGuard, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "identifier and password are required" });
    }
    const id = identifier.trim();

    // 1. Owner - checked against env vars, never against anything in the client bundle.
    const ownerEmail = process.env.SAAS_OWNER_EMAIL;
    const ownerMobile = process.env.SAAS_OWNER_MOBILE;
    const ownerHash = process.env.SAAS_OWNER_PASSWORD_HASH;

    if (ownerHash && (id === ownerEmail || id === ownerMobile)) {
      const match = await bcrypt.compare(password, ownerHash);
      if (match) {
        // 2FA (if enabled) is stored in Firestore even though the password
        // itself lives in env vars - see twoFactor.ts.
        const ownerConfig = await getDb().collection("saasOwnerConfig").doc("owner").get();
        const ownerData = ownerConfig.data();

        markLoginSuccess(res);
        if (ownerData?.twoFactorEnabled && ownerData?.twoFactorSecret) {
          const preAuthToken = jwt.sign(
            { id: "saas-owner", email: ownerEmail, role: "SAAS_OWNER", preAuth: true },
            getJwtSecret(),
            { expiresIn: "5m" }
          );
          return res.json({ requires2fa: true, preAuthToken });
        }

        const user = {
          id: "saas-owner",
          name: process.env.SAAS_OWNER_NAME || "SaaS Owner",
          businessName: "Bizora Platform",
          email: ownerEmail,
          mobile: ownerMobile,
          role: "SAAS_OWNER",
          permissions: ["all"],
        };
        markLoginSuccess(res);
        return res.json(await tokenResponse({ id: user.id, email: user.email!, role: user.role }));
      }
      // fall through to a generic 401 below rather than leaking which check failed
    }

    // 2. Additional SaaS Admins - Firestore-backed, created by the owner.
    const snapshot = await saasAdminsCollection().where("email", "==", id.toLowerCase()).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const match = await bcrypt.compare(password, data.passwordHash || "");
      if (match) {
        markLoginSuccess(res);
        if (data.twoFactorEnabled && data.twoFactorSecret) {
          const preAuthToken = jwt.sign(
            { id: doc.id, email: data.email, role: "SAAS_ADMIN", preAuth: true },
            getJwtSecret(),
            { expiresIn: "5m" }
          );
          return res.json({ requires2fa: true, preAuthToken });
        }

        const user = {
          id: doc.id,
          name: data.name,
          businessName: "Bizora Support",
          email: data.email,
          role: "SAAS_ADMIN",
          permissions: data.permissions || [],
        };
        markLoginSuccess(res);
        return res.json(await tokenResponse({ id: user.id, email: user.email, role: user.role }));
      }
    }

    const rl = markLoginFailed(res);
    return res.status(401).json({
      error: "Invalid credentials",
      remainingAttempts: rl.remaining,
      retryAfterSec: rl.retryAfterSec || undefined,
    });
  } catch (error) {
    console.error("SaaS login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/auth/saas-admins - list admins (owner only, passwords excluded)
router.get("/saas-admins", authenticateToken, requireRole("SAAS_OWNER"), async (_req, res) => {
  try {
    const snapshot = await saasAdminsCollection().get();
    const admins = snapshot.docs.map((doc) => {
      const { passwordHash, ...rest } = doc.data();
      return { id: doc.id, ...rest };
    });
    res.json({ admins });
  } catch (error) {
    console.error("List saas-admins error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/saas-admins - create a new SaaS Admin (owner only)
router.post("/saas-admins", authenticateToken, requireRole("SAAS_OWNER"), async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }
    const existing = await saasAdminsCollection().where("email", "==", email.toLowerCase().trim()).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: "An admin with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const docRef = await saasAdminsCollection().add({
      name: String(name).trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      permissions: permissions || [],
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ admin: { id: docRef.id, name, email: email.toLowerCase(), permissions: permissions || [] } });
  } catch (error) {
    console.error("Create saas-admin error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
