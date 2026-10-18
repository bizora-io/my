# Bizora ERP — Project Coding Standards & AI Governance Rules

These rules govern all AI-assisted engineering and pair-programming tasks on the Bizora multi-tenant SaaS ERP repository. Every agent, subagent, and automated process MUST adhere to these standards unconditionally.

---

## 1. Pre-Flight Inspection & Context First
- **Read Before Modifying**: Never edit code without first inspecting the relevant source files, existing schemas, and architectural blueprints (`docs/PROJECT_BLUEPRINT.md`, `docs/SECURITY_ARCHITECTURE.md`, `docs/DATABASE.md`).
- **Assess Risk**: Categorize changes by risk tier (Low: UI formatting/copy; Medium: API endpoint logic/state management; High: Authentication, RBAC, tenant isolation, database schema, payment webhooks). Plan high-risk modifications with extra verification steps.
- **Preserve Existing Business Logic**: Respect established workflows (FEFO batch allocation, double-entry journal postings, offline queue flush, VAT netting). Never discard working business logic in favor of oversimplified generic implementations.

## 2. Integrity & Anti-Fabrication Mandate
- **Zero Hallucination / Fabrication**:
  - NEVER invent or fabricate API routes, database subcollections, document fields, or permissions that do not exist.
  - NEVER fabricate fake credentials, placeholder secrets, or demo tokens.
  - NEVER fabricate test execution results. Report exact commands run, exit codes, and output logs honestly.
  - NEVER fabricate corporate history, fictitious executive bios, or false certifications in public site content.
- **Real Persistence Guarantee**:
  - NEVER replace actual Firestore / database operations with hardcoded mock responses or temporary in-memory arrays unless explicitly requested as a standalone unit test stub.
  - NEVER bypass authentication checks, role gates, or tenant isolation checks (`businessId`) just to make a failing test pass. Fix the test fixture or implementation root cause.

## 3. Cryptographic, Secrets & Tenant Isolation Standards
- **Zero Secrets in Version Control**:
  - Never commit, display, or leak `.env` variables, service account keys, private JWT secrets, or payment credentials into source code, comments, or client-side bundles.
  - All client environment variables must use the explicit `VITE_` prefix and contain only public routing configurations (e.g., `VITE_API_URL`, `VITE_ADMIN_URL`).
- **Multi-Tenant Path Security**:
  - All tenant data must be strictly scoped under `businesses/{businessId}/{subcollection}`.
  - No API endpoint may accept a client-provided `businessId` without verifying that it matches the authenticated session's token claims.
- **SaaS Admin Portal Boundary**:
  - SaaS Admin endpoints (`/api/admin/*`) and administration dashboards (`admin/` workspace) must remain strictly inaccessible to general public visitors and regular shop employees.
  - Never expose SaaS Admin links on public-facing marketing or landing pages.

## 4. Code Quality, Stepwise Execution & Verification
- **Small, Reviewable Changes**: Make targeted, incremental modifications. Avoid massive, untracked multi-file overwrites.
- **Maintain Documentation Integrity**: Preserve all existing docstrings, interface definitions, and architectural notes unless explicitly asked to rewrite.
- **Automated Regression Testing**:
  - Any bug fix or new feature must be verified against `npm test`.
  - Add or update regression test cases under `shared/lib/*.test.ts` or `backend/src/lib/*.test.ts` to lock in bug fixes permanently.
- **TypeScript & Build Verification**:
  - Run `npm run lint` (`tsc --noEmit`) to verify zero type diagnostics before concluding any turn.
  - Run `npm run build:frontend` or `npm run build:backend` when modifying bundler-sensitive files.
- **Diff Review**: Inspect the final git status and diff before reporting completion to ensure no accidental files or unintended modifications occurred.

## 5. Explicit Authorization & Safety Gates
Always request explicit user confirmation before:
- Destructive database actions (dropping collections, batch document deletions, schema-breaking migrations).
- Modifying production deployment configurations, DNS records, or trigger scripts.
- Rotating production secrets or encryption keys (`JWT_SECRET`, `BACKUP_AT_REST_KEY`, Firebase credentials).
- Installing third-party packages or untrusted MCP servers.

## 6. Truthful Reporting
- Always clearly distinguish verified, empirically tested results (with tool output evidence) from assumptions, inferences, or pending open items.

