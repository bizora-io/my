---
name: bizora-saas-architecture
description: >-
  Use this skill when designing, reviewing, or refactoring architecture across Bizora ERP.
  Covers the 4 monorepo workspaces, multi-portal domain boundaries, role hierarchies,
  subscription entitlement limits, and platform configuration synchronization.
---

# Bizora SaaS Architecture Skill

## Purpose & Scope
Bizora is a multi-tenant, offline-capable commerce ERP and SaaS operating system. This skill ensures that all changes respect the architectural boundaries between the 4 monorepo workspaces, 4 dedicated user portals, and platform subscription tiers.

## Monorepo Workspace Structure

| Workspace | Directory | Responsibility | Deployment Target |
| :--- | :--- | :--- | :--- |
| **Backend** | `backend/` | Express 5 REST API, Socket.IO real-time sync, Firebase Admin SDK | Node.js / Docker (`:3000`) |
| **Frontend** | `frontend/` | Public 3D Website + Shop Owner ERP + Employee Workspace + Customer Portal | Vercel / Static CDN (`:5173`) |
| **Admin** | `admin/` | SaaS Owner & SaaS Admin Platform Management | Vercel / Isolated Host (`:5174`) |
| **Shared** | `shared/` | Shared domain libraries, types, contexts, and reconciliation logic | Inlined in Vite builds (`@shared/*`) |

## Access Boundaries & User Portals

```text
                               ┌────────────────────────────────┐
                               │       Internet / DNS           │
                               └──────────────┬─────────────────┘
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
   bizora.io          shop.bizora.io   employee.bizora.io customer.bizora.io dashboard_admin.bizora.io
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐
 │ Public Site  │   │  Shop Owner  │   │  Employee    │   │  Customer    │   │      SaaS Admin       │
 │ Showcase &   │   │  Full ERP,   │   │  POS Till,   │   │  Invoices,   │   │  Tenant oversight,    │
 │ Subscription │   │  P&L, Staff, │   │  Shifts,     │   │  Dues,       │   │  Packages, Billing,   │
 │ Pricing      │   │  Inventory   │   │  Barcode     │   │  Payments    │   │  System Health        │
 └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └───────────────────────┘
         │                  │                 │                 │                      │
         └──────────────────┴────────┬────────┴─────────────────┘                      │
                                     ▼                                                 ▼
                       /api/* (Tenant Business Scope)                       /api/admin/* (Platform Scope)
```

### Strict Portal Rules
1. **Public Website (`bizora.io`)**:
   - Must NEVER link to or expose SaaS Admin (`dashboard_admin.bizora.io`).
   - Action CTAs route exclusively to Shop Owner onboarding/login or subscription selection.
2. **Shop Owner Portal (`shop.bizora.io`)**:
   - Access to full business operations: POS, purchasing, stock transfers, payroll, double-entry accounts, net VAT.
   - Resource limits enforced by subscription tier.
3. **Employee Portal (`employee.bizora.io`)**:
   - Least-privilege access restricted to role template (`cashier`, `stock_manager`, `manager`).
   - Strictly blocked from SaaS Admin and unauthorized business settings.
4. **Customer Portal (`customer.bizora.io`)**:
   - Self-service ledger view: historical invoices, outstanding installment balances, delivery tracking.
5. **SaaS Admin (`dashboard_admin.bizora.io`)**:
   - Deployed separately from the business frontend (`admin/` workspace).
   - Only accounts with role `SAAS_OWNER` or `SAAS_ADMIN` can authenticate.
   - Operates on platform collections (`businesses`, `saasTickets`, `saasAlerts`, `revenuePayments`, `platformConfig`).

## Subscription Entitlements & Tier Enforcement

Subscriptions govern tenant operational limits via `backend/src/lib/trialLimits.ts` and `shared/lib/subscriptionStatus.ts`:

- **Store Limit** (`limitStores`): Maximum retail branches a tenant can create.
- **User / Seat Limit** (`limitUsers`): Maximum back-office operator accounts.
- **Employee Limit** (`limitEmployees`): Maximum staff roster records.
- **Product & Invoice Quotas**: Capped on starter/trial tiers to incentivize upgrades.
- **Module Entitlements**: Checked via `hasPermission()` or `features` array.
- **Dynamic Sync**: Package updates created by SaaS Admin are cached for 15 seconds (`Cache-Control: public, max-age=15`), broadcasted via Socket.IO, and consumed dynamically by the public pricing slider.

## Architectural Verification Procedure

Run the multi-tenant architecture and entitlement unit tests:
```bash
node --experimental-strip-types --test shared/lib/rbacRoles.test.ts shared/lib/trialLimits.test.ts shared/lib/subscriptionStatus.test.ts shared/lib/saasChurn.test.ts
```

Verify build isolation across all 3 codebases:
```bash
npm run build:backend && npm run build:frontend && npm run build:admin
```

