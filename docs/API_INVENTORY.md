# Bizora ERP — Master API Endpoint Inventory

This document provides a comprehensive inventory of all REST endpoints exposed by the Bizora Express API server (`http://localhost:3000` / `https://api.bizora.io`), including required authentication, roles, and permissions.

---

## 1. Public & Unauthenticated Endpoints

| Method | Path | Purpose | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service liveness probe | Standard |
| `GET` | `/api/health/ready` | Service readiness probe (Firestore check) | Standard |
| `GET` | `/api/platform/public-plans` | Public subscription packages for landing page (cached 15s) | Standard |
| `GET` | `/api/platform/plans?public=true` | Alternate public package retrieval route | Standard |
| `GET` | `/api/announcements/public` | Global public announcements | Standard |
| `GET` | `/api/storefront/:slug` | Public e-commerce storefront catalog and branding | Standard |
| `POST` | `/api/storefront/:slug/order` | Public customer storefront checkout placement | 20 / 15min |
| `POST` | `/api/phone-verification/send` | Send OTP challenge via SMS or email | 5 / 15min |
| `POST` | `/api/phone-verification/verify` | Verify OTP code | 10 / 15min |

---

## 2. Authentication & Identity Endpoints

| Method | Path | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | None | Shop Owner authentication (issues access + refresh tokens) |
| `POST` | `/api/auth/register` | None | New tenant registration (creates `businesses` doc) |
| `POST` | `/api/auth/refresh` | None (Refresh Token) | Rotates refresh token and issues new access token |
| `POST` | `/api/auth/logout` | Authenticated | Revokes active refresh token `jti` |
| `GET` | `/api/auth/me` | Authenticated | Fetches current user profile and business settings |
| `POST` | `/api/auth/employee-login` | None | Employee PIN authentication for POS till |
| `POST` | `/api/auth/customer-login` | None | Customer portal login |
| `POST` | `/api/auth/supplier-login` | None | Supplier portal login |
| `POST` | `/api/saas/login` | None | SaaS Owner / Admin platform login |
| `POST` | `/api/two-factor/verify` | Pre-Auth Token | Verifies 2FA TOTP code to complete admin login |

---

## 3. Tenant Business Endpoints (Shop Owner & Employee Scope)

*All tenant endpoints require `Authorization: Bearer <accessToken>` carrying a verified `businessId`.*

| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET`, `POST` | `/api/products` | `inventory.view` / `inventory.create` | Product catalog, pricing, barcodes |
| `GET`, `PATCH` | `/api/products/:id` | `inventory.edit` | Update SKU, stock delta, variants |
| `GET`, `POST` | `/api/transactions` | `pos.terminal` / `pos.view` | POS invoices, sales, purchases (idempotent) |
| `GET`, `POST` | `/api/entities` | `customers.view` / `suppliers.view` | Customer and supplier profiles |
| `GET`, `POST` | `/api/staff` | `hrm.employees` | Shop employee roster and work shifts |
| `GET`, `POST` | `/api/warehouses` | `inventory.warehouses` | Branch stores and storage locations |
| `GET`, `POST` | `/api/stock-transfers` | `inventory.transfer` | Inter-branch inventory requisitions |
| `GET`, `POST` | `/api/quotations` | `pos.quotations` | Price estimates and quote-to-sale |
| `GET`, `POST` | `/api/kitchen-orders` | `pos.kitchen_display` | Restaurant kitchen display tickets |
| `GET`, `POST` | `/api/purchase-orders` | `purchases.orders` | Vendor purchase orders |
| `GET`, `POST` | `/api/financial-accounts`| `finance.cashbox` | Cashbox drawers, bKash, and bank balances |
| `GET`, `POST` | `/api/journal-entries` | `finance.journal` | Double-entry accounting debits/credits |
| `GET`, `POST` | `/api/payroll-runs` | `hrm.payroll` | Staff salary disbursements |
| `GET`, `POST` | `/api/raw-materials` | `manufacturing.materials` | Raw material catalog |
| `GET`, `POST` | `/api/boms` | `manufacturing.bom` | Bills of materials formulations |
| `GET`, `POST` | `/api/production-batches`| `manufacturing.batches` | Production runs and lot allocation |
| `GET`, `POST` | `/api/couriers` | `ecommerce.courier` | Pathao & Steadfast logistics booking |
| `GET`, `POST` | `/api/backups` | `security.backup` | Tenant-level cloud backup snapshots |
| `POST` | `/api/backups/export-full` | `SHOP_OWNER` | Full tenant Firestore dump and sealed backup |
| `GET`, `PUT` | `/api/business-settings`| `SHOP_OWNER` | Tenant configuration, currency, VAT rates |
| `POST` | `/api/assistant/chat` | Authenticated | Natural-language Bizora ERP assistant |

---

## 4. Platform Administration Endpoints (SaaS Admin Scope)

*All SaaS admin endpoints require `Authorization: Bearer <accessToken>` with role `SAAS_OWNER` or `SAAS_ADMIN`.*

| Method | Path | Scope | Description |
| :--- | :--- | :--- | :--- |
| `GET`, `POST` | `/api/admin/users` | `saasAdmins` | List and manage all tenant businesses |
| `GET`, `PATCH` | `/api/admin/users/:id` | `saasAdmins` | Edit tenant subscription, status, and quotas |
| `POST` | `/api/admin/users/:id/impersonate`| `SAAS_OWNER` | Generate temporary support token for tenant |
| `GET`, `PUT` | `/api/platform/plans` | `saasAdmins` | Create, update, or archive subscription tiers |
| `GET` | `/api/revenue` | `saasAdmins` | SaaS platform subscription revenue metrics |
| `GET` | `/api/admin/churn` | `saasAdmins` | MRR expansion, churn rate, and at-risk tenants |
| `GET`, `POST` | `/api/saas-tickets` | `saasAdmins` | Cross-tenant support ticket management |
| `GET` | `/api/admin/readiness` | `saasAdmins` | Comprehensive production readiness audit gate |
| `GET` | `/api/admin/db-schema` | `saasAdmins` | Live Firestore collection schema summary |
| `GET`, `POST` | `/api/admin/platform-backups` | `SAAS_OWNER` | Platform-wide encrypted backup snapshots |
| `POST` | `/api/admin/platform-backup/restore`| `SAAS_OWNER` | Disaster recovery restore drill |

