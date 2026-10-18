# Bizora production hardening checklist

## 1. Secrets (backend `.env`)

```bash
NODE_ENV=production
JWT_SECRET=<random-64+ chars, not the fallback string>
OTP_PEPPER=<random long string>
OTP_DEV_ECHO=false
OTP_SKIP_COOLDOWN=0
BACKUP_AT_REST_KEY=<32-byte secret>
```

Optional but recommended:
```bash
APP_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
# or FIREBASE_SERVICE_ACCOUNT_JSON=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
RESEND_API_KEY=...
EMAIL_FROM=Bizora <noreply@yourdomain.com>
SAAS_OWNER_EMAIL=...
SAAS_OWNER_PASSWORD_HASH=...   # node backend/scripts/generate-password-hash.mjs "password"
IMPERSONATE_TTL=15m
IMPERSONATE_READ_ONLY=1
```

Verify: `GET /api/admin/readiness` → `readyForProd: true`, zero **fail** on required checks.

## 2. CSS / Tailwind (no CDN)

Frontend and Admin use **PostCSS + Tailwind 3** (`src/index.css`).

```bash
npm install
npm run build:frontend
npm run build:admin
```

Do **not** re-add `cdn.tailwindcss.com` in production builds.

## 3. Build & deploy

Full HTTPS / DNS / Caddy / Nginx: **`docs/DEPLOY_HTTPS.md`**.

```bash
npm run ci          # tests + build
# or
npm run build
```

Serve `frontend/dist` and `admin/dist` behind HTTPS (nginx samples in each app).

## 4. OTP / SMS

- Production: real Twilio (or your SMS) + Resend/email.
- Never enable `OTP_DEV_ECHO` or `OTP_SKIP_COOLDOWN` in production.

## 5. After deploy

- Open shop + admin apps, confirm styles load (no CDN warning).
- Login, readiness **Download JSON** for support archive.
- Confirm OTP delivery on a test signup.
