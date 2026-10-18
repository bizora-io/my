# Bizora ERP — Security Architecture Specification

## 1. Threat Model & Defense-in-Depth

Bizora enforces a defense-in-depth security model designed to protect multi-tenant commercial data against unauthorized access, tenant crossover, credential stuffing, API abuse, and data corruption.

```text
 ┌────────────────────────────────────────────────────────┐
 │ Layer 1: Edge & Network Security                       │
 │ Cloudflare / Let's Encrypt TLS 1.3, Strict CORS, DDoS  │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │ Layer 2: HTTP & Request Security                       │
 │ Helmet Headers, Rate Limiting, JSON Body Caps          │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │ Layer 3: Authentication & Identity                     │
 │ Bcrypt Hashes, Strong JWT (typ:access), OTP Pepper     │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │ Layer 4: Authorization & Multi-Tenant Scoping          │
 │ businesses/{businessId}/* isolation, Role & Perm RBAC  │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │ Layer 5: Data & Cryptography at Rest                   │
 │ AES-256-GCM Backup Encryption, Immutable Audit Logs    │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Credential Management

### Password Hashing
- Algorithm: `bcryptjs` with salt work factor >= 10.
- Passwords are never logged, echoed, or stored in plaintext.
- SaaS Owner credentials use `SAAS_OWNER_PASSWORD_HASH` in `.env` (never plaintext).

### JWT Protocol
- **Access Tokens**: Short-lived (default 15 minutes). Must carry `typ: "access"`. Encoded with `getJwtSecret()`, which mandates >= 32 characters and forbids insecure placeholder keywords (`fallback`, `change_me`, etc.).
- **Refresh Tokens**: Long-lived (7–30 days). Carry a unique `jti` UUID stored in the `refreshTokens` Firestore collection.
- **Token Rotation**: Every refresh generates a new refresh token and deletes the prior `jti`.
- **Instant Revocation**: Calling `/api/auth/logout` revokes the active token pair immediately.

### OTP Cryptographic Hardening
- **Generation**: Uses `crypto.randomInt` for cryptographically strong, non-predictable 6-digit numeric codes.
- **Storage**: Stored as SHA-256 hashes combined with `OTP_PEPPER`.
- **Abuse Controls**: Capped at 5 maximum failed attempts before locking. Rate limited with exponential cooldown.
- **Production Guardrail**: `OTP_DEV_ECHO` is strictly prohibited in `NODE_ENV=production`. If set to true, the backend server aborts startup immediately.

---

## 3. Multi-Tenant Data Isolation

- **Path Enforcement**: All tenant records reside in subcollections beneath `businesses/{businessId}/`.
- **Zero Cross-Tenant Leakage**: Every query verifies the authenticated caller's tenant identifier (`req.user.businessId`). An attempt by Tenant A to query or write to Tenant B's subcollections returns `403 Forbidden`.
- **Firestore Security Rules**: Client SDK rules default to `allow read, write: if false;` for global collections, permitting authenticated reads only within the caller's verified user namespace.

---

## 4. Role-Based Access Control (RBAC)

### User Role Hierarchy
1. `SAAS_OWNER`: Full platform administration, billing, subscription packages, and tenant management.
2. `SAAS_ADMIN`: Platform operations, tenant assistance, support ticket resolution.
3. `SHOP_OWNER`: Full authority over their respective tenant business.
4. `EMPLOYEE`: Operational till and stock management restricted by active role template (`cashier`, `stock_manager`, `manager`).
5. `CUSTOMER`: Self-service portal access restricted to personal invoices and order tracking.
6. `SUPPLIER`: Purchase order management and dispatch status.

### Permission Checks
Sensitive business operations require explicit granular permissions verified server-side via `requirePermission(PERMISSIONS.FEATURE)`:
- `pos.terminal`, `pos.returns`, `pos.discounts`
- `inventory.adjust`, `inventory.transfer`
- `finance.cashbox`, `finance.journal`, `finance.expenses`
- `hrm.payroll`, `hrm.employees`

---

## 5. Network & HTTP Hardening

- **Helmet**: Active across all endpoints with secure HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`).
- **CORS Whitelist**: Locked to exact client domains defined in `CORS_ORIGINS`. Wildcards (`*`) are prohibited in production.
- **Rate Limiting**: `express-rate-limit` active on all public and authentication routes to mitigate brute force attacks.
- **Error Shielding**: Stack traces and internal database errors are completely suppressed in production error responses.

---

## 6. Data Encryption at Rest & Disaster Recovery

- **Backup Encryption**: Snapshots exported from the Firestore database are encrypted at rest using AES-256-GCM via `backend/src/lib/backupAtRest.ts`.
- **Automated Platform Backups**: Configured via `AUTO_PLATFORM_BACKUP_HOURS` to export sealed platform snapshots every 12 hours.
- **Audit Trails**: Critical security actions (login, 2FA setup, role updates, data export, platform config edits) are appended to the immutable `auditLogs` collection.

