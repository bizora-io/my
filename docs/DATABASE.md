# Bizora Database Structure

**Engine:** Google Cloud Firestore (via Firebase Admin SDK)

## Multi-tenant model

```
businesses/{businessId}          ← shop owner account + subscription
  ├── products/
  ├── transactions/
  ├── entities/                  ← customers & suppliers (type field)
  ├── staff/
  ├── warehouses/
  ├── financialAccounts/
  ├── onlineOrders/
  ├── … (see TENANT_SUBCOLLECTIONS in backend/src/lib/dbSchema.ts)
```

- **Shop owner JWT `id`** = `businessId`
- **Employee JWT** carries `businessId` of the active employment
- **SaaS roles** never use tenant paths; they use `/api/admin/*` + platform collections

## Platform (root) collections

| Collection | Purpose |
|------------|---------|
| `businesses` | Tenants (canonical “users” for shops) |
| `saasAdmins` | Platform staff |
| `saasOwnerConfig` | Owner 2FA |
| `saasTickets` | Platform support |
| `saasAlerts` | Admin alerts |
| `announcements` | Broadcasts |
| `auditLogs` | Audit trail |
| `revenuePayments` | SaaS payments |
| `mrrSnapshots` | MRR history |
| `platformConfig` | Global settings |
| `refreshTokens` | Auth rotation |
| `globalCustomers` / `globalEmployees` / `globalSuppliers` | Portal identities |
| `paymentIntents` / `paymentExternalIndex` | Billing |

## Deprecated

| Collection | Status |
|------------|--------|
| `users` | **Do not use.** Legacy alias; API now maps to `businesses`. |

## Indexes

Composite indexes may be required for:

- `businesses`: `email`, `mobile` (equality)
- `transactions`: `date` desc
- `saasTickets`: `status`, `business_id`

Create via Firebase console when Firestore suggests them after query failures.

## API schema endpoint

`GET /api/admin/db-schema` (SaaS Owner/Admin) returns the live summary from `getSchemaSummary()`.

## Online backup (no data without cloud path)

### Tenant (shop)
| Path | API |
|------|-----|
| `businesses/{id}/backups/{bkId}` | `GET/POST /api/backups` |
| Full Firestore dump | `POST /api/backups/export-full` |

`export-full` reads **every** tenant subcollection from Firestore and stores an encrypted online snapshot. Client offline queue still flushes via `POST /api/backups` when network returns.

### Platform (SaaS)
| Path | API |
|------|-----|
| `backups/{platform-…}` | `POST /api/admin/platform-backup` |
| List | `GET /api/admin/platform-backups` |

Includes all `businesses` docs (no password hashes) + saasTickets, announcements, alerts, revenue, MRR, audit (capped).

### Encryption
Set `BACKUP_AT_REST_KEY` (32-byte hex or any passphrase → SHA-256) so cloud payloads are AES-256-GCM at rest.

### Conflict / multi-device
Backup `meta` carries `deviceId`, `revision`, `contentHash` for client merge; server stores last N (default 7–30).
