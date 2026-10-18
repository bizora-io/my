---
name: bizora-regression-testing
description: >-
  Use this skill when running test suites, verifying code changes, checking TypeScript types,
  or running production builds across the Bizora monorepo. Enforces evidence-based reporting.
---

# Bizora Regression Testing Skill

## Purpose & Scope
This skill defines the canonical verification protocol for the Bizora ERP monorepo. It ensures that every code change is backed by automated tests, strict TypeScript typechecking, and successful production builds across all 4 workspaces.

## Monorepo Test Commands Reference

### 1. Primary Automated Test Suite
Runs all core domain, reconciliation, cryptographic, security, and ERP assistant tests:
```bash
npm test
```
*Current test inventory: 106 automated tests (99 core tests + 7 assistant tests).*

### 2. Full Continuous Integration Suite
Executes the full test suite followed by production builds of backend, frontend, and admin workspaces:
```bash
npm run ci
```

### 3. Focused Test Targets
- **ERP Assistant**: `npm run test:assistant`
- **Security & Readiness Smoke**: `npm run test:smoke`
- **Edge Financial Calculations**: `npm run test:edge`
- **SaaS Churn & MRR Analytics**: `npm run test:churn`
- **API Smoke Probes**: `npm run test:api-smoke`

### 4. Type Checking & Linting
TypeScript compilation check without emitting artifacts:
```bash
# Monorepo-wide check:
npm run lint

# Workspace-specific checks:
npm run lint -w backend
npm run lint -w frontend
npm run lint -w admin
```

### 5. Production Builds
Verifies bundling, chunk splitting, and tree-shaking for production artifacts:
```bash
# Build all workspaces:
npm run build

# Workspace-specific builds:
npm run build:backend
npm run build:frontend
npm run build:admin
```

## Mandatory Pre-Commit Checklist
Before claiming a coding task is complete, an AI assistant must:
1. Run `npm test` and verify that all test suites report `pass` with `fail: 0`.
2. Run `npm run lint` and verify zero TypeScript diagnostic errors.
3. Run `npm run build:frontend` (or `npm run build`) if frontend/admin UI components were modified.
4. Verify that no mock code, placeholder credentials, or bypassed security logic were introduced to force a passing test.

## Failure & Regression Policy
- **Never ignore a failing test**: If a test fails, analyze the assertion and fix the underlying defect.
- **Never delete or comment out tests**: Unless the corresponding business requirement has been legitimately altered or deprecated by explicit user instruction.
- **Add regression tests**: Whenever fixing a bug or adding a feature, add a corresponding test case in the relevant test file.

