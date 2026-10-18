# Bizora ERP — Project Standards & Instructions for Gemini & Antigravity

This repository adheres to strict coding standards, multi-tenant security isolation, and regression verification rules defined in `.agents/rules/bizora-project-standards.md`.

## Key Rules
- Read relevant files in `docs/` and source directories before making edits.
- Never invent mock routes, fake data, or bypass authorization.
- Enforce multi-tenant Firestore isolation on every tenant endpoint (`businesses/{businessId}/...`).
- Verify all changes with `npm test` and `npm run lint`.
- Never commit credentials or expose secrets in client bundles.
- Request explicit approval before destructive database operations or deployments.

See `docs/PROJECT_BLUEPRINT.md` and `docs/SECURITY_ARCHITECTURE.md` for full architectural blueprints.

