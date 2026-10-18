# Bizora ERP — Master Security Checklist & Audit Log

This checklist tracks security controls and governance policies across the Bizora multi-tenant SaaS ERP monorepo.

**Status Legend:**
- `PASS`: Formally verified with empirical test or code audit evidence.
- `IN_PROGRESS`: Currently being implemented or refined.
- `BLOCKED`: Impeded by external dependency or infrastructure prerequisite.
- `NOT_STARTED`: Scheduled for future security hardening cycle.
- `FAIL`: Failed verification; requires immediate remediation.
- `NOT_APPLICABLE`: Not applicable to this environment.

---

## 1. Secrets & Environment Configuration

| Check Item | Description | Status | Evidence / Verification Method |
| :--- | :--- | :---: | :--- |
| **SEC-01** | `JWT_SECRET` is strong (>= 32 chars) without insecure fallback keywords | `PASS` | `backend/src/lib/jwtSecret.ts` throws fatal error if missing or matching placeholder words. Verified in `securityAudit.test.ts`. |
| **SEC-02** | `NODE_ENV` production enforcement | `PASS` | Verified in `readiness.ts` and `server.ts`. |
| **SEC-03** | `OTP_DEV_ECHO` strictly disabled in production | `PASS` | `server.ts` aborts process startup if `NODE_ENV=production` and `OTP_DEV_ECHO=true`. |
| **SEC-04** | `OTP_PEPPER` enforced | `PASS` | `server.ts` terminates startup if missing or set to `change-me`. |
| **SEC-05** | SaaS Owner password stored as bcrypt hash (`SAAS_OWNER_PASSWORD_HASH`) | `PASS` | `server.ts` verifies hash format using `bcrypt.compare`. Plaintext credentials forbidden in configuration. |
| **SEC-06** | Firebase credentials excluded from Git | `PASS` | `.gitignore` explicitly ignores `*.json` credentials and `.env` files. |
| **SEC-07** | `BACKUP_AT_REST_KEY` active for encrypted snapshots | `PASS` | `backupAtRest.ts` uses AES-256-GCM encryption. Verified in `backupAtRest.test.ts`. |
| **SEC-08** | Client bundles contain zero private keys or secrets | `PASS` | Only `VITE_` prefixed public routing URLs exist in `frontend/` and `admin/`. Verified in production bundle inspect. |

---

## 2. Authentication & Session Management

| Check Item | Description | Status | Evidence / Verification Method |
| :--- | :--- | :---: | :--- |
| **AUTH-01** | Passwords hashed with salt factor >= 10 | `PASS` | `bcryptjs` used across shop registration, employee creation, and admin seeding. |
| **AUTH-02** | Access tokens carry `typ: "access"` and short TTL | `PASS` | Verified in `tokenPair.ts`. Token verification enforces `decoded.typ === "access"`. |
| **AUTH-03** | Refresh token rotation & `jti` invalidation | `PASS` | `auth.ts` verifies and consumes `jti` in `refreshTokens` collection upon each exchange. |
| **AUTH-04** | Instant session revocation on logout | `PASS` | `POST /api/auth/logout` deletes active `jti` immediately. |
| **AUTH-05** | Login rate limiting active | `PASS` | Express rate limiter limits failed attempts. Verified in `loginRateLimit.test.ts`. |
| **AUTH-06** | Cryptographic random OTP generation | `PASS` | Uses `crypto.randomInt` (high entropy). Verified in `securityAudit.test.ts`. |
| **AUTH-07** | OTP lockout after 5 failed attempts | `PASS` | State transitions to locked in `notify.ts`. Verified in `securityAudit.test.ts`. |
| **AUTH-08** | 2FA pre-auth token cannot call business APIs | `PASS` | Pre-auth token carries `typ: "pre_auth"`. Business routes require `typ: "access"`. |

---

## 3. Authorization & Multi-Tenant Scoping

| Check Item | Description | Status | Evidence / Verification Method |
| :--- | :--- | :---: | :--- |
| **AUTHZ-01** | `/api/admin/*` gates non-SaaS roles | `PASS` | Middleware requires `SAAS_OWNER` or `SAAS_ADMIN`. Regular shop tokens receive `403 Forbidden`. |
| **AUTHZ-02** | Strict multi-tenant isolation under `businesses/{businessId}/` | `PASS` | All tenant subcollections require matching `req.user.businessId`. Cross-tenant reading is rejected. |
| **AUTHZ-03** | Server-side permission checks (`requirePermission`) | `PASS` | Operational mutations verify explicit permissions. Verified in `rbacRoles.test.ts`. |
| **AUTHZ-04** | Subscription trial quotas enforced server-side | `PASS` | `trialLimits.ts` blocks store, staff, product, or invoice creation exceeding limits. Verified in `trialLimits.test.ts`. |

---

## 4. HTTP, Network & Webhooks

| Check Item | Description | Status | Evidence / Verification Method |
| :--- | :--- | :---: | :--- |
| **NET-01** | Helmet security headers active | `PASS` | Mounted in `server.ts` (`nosniff`, `DENY`, `strict-origin`). |
| **NET-02** | CORS locked to verified origins | `PASS` | `server.ts` checks origin against `CORS_ORIGINS`. Rejects arbitrary origins. |
| **NET-03** | Express JSON body size caps | `PASS` | Body parser capped at 1MB to prevent memory exhaustion attacks. |
| **NET-04** | Production error sanitization | `PASS` | Error middleware suppresses internal stack traces in production responses. |
| **NET-05** | Outbound webhook HMAC-SHA256 signatures | `PASS` | Outbound webhooks include `X-Bizora-Signature` header computed via HMAC-SHA256. |

---

## 5. UI, Client & Supply Chain Safety

| Check Item | Description | Status | Evidence / Verification Method |
| :--- | :--- | :---: | :--- |
| **CLIENT-01**| Public landing page excludes SaaS Admin links | `PASS` | Header, Hero, and Footer in `LandingPage.tsx` verified to contain zero admin references. |
| **CLIENT-02**| Legal policies integrated and accessible | `PASS` | `LegalModal.tsx` contains 6 complete policies accessible via footer and URL hashes. |
| **CLIENT-03**| Lockfile committed (`package-lock.json`) | `PASS` | Monorepo lockfile version-controlled and synchronized. |
| **CLIENT-04**| Zero unvetted post-install scripts | `PASS` | Dependencies restricted to audited packages (`firebase-admin`, `bcryptjs`, `express`, `helmet`, `lucide-react`). |

---

## Sign-Off & Verification Metadata
- **Last Verified Date**: 2026-10-19
- **Automated Tests Passing**: 106 / 106 (`npm test`)
- **TypeScript Diagnostics**: 0 Errors (`npm run lint`)
- **Reviewer**: Antigravity AI Security & Governance Engine

