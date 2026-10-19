import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, getAdminAuth } from "../lib/firebaseAdmin.js";
import { broadcastBusinessSync, broadcastSaasStaff } from "../lib/chatSocket.js";
import { authenticateToken, forbidImpersonation } from "./middleware/auth.js";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import { deliverOtpToAccount, generateOtpCode, checkOtpCooldown, hashOtp, verifyOtp, isOtpLocked, nextFailedOtpState, clearOtpFields } from "../lib/notify.js";
import { resolveStaffPermissions } from "../lib/rbacRoles.js";
import { issueTokenPair, signAccessToken, signRefreshToken } from "../lib/tokenPair.js";

import { getJwtSecret } from "../lib/jwtSecret.js";
import { validatePassword, validateEmail, validatePhone } from "../lib/validation.js";

const router = express.Router();
const BCRYPT_ROUNDS = 12;

function stripPassword(doc: Record<string, any>) {
  const { passwordHash, ...rest } = doc;
  return rest;
}

/** Normalize business doc fields for frontend getSubscriptionView() */
function withSubscriptionFields(data: Record<string, any>) {
  const statusRaw = data.subscriptionStatus || data.status || data.accountStatus || "Active";
  const status =
    String(statusRaw).toLowerCase() === "expired"
      ? "expired"
      : String(statusRaw).toLowerCase() === "suspended"
        ? "suspended"
        : String(statusRaw).toLowerCase() === "trial"
          ? "trial"
          : String(statusRaw).toLowerCase() === "grace"
            ? "grace"
            : "active";
  const renews =
    data.subscriptionRenewsAt ||
    data.expiry ||
    data.expiresAt ||
    null;
  return {
    ...data,
    plan: data.plan || (data.isPremium ? "Pro" : "Basic"),
    isPremium: !!data.isPremium,
    subscriptionStatus: status,
    subscriptionRenewsAt: renews,
    subscriptionEnforce: data.subscriptionEnforce === true || data.subscriptionEnforce === "true",
  };
}

// POST /api/auth/register - Shop Owner signup.
// Shop owner signup. Employee/customer/supplier use dedicated auth routes under /api/auth/*.
router.post("/register", loginRateLimitGuard, async (req, res) => {
  try {
    const { businessName, email, mobile, password, businessType, location, name, firebaseUid } = req.body;

    if (!businessName || !email || !mobile || !password) {
      return res.status(400).json({ error: "businessName, email, mobile and password are required" });
    }

    const db = getDb();
    const users = db.collection("businesses");

    const emailMatch = await users.where("email", "==", email.toLowerCase()).limit(1).get();
    if (!emailMatch.empty) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    const mobileMatch = await users.where("mobile", "==", mobile).limit(1).get();
    if (!mobileMatch.empty) {
      return res.status(409).json({ error: "An account with this mobile number already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    const newUser = {
      name: name || businessName,
      businessName,
      email: email.toLowerCase(),
      mobile,
      ...(firebaseUid ? { firebaseUid: String(firebaseUid) } : {}),
      phoneVerified: true,
      businessType: businessType || "Retail",
      location: location || "Not Specified",
      role: "SHOP_OWNER",
      isPremium: false,
      unlockedTemplates: [1],
      twoFactorEnabled: false,
      pinEnabled: true,
      passwordEnabled: true,
      features: ["Single Store", "Basic Reports"],
      accountStatus: "Active",
      plan: "Trial",
      subscriptionStatus: "Trial",
      subscriptionRenewsAt: trialEnds.toISOString(),
      subscriptionEnforce: true,
      trialLimits: {
        products: 5,
        customers: 3,
        buys: 5,
        sells: 10,
        expenses: 5,
        quickSales: 20,
      },
      trialUsage: {
        products: 0,
        customers: 0,
        buys: 0,
        sells: 0,
        expenses: 0,
        quickSales: 0,
      },
      trialStartedAt: new Date().toISOString(),
      employeeLimit: 3,
      branchLimit: 1,
      productLimit: 500,
      locationCount: 1,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await users.add(newUser);
    const userOut = { id: docRef.id, ...withSubscriptionFields(stripPassword(newUser)) };
    const tokens = await issueTokenPair({ id: docRef.id, email: newUser.email, role: newUser.role });

    broadcastSaasStaff({
      domain: "all",
      reason: "shop_registered",
      payload: { businessId: docRef.id, businessName: newUser.businessName },
    });

    res.status(201).json({ user: userOut, ...tokens });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// POST /api/auth/login - Shop Owner login by email or mobile + password.
router.post("/login", loginRateLimitGuard, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "identifier and password are required" });
    }

    const db = getDb();
    const users = db.collection("businesses");
    const cleanIdentifier = identifier.trim();

    let snapshot = await users.where("email", "==", cleanIdentifier.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      snapshot = await users.where("mobile", "==", cleanIdentifier).limit(1).get();
    }
    // Digit-only mobile variants (e.g. 018... vs +88018...)
    if (snapshot.empty) {
      const digits = cleanIdentifier.replace(/\D/g, "");
      if (digits.length >= 10) {
        const all = await users.get();
        const hit = all.docs.find((d) => {
          const m = String(d.data()?.mobile || "").replace(/\D/g, "");
          return m === digits || m.endsWith(digits) || digits.endsWith(m);
        });
        if (hit) {
          snapshot = { empty: false, docs: [hit] } as any;
        }
      }
    }

    if (snapshot.empty) {
      const rl = markLoginFailed(res);
      return res.status(401).json({
        error: "Invalid credentials",
        remainingAttempts: rl.remaining,
        retryAfterSec: rl.retryAfterSec || undefined,
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const match = await bcrypt.compare(password, data.passwordHash || "");
    if (!match) {
      const rl = markLoginFailed(res);
      return res.status(401).json({
        error: "Invalid credentials",
        remainingAttempts: rl.remaining,
        retryAfterSec: rl.retryAfterSec || undefined,
      });
    }

    if (data.accountStatus === "Suspended") {
      return res.status(403).json({ error: "This account has been suspended. Please contact support." });
    }
    if (data.accountStatus === "PendingApproval") {
      return res.status(403).json({ error: "This account is awaiting approval. Please check back soon." });
    }

    const userOut = { id: doc.id, ...withSubscriptionFields(stripPassword(data)) };

    markLoginSuccess(res);

    if (data.twoFactorEnabled && data.twoFactorSecret) {
      // Don't issue a full session token yet - just a short-lived pre-auth
      // token that can only be exchanged for a real one by also proving
      // the TOTP code (POST /api/auth/2fa/verify-login).
      const preAuthToken = jwt.sign(
        { id: doc.id, email: data.email, role: data.role, preAuth: true }, getJwtSecret(),
        { expiresIn: "5m" }
      );
      return res.json({ requires2fa: true, preAuthToken });
    }

    // Engagement signal for churn / at-risk
    const lastLoginAt = new Date().toISOString();
    try {
      await doc.ref.set({ lastLoginAt, lastLoginIp: req.ip || null }, { merge: true });
    } catch (e) {
      console.warn("Failed to stamp lastLoginAt:", e);
    }

    const shopRole = data.role === "SHOP_OWNER" || !data.role ? "SHOP_OWNER" : String(data.role);
    const tokens = await issueTokenPair({
      id: doc.id,
      email: String(data.email || ""),
      role: shopRole === "SHOP_OWNER" ? "SHOP_OWNER" : shopRole,
    });
    // Ensure client always gets explicit role
    res.json({
      user: { ...userOut, role: "SHOP_OWNER", lastLoginAt },
      ...tokens,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      detail: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error),
    });
  }
});

// POST /api/auth/firebase-login - Exchange Firebase ID token for Bizora session tokens
router.post("/firebase-login", loginRateLimitGuard, async (req, res) => {
  try {
    const { idToken, targetRole, businessName, businessType, location, name } = req.body;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken is required" });
    }

    let decoded: any;
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch (err: any) {
      console.warn("[auth] Firebase token verification failed:", err?.message || err);
      return res.status(401).json({ error: "Invalid or expired Firebase token", detail: err?.message });
    }

    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase().trim();
    const phone = (decoded.phone_number || "").trim();
    const tokenName = decoded.name || "";
    const requestedRole = (targetRole || "SHOP_OWNER").toUpperCase();

    // Security check: NEVER allow self-provisioning or token exchange for SaaS platform admin roles
    if (requestedRole === "SAAS_OWNER" || requestedRole === "SAAS_ADMIN") {
      return res.status(403).json({ error: "SaaS administrative roles cannot authenticate via client Firebase exchange." });
    }

    const db = getDb();

    // --- 1. SHOP OWNER FLOW ---
    if (requestedRole === "SHOP_OWNER") {
      const businesses = db.collection("businesses");
      let snapshot = await businesses.where("firebaseUid", "==", uid).limit(1).get();

      if (snapshot.empty && email) {
        snapshot = await businesses.where("email", "==", email).limit(1).get();
      }

      if (snapshot.empty && phone) {
        snapshot = await businesses.where("mobile", "==", phone).limit(1).get();
        if (snapshot.empty) {
          const digits = phone.replace(/\D/g, "");
          if (digits.length >= 8) {
            const all = await businesses.get();
            const hit = all.docs.find((d) => {
              const m = String(d.data()?.mobile || "").replace(/\D/g, "");
              return m && (m === digits || m.endsWith(digits) || digits.endsWith(m));
            });
            if (hit) snapshot = { empty: false, docs: [hit] } as any;
          }
        }
      }

      if (!snapshot.empty) {
        // Existing shop owner
        const doc = snapshot.docs[0];
        const data = doc.data();

        if (data.accountStatus === "Suspended") {
          return res.status(403).json({ error: "This account has been suspended. Please contact support." });
        }
        if (data.accountStatus === "PendingApproval") {
          return res.status(403).json({ error: "This account is awaiting approval. Please check back soon." });
        }

        const updates: Record<string, any> = {
          lastLoginAt: new Date().toISOString(),
          lastLoginIp: req.ip || null,
        };
        if (!data.firebaseUid || data.firebaseUid !== uid) {
          updates.firebaseUid = uid;
        }
        try {
          await doc.ref.set(updates, { merge: true });
        } catch (e) {
          console.warn("[auth] Failed to update firebaseUid/lastLoginAt:", e);
        }

        markLoginSuccess(res);
        const tokens = await issueTokenPair({
          id: doc.id,
          email: data.email || email,
          role: "SHOP_OWNER",
        });

        const userOut = { id: doc.id, ...withSubscriptionFields(stripPassword({ ...data, ...updates })), role: "SHOP_OWNER" };
        return res.json({ user: userOut, ...tokens });
      }

      // New Shop Owner registration with 14-day trial
      const finalBusinessName = (businessName || name || tokenName || (email ? email.split("@")[0] : "My Store")).trim();
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      const newShop = {
        name: name || tokenName || finalBusinessName,
        businessName: finalBusinessName,
        email: email || "",
        mobile: phone || "",
        firebaseUid: uid,
        businessType: businessType || "Retail",
        location: location || "Not Specified",
        role: "SHOP_OWNER",
        isPremium: false,
        unlockedTemplates: [1],
        twoFactorEnabled: false,
        pinEnabled: true,
        passwordEnabled: false,
        features: ["Single Store", "Basic Reports"],
        accountStatus: "Active",
        plan: "Trial",
        subscriptionStatus: "Trial",
        subscriptionRenewsAt: trialEnds.toISOString(),
        subscriptionEnforce: true,
        trialLimits: {
          products: 5,
          customers: 3,
          buys: 5,
          sells: 10,
          expenses: 5,
          quickSales: 20,
        },
        trialUsage: {
          products: 0,
          customers: 0,
          buys: 0,
          sells: 0,
          expenses: 0,
          quickSales: 0,
        },
        trialStartedAt: new Date().toISOString(),
        employeeLimit: 3,
        branchLimit: 1,
        productLimit: 500,
        locationCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const docRef = await businesses.add(newShop);
      const userOut = { id: docRef.id, ...withSubscriptionFields(newShop) };
      const tokens = await issueTokenPair({ id: docRef.id, email: newShop.email, role: "SHOP_OWNER" });

      broadcastSaasStaff({
        domain: "all",
        reason: "shop_registered",
        payload: { businessId: docRef.id, businessName: newShop.businessName },
      });

      markLoginSuccess(res);
      return res.status(201).json({ user: userOut, ...tokens });
    }

    // --- 2. EMPLOYEE FLOW ---
    if (requestedRole === "EMPLOYEE") {
      const employees = db.collection("globalEmployees");
      let snapshot = await employees.where("firebaseUid", "==", uid).limit(1).get();

      if (snapshot.empty && phone) {
        const cleanMobile = phone.replace(/\D/g, "").replace(/^0+/, "");
        const docRef = employees.doc(cleanMobile);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          snapshot = { empty: false, docs: [docSnap] } as any;
        } else if (cleanMobile.length >= 8) {
          const all = await employees.get();
          const match = all.docs.find((d) => d.id.length >= 8 && (d.id.endsWith(cleanMobile) || cleanMobile.endsWith(d.id)));
          if (match) snapshot = { empty: false, docs: [match] } as any;
        }
      }

      if (snapshot.empty && email) {
        snapshot = await employees.where("email", "==", email).limit(1).get();
      }

      if (snapshot.empty) {
        return res.status(404).json({ error: "No employee account is associated with this verified phone or email. Please contact your shop administrator." });
      }

      const doc = snapshot.docs[0];
      const data = doc.data() || {};
      const employments = (data.employments || []).filter((e: any) => e.status === "Active");
      if (employments.length === 0) {
        return res.status(403).json({ error: "No active employment found for this account." });
      }

      const employment = employments[0];
      let permissions: string[] = Array.isArray(employment.permissions) ? employment.permissions : [];
      let roleTemplateId = employment.roleTemplateId as string | undefined;
      let roleLabel = employment.role as string | undefined;

      if (employment.businessId) {
        try {
          const staffSnap = await db.collection("businesses").doc(employment.businessId).collection("staff").where("mobile", "==", doc.id).limit(1).get();
          if (!staffSnap.empty) {
            const sd = staffSnap.docs[0].data();
            if (Array.isArray(sd.permissions) && sd.permissions.length) permissions = sd.permissions;
            if (sd.roleTemplateId) roleTemplateId = sd.roleTemplateId;
            if (sd.role) roleLabel = sd.role;
          }
        } catch { /* ignore */ }
      }

      permissions = resolveStaffPermissions({ role: roleLabel, permissions, roleTemplateId });

      try {
        await doc.ref.set({ firebaseUid: uid, lastLoginAt: new Date().toISOString() }, { merge: true });
      } catch { /* ignore */ }

      const tokens = await issueTokenPair({
        id: doc.id,
        email: data.email || email || "",
        role: "EMPLOYEE",
        businessId: employment.businessId,
        staffId: employment.staffId || employment.id || null,
        permissions,
      });

      markLoginSuccess(res);
      return res.json({
        employee: { mobile: doc.id, name: data.name, employments, activeBusinessId: employment.businessId, permissions },
        user: { id: doc.id, name: data.name, role: "EMPLOYEE", businessId: employment.businessId, permissions },
        ...tokens,
      });
    }

    // --- 3. CUSTOMER FLOW ---
    if (requestedRole === "CUSTOMER") {
      const customers = db.collection("globalCustomers");
      let snapshot = await customers.where("firebaseUid", "==", uid).limit(1).get();

      const cleanPhone = phone ? phone.replace(/\D/g, "").replace(/^0+/, "") : "";
      if (snapshot.empty && cleanPhone) {
        const docRef = customers.doc(cleanPhone);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          snapshot = { empty: false, docs: [docSnap] } as any;
        }
      }

      if (snapshot.empty && email) {
        snapshot = await customers.where("email", "==", email).limit(1).get();
      }

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() || {};
        try {
          await doc.ref.set({ firebaseUid: uid, lastLoginAt: new Date().toISOString() }, { merge: true });
        } catch { /* ignore */ }

        const tokens = await issueTokenPair({ id: doc.id, email: data.email || email || "", role: "CUSTOMER" });
        const { pinHash, resetCodeHash, ...customerOut } = data;
        markLoginSuccess(res);
        return res.json({
          customer: { id: doc.id, ...customerOut },
          user: { id: doc.id, role: "CUSTOMER", ...customerOut },
          ...tokens,
        });
      }

      // Create new customer doc
      const docId = cleanPhone || uid;
      const customerData = {
        firebaseUid: uid,
        phone: cleanPhone || phone || "",
        email: email || "",
        name: name || tokenName || "Customer",
        address: location || "",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await customers.doc(docId).set(customerData, { merge: true });

      const tokens = await issueTokenPair({ id: docId, email: email || "", role: "CUSTOMER" });
      markLoginSuccess(res);
      return res.status(201).json({
        customer: { id: docId, ...customerData },
        user: { id: docId, role: "CUSTOMER", ...customerData },
        ...tokens,
      });
    }

    // --- 4. SUPPLIER FLOW ---
    if (requestedRole === "SUPPLIER") {
      const suppliers = db.collection("globalSuppliers");
      let snapshot = await suppliers.where("firebaseUid", "==", uid).limit(1).get();
      if (snapshot.empty && phone) {
        const cleanPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
        const docRef = suppliers.doc(cleanPhone);
        const docSnap = await docRef.get();
        if (docSnap.exists) snapshot = { empty: false, docs: [docSnap] } as any;
      }
      if (snapshot.empty && email) {
        snapshot = await suppliers.where("email", "==", email).limit(1).get();
      }

      if (snapshot.empty) {
        return res.status(404).json({ error: "No supplier account associated with this account." });
      }

      const doc = snapshot.docs[0];
      const data = doc.data() || {};
      try {
        await doc.ref.set({ firebaseUid: uid, lastLoginAt: new Date().toISOString() }, { merge: true });
      } catch { /* ignore */ }

      const tokens = await issueTokenPair({ id: doc.id, email: data.email || email || "", role: "SUPPLIER" });
      const { pinHash, resetCodeHash, ...supplierOut } = data;
      markLoginSuccess(res);
      return res.json({
        supplier: { id: doc.id, ...supplierOut },
        user: { id: doc.id, role: "SUPPLIER", ...supplierOut },
        ...tokens,
      });
    }

    return res.status(400).json({ error: "Unsupported targetRole" });
  } catch (error: any) {
    console.error("[auth] Firebase login error:", error);
    res.status(500).json({ error: "Internal Server Error", detail: error?.message });
  }
});

// GET /api/auth/me - return the current user for a valid token (fresh read from Firestore).

// POST /api/auth/refresh - exchange a valid refresh token for a new pair (rotation).
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, getJwtSecret());
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    if (decoded.typ !== "refresh" || !decoded.jti || !decoded.id) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const db = getDb();
    const ref = db.collection("refreshTokens").doc(decoded.jti);
    const snap = await ref.get();
    if (!snap.exists) return res.status(401).json({ error: "Refresh token revoked or unknown" });
    const stored = snap.data() || {};
    if (stored.revoked) return res.status(401).json({ error: "Refresh token revoked" });
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
      await ref.set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
      return res.status(401).json({ error: "Refresh token expired" });
    }

    // Rotate: revoke old jti, issue new pair
    await ref.set({ revoked: true, revokedAt: new Date().toISOString(), replacedBy: "rotated" }, { merge: true });
    const claimSrc = stored.claims || stored;
    const tokens = await issueTokenPair({
      id: decoded.id,
      email: decoded.email || stored.email || "",
      role: decoded.role || stored.role || "SHOP_OWNER",
      businessId: claimSrc.businessId || decoded.businessId,
      staffId: claimSrc.staffId || decoded.staffId,
      permissions: claimSrc.permissions || decoded.permissions,
    } as any);
    res.json(tokens);
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/logout - revoke refresh token (access token expires on its own).
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      try {
        const decoded: any = jwt.verify(refreshToken, getJwtSecret());
        if (decoded.jti) {
          await getDb().collection("refreshTokens").doc(decoded.jti).set(
            { revoked: true, revokedAt: new Date().toISOString() },
            { merge: true }
          );
        }
      } catch {
        // already invalid - treat as logged out
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const u = (req as any).user;
    const role = u.role;

    if (role === "EMPLOYEE") {
      const doc = await db.collection("globalEmployees").doc(u.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Employee not found" });
      const data = doc.data() || {};
      const { pinHash, resetCodeHash, resetCodeExpiresAt, ...rest } = data as any;
      return res.json({
        user: {
          id: doc.id,
          role: "EMPLOYEE",
          name: data.name,
          mobile: doc.id,
          businessId: u.businessId,
          permissions: u.permissions || [],
          employments: data.employments || [],
          ...rest,
        },
      });
    }

    if (role === "CUSTOMER") {
      const doc = await db.collection("globalCustomers").doc(u.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Customer not found" });
      const data = doc.data() || {};
      const { pinHash, resetCodeHash, resetCodeExpiresAt, ...rest } = data as any;
      return res.json({ user: { id: doc.id, role: "CUSTOMER", ...rest } });
    }

    if (role === "SUPPLIER") {
      const doc = await db.collection("globalSuppliers").doc(u.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Supplier not found" });
      const data = doc.data() || {};
      const { pinHash, resetCodeHash, resetCodeExpiresAt, ...rest } = data as any;
      return res.json({ user: { id: doc.id, role: "SUPPLIER", ...rest } });
    }

    if (role === "SAAS_ADMIN") {
      const doc = await db.collection("saasAdmins").doc(u.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Admin not found" });
      const data = doc.data() || {};
      const { passwordHash, ...rest } = data as any;
      return res.json({ user: { id: doc.id, role: "SAAS_ADMIN", ...rest } });
    }

    if (role === "SAAS_OWNER") {
      return res.json({
        user: {
          id: u.id,
          role: "SAAS_OWNER",
          name: process.env.SAAS_OWNER_NAME || "SaaS Owner",
          email: process.env.SAAS_OWNER_EMAIL,
        },
      });
    }

    // SHOP_OWNER default
    const doc = await db.collection("businesses").doc(u.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const shopData = doc.data() || {};
    res.json({
      user: {
        id: doc.id,
        role: "SHOP_OWNER",
        ...withSubscriptionFields(stripPassword(shopData)),
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/verify-password - re-auth check ("confirm your password
// before this sensitive action"). Uses the caller's own JWT to know who
// they are, so there's nothing for the client to leak - it can only ever
// verify the currently logged-in user's own password.
router.post("/verify-password", authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const { id, role } = (req as any).user;
    if (!password) return res.status(400).json({ error: "password is required" });

    if (role === "SAAS_OWNER") {
      const hash = process.env.SAAS_OWNER_PASSWORD_HASH;
      const valid = !!hash && (await bcrypt.compare(password, hash));
      return res.json({ valid });
    }

    if (role === "SAAS_ADMIN") {
      const doc = await getDb().collection("saasAdmins").doc(id).get();
      const valid = doc.exists && (await bcrypt.compare(password, doc.data()!.passwordHash || ""));
      return res.json({ valid });
    }

    // SHOP_OWNER (default)
    const doc = await getDb().collection("businesses").doc(id).get();
    const valid = doc.exists && (await bcrypt.compare(password, doc.data()!.passwordHash || ""));
    res.json({ valid });
  } catch (error) {
    console.error("Verify password error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Forgot PIN / password reset ---
// Random OTP hashed server-side (10 min expiry). Delivered via Twilio SMS
// and/or Resend email (backend/src/lib/notify.ts). Production requires a
// configured provider; development may log to console.
router.post("/reset-pin/request", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "identifier is required" });

    const db = getDb();
    const users = db.collection("businesses");
    let snapshot = await users.where("email", "==", identifier.trim().toLowerCase()).limit(1).get();
    if (snapshot.empty) snapshot = await users.where("mobile", "==", identifier.trim()).limit(1).get();

    // Always return generic success when not found (anti-enumeration).
    if (snapshot.empty) return res.json({ sent: true });

    const doc = snapshot.docs[0];
    const data = doc.data() || {};
    const cooldown = checkOtpCooldown(data.resetCodeLastSentAt);
    if (cooldown) return res.status(429).json({ error: cooldown });

    const code = generateOtpCode(6);
    const codeHash = await hashOtp(code);
    const delivery = await deliverOtpToAccount({
      email: data.email,
      mobile: data.mobile,
      code,
      purpose: "password reset",
    });
    if (!delivery.ok) {
      return res.status(503).json({ error: delivery.error || "Failed to deliver verification code." });
    }

    await doc.ref.set(
      {
        resetCodeHash: codeHash,
        resetCodeExpiresAt: Date.now() + 10 * 60 * 1000,
        resetCodeLastSentAt: Date.now(),
        resetCodeFailedAttempts: 0,
        resetCodeLockedUntil: null,
      },
      { merge: true }
    );

    const body: Record<string, any> = {
      sent: true,
      channel: delivery.channel,
      provider: delivery.provider,
    };
    if (delivery.devCode) body.devCode = delivery.devCode;
    res.json(body);
  } catch (error) {
    console.error("Reset-pin request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/reset-pin/confirm", async (req, res) => {
  try {
    const { identifier, otp, newPin } = req.body;
    if (!identifier || !otp || !newPin) {
      return res.status(400).json({ error: "identifier, otp and newPin are required" });
    }

    const db = getDb();
    const users = db.collection("businesses");
    let snapshot = await users.where("email", "==", identifier.trim().toLowerCase()).limit(1).get();
    if (snapshot.empty) snapshot = await users.where("mobile", "==", identifier.trim()).limit(1).get();
    if (snapshot.empty) return res.status(400).json({ error: "Invalid or expired code." });

    const doc = snapshot.docs[0];
    const data = doc.data();
    const locked = isOtpLocked(data.resetCodeFailedAttempts, data.resetCodeLockedUntil);
    if (locked) return res.status(429).json({ error: locked });

    if (!data.resetCodeHash || !data.resetCodeExpiresAt || Date.now() > data.resetCodeExpiresAt) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }
    const match = await verifyOtp(otp, data.resetCodeHash);
    if (!match) {
      const fail = nextFailedOtpState(data.resetCodeFailedAttempts);
      await doc.ref.set(fail, { merge: true });
      return res.status(400).json({ error: "Invalid or expired code." });
    }

    const passwordHash = await bcrypt.hash(newPin, 10);
    await doc.ref.set({ passwordHash, ...clearOtpFields() }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Reset-pin confirm error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/auth/me/password - change your own password. Requires the
// current password, same as any standard "change password" flow.
router.patch("/me/password", authenticateToken, forbidImpersonation, async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    if (role !== "SHOP_OWNER") {
      return res.status(400).json({ error: "This endpoint is only for Shop Owner accounts." });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    const docRef = getDb().collection("businesses").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(currentPassword, doc.data()!.passwordHash || "");
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await docRef.set({ passwordHash }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// PATCH /api/auth/trial-usage — shop owner increments / sets trial usage counters
router.patch("/trial-usage", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { trialUsage, increment, key } = req.body || {};
    const db = getDb();
    const ref = db.collection("businesses").doc(userId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Business not found" });
    const data = snap.data() || {};
    const status = String(data.subscriptionStatus || data.plan || "").toLowerCase();
    if (status !== "trial" && String(data.plan || "").toLowerCase() !== "trial") {
      return res.json({ skipped: true, reason: "not_on_trial", trialUsage: data.trialUsage || {} });
    }
    const limits = data.trialLimits || {
      products: 5, customers: 3, buys: 5, sells: 10, expenses: 5, quickSales: 20,
    };
    let usage = {
      products: Number(data.trialUsage?.products) || 0,
      customers: Number(data.trialUsage?.customers) || 0,
      buys: Number(data.trialUsage?.buys) || 0,
      sells: Number(data.trialUsage?.sells) || 0,
      expenses: Number(data.trialUsage?.expenses) || 0,
      quickSales: Number(data.trialUsage?.quickSales) || 0,
    };
    if (trialUsage && typeof trialUsage === "object") {
      for (const k of Object.keys(usage) as (keyof typeof usage)[]) {
        if (trialUsage[k] !== undefined) usage[k] = Math.max(usage[k], Number(trialUsage[k]) || 0);
      }
    }
    if (key && increment) {
      if (!(key in usage)) return res.status(400).json({ error: "invalid key" });
      (usage as any)[key] = Math.max(0, ((usage as any)[key] || 0) + Number(increment));
    }
    const exhausted = (Object.keys(limits) as (keyof typeof limits)[]).some(
      (k) => Number(limits[k]) > 0 && usage[k as keyof typeof usage] >= Number(limits[k])
    );
    const patch: Record<string, unknown> = {
      trialUsage: usage,
      updatedAt: new Date().toISOString(),
    };
    if (exhausted) {
      patch.subscriptionStatus = "Expired";
      patch.subscriptionEnforce = true;
    }
    await ref.set(patch, { merge: true });
    broadcastBusinessSync(userId, {
      domain: "trial",
      reason: "trial_usage_update",
      payload: { trialUsage: usage, exhausted },
    });
    res.json({ trialUsage: usage, exhausted, subscriptionStatus: exhausted ? "Expired" : data.subscriptionStatus });
  } catch (e) {
    console.error("trial-usage error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;
