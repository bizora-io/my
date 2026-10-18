# Path to 100% — active sprint

Updated: 2026-10-16

## Overall
| Layer | ~% | Notes |
|-------|----|-------|
| Core ERP + integrations | **~90%** | Rate limits + Firestore default |
| SaaS Admin code | **~86%** (lazy tabs) | Tabs + live tickets/plans |
| Production readiness | ~45% | Needs your env + deploy + smoke |
| **Target 100%** | code + config + verified E2E | |

## Sprint 12 (manufacturing / bank edges)
- [x] Bank: skip reconciled txs; amount tolerance; partial → suggested only
- [x] `summarizeMatchResults` + UI near-amount hint
- [x] Material `canReserve` / `findOverReservations`
- [x] Edge unit tests (`npm run test:edge`)

## Sprint 11 (ops helper)
- [x] `npm run check:local` — structure + .env + health probe
- [x] Code feature sprints 1–10 closed; remaining = deploy on your machine

## Sprint 10 (done in code)
- [x] Employee PIN login → `loginRateLimitGuard` (+ fail/success marks when patterns match)
- [x] Offline conflict banner: show conflict preview before clear
- [x] Code sprint series 1–10 complete for go-live path

## Sprint 9 (done in code)
- [x] RBAC audit: products/tx/staff/warehouses/stockTransfers/onlineOrders gated
- [x] `docs/CODE_STATUS.md` — code vs ops separation
- [x] Remaining work marked ops-first for go-live

## Sprint 8 (done in code)
- [x] `npm run report:readiness` — markdown readiness from live API
- [x] `docs/GO_LIVE.md` end-to-end go-live steps
- [x] Readiness summary includes `requiredFails`; OTP echo check hardened

## Sprint 7 (done in code)
- [x] Consolidation UI: default month range, auto-run report
- [x] Intercompany eliminations list + Print/PDF
- [x] API already: groups CRUD, report, CSV, IC eliminate, ownership %

## Sprint 6 (done in code)
- [x] Storefront order → realtime `broadcastBusinessSync(onlineOrders)`
- [x] Online Shop: Publish / Unpublish / Preview catalog / Open public shop
- [x] Themes + domain/catalog API already in place

## Sprint 5 (done in code)
- [x] Payroll void: no double-reversal; stores `voidedAt` + `reversalTransactionId`
- [x] FEFO dashboard strip BN/EN labels
- [x] FEFO already on Dashboard + Sell + LotEnquiry (verified)

## Sprint 4 (done in code)
- [x] `GET /api/payments/webhook-info` (Stripe/bKash URLs + secret flags)
- [x] `docs/COURIER_PAYMENTS.md` — courier webhooks + payment live checklist
- [x] `.env.example` courier notes
- [x] Courier webhook routes already present (steadfast/pathao/redx/paperfly)

## Sprint 3 (done in code)
- [x] Shop: Dashboard / Buy / Sell / QuickSale / Notifications → lazy
- [x] Settings restore: multi-device conflict detection before overwrite
- [ ] Courier live API keys (env-driven — next)
- [ ] Payment webhook secrets on deploy

## Sprint 2 (done in code)
- [x] AdminPanel: **32 tabs** → `React.lazy` + `Suspense` (code-split)
- [x] Auth rate limits (Sprint 1)
- [ ] `npm audit` on your machine after `npm install` (`npm audit fix`)

## Sprint 1 (done in code)
- [x] Stricter `/api/auth` rate limit
- [x] Register + OTP request use `loginRateLimitGuard`
- [x] Client Firestore prefer **default** database
- [x] Tickets socket dual-room
- [x] Impersonation banner + TTL
- [x] Plans API + upgrade requests
- [x] Favicon, glass nav, deploy/OTP docs

## Still required for “100% live”
1. You: fill `backend/.env` production secrets  
2. You: Twilio + Resend → `npm run verify:otp`  
3. You: `npm run test:api-smoke` + manual smoke  
4. You: HTTPS deploy (`docs/DEPLOY_HTTPS.md`)  
5. Code: e-com domain polish, courier live keys, payment live webhooks  
6. Code: AdminPanel further code-split, npm audit fix  
7. Code: manufacturing/payroll edge UX  

## Definition of done (100%)
- [ ] Shop signup OTP real SMS/email  
- [ ] Shop buy→sell→return→backup restore  
- [ ] Admin businesses live + plan approve + ticket reply live  
- [ ] Employee PIN login + permission-blocked routes return 403  
- [ ] `GET /api/admin/readiness` all critical pass  
- [ ] HTTPS app + admin + api, no mixed content  
- [ ] `SECURITY_CHECK.md` signed  
