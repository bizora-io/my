# Bizora ERP — Master Production Deployment Runbook

## 1. System Architecture & Port Allocations

Bizora is deployed as three independent runtime services:

| Application | Technology | Default Port | Production Domain | Hosting Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **API Server** | Node.js 22 / Docker | `:3000` | `https://api.bizora.io` | VPS (Ubuntu 24.04), AWS ECS, or DigitalOcean |
| **Business Frontend** | Vite SPA (Static) | `:5173` | `https://bizora.io`, `https://shop.bizora.io` | Vercel or Cloudflare Pages |
| **SaaS Admin** | Vite SPA (Static) | `:5174` | `https://dashboard_admin.bizora.io` | Vercel (Isolated Team Project) |

---

## 2. Environment Configuration

### Backend (`backend/.env` or Secrets Manager)
All variables marked **Required** must be configured prior to starting the production server:

| Variable | Required | Production Guidance |
| :--- | :---: | :--- |
| `NODE_ENV` | **YES** | Must be set to `production`. |
| `PORT` | **YES** | Typically `3000` (or `3001` if reverse-proxied behind Caddy). |
| `JWT_SECRET` | **YES** | Strong random string (>= 32 chars). Generated via `crypto.randomBytes(48).toString('hex')`. |
| `JWT_ACCESS_TTL` | NO | Default: `15m` (15 minutes). |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **YES** | Complete JSON string or file path to Google Service Account. |
| `SAAS_OWNER_EMAIL` | **YES** | Canonical email of the platform administrator. |
| `SAAS_OWNER_PASSWORD_HASH` | **YES** | Bcrypt hash generated via `node backend/scripts/generate-password-hash.mjs "password"`. |
| `OTP_PEPPER` | **YES** | Random pepper string for OTP SHA-256 hashing. Cannot be `change-me`. |
| `OTP_DEV_ECHO` | **YES** | Must be `false` or unset. (Server terminates if `true` in production). |
| `BACKUP_AT_REST_KEY` | **YES** | 32-byte hex key for AES-256-GCM cloud backup encryption. |
| `CORS_ORIGINS` | **YES** | Comma-separated allowed origins (e.g. `https://bizora.io,https://shop.bizora.io,https://employee.bizora.io,https://customer.bizora.io,https://dashboard_admin.bizora.io`). |
| `AUTO_PLATFORM_BACKUP_HOURS`| NO | Default `12` (runs automated encrypted backup every 12 hours). |

---

## 3. Pre-Flight Verification Gate

Before pointing production DNS or deploying to end-users, execute the automated verification suite:

```bash
# 1. Run full automated test suite (106 tests)
npm test

# 2. Run TypeScript compilation check
npm run lint

# 3. Build all production artifacts
npm run build

# 4. Run production readiness diagnostic
npm run report:readiness
```

A deployment is authorized only when `readyForProd: true` with zero required failures.

---

## 4. Frontend & Admin Deployment (Vercel)

### Step 1: Frontend Workspace (`frontend/`)
1. In Vercel, import the repository and set Root Directory to `frontend`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_URL`: `https://api.bizora.io`
   - `VITE_ADMIN_URL`: `https://dashboard_admin.bizora.io`
6. Custom Domains:
   - `bizora.io` (Public website)
   - `*.bizora.io` (Wildcard subdomain mapping for `shop`, `employee`, `customer`)

### Step 2: Admin Workspace (`admin/`)
1. In Vercel, create a separate project with Root Directory set to `admin`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_URL`: `https://api.bizora.io`
6. Custom Domain: `dashboard_admin.bizora.io`.
7. Verify `X-Robots-Tag: noindex, nofollow` header is present in `vercel.json`.

---

## 5. Backend API Deployment (VPS / Caddy)

### Option A: Direct Node.js Process with Caddy (Recommended)
1. Build server:
   ```bash
   npm run build:backend
   ```
2. Start background service via PM2 or systemd:
   ```bash
   pm2 start backend/dist/server.cjs --name "bizora-api" -i max
   ```
3. Configure Caddy (`deploy/Caddyfile`):
   ```caddyfile
   api.bizora.io {
       reverse_proxy 127.0.0.1:3000
   }
   ```
4. Reload Caddy: `caddy reload`.

### Option B: Docker Compose
```bash
docker compose up -d --build
```

---

## 6. Rollback Procedures

### Instant Frontend / Admin Rollback
If a regression occurs in the web app:
1. Navigate to the project in the Vercel Dashboard -> **Deployments**.
2. Locate the previous stable deployment SHA.
3. Click `...` -> **Promote to Production** (instant zero-downtime rollback).

### Backend API Rollback
1. Revert Git commit to previous stable release tag:
   ```bash
   git checkout tags/v1.x.x
   npm run build:backend
   pm2 restart bizora-api
   ```
2. Confirm health status via `GET https://api.bizora.io/api/health`.

### Database Recovery Drill
If catastrophic data corruption occurs:
1. Call the authenticated restore endpoint:
   ```bash
   curl -X POST https://api.bizora.io/api/admin/platform-backup/restore \
     -H "Authorization: Bearer <SAAS_OWNER_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"backupId": "platform-auto-<timestamp>"}'
   ```
2. Alternatively, use Google Cloud Console to restore a point-in-time Firestore database snapshot.

