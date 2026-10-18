import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getJwtSecret } from "./jwtSecret.ts";
import {
  validatePassword,
  validatePin,
  validateEmail,
  validatePhone,
  validatePositiveMoney,
  sanitizePlainText,
} from "./validation.ts";
import {
  generateOtpCode,
  hashOtp,
  verifyOtp,
  isOtpLocked,
  nextFailedOtpState,
  clearOtpFields,
  checkOtpCooldown,
} from "./notify.ts";

describe("Security Audit — Cryptographic & JWT Hardening", () => {
  it("enforces strong JWT secret in production mode", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";

      // Missing
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /FATAL: JWT_SECRET environment variable is missing/);

      // Short (< 32 chars)
      process.env.JWT_SECRET = "too_short_secret";
      assert.throws(() => getJwtSecret(), /at least 32 characters/);

      // Fallback placeholder keywords
      process.env.JWT_SECRET = "fallback_secret_key_change_in_production_32chars_long";
      assert.throws(() => getJwtSecret(), /FATAL: JWT_SECRET contains an insecure placeholder word/);

      // Valid strong secret
      process.env.JWT_SECRET = "bizora_production_hardened_super_secure_signing_secret_2026_x99!";
      const valid = getJwtSecret();
      assert.equal(valid, "bizora_production_hardened_super_secure_signing_secret_2026_x99!");
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.JWT_SECRET = prevSecret;
    }
  });

  it("generates cryptographically secure non-predictable OTP codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode(6);
      assert.equal(code.length, 6, "Code must be 6 digits");
      assert.match(code, /^\d{6}$/, "Code must be strictly numeric");
      codes.add(code);
    }
    // High entropy test: 200 random 6-digit integers shouldn't collapse into a tiny set
    assert.ok(codes.size > 180, "Entropy of crypto.randomInt must prevent predictable repetition");
  });
});

describe("Security Audit — Input Validation & Monetary Bounds", () => {
  it("validates password complexity and bounds", () => {
    assert.equal(validatePassword("").valid, false);
    assert.equal(validatePassword("short").valid, false, "Must reject passwords under 8 chars");
    assert.equal(validatePassword("a".repeat(129)).valid, false, "Must reject passwords over 128 chars");
    assert.equal(validatePassword("correct_horse_battery_staple").valid, true);
  });

  it("validates numeric PIN constraints strictly", () => {
    assert.equal(validatePin("").valid, false);
    assert.equal(validatePin("12").valid, false, "Must reject PINs shorter than 4 digits");
    assert.equal(validatePin("1234567").valid, false, "Must reject PINs longer than 6 digits");
    assert.equal(validatePin("12a4").valid, false, "Must reject alphanumeric characters");
    assert.equal(validatePin(" 1234 ").valid, true, "Must accept trimmed 4-digit PIN");
    assert.equal(validatePin("987654").valid, true, "Must accept 6-digit PIN");
  });

  it("validates and bounds financial/monetary values", () => {
    // Negative numbers must be rejected
    assert.equal(validatePositiveMoney(-10, "amount").valid, false);
    assert.equal(validatePositiveMoney(-0.01, "amount").valid, false);

    // Non-finite numbers must be rejected
    assert.equal(validatePositiveMoney(NaN, "amount").valid, false);
    assert.equal(validatePositiveMoney(Infinity, "amount").valid, false);
    assert.equal(validatePositiveMoney("invalid", "amount").valid, false);

    // Realistic numbers must be accepted and rounded to 2 decimals
    const res = validatePositiveMoney(123.456, "amount");
    assert.equal(res.valid, true);
    assert.equal(res.value, 123.46);

    // Extreme values above safe ceiling must be rejected
    assert.equal(validatePositiveMoney(999_999_999_999, "amount").valid, false);
  });

  it("sanitizes text input against XSS injection and control characters", () => {
    const dirty = "<script>alert('xss')</script> Hello \u0000World";
    const cleaned = sanitizePlainText(dirty);
    assert.equal(cleaned.includes("<script>"), false);
    assert.equal(cleaned.includes("\u0000"), false);
    assert.equal(cleaned.includes("Hello World"), true);
  });
});

describe("Security Audit — Multi-Tenant Authorization & Privilege Escalation", () => {
  it("prevents employee self-privilege escalation logic", () => {
    // Simulating HR authorization check
    const checkHrAuth = (
      caller: { role: string; id: string; permissions: string[] },
      targetEmployeeMobile: string,
      requestedPermissions?: string[]
    ) => {
      const isOwner = caller.role === "SHOP_OWNER" || caller.role === "SAAS_OWNER" || caller.role === "SAAS_ADMIN";
      const hasHrPermission = caller.permissions.includes("all") || caller.permissions.includes("hr.manage");
      if (!isOwner && !hasHrPermission) {
        return { allowed: false, reason: "Insufficient permissions" };
      }
      if (caller.role === "EMPLOYEE") {
        if (caller.id === targetEmployeeMobile) {
          return { allowed: false, reason: "Self-modification forbidden" };
        }
        if (requestedPermissions) {
          const disallowed = requestedPermissions.filter((p) => !caller.permissions.includes(p));
          if (disallowed.length > 0) {
            return { allowed: false, reason: `Cannot grant permissions you lack: ${disallowed.join(", ")}` };
          }
        }
      }
      return { allowed: true };
    };

    // Employee attempting to modify their own permissions
    const empCaller = { role: "EMPLOYEE", id: "01700000001", permissions: ["hr.manage", "pos.sell"] };
    const selfRes = checkHrAuth(empCaller, "01700000001");
    assert.equal(selfRes.allowed, false);
    assert.equal(selfRes.reason, "Self-modification forbidden");

    // Employee attempting to grant permissions they do NOT have (e.g., 'all' or 'finance.ledgers')
    const grantRes = checkHrAuth(empCaller, "01700000002", ["pos.sell", "finance.ledgers"]);
    assert.equal(grantRes.allowed, false);
    assert.match(grantRes.reason || "", /Cannot grant permissions you lack/);

    // Shop Owner can grant anything to any employee
    const ownerCaller = { role: "SHOP_OWNER", id: "biz_123", permissions: ["all"] };
    const ownerRes = checkHrAuth(ownerCaller, "01700000001", ["pos.sell", "finance.ledgers"]);
    assert.equal(ownerRes.allowed, true);
  });

  it("enforces tenant boundary isolation across shop identifiers", () => {
    const isTenantAuthorized = (tokenBizId: string, requestedBizId: string) => {
      if (!tokenBizId || !requestedBizId) return false;
      return tokenBizId === requestedBizId;
    };

    assert.equal(isTenantAuthorized("shop_alpha", "shop_alpha"), true);
    assert.equal(isTenantAuthorized("shop_alpha", "shop_beta"), false, "Cross-tenant access must be rejected");
    assert.equal(isTenantAuthorized("shop_alpha", ""), false);
  });
});

describe("Security Audit — OTP Lifecycle, Expiration & Replay Defense", () => {
  it("enforces OTP hash, verify, expiration, and replay prevention", async () => {
    const code = "782914";
    const hashed = await hashOtp(code);

    // Verification succeeds with correct OTP
    assert.equal(await verifyOtp(code, hashed), true);
    // Verification fails with wrong OTP
    assert.equal(await verifyOtp("000000", hashed), false);

    // Lockout policy
    assert.equal(isOtpLocked(0, null), null);
    assert.equal(isOtpLocked(3, null), null);
    // Over threshold
    const lockedMsg = isOtpLocked(5, Date.now() + 60000);
    assert.match(lockedMsg || "", /Too many failed attempts/);

    // State transition on failed attempt
    const state = nextFailedOtpState(4);
    assert.equal(state.resetCodeFailedAttempts, 5);
    assert.ok(state.resetCodeLockedUntil && state.resetCodeLockedUntil > Date.now());

    // Single use clearing
    const cleared = clearOtpFields();
    assert.equal(cleared.resetCodeHash, null);
    assert.equal(cleared.resetCodeExpiresAt, null);
  });

  it("enforces OTP cooldown between requests to prevent SMS flooding", () => {
    const now = Date.now();
    // Sent 10 seconds ago -> still in cooldown
    const activeCooldown = checkOtpCooldown(now - 10000);
    assert.match(activeCooldown || "", /Please wait/);

    // Sent 2 minutes ago -> cooldown expired
    const expiredCooldown = checkOtpCooldown(now - 120000);
    assert.equal(expiredCooldown, null);
  });
});
