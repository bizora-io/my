# Bizora ERP — Master Project Blueprint

## 1. System Overview & Architecture

Bizora is a production-grade multi-tenant SaaS ERP and Commerce Operating System engineered for retail chains, supermarts, pharmacies, fashion boutiques, mobile/electronics dealers, restaurants, and light manufacturing enterprises.

### Monorepo Workspaces

```text
bizora-monorepo/
├── shared/                 # Shared domain models, financial reconciliation, types, and utilities
├── backend/                # Express 5 REST API, Socket.IO sync, Firebase Admin SDK, Bizora Assistant
├── frontend/               # Public 3D Website, Shop Owner ERP, Employee POS Till, Customer Portal
├── admin/                  # Standalone SaaS Owner / Platform Administration Application
├── deploy/                 # Production deployment templates (Caddy, Nginx, Docker)
├── docs/                   # Master architecture blueprints, API inventories, and checklists
└── .agents/                # Antigravity AI skills and project governance rules
```

| Workspace | Technology Stack | Port (Dev) | Production Target |
| :--- | :--- | :--- | :--- |
| **Backend** | Node.js 22, Express 5, TypeScript 5.8, Socket.IO, `firebase-admin` | `:3000` | Node.js / Docker (`api.bizora.io`) |
| **Frontend** | React 19, Vite 6, Tailwind CSS 3.4, Lucide Icons, Three.js | `:5173` | Vercel (`bizora.io`, `shop.*`, `employee.*`, `customer.*`) |
| **Admin** | React 19, Vite 6, Tailwind CSS 3.4, Recharts | `:5174` | Vercel (`dashboard_admin.bizora.io`) |
| **Shared** | TypeScript 5.8 (shared TS/TSX direct consumed via `@shared/*`) | N/A | Inlined into bundle at build time |

---

## 2. Multi-Portal Domain Routing

Production domain routing is handled dynamically via `frontend/src/lib/domainRouter.ts`:

1. **Public Showcase (`bizora.io` / `www.bizora.io`)**:
   - High-conversion 3D animated SaaS landing page (`LandingPage.tsx`).
   - Dynamic subscription package carousel synchronized with SaaS Admin (`/api/platform/public-plans`).
   - Feature detail drawers (`PlanDetailsModal.tsx`) and legal documents viewer (`LegalModal.tsx`).
   - **Zero exposure of SaaS Admin links.**
2. **Shop Owner Portal (`shop.bizora.io`)**:
   - Full ERP management: inventory catalog, purchasing, stock transfers, double-entry ledgers, net VAT, HR payroll, and branch consolidation.
3. **Employee Portal (`employee.bizora.io`)**:
   - Streamlined workplace: cashier till, barcode scanning, shift cash registers, attendance check-in.
4. **Customer Portal (`customer.bizora.io`)**:
   - Self-service: itemized invoice history, credit installment tracking, online delivery updates.
5. **SaaS Admin Portal (`dashboard_admin.bizora.io`)**:
   - Deployed from `admin/` workspace. Requires `SAAS_OWNER` or `SAAS_ADMIN` role. Manages tenants, subscriptions, platform telemetry, and backups.

---

## 3. Core Business Capabilities

### A. Point of Sale & Billing (`pos.*`)
- Rapid barcode scanning, touch-numpad keypad, and 58mm/80mm thermal receipt printing.
- Split-tender payment collection across Cash, bKash, Nagad, Card, and Credit Due.
- Real-time offline checkout mode using client-side IndexedDB persistence.

### B. Inventory & FEFO Batch Allocation (`inventory.*`)
- First-Expired, First-Out (FEFO) automated lot allocation on every checkout.
- Automated expiry warnings (30/60/90 days) and predictive reorder triggers.
- Serial number and IMEI unit lifecycle tracking from vendor invoice to customer warranty claims.

### C. Automated Financial Ledgers & Cashbox (`finance.*`)
- Automated double-entry journal postings for all sales, purchases, returns, and operational expenses.
- Single-view reconciliation of cashbox drawers, mobile money (bKash/Nagad), and bank statements.
- Tamper-evident accounting period locks preventing unauthorized back-dated journal edits.

### D. Net VAT Calculation & Tax Audit (`reports.tax_vat`)
- Calculates net VAT liability: Output VAT collected on sales minus Input VAT paid on purchases and expenses, net of returns.
- 1-click CSV audit export and official tax summary reporting.

### E. Omnichannel Storefront & Logistics (`ecommerce.*`)
- 5 pre-built storefront themes synchronized in real-time with physical counter stock.
- Direct 1-click courier consignment booking and tracking with Pathao, Steadfast Logistics, Paperfly, and RedX.

### F. Manufacturing & Production (`manufacturing.*`)
- Multi-level Bills of Materials (BOM), raw material reservations, and production run variance audits.

### G. Context-Aware Bizora Assistant (`ai.assistant`)
- Fully self-hosted natural language ERP assistant. Understands permissions, queries business collections, and answers questions in English and Bengali with zero external AI provider dependencies.

