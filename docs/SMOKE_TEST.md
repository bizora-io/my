# Bizora E2E smoke checklist

Run after deploy or before release. Mark each step.

## Automated (fast)

Backend must be running (`npm run dev:backend`).

```bash
# Unit smoke (no server)
npm run test:smoke

# Live API smoke
npm run test:api-smoke

# Optional auth checks:
set SMOKE_SHOP_ID=shop@email.com
set SMOKE_SHOP_PASSWORD=yourpassword
set SMOKE_SAAS_ID=owner@email.com
set SMOKE_SAAS_PASSWORD=saaspassword
npm run test:api-smoke

# Both
npm run test:all-smoke
```

What `test:api-smoke` hits:
- `GET /api/health` · `/api/health/ready`
- `GET /api/platform/plans`
- Optional shop login + `/api/auth/me` + plan-requests
- Optional SaaS login + businesses + readiness + plan-requests

---

## A. Backend health
- [ ] `npm run dev:backend` starts without transform errors
- [ ] `GET /api/health` responds 200
- [ ] `npm run test:api-smoke` → 0 failed (base checks)
- [ ] Admin → readiness (SaaS) → critical fail = 0 in production

## B. Shop owner signup / login
- [ ] Sign up with phone → OTP (dev: console / `OTP_DEV_ECHO` only in dev)
- [ ] Complete signup → dashboard
- [ ] Trial banner if trial plan
- [ ] Logout → login again

## C. Core POS
- [ ] **Buy** → stock up
- [ ] **Sell** → stock down, ledger
- [ ] **Quick Sale**
- [ ] Mobile bottom glass dock on Home / Sell / Buy

## D. Staff
- [ ] Add Cashier with template permissions
- [ ] Employee login (mobile + PIN)
- [ ] No SaaS admin access

## E. Subscription live
- [ ] Shop: Subscription → request **Pro**
- [ ] Admin: Plan requests → **Approve**
- [ ] Shop plan/limits updated after re-login or refresh

## F. Backup
- [ ] Online backup / Sync works
- [ ] Offline indicator does not crash app

## G. SaaS admin
- [ ] `npm run dev:admin` → SaaS login
- [ ] Glass sidebar + Businesses list
- [ ] Subscriptions plans from server
- [ ] Login-As → Exit restores admin

## Sign-off
Date: ________  Tester: ________  Environment: ________
