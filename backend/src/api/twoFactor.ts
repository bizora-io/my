import express from "express";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, forbidImpersonation, requireBusinessContext } from "./middleware/auth.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import { issueTokenPair } from "../lib/tokenPair.js";

const router = express.Router();
const TOKEN_TTL = "7d";

// Covers all three account types. Shop Owner and SaaS Admin both have a
// real Firestore doc already; the SaaS Owner doesn't (their identity/
// password live in env vars, see saasAuth.ts) - so their 2FA secret gets
// its own single fixed doc instead.
function userDoc(id: string, role: string) {
  const db = getDb();
  if (role === "SAAS_OWNER") return db.collection("saasOwnerConfig").doc("owner");
  if (role === "SAAS_ADMIN") return db.collection("saasAdmins").doc(id);
  return db.collection("businesses").doc(id);
}

// POST /api/auth/2fa/setup - generate a new (unconfirmed) TOTP secret for
// the current user, to be scanned into an authenticator app.
router.post("/setup", authenticateToken, forbidImpersonation, async (req, res) => {
  try {
    const { id, email, role } = (req as any).user;
    const secret = authenticator.generateSecret();
    await userDoc(id, role).set({ pendingTwoFactorSecret: secret }, { merge: true });

    const otpauthUrl = authenticator.keyuri(email || id, "Bizora", secret);
    res.json({ secret, otpauthUrl });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/2fa/enable - confirm setup with a code from the app and
// turn 2FA on.
router.post("/enable", authenticateToken, forbidImpersonation, async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    const { otp } = req.body;
    const doc = await userDoc(id, role).get();
    const pendingSecret = doc.data()?.pendingTwoFactorSecret;
    if (!pendingSecret) {
      return res.status(400).json({ error: "No pending 2FA setup found. Call /2fa/setup first." });
    }
    if (!otp || !authenticator.check(otp, pendingSecret)) {
      return res.status(401).json({ error: "Invalid code." });
    }
    await userDoc(id, role).set(
      { twoFactorSecret: pendingSecret, twoFactorEnabled: true, pendingTwoFactorSecret: null },
      { merge: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/2fa/disable
router.post("/disable", authenticateToken, forbidImpersonation, async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    await userDoc(id, role).set({ twoFactorEnabled: false, twoFactorSecret: null }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/2fa/verify-login - exchange a pre-auth token (from
// /api/auth/login or /api/auth/saas-login when twoFactorEnabled) + a TOTP
// code for a real session token. This is the actual second factor -
// without a valid code, no session token is ever issued.
router.post("/verify-login", loginRateLimitGuard, authenticateToken, async (req, res) => {
  try {
    const { id, email, role, preAuth } = (req as any).user;
    if (!preAuth) {
      return res.status(400).json({ error: "This endpoint is only for completing a 2FA login." });
    }
    const { otp } = req.body;
    const doc = await userDoc(id, role).get();
    const secret = doc.data()?.twoFactorSecret;
    if (!secret || !otp || !authenticator.check(otp, secret)) {
      const rl = markLoginFailed(res);
      return res.status(401).json({
        error: "Invalid code.",
        remainingAttempts: rl.remaining,
        retryAfterSec: rl.retryAfterSec || undefined,
      });
    }
    markLoginSuccess(res);
    const permissions = doc.data()?.permissions || (role === "SAAS_OWNER" ? ["all"] : []);
    let tokenPairRes;
    try {
      tokenPairRes = await issueTokenPair({ id, email, role, permissions });
    } catch {
      const fallbackToken = jwt.sign({ id, email, role, typ: "access" }, getJwtSecret(), { expiresIn: TOKEN_TTL });
      tokenPairRes = { token: fallbackToken, accessToken: fallbackToken };
    }
    const { passwordHash, twoFactorSecret, pendingTwoFactorSecret, ...userOut } = doc.data()!;
    res.json({ user: { id, role, ...userOut }, ...tokenPairRes });
  } catch (error) {
    console.error("2FA verify-login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
