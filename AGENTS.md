# Bizora ERP — AI Agent Governance & Project Guidelines

This file links directly to the canonical project standards and coding governance rules defined in `.agents/rules/bizora-project-standards.md`.

## Core Standards Summary
1. **Pre-Flight Inspection**: Inspect real source files and blueprints before editing.
2. **Anti-Fabrication**: Never fabricate API endpoints, database fields, credentials, or test results.
3. **Real Persistence**: Never replace database operations with mock success responses. Never bypass authentication or tenant isolation to fix tests.
4. **Tenant Isolation**: Strictly enforce `businesses/{businessId}/{subcollection}` isolation on all tenant queries.
5. **Zero Secrets Leaks**: Never expose `.env` credentials, private keys, or passwords in client bundles or logs.
6. **Regression Verification**: Always verify changes with `npm test`, `npm run lint`, and workspace production builds.
7. **Human Oversight**: Ask before destructive database changes, secret rotations, or production deployments.

For detailed guidelines, skill procedures, and runbooks, refer to:
- Standards: `.agents/rules/bizora-project-standards.md`
- Skills: `.agents/skills/`
  - `bizora-security-audit`
  - `bizora-saas-architecture`
  - `bizora-database-integrity`
  - `bizora-regression-testing`
  - `bizora-deployment-review`
  - `bizora-ui-ux`
- Blueprints: `docs/PROJECT_BLUEPRINT.md` and `docs/SECURITY_ARCHITECTURE.md`

