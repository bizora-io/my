---
name: bizora-database-integrity
description: >-
  Use this skill when inspecting, verifying, or modifying Bizora database schemas,
  Firestore rules, subcollection structures, indexes, backups, and data synchronization.
  Enforces strict safety: NEVER reset, truncate, or delete production data.
---

# Bizora Database Integrity Skill

## Purpose & Scope
Bizora utilizes Google Cloud Firestore (via `firebase-admin` on the server and resilient client-side caching). This skill governs data modeling, schema consistency, indexing, offline synchronization, and disaster recovery.

## Critical Safety Rule
> [!CAUTION]
> **NEVER reset, drop, truncate, or delete production databases or tenant collections as part of automated verification or routine testing.** All testing and verification must execute against local mocks, scratch databases, or non-destructive test identifiers.

## Firestore Collection Hierarchy

### 1. Platform Root Collections
Defined in `backend/src/lib/dbSchema.ts` under `PLATFORM_COLLECTIONS`:
- `businesses`: The canonical tenant registry. Document ID = shop owner user ID. Contains business settings, owner credentials hash, subscription status, plan limits, and active module flags.
- `saasAdmins`: SaaS administration accounts (bcrypt password hash).
- `saasOwnerConfig`: 2FA secret and recovery configurations for the SaaS platform owner.
- `saasTickets`: Cross-tenant support requests escalated to platform administrators.
- `saasAlerts`: System alerts feed for platform operations.
- `announcements`: Global broadcast notices delivered to tenant dashboards.
- `auditLogs`: Immutable system audit trail capturing sensitive modifications.
- `revenuePayments`: Platform revenue and subscription invoice records.
- `mrrSnapshots`: Monthly recurring revenue snapshots.
- `platformConfig`: Global platform configurations and subscription plan templates (`doc: "settings"`).
- `refreshTokens`: Whitelisted active refresh token `jti` hashes for token rotation and instant revocation.
- `backups`: Encrypted platform-level disaster recovery snapshots.

### 2. Tenant Subcollections (`businesses/{businessId}/{sub}`)
Defined in `backend/src/lib/dbSchema.ts` under `TENANT_SUBCOLLECTIONS`:
- `products`: SKU catalog, barcode, pricing, min/max thresholds, unit definitions.
- `transactions`: Point-of-sale invoices, vendor bills, customer returns, expenses (idempotent by client `id`).
- `entities`: Customer profiles and supplier accounts (differentiated by `type: "customer" | "supplier"`).
- `staff`: Shop employee roster, active role template, shift history.
- `warehouses`: Retail stores, branch outlets, storage bins.
- `financialAccounts`: Cash drawers, bKash/Nagad merchant accounts, bank ledgers.
- `journalEntries`: Double-entry audit-grade debit and credit postings.
- `productionBatches` & `boms`: Manufacturing recipes, lot numbers, and FEFO expiry tracking.
- `backups`: Per-tenant encrypted backup snapshots created on demand or via automated schedules.

## Offline Synchronization & Conflict Resolution
- **IndexedDB Local Queue**: When offline, client checkouts, stock deductions, and payments are stored in IndexedDB (`frontend/src/lib/offlineQueue.ts`).
- **Idempotent Write Keys**: All transaction documents generate an immutable UUID at the counter before dispatching to the network. Re-transmissions of the same transaction ID update rather than duplicate sales.
- **Optimistic Reconciliation**: Incoming offline transactions are ordered by counter timestamp and processed with server-side validation against product lot balances.

## Backup, Encryption & Recovery
- **At-Rest Encryption**: Cloud backup payloads are encrypted using AES-256-GCM via `backend/src/lib/backupAtRest.ts` using `BACKUP_AT_REST_KEY`.
- **Tenant Export**: `POST /api/backups/export-full` traverses every tenant subcollection and writes a point-in-time encrypted snapshot.
- **Automated Platform Backups**: Configurable via `AUTO_PLATFORM_BACKUP_HOURS` (default: every 12 hours).

## Verification Procedure

Run schema and database logic unit tests:
```bash
node --experimental-strip-types --test backend/src/lib/backupAtRest.test.ts shared/lib/fefo.test.ts shared/lib/journalAutoPost.test.ts
```

Inspect database schema metadata via script:
```bash
node -e "const { PLATFORM_COLLECTIONS, TENANT_SUBCOLLECTIONS } = require('./backend/dist/server.cjs'); console.log('Platform collections:', PLATFORM_COLLECTIONS.length, 'Tenant subcollections:', TENANT_SUBCOLLECTIONS.length);"
```

