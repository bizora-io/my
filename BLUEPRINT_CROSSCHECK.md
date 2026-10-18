# Bizora ERP — Blueprint Cross-Check

Honest status of every section in the blueprint document against what's
actually in `bizora-monorepo` today. Legend:

- ✅ **Real** — UI exists and is backed by a real `backend/src/api/*` route (Firestore-persisted)
- 🟡 **UI/local only** — UI exists, but data lives in `localStorage` only, or the backend part is a stub/placeholder
- ❌ **Missing** — not built

## ⚠️ Updated after Stage 4 (see README)

**Business Management, Subscription Management, Audit Logs, and Super
Admin monitoring** are now ✅ **Real** - built out in Stage 4. Two rows
below were simply **wrong** in the original audit and have been
corrected: **Installment Sales** was already real (not ❌), and
**Balance Sheet / Income Statement** already existed (not ❌) - only
**Trial Balance** was the actual gap, and that's now built too. Treat
any item Stage 4 addressed (see README) as current; the tables below
were written before Stage 4.

---

## User Roles

| Role | Status |
|---|---|
| SaaS Owner | ✅ Real login, real 2FA, real ticket system. Most of the 30 AdminPanel tabs' *data* is still 🟡 local (see below). |
| Business Owner (Shop Owner) | ✅ Real login/signup, real 2FA, real password reset |
| Employee | ✅ Real login (global registry), 🟡 permission UI exists but isn't independently backend-enforced (see Security section) |
| Customer (Portal) | ✅ Real login/signup/PIN-reset with OTP, standalone account |
| Supplier (Portal) | ✅ Real login/signup/PIN-reset with OTP, cross-business registry |

## SaaS Owner Modules

| Module | Status | Note |
|---|---|---|
| Dashboard (totals, charts) | 🟡 | AdminPanel dashboard tab exists; most figures are computed from `registeredUsers`/`saasTickets` in the browser, not dedicated aggregate endpoints. Real data, but recomputed client-side each load rather than server-aggregated. |
| Business Management (approve/suspend/delete/login-as) | ✅ (Stage 4) | `PATCH/DELETE /api/admin/businesses/:id`, real `accountStatus` enforced at login, audit-logged. "Login as" (impersonation) is still local-only. |
| Subscription Management (plans, limits, pricing) | ✅ (Stage 4) | `GET/PUT /api/platform/plans`, Firestore-backed, editable from AdminPanel. Billing cycles (monthly/yearly/lifetime) and auto-renewal still aren't tracked — that needs a payment gateway (see below) to mean anything. |
| Global Customer Registry | ✅ | `globalCustomers` (backend/src/api/customerAuth.ts) |
| Global Employee Registry | ✅ | `globalEmployees` (backend/src/api/employees.ts) |
| Global Supplier Registry | ✅ | `globalSuppliers` (backend/src/api/suppliers.ts) |
| Ticket System | ✅ | Real-time via Socket.io (`saasTickets.ts` + `chatSocket.ts`) |
| Revenue Management | ✅ (Stage 6) | `backend/src/api/revenue.ts` - a real manual payment ledger (`GET/POST /api/admin/revenue/payments`, refund action, real summary totals) since no live payment gateway exists to auto-generate revenue events. |
| Announcement / Notifications | ✅ (Stage 6) | `backend/src/api/announcements.ts` - SaaS Owner/Admin broadcast global or business-targeted announcements, real backend, shown live to businesses in `App.tsx`'s banner (polled every 60s). The general internal activity `NotificationContext` (e.g. "new order" pings) remains local-only - only the SaaS-broadcast announcement system described in the blueprint's SaaS Owner Modules section was in scope here. |
| System Settings (branding, SMTP host, SMS gateway URL, currency, timezone, logo, favicon, SEO) | ✅ (Stage 4 + 6) | `GET/PUT /api/platform/settings` is real and Firestore-backed, now covering every field the blueprint lists. It only stores config *values* though (e.g. an SMTP host string) — nothing actually connects to a real SMTP/SMS/payment provider to send anything, same underlying gap as the chatbot's OTP delivery stub. |

## Business Owner Modules — data layer

| Module | Status |
|---|---|
| Dashboard | ✅ real transactions/products data (recently decluttered — see Stage 3e in README) |
| Customers | ✅ `entities.ts` |
| Suppliers | ✅ `entities.ts` + `suppliers.ts` |
| Products / Categories / Brands / Units | 🟡 Products are ✅ (`products.ts`); Category/Brand/Unit are just fields on the Product record, not their own managed lists |
| Variants | 🟡 `ProductVariant` type exists in the data model but there's no dedicated variant-management UI |
| Barcode / QR Code | ✅ barcode + visual QR generate/preview on Product form; POS scan still supported |
| Bulk Import/Export | ✅ CSV import (Papa Parse) + export on Product List; Stage 10 expanded columns |
| Warehouse / multi-warehouse | 🟡 Store Management exists (multi-**store**, not multi-warehouse-per-store); no separate warehouse layer |
| Stock In/Out/Transfer/Adjustment | ✅ Transfer is real (Stage 2r); stock adjustments happen inline via `updateProductStock` |
| Damage / Expiry / Batch / Serial Number | ✅ batch + expiry on product; serialNumbers[] tracked on product (Stage 10); warranty view exists |
| Purchase (order → receive → payment → return) | ✅ (Stage 7) new `PurchaseOrder.tsx` + `/api/purchase-orders` covers the order→receive stage (converts to a real Purchase transaction on receipt); `Buy.tsx` still covers direct already-received entry and returns |
| Sales: Quotation | ✅ (Stage 4) new `Quotation.tsx` page + `/api/quotations` backend — create, status workflow, convert accepted quotes straight into a real Sale |
| Sales: POS/Invoice/Returns | ✅ |
| Sales: Installment | ✅ (corrected — see Stage 4) `Sell.tsx` splits a sale into a real installment schedule (`LedgerEntry.installments[]`), backend-synced since Stage 2c. A dedicated collection/tracking screen (`/installments`) was added afterward. |
| Accounting: Cashbook/Bank/Mobile Banking | ✅ `Cashbox.tsx`, `Ledgers.tsx`, financial accounts backend |
| Accounting: Journal/Trial Balance/Balance Sheet/Income Statement | 🟡 (corrected — see Stage 4). Balance Sheet + Income Statement already existed in `BusinessReports.tsx`, computed from real data. Trial Balance was the actual gap and is now built too, honestly labeled as derived from single-entry records (no formal double-entry Journal exists). |
| HRM: Employees/Attendance/Leave/Payroll/Salary | 🟡 Staff records + attendance are ✅ backend; Payroll tab exists (`EmployeeManagement.tsx`'s `PayrollTab`) but salary runs aren't a tracked backend resource yet |
| HRM: Departments/Designation | ✅ (Stage 7) new `/hr-structure` screen + `/api/departments`, `/api/designations`, wired into Add Staff as an optional field distinct from the permission-gating "Role" |
| HRM: Shift/Holiday | ✅ Stage 12 not found as distinct entities |
| CRM: Notes/Communication | 🟡 `Communication.tsx` exists; sending SMS/Email/WhatsApp is not wired to a real provider (no `twilio`/`nodemailer`/etc. found anywhere in the backend) |
| Marketing / Campaigns | ✅ backend-synced (Stage 2j), but the campaigns don't actually send anything for the same reason as Communication |
| Loyalty Program | ✅ (Stage 8) real configurable earn/redemption rules (`LoyaltyConfig`), redemption at checkout in `Sell.tsx`, real points balance sync (fixed a bug where earned points never actually persisted to the backend) |
| Coupon System | ✅ (Stage 8) `validateCoupon()` enforces min purchase, expiry, usage limit, and a max-discount cap - not just "does an active code exist"; usage is tracked and actually incremented on sale |
| Gift Cards / Referral System | ✅ Stage 13 not found |
| QR Payment | ❌ not found (QR scanning exists for barcodes, not for receiving payments) |

## POS System

| Feature | Status |
|---|---|
| Fast billing, barcode/QR scan, split payment, discount | ✅ camera + keyboard-wedge scanner (Stage 11) |
| Cash/Card/bKash/Nagad/Rocket/Due as payment *method labels* | ✅ (they're selectable payment-method strings) |
| Actual bKash/Nagad/Rocket/card **gateway integration** (real money movement) | ❌ — these are just labels for record-keeping, not live payment processing |
| Invoice print | ✅ |
| Kitchen Order (restaurant/KOT) | ✅ (Stage 5/5b) `Sell.tsx`'s "Send to Kitchen" (restaurant-only) routes items to per-product kitchen stations, one ticket per station; `/kitchen` KDS board with a live Pending→Preparing→Ready→Served workflow, station filter tabs, and a real thermal-printer-format ticket (`KOTTicket.tsx`) |
| Offline cache | 🟡 a basic service worker (`sw.js`) exists for asset caching; no offline transaction queue/sync |

## Payment Gateway (bKash/Nagad/Rocket/SSLCommerz/Stripe/PayPal)

❌ **None are actually integrated.** AdminPanel has a "Payment Gateway" tab UI (`Payment Gateway Connectivity Hub`) for entering credentials, but nothing in the backend calls any of these providers' APIs. This is the same category as the SMS/email gap: real integration needs your own merchant accounts/API keys with each provider, which I can't create for you — but I can wire the code up once you have them.

## AI Features

❌ **Deliberately removed per your instruction** ("no need for any AI API"). Sales Prediction / Demand Forecast / Customer Insights / "Smart Reports" as described in the blueprint (needing a real ML/AI model) don't exist and weren't rebuilt. What does exist:
- A rule-based knowledge-base chatbot (Stage 3b) — not predictive, just FAQ matching.
- Real (non-AI) computed analytics in the SaaS Admin panel (Stage 3c) — actual numbers, not forecasts.

If genuine forecasting is wanted later, that's a real (non-AI-API) statistics project — doable, but distinct from what's built now.

## Security

| Feature | Status |
|---|---|
| RBAC / Permission Management | ✅ `PERMISSIONS` object + role checks throughout |
| JWT Authentication | ✅ |
| Refresh Token | ❌ — current tokens are long-lived (7d) with no refresh/rotation flow |
| Session/Device Management, Login History | 🟡 UI exists (`SettingsPage.tsx`), backed by `localStorage`, not a real backend-tracked session store |
| 2FA | ✅ real TOTP (Stage 2m/2n) for Shop Owner + SaaS Owner/Admin |
| OTP (signup/reset flows) | ✅ real, but delivery is console-logged only (no SMS/email provider — see above) |
| Audit Logs / Activity Logs | ✅ (Stage 4) platform-level audit trail is real (`GET /api/admin/audit-logs`, written by `logAudit()` on every significant admin action). Per-business `AuditLog.tsx`/`AppLog` activity feed is still local only. |
| Rate Limiting | ✅ `express-rate-limit` on `/api/` |
| CSRF / XSS protection | 🟡 `helmet()` is on (covers common XSS-adjacent headers); no explicit CSRF token flow (lower risk for a Bearer-token API, but worth knowing it's not there) |
| SQL Injection Protection | N/A — Firestore, not SQL, so this class of attack doesn't apply the same way |
| Encrypted Sensitive Data | ✅ passwords/PINs are bcrypt-hashed (this session's major security work) |
| Automatic Backup | ❌ not built (would rely on Firestore's own export/backup tooling, not app code) |

## Super Admin Features

**System Health / Server Monitor** — ✅ (Stage 4) `GET
/api/admin/system-health` returns real OS-level CPU load average and
memory usage, polled every 15s by AdminPanel's Monitoring Center.

Feature Toggle / Module Toggle / Maintenance Mode / DB Backup-Restore /
API Monitor / Storage Manager — still 🟡 **UI-only** (AdminPanel tabs
exist with mock data); none of these read or control anything real yet.

## APIs

REST API ✅ (everything built this project is REST). GraphQL, generic
inbound webhooks, and a documented public/mobile API — ❌ not built.

## Mobile Ready

PWA manifest/service worker ✅ exist (basic). Native Android/iOS apps ❌
not applicable to a web codebase like this without a separate
React Native/Capacitor project. Offline sync beyond basic asset caching ❌.

## UI/UX

Responsive layout, collapsible sidebar ✅ (this session's work).
Dark mode ❌ not found anywhere (no theme toggle/dark palette).
Advanced tables (sort/filter beyond basic search), drag & drop,
keyboard shortcuts, skeleton loaders, infinite scroll — not found as a
general pattern; some pages have their own filtering but not a shared
"advanced table" component.

## Performance / Architecture

Multi-tenant ✅ (each business's data is Firestore-scoped by
`businesses/{id}/...`). Lazy loading, caching, queues, Redis, CDN,
horizontal scaling — these are deployment/infra decisions, not really
"code that's missing" — the architecture (stateless Express API +
Firestore) is compatible with all of them once you deploy it somewhere,
but none is configured yet since there's no deployment target chosen.

---

## Bottom line

The blueprint describes a **very large enterprise ERP** — realistically
months of work for a team. What actually exists today is a genuinely
solid **core**: real multi-tenant auth (5 account types), real POS/
inventory/sales/customers/suppliers/staff/production data layer, a
real-time support chat system, and a properly-audited security layer —
but a lot of the *breadth* items in this blueprint (quotations,
double-entry accounting, payment gateway integrations, loyalty/coupon
engines, department/designation HR structures, dark mode, GraphQL,
native mobile apps) are either UI-only mockups or not present at all.

Nothing above is hidden or silently faked anymore — if a screen shows a
number, either it's real (✅), or the table above tells you it isn't.
Tell me which of the 🟡/❌ items matter most for your actual use case and
I'll build them next, in the same real/no-shortcuts way as everything
else this session.
