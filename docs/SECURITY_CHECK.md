# Bizora — Security Check

Use this checklist before any public or production deploy.  
Mark each item **PASS / FAIL / N/A** and date.

---

## 1. Secrets & environment

| Check | How | Status |
|-------|-----|--------|
| `JWT_SECRET` is long random (≥32 chars), **not** sample/fallback | `.env` + no `fallback_secret_key` in prod logs | |
| Same `JWT_SECRET` on all API instances | Compare env across servers | |
| `NODE_ENV=production` | Process env | |
| `OTP_DEV_ECHO` is **false** / unset | Server refuses start if true in production | |
| `OTP_SKIP_COOLDOWN` is **0** / unset | `.env` | |
| SaaS owner password is **hash** (`SAAS_OWNER_PASSWORD_HASH`), not plaintext | bcrypt hash only | |
| Firebase service account **not** in git | `.gitignore`; CI secrets | |
| `BACKUP_AT_REST_KEY` set for cloud backups | AES-GCM at rest | |
| API keys (Twilio, Stripe, SMTP) only in env | No hardcoded keys in repo | |
| `.env` never committed | `git status` / history scan | |

Generate JWT secret example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 2. Authentication & sessions

| Check | How | Status |
|-------|-----|--------|
| Shop login issues `typ: access` + refresh pair | Network: `/api/auth/login` response | |
| Refresh rotation / revoke on logout | `/api/auth/refresh`, `/api/auth/logout` | |
| Access token short TTL (e.g. 15m) | `JWT_ACCESS_TTL` | |
| Login rate limit active | Fail password 5+ times → 429 | |
| OTP cooldown + lockout | Repeated wrong OTP | |
| 2FA pre-auth token cannot call business APIs | Call `/api/products` with preAuth JWT → reject | |
| Employee PIN not accepted as shop password path only | Shop needs password | |
| Admin portal does not accept shop-only session without SaaS role | Admin gate | |
| Impersonation: backup SaaS token; exit restores admin | Login-as → exit | |
| Impersonation time-limited / audited | `auditLogs` | |
| No JWT in URL query strings | Code review | |

---

## 3. Authorization (RBAC)

| Check | How | Status |
|-------|-----|--------|
| `/api/admin/*` requires `SAAS_OWNER` or `SAAS_ADMIN` | Call with shop token → 401/403 | |
| Tenant routes require business context | Employee without `businessId` → 403 | |
| Shop A token cannot read Shop B data | Swap business ids | |
| `requirePermission` on sensitive writes | Stock adjust, settings, payroll | |
| Server enforces permissions (not UI-only) | Disable UI check; call API | |
| Trial limits enforced server-side | Exceed trial → blocked | |
| Suspended account cannot login / API | `accountStatus: Suspended` | |

---

## 4. HTTP / network

| Check | How | Status |
|-------|-----|--------|
| Helmet enabled | `server.ts` | |
| CORS allowlist only APP/ADMIN origins | No `*` in production | |
| HTTPS only in production | Redirect HTTP→HTTPS | |
| Rate limit on auth and public routes | express-rate-limit | |
| Body size limits | Large JSON rejected | |
| No stack traces in production error JSON | Force 500; inspect body | |

---

## 5. Data & Firestore

| Check | How | Status |
|-------|-----|--------|
| Firestore security rules deny unauthenticated client abuse | Rules simulator | |
| Client uses least privilege; primary writes via backend | Architecture | |
| Passwords only as bcrypt hashes | Never store plaintext | |
| OTP stored hashed (not plain) | `hashOtp` | |
| Backup payloads encrypted at rest when key set | `BACKUP_AT_REST_KEY` | |
| PII minimized in logs | No password/OTP in logs | |
| Multi-tenant path `businesses/{id}/...` isolation | Rules + API | |

---

## 6. Payments & webhooks

| Check | How | Status |
|-------|-----|--------|
| Webhook signatures verified | Stripe/provider secret | |
| Idempotent payment intents | Replay same id | |
| No secret keys in frontend bundle | Search built `dist` | |

---

## 7. Client / XSS / storage

| Check | How | Status |
|-------|-----|--------|
| Tokens in `localStorage` — accepted risk; consider XSS hardening | CSP, sanitize HTML | |
| User-generated HTML escaped | React text nodes; no raw `dangerouslySetInnerHTML` without sanitize | |
| CSP headers (optional but recommended) | Helmet contentSecurityPolicy | |
| Admin and shop apps separate origins | Reduces token mix-ups | |

---

## 8. Dependency & supply chain

| Check | How | Status |
|-------|-----|--------|
| `npm audit` — no unfixed **high/critical** without waiver | `npm audit` | |
| Lockfile committed (`package-lock.json`) | Git | |
| No postinstall scripts from untrusted pkgs without review | `npm install-scripts` | |

---

## 9. Operational

| Check | How | Status |
|-------|-----|--------|
| Readiness endpoint | `GET /api/admin/readiness` (auth) | |
| Backup restore tested | Export-full → restore drill | |
| Log retention / access limited | Hosting policy | |
| Incident contact / rotate JWT plan documented | Runbook | |

---

## Quick prod gate (minimum)

Before going live, **all** must be true:

1. [ ] `NODE_ENV=production`  
2. [ ] Strong unique `JWT_SECRET`  
3. [ ] `OTP_DEV_ECHO` off  
4. [ ] Real OTP delivery configured  
5. [ ] CORS locked to real domains  
6. [ ] HTTPS  
7. [ ] Admin API rejects shop tokens  
8. [ ] Shop API rejects cross-tenant access  
9. [ ] Smoke test passed  
10. [ ] Backups verified  

---

## Related docs

- `docs/PRODUCTION.md` — env and deploy  
- `docs/DATABASE.md` — data model  
- `docs/SMOKE_TEST.md` — functional checks  
- `docs/REMAINING_WORK.md` — feature backlog  

**Sign-off:** _________________ Date: ___________  
