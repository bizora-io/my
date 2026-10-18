# Bizora ERP — AI Development & Engineering Changelog

This document maintains a chronological record of all AI-assisted audits, security hardening, architectural refactors, and feature implementations across the Bizora multi-tenant SaaS ERP monorepo.

---

## [2026-10-19] Antigravity Skills & Coding Governance Setup

### Added
- **Antigravity Project Skills** under `.agents/skills/`:
  1. `bizora-security-audit`: Standardized authentication, authorization, multi-tenant Firestore scoping, and cryptographic verification.
  2. `bizora-saas-architecture`: Multi-portal domain routing, workspace boundaries, and subscription entitlement enforcement.
  3. `bizora-database-integrity`: Firestore collection schema governance, resilient caching, and non-destructive testing rules.
  4. `bizora-regression-testing`: Monorepo test suites (`npm test`, `npm run ci`, `npm run test:assistant`), typechecking, and production builds.
  5. `bizora-deployment-review`: Pre-flight deployment audit, Vercel headers, readiness probes, and rollback runbooks.
  6. `bizora-ui-ux`: Responsive mobile design, zero-horizontal-scroll enforcement, and portal design system consistency.
- **Persistent Project Rules**:
  - Created `.agents/rules/bizora-project-standards.md` establishing pre-flight inspection, anti-fabrication, real persistence guarantees, zero secrets leaks, and explicit authorization gates.
  - Linked root governance files: `AGENTS.md` and `GEMINI.md`.
- **Master Documentation Suite** in `docs/`:
  - `docs/PROJECT_BLUEPRINT.md`: Comprehensive system blueprint, workspaces, portals, and domain capabilities.
  - `docs/SECURITY_ARCHITECTURE.md`: Defense-in-depth architecture, JWT, OTP, RBAC, and encryption.
  - `docs/API_INVENTORY.md`: Complete directory of public, auth, tenant, and SaaS admin endpoints.
  - `docs/SECURITY_CHECKLIST.md`: Formal verification status of all 25 security controls.
  - `docs/DEPLOYMENT_RUNBOOK.md`: Production deployment, Vercel & Docker instructions, and rollback runbooks.
  - `docs/AI_CHANGELOG.md`: This engineering record.

---

## [2026-10-19] Website Redesign, Dynamic Pricing Sync & Legal Suite

### Changed
- **Public Landing Page (`frontend/src/components/landing/LandingPage.tsx`)**:
  - Removed top announcement bar containing subdomains and the Admin button.
  - Removed all SaaS Admin links (`dashboard_admin.bizora.io` / `Admin`) from header, hero, and footer.
  - Replaced hero developer-centric subdomain cards with 4 high-converting SaaS trust metrics:
    1. 100% Offline POS Resilience
    2. FEFO Expiry Flow
    3. Auto VAT & Ledger
    4. Storefront & Real-time Sync
  - Added dedicated **About Bizora** section (`#about`) with tabbed exploration of Core Architecture, Operational Problems Solved, Supported Industry Profiles (Retail, Pharmacy, Fashion, Electronics, Restaurant, Light Manufacturing), Role Hierarchy (Owner, Staff, Customer), and Security Boundaries.
  - Integrated dynamic pricing package synchronization with `/api/platform/public-plans`.
- **Feature Display Engine (`frontend/src/lib/featureDisplayMapping.ts`)**:
  - Created central dictionary resolving raw permission keys (`pos.terminal`, `inventory.batch_tracking`, `purchases.orders`, `finance.cashbox`, `manufacturing.bom`, etc.) into clean titles, descriptions, and Lucide icons.
  - Implemented `getPlanFeaturesOverview()` extracting the top 5 highlights for compact cards and categorizing remaining capabilities.
- **Plan Details Drawer (`frontend/src/components/landing/PlanDetailsModal.tsx`)**:
  - Created interactive modal allowing visitors to inspect all plan capabilities grouped by module category without stretching cards.
- **Comprehensive Legal Suite (`frontend/src/components/legal/LegalModal.tsx`)**:
  - Created legal modal housing 6 compliance documents: Privacy Policy, Terms of Service, Cookie Policy, Refund & Cancellation Policy, Data Security & Processing, and Account & Data Deletion Instructions.
  - Connected to footer buttons and URL hash routing (`#privacy`, `#terms`, `#cookies`, `#refunds`, `#security`, `#deletion`).
- **Build & Test Verification**:
  - Fixed Lucide icon imports (`Trash2`, `Database`).
  - Frontend production build verified (`vite build` passed in 38s).
  - All 106 automated tests passing with 0 failures.

---

## [2026-10-18] Removal of External AI Dependencies & Bizora ERP Assistant

### Changed
- Removed obsolete third-party AI provider API keys, proxy routes, and unneeded external model dependencies.
- Built self-hosted **Bizora ERP Assistant** (`backend/src/assistant/`):
  - Natural language intent matcher with bilingual (English & Bengali) capabilities.
  - Role-Based Access Control (RBAC) enforcement on assistant queries.
  - Zero external cloud AI provider dependencies or recurring token costs.
- Added automated assistant test suite (`backend/src/assistant/assistantService.test.ts`) covering capability registry, natural language matching, and permission gates.

---

## [2026-10-17] Production Security Hardening & Readiness Engine

### Added
- Cryptographic JWT secret enforcement (`backend/src/lib/jwtSecret.ts`) requiring >= 32 characters and rejecting placeholder keywords.
- Cryptographically secure OTP code generation using `crypto.randomInt` with SHA-256 hashing and secret pepper (`OTP_PEPPER`).
- AES-256-GCM cloud backup encryption at rest (`backend/src/lib/backupAtRest.ts`).
- Production readiness gate (`backend/src/lib/readiness.ts`) and deep diagnostic endpoint (`GET /api/admin/readiness`).
- Express body parsing size limits and rate limiting middleware across authentication routes.
- Monorepo automated test suite (`npm test`) reaching 99 passing core tests.

