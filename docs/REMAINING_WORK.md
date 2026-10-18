# Bizora — Remaining Work

Last updated: 2026-10-13  
Status: **Core ERP + SaaS Admin ~93–95% coded** — see `CODE_STATUS.md` + `GO_LIVE.md`. Remaining = mostly ops.; production readiness depends on env, E2E test, and polish below.

---

## P0 — Must do before real users (blockers)

| # | Item | Notes |
|---|------|--------|
| 1 | **Stable auth on your machine** | Clear `bizora_token` / `nexus_user`; one `JWT_SECRET`; backend restart; shop login 200 + admin login 200 |
| 2 | **Production secrets** | Templates ready: `.env.production.example` + `generate-prod-secrets.mjs` — **fill on your server** |
| 3 | **Firebase** | Client + Admin SDK; correct project; authorized domains (`localhost`, your host); Firestore rules |
| 4 | **SMS / email OTP** | Code ready — configure Twilio/Resend; `npm run verify:otp` + `docs/OTP_PRODUCTION.md` |
| 5 | **CORS / URLs** | `APP_URL`, `ADMIN_URL`, `CORS_ORIGINS`, `VITE_API_URL` for real hosts |
| 6 | **E2E smoke** | `npm run test:api-smoke` + manual checklist in `SMOKE_TEST.md` — **run on your machine** |
| 7 | **HTTPS + reverse proxy** | Guide ready: `docs/DEPLOY_HTTPS.md` + `deploy/Caddyfile` + `deploy/nginx-https.conf` |

---

## P1 — High value / reliability

| # | Item | Notes |
|---|------|--------|
| 1 | ~~**Client Firestore**~~ | **Done** — prefer default DB, named fallback, null-safe |
| 2 | ~~**Support tickets live**~~ | **Done** — dual-room broadcast + `chat:ticket-update` + 15s poll |
| 3 | ~~**Subscription plans API**~~ | **Done** — `GET/PUT /api/platform/plans` + Admin sync |
| 4 | ~~**Plan upgrade requests**~~ | **Done** — `/api/plan-requests` create/approve/reject + live refresh |
| 5 | ~~**Impersonation UX**~~ | **Done** — fixed banner, TTL auto-exit, SaaS token restore first |
| 6 | **npm audit** | Run on your machine after `npm install` |
| 7 | ~~**Chunk size**~~ | **Admin tabs lazy-loaded** — shop routes can follow |
| 8 | ~~**Favicon**~~ | **Done** — local SVG + ICO, no external Icons8 |
| 9 | ~~**Rate limits**~~ | **Done** — login/register/OTP guards + `/api/auth` authLimiter |

---

## P2 — Feature polish (partially built)

| Area | Remaining |
|------|-----------|
| **E-commerce / storefront** | Theme deploy, domain/subdomain, full order→POS sync polish |
| **Courier** | Real Pathao/Steadfast (or local) API keys + status webhooks |
| **Bank reconciliation** | Matching UI + partial auto-match edge cases |
| **Manufacturing** | Multi-level BOM, FEFO expiry alerts UX |
| **Payroll / leave** | Void expense reverse + payroll run edge cases |
| **Multi-company consolidation** | Reports across entities |
| **Payment gateways** | Live Stripe/bKash/etc. keys + webhook verify |
| **SaaS churn / MRR** | Snapshot write fully stable (undefined field already hardened) |
| **Employee RBAC** | Core APIs use `requirePermission` (products, tx, staff, warehouses, CRUD modules) |
| **Offline sync** | Queue + conflict banner in App; expand entity coverage optional |
| **Backup restore** | Guided restore + conflict picker in Settings |

---

## P3 — Nice to have

- Real-time admin dashboard charts without manual refresh  
- Announcement targeting by plan/region  
- Audit log export + retention policy UI  
- Mobile PWA install + update banner polish  
- Automated CI (lint, test, build) on push  
- Staging environment separate from production Firebase  

---

## Suggested next sprint (1–2 weeks)

1. Security pass (`SECURITY_CHECK.md`) + production `.env`  
2. Full smoke test shop + admin  
3. Persist subscription plans + upgrade flow  
4. OTP production provider  
5. Fix remaining white-screen / empty-tab reports one by one  

---

## Done recently (do not re-do)

- JWT `getJwtSecret()` login/register  
- Admin full-height sidebar + all tabs for Owner/Admin  
- StoreProvider → DataProvider order  
- Subscriptions `features` string/array safe  
- Auto backup + online export-full  
- DB schema docs + platform backup  
- Firebase client init resilient (no white-screen if Firestore missing)  
- Tailwind 3.4 pin for PostCSS  
- Glass animated sidebars (client + admin)  
- Subscription plans server persist (`/api/platform/plans`)  
- Plan upgrade requests live (`/api/plan-requests`)  
- OTP production guide + `verify:otp` script  

---

## How to track

- After each fix: note in this file or close the row above.  
- Before release: complete `SECURITY_CHECK.md` and `PRODUCTION.md`.  
