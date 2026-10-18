import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole, forbidImpersonation, requireBusinessContext } from "./middleware/auth.js";
import { loginRateLimitGuard, markLoginFailed, markLoginSuccess } from "./middleware/loginRateLimit.js";
import { resolveStaffPermissions } from "../lib/rbacRoles.js";
import { issueTokenPair } from "../lib/tokenPair.js";
import { deliverOtp, generateOtpCode, checkOtpCooldown, hashOtp, verifyOtp, isOtpLocked, nextFailedOtpState, clearOtpFields } from "../lib/notify.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { validatePhone, validatePin, sanitizePlainText } from "../lib/validation.js";

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = "7d";

// Mirrors the frontend's `bizora_global_employee_registry`: one document
// per employee (mobile number), with an `employments[]` array covering
// every business they work at. Top-level (not under a single business)
// because one employee can belong to several businesses.
function employeesCollection() {
  return getDb().collection("globalEmployees");
}

function normalizeMobile(mobile: string): string {
  return (mobile || "").replace(/\D/g, "").replace(/^0+/, "");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// PATCH /api/employees/me/pin - self-service PIN change. Requires the
// employee's own JWT (from /api/auth/employee-login) - verifies their
// current PIN server-side and stores the new one hashed. Replaces the old
// client-side plaintext PIN comparison in EmployeePortal.tsx.
router.patch("/me/pin", authenticateToken, requireRole("EMPLOYEE"), async (req, res) => {
  try {
    const mobile = (req as any).user.id;
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: "currentPin and newPin are required" });
    }
    const pinValidation = validatePin(newPin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }

    const docRef = employeesCollection().doc(mobile);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Employee not found" });

    const data = doc.data()!;
    const match = await bcrypt.compare(currentPin, data.pinHash || "");
    if (!match) return res.status(401).json({ error: "Current login PIN is incorrect." });

    await docRef.set({ pinHash: await bcrypt.hash(String(newPin).trim(), BCRYPT_ROUNDS) }, { merge: true });
    markLoginSuccess(res);
    res.json({ success: true });
  } catch (error) {
    console.error("Employee PIN change error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

function authorizeHrManager(req: express.Request, targetEmployeeMobile?: string): { authorized: boolean; error?: string } {
  const user = (req as any).user;
  if (!user) return { authorized: false, error: "Unauthorized" };
  const isOwner = user.role === "SHOP_OWNER" || user.role === "SAAS_OWNER" || user.role === "SAAS_ADMIN";
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const hasHrPermission = permissions.includes("all") || permissions.includes("hr.manage") || permissions.includes("employees.manage");
  if (!isOwner && !hasHrPermission) {
    return { authorized: false, error: "Insufficient permissions to manage staff." };
  }
  if (user.role === "EMPLOYEE" && targetEmployeeMobile) {
    const userCleanMobile = normalizeMobile(user.id);
    const targetCleanMobile = normalizeMobile(targetEmployeeMobile);
    if (userCleanMobile && targetCleanMobile && userCleanMobile === targetCleanMobile) {
      return { authorized: false, error: "Employees cannot modify their own employment records or permissions." };
    }
  }
  return { authorized: true };
}

// POST /api/employees/link - create or update an employee + their
// employment at the calling (authenticated) business. Called from
// DataContext's addStaff().
router.post("/link", authenticateToken, requireBusinessContext, async (req, res) => {
  try {
    const businessId = (req as any).businessId || (req as any).user.businessId || (req as any).user.id;
    const { mobile, name, pin, businessName, ...employmentFields } = req.body;
    if (!mobile || !name) {
      return res.status(400).json({ error: "mobile and name are required" });
    }

    const docId = normalizeMobile(mobile) || mobile;
    const authCheck = authorizeHrManager(req, docId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }

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

    // Prevent privilege escalation: employee cannot grant permissions they lack
    const user = (req as any).user;
    if (user.role === "EMPLOYEE" && Array.isArray(employmentFields.permissions)) {
      const callerPerms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      if (!callerPerms.includes("all")) {
        const disallowed = employmentFields.permissions.filter((p: string) => !callerPerms.includes(p));
        if (disallowed.length > 0) {
          return res.status(403).json({ error: `Cannot grant permissions you do not possess: ${disallowed.join(", ")}` });
        }
      }
    }

    const docRef = employeesCollection().doc(docId);
    const existing = await docRef.get();

    const newEmployment = stripUndefined({
      businessId,
      businessName: sanitizePlainText(businessName || "Business"),
      status: "Active",
      ...employmentFields,
    });

    if (existing.exists) {
      const data = existing.data()!;
      const employments = Array.isArray(data.employments) ? data.employments : [];
      const idx = employments.findIndex((e: any) => e.businessId === businessId);
      if (idx > -1) employments[idx] = { ...employments[idx], ...newEmployment };
      else employments.push(newEmployment);

      const update: Record<string, any> = { name: sanitizePlainText(name), employments, mobile: docId };
      if (pin) update.pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
      await docRef.set(stripUndefined(update), { merge: true });
    } else {
      await docRef.set(
        stripUndefined({
          name: sanitizePlainText(name),
          mobile: docId,
          pinHash: await bcrypt.hash(String(pin || "1234").trim(), BCRYPT_ROUNDS),
          employments: [newEmployment],
        })
      );
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Link employee error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/employees/:mobile - update employee name/pin and/or this
// business's employment entry. Called from DataContext's updateStaff().
router.patch("/:mobile", authenticateToken, requireBusinessContext, async (req, res) => {
  try {
    const businessId = (req as any).businessId || (req as any).user.businessId || (req as any).user.id;
    const mobile = String(req.params.mobile);
    const docId = normalizeMobile(mobile) || mobile;

    const authCheck = authorizeHrManager(req, docId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }

    const docRef = employeesCollection().doc(docId);
    const existing = await docRef.get();
    if (!existing.exists) return res.status(404).json({ error: "Employee not found" });

    const { name, pin, ...employmentFields } = req.body;

    if (pin) {
      const pinValidation = validatePin(pin);
      if (!pinValidation.valid) {
        return res.status(400).json({ error: pinValidation.error });
      }
    }

    // Prevent privilege escalation: employee cannot grant permissions they lack
    const user = (req as any).user;
    if (user.role === "EMPLOYEE" && Array.isArray(employmentFields.permissions)) {
      const callerPerms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      if (!callerPerms.includes("all")) {
        const disallowed = employmentFields.permissions.filter((p: string) => !callerPerms.includes(p));
        if (disallowed.length > 0) {
          return res.status(403).json({ error: `Cannot grant permissions you do not possess: ${disallowed.join(", ")}` });
        }
      }
    }

    const data = existing.data()!;
    const employments = Array.isArray(data.employments) ? data.employments : [];
    const idx = employments.findIndex((e: any) => e.businessId === businessId);
    if (idx > -1) employments[idx] = stripUndefined({ ...employments[idx], ...employmentFields });

    const update: Record<string, any> = { employments };
    if (name) update.name = sanitizePlainText(name);
    if (pin) update.pinHash = await bcrypt.hash(String(pin).trim(), BCRYPT_ROUNDS);
    await docRef.set(stripUndefined(update), { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/employees/:mobile - mark this business's employment inactive
// (doesn't remove the employee - they may still work elsewhere). Called
// from DataContext's deleteStaff().
router.delete("/:mobile", authenticateToken, requireBusinessContext, forbidImpersonation, async (req, res) => {
  try {
    const businessId = (req as any).businessId || (req as any).user.businessId || (req as any).user.id;
    const mobile = String(req.params.mobile);
    const docId = normalizeMobile(mobile) || mobile;

    const authCheck = authorizeHrManager(req, docId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }

    const docRef = employeesCollection().doc(docId);
    const existing = await docRef.get();
    if (!existing.exists) return res.json({ success: true });

    const data = existing.data()!;
    const employments = Array.isArray(data.employments) ? data.employments : [];
    const idx = employments.findIndex((e: any) => e.businessId === businessId);
    if (idx > -1) {
      employments[idx].status = "Inactive";
      employments[idx].resignationDate = new Date().toISOString().split("T")[0];
      await docRef.set({ employments }, { merge: true });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Deactivate employee error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/employee-login - public. Verifies a mobile+PIN against
// the global employee registry and returns their active employments.
export const employeeLoginRouter = express.Router();
employeeLoginRouter.post("/employee-login", loginRateLimitGuard, async (req, res) => {
  try {
    const { identifier, pin } = req.body;
    if (!identifier || !pin) {
      return res.status(400).json({ error: "identifier and pin are required" });
    }
    const cleanMobile = normalizeMobile(identifier);

    let doc = await employeesCollection().doc(cleanMobile).get();
    if (!doc.exists && cleanMobile.length >= 8) {
      // Fall back to a suffix match only for realistic phone lengths (>= 8 digits).
      const snapshot = await employeesCollection().get();
      const match = snapshot.docs.find((d) => d.id.length >= 8 && (d.id.endsWith(cleanMobile) || cleanMobile.endsWith(d.id)));
      if (match) doc = match;
    }
    if (!doc.exists) {
      markLoginFailed(res);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const data = doc.data()!;
    const match = await bcrypt.compare(pin, data.pinHash || "");
    if (!match) {
      markLoginFailed(res);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const employments = (data.employments || []).filter((e: any) => e.status === "Active");
    if (employments.length === 0) {
      return res.status(403).json({ error: "No active employment found for this account." });
    }

    // Prefer explicit businessId from body when employee works at multiple shops
    const requestedBiz = (req.body.businessId || "").trim();
    const employment =
      (requestedBiz && employments.find((e: any) => e.businessId === requestedBiz)) || employments[0];

    let permissions: string[] = Array.isArray(employment.permissions) ? employment.permissions : [];
    let roleTemplateId = employment.roleTemplateId as string | undefined;
    let roleLabel = employment.role as string | undefined;
    // Fallback: load staff record under the business
    if (employment.businessId) {
      try {
        const staffSnap = await getDb()
          .collection("businesses")
          .doc(employment.businessId)
          .collection("staff")
          .where("mobile", "==", doc.id)
          .limit(1)
          .get();
        if (!staffSnap.empty) {
          const sd = staffSnap.docs[0].data();
          if (Array.isArray(sd.permissions) && sd.permissions.length) permissions = sd.permissions;
          if (sd.roleTemplateId) roleTemplateId = sd.roleTemplateId;
          if (sd.role) roleLabel = sd.role;
        }
      } catch {
        /* ignore */
      }
    }
    permissions = resolveStaffPermissions({
      role: roleLabel,
      permissions,
      roleTemplateId,
    });

    try {
      await doc.ref.set({ lastLoginAt: new Date().toISOString() }, { merge: true });
    } catch { /* ignore */ }

    const tokens = await issueTokenPair({
      id: doc.id,
      email: data.email || "",
      role: "EMPLOYEE",
      businessId: employment.businessId,
      staffId: employment.staffId || employment.id || null,
      permissions,
    });
    markLoginSuccess(res);
    res.json({
      employee: { mobile: doc.id, name: data.name, employments, activeBusinessId: employment.businessId, permissions },
      ...tokens,
    });
  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

employeeLoginRouter.post("/employee-reset-pin/request", loginRateLimitGuard, async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ error: "identifier (mobile) is required" });
    const cleanMobile = normalizeMobile(identifier);
    let docRef = employeesCollection().doc(cleanMobile);
    let doc = await docRef.get();
    if (!doc.exists && cleanMobile.length >= 8) {
      const snapshot = await employeesCollection().get();
      const match = snapshot.docs.find((d) => d.id.length >= 8 && (d.id.endsWith(cleanMobile) || cleanMobile.endsWith(d.id)));
      if (match) { doc = match; docRef = match.ref; }
    }
    // Always generic success to avoid enumeration
    if (!doc.exists) return res.json({ sent: true });

    const data = doc.data() || {};
    const cooldown = checkOtpCooldown(data.resetCodeLastSentAt);
    if (cooldown) return res.status(429).json({ error: cooldown });
    const locked = isOtpLocked(data.resetCodeFailedAttempts, data.resetCodeLockedUntil);
    if (locked) return res.status(429).json({ error: locked });

    const code = generateOtpCode();
    const delivery = await deliverOtp({
      purpose: "PIN reset",
      identifier: doc.id,
      code,
      preferredChannel: "sms",
    });
    if (!delivery.ok) return res.status(503).json({ error: delivery.error || "Failed to deliver code" });

    await docRef.set({
      resetCodeHash: await hashOtp(code),
      resetCodeExpiresAt: Date.now() + 10 * 60 * 1000,
      resetCodeLastSentAt: Date.now(),
      resetCodeFailedAttempts: 0,
      resetCodeLockedUntil: null,
    }, { merge: true });
    const body: Record<string, any> = { sent: true, channel: delivery.channel, provider: delivery.provider };
    if (delivery.devCode) body.devCode = delivery.devCode;
    res.json(body);
  } catch (error) {
    console.error("Employee reset-pin request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

employeeLoginRouter.post("/employee-reset-pin/confirm", loginRateLimitGuard, async (req, res) => {
  try {
    const { identifier, otp, newPin } = req.body || {};
    if (!identifier || !otp || !newPin) return res.status(400).json({ error: "identifier, otp and newPin are required" });

    const pinValidation = validatePin(newPin);
    if (!pinValidation.valid) {
      return res.status(400).json({ error: pinValidation.error });
    }

    const cleanMobile = normalizeMobile(identifier);
    let docRef = employeesCollection().doc(cleanMobile);
    let doc = await docRef.get();
    if (!doc.exists && cleanMobile.length >= 8) {
      const snapshot = await employeesCollection().get();
      const match = snapshot.docs.find((d) => d.id.length >= 8 && (d.id.endsWith(cleanMobile) || cleanMobile.endsWith(d.id)));
      if (match) { doc = match; docRef = match.ref; }
    }
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
    await docRef.set({ pinHash: await bcrypt.hash(String(newPin).trim(), BCRYPT_ROUNDS), ...clearOtpFields() }, { merge: true });
    markLoginSuccess(res);
    res.json({ success: true });
  } catch (error) {
    console.error("Employee reset-pin confirm error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
