---
name: bizora-security-audit
description: >-
  Use this skill when auditing, hardening, or testing the security of Bizora ERP.
  Covers authentication, authorization, multi-tenant isolation, secrets exposure,
  API rate limiting, cryptographic practices, and defensive logging.
---

# Bizora Security Audit Skill

## Purpose & Scope
This skill provides a standardized, repeatable security audit workflow for the Bizora multi-tenant SaaS ERP monorepo. It ensures that every code modification maintains zero-trust boundaries, rigorous tenant isolation, and cryptographic integrity.

## When to Use
- Whenever modifying authentication, authorization, or session logic (`backend/src/api/auth.ts`, `jwtSecret.ts`, `tokenPair.ts`).
- Whenever modifying multi-tenant Firestore queries or database access patterns (`backend/src/lib/resilientDb.ts`, `firestore.rules`).
- Prior to public releases or production deployment reviews.
- When evaluating external dependencies, webhooks, or payment integrations.

## Core Security Pillars

### 1. Authentication & Token Management
- **Password Security**: Passwords must be hashed using bcrypt with salt rounds >= 10 (`bcryptjs`). Plaintext passwords must never be stored, cached, or logged.
- **JWT Cryptography**:
  - `JWT_SECRET` must be cryptographically strong (>= 32 characters) and never contain placeholder keywords (`fallback`, `change_me`, `your_super_secret`).
  - Access tokens must carry `typ: "access"` and have short TTL (default: 15 minutes).
  - Refresh tokens must be rotated upon use (`jti` tracked in `refreshTokens` collection) and revoked on logout.
- **OTP Hardening**:
  - OTP codes must be generated using `crypto.randomInt` (cryptographic pseudo-random number generator).
  - OTPs must be stored hashed with a secret pepper (`OTP_PEPPER`).
  - Strict rate limiting and lockout: maximum 5 attempts, cooldown period enforced (`notify.ts`).
  - `OTP_DEV_ECHO` must never be enabled in `production` mode (server must abort startup if true).

### 2. Multi-Tenant Isolation (Zero Cross-Tenant Leakage)
- **Tenant Path Isolation**: All shop data MUST reside under `businesses/{businessId}/{subcollection}`.
- **Context Enforcement**: Handlers must verify `req.user.businessId` matches the target resource. Never allow a tenant to pass arbitrary `businessId` in URL or body to access another tenant's data.
- **Employee Containment**: Employees must only access the `businessId` of their active employment.

### 3. Role-Based Access Control (RBAC)
- **SaaS Platform Separation**: Endpoints under `/api/admin/*` require `SAAS_OWNER` or `SAAS_ADMIN` role. Shop owners, employees, and customers must receive `401 Unauthorized` or `403 Forbidden`.
- **Operational Permissions**: Shop employee actions must check explicit permission strings (e.g. `pos.terminal`, `finance.cashbox`, `inventory.adjust`) using `requirePermission()`.
- **Server-Side Enforcement**: Permissions must always be validated on the backend API, never trusted purely from frontend UI visibility.

### 4. Input Validation & Defense in Depth
- **Input Sanitization**: Validate and sanitize string inputs, emails, phone numbers, and monetary amounts (`backend/src/lib/validation.ts`).
- **HTTP Security**:
  - `helmet` headers enabled across all Express routes.
  - CORS strictly configured to whitelist legitimate APP and ADMIN origins.
  - Body parsers capped with explicit size limits to prevent denial-of-service.

### 5. Sensitive Data & At-Rest Encryption
- Cloud backup snapshots stored in Firestore must be encrypted at rest with AES-256-GCM using `BACKUP_AT_REST_KEY` (`backupAtRest.ts`).
- PII and credentials must be scrubbed from logs and error payloads (no stack traces returned in production mode).

## Verification Procedure

Run the automated security regression tests:
```bash
node --experimental-strip-types --test backend/src/lib/securityAudit.test.ts backend/src/lib/readiness.test.ts backend/src/lib/loginRateLimit.test.ts
```

Check production readiness gates:
```bash
node -e "const { runReadinessChecks } = require('./backend/dist/server.cjs'); console.log(runReadinessChecks());"
```

## Failure Handling
- If any test fails: Halt modifications immediately. Identify the root cause without weakening security rules or bypassing checks.
- If a secret or sensitive key is found in git history or client bundles: Flag as critical, rotate the credential, and update `.gitignore`.

