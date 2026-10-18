# Bizora production deploy checklist

## 1. Environment

Copy `backend/.env.example` → `backend/.env` (or host secrets manager).

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | yes | `production` |
| `JWT_SECRET` | yes | ≥32 random chars, not the example default |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` | yes | Admin SDK |
| `SAAS_OWNER_EMAIL` + `SAAS_OWNER_PASSWORD_HASH` | yes | Platform login |
| `APP_URL` / `ADMIN_URL` / `CORS_ORIGINS` | yes | HTTPS origins |
| `OTP_PEPPER` | yes | Random; never `change-me` |
| `OTP_DEV_ECHO` | must be false | Never `true` in prod — **process exits** if true |
| `OTP_PEPPER` | yes | Process exits if missing/`change-me` in production |
| `RESEND_API_KEY` + `EMAIL_FROM` | recommended | OTP + at-risk digests |
| `TWILIO_*` | optional | SMS OTP |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | if using Stripe | Webhook URL → `/api/payments/webhook/stripe` |
| `SAAS_ALERT_EMAILS` | optional | At-risk digest recipients |

Generate owner hash:
```bash
node backend/scripts/generate-password-hash.mjs "your-password"
```

## 2. Firebase

- [ ] Production Firebase project (not dev)
- [ ] Firestore rules: client apps should not use privileged admin SDK
- [ ] Indexes for ordered queries (transactions, payment intents)
- [ ] Backups scheduled (Firestore export or Bizora backup API)

## 3. Network

- [ ] TLS terminator (Cloudflare / load balancer)
- [ ] API only on HTTPS
- [ ] CORS allows exact frontend + admin origins
- [ ] Rate limiter enabled (`/api/` limiter in server)

## 4. Payments

- [ ] Stripe webhook endpoint registered with signing secret
- [ ] Checkout/PaymentIntent `metadata.businessId` set
- [ ] `PAYMENT_DEFAULT_PROVIDER` not left on `sandbox` if taking real money

## 5. Verify

```bash
curl -s https://api.example.com/api/health
curl -s https://api.example.com/api/health/ready
# Authenticated (SaaS):
curl -s -H "Authorization: Bearer $TOKEN" https://api.example.com/api/admin/readiness
```

`readyForProd` is true only when `NODE_ENV=production` and **zero** failing checks.

## 6. Smoke test

- [ ] Shop owner register/login + refresh token
- [ ] Employee / customer / supplier login
- [ ] Create sale + product stock
- [ ] SaaS login + dashboard stats
- [ ] Stripe test webhook (CLI) failure + success stamps


## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

On push/PR to `main` / `master` / `develop`:

1. `npm test` — shared unit tests (FEFO, BOM, churn, …)
2. `npm run build -w backend|frontend|admin`

No secrets required for CI build. Production deploy remains manual (see steps above) or wire your host after green CI.


## 7. Docker Compose

From monorepo root:

```bash
cp backend/.env.example backend/.env   # set JWT, Firebase, OTP_PEPPER, …
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web (nginx) | http://localhost:8080 |
| API | http://localhost:3001 |
| Admin (optional) | http://localhost:8081 — `docker compose --profile full up --build` |

`web` proxies `/api/` → `api:3001`. For production, put TLS in front (Caddy/Cloudflare) and set `CORS_ORIGINS` / `APP_URL` to HTTPS hosts.

Images:
- `backend/Dockerfile` — Node + `tsx server.ts`
- `frontend/Dockerfile` — Vite build + nginx SPA


### Smoke after compose

```bash
docker compose up --build -d
./scripts/smoke-docker.sh
# or: make smoke
```
