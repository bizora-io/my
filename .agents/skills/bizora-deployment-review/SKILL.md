---
name: bizora-deployment-review
description: >-
  Use this skill when preparing, validating, or auditing production deployment artifacts,
  Vercel rewrites, environment variables, security headers, health endpoints, or rollback runbooks.
  Enforces safety: NEVER deploy automatically without explicit authorization.
---

# Bizora Deployment Review Skill

## Purpose & Scope
This skill provides a pre-flight deployment audit protocol for Bizora's multi-tier deployment infrastructure, covering the Express API server, the Vercel-hosted frontend app, and the isolated SaaS admin dashboard.

## Critical Safety Rule
> [!IMPORTANT]
> **NEVER trigger production deployments, cloud service updates, or DNS switches automatically without explicit user authorization.**

## Pre-Flight Deployment Checklist

### 1. Production Environment Variables Verification
Inspect backend environment configuration (never display actual secret values):
- `NODE_ENV=production`
- `JWT_SECRET`: Random string >= 32 characters, no fallback keywords.
- `OTP_DEV_ECHO`: Must be explicitly `false` (process will exit if true in production).
- `OTP_PEPPER`: Strong random pepper, not default `change-me`.
- `SAAS_OWNER_EMAIL` & `SAAS_OWNER_PASSWORD_HASH`: Valid bcrypt hash.
- `BACKUP_AT_REST_KEY`: 32-byte hex key for encrypting cloud backups at rest.
- `CORS_ORIGINS`: Strict comma-separated list of production origins (e.g., `https://bizora.io,https://shop.bizora.io,https://employee.bizora.io,https://customer.bizora.io,https://dashboard_admin.bizora.io`).

### 2. Vercel Configuration & Security Headers
Verify `frontend/vercel.json` and `admin/vercel.json`:
- **API Rewrites**: Route `/api/(.*)` to the verified backend API host.
- **SPA Fallback**: Route `/(.*)` to `/index.html`.
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Robots-Tag: noindex, nofollow` (mandatory on `admin/vercel.json` to prevent indexing of SaaS administration).
  - Asset caching: `Cache-Control: public, max-age=31536000, immutable` for `/assets/(.*)`.

### 3. API Health & Readiness Probes
The backend exposes standard health and readiness probes:
- `GET /api/health`: Basic liveness check returning `{ status: "ok", timestamp }`.
- `GET /api/health/ready`: Readiness check confirming Firestore connection and environment sanity.
- `GET /api/admin/readiness` (Authenticated SaaS role): Deep production gate evaluation returning `readyForProd: true | false`.

## Rollback Procedure
If a production release exhibits unexpected behavior:
1. **Frontend / Admin (Vercel)**:
   - Instant rollback to the previous deployment SHA via Vercel dashboard or CLI.
   - Zero downtime since static artifacts are immutable.
2. **Backend API (Node/Docker)**:
   - Revert container image tag to previous build (e.g. `bizora-api:latest-stable`).
   - Run readiness check against standby instance before switching traffic balancer.
3. **Database Safeguards**:
   - Restore point-in-time snapshot from `backups` collection using `POST /api/admin/platform-backup/restore` or Firestore Console if data corruption occurred.

## Verification Procedure
Run the build and readiness test suite:
```bash
npm run build && node --experimental-strip-types --test backend/src/lib/readiness.test.ts
```

