---
name: bizora-ui-ux
description: >-
  Use this skill when auditing, designing, or implementing UI/UX components across Bizora ERP.
  Covers responsive mobile layouts, design system consistency, accessibility, error states,
  and portal visual coherence.
---

# Bizora UI/UX Quality & Responsive Design Skill

## Purpose & Scope
Bizora ERP operates across diverse viewports: from high-resolution desktop management displays to 7-inch mobile POS tablets and smartphone customer portals. This skill enforces rigorous visual consistency, responsive integrity, and accessibility standards across all user interfaces.

## Core Design Principles

### 1. Unified Brand & Design System
- **Color Palette**:
  - Dark Theme Foundation: Rich obsidian blacks (`#09090b`, `#121215`, `#18181e`).
  - Brand Accents: Warm amber and gold (`amber-400` / `#f59e0b`, `amber-300`).
  - Semantic Status: Emerald for success/active (`emerald-400`), Rose for alerts/loss (`rose-400`), Sky for information/transfers (`sky-400`), Purple for customers (`purple-400`).
- **Typography & Hierarchy**: Clean sans-serif with bold numerical readouts for financial metrics, tabbed headers, and high-contrast labels.
- **Micro-Interactions**: Subtle hover states, smooth transitions (200-300ms), interactive glassmorphic cards with restrained borders (`border-white/10`).

### 2. Zero Unintended Horizontal Scroll
- The root document viewport must never experience unintended horizontal scrollbars (`overflow-x-hidden` on main containers).
- Data tables with many columns (e.g. Sales Ledger, Journal, Stock Report) must wrap their `<table>` in an explicit `<div className="overflow-x-auto">` container with smooth horizontal scrolling.
- Pricing cards, feature grids, and tab bars must collapse into vertical stacks or swipeable horizontal tracks on viewports `< 768px`.

### 3. Accessible Forms & Interactive Controls
- Every form input must have an accessible label, explicit placeholder, and visual focus ring (`focus:ring-2 focus:ring-amber-400`).
- Action buttons must provide clear loading spinners during async submission (`disabled:opacity-50`, `cursor-not-allowed`, `<RefreshCw className="animate-spin" />`).
- Error states must display inline validation messages beneath the respective input field with high-contrast text (`text-rose-400 text-xs`).

### 4. Portal-Specific UX Guidelines
- **Public Website (`LandingPage.tsx`)**:
  - Immersive 3D visual storytelling (`ThreeHeroScene.tsx`), interactive module tabs, dynamic pricing carousel, and full legal drawers (`LegalModal.tsx`).
  - Zero mentions or links to SaaS Admin.
- **Shop Owner ERP (`frontend/src/components/*`)**:
  - High-density KPI cards, quick actions bar, offline sync badge, and fast keyboard navigation.
- **Cashier POS Till (`Sell.tsx` / `QuickSale.tsx`)**:
  - Large touch targets, instant barcode reader focus, split-payment numpad, thermal receipt preview.
- **SaaS Admin Dashboard (`admin/src/*`)**:
  - System-wide tenant search, subscriber tier editor, safe archive warnings, and platform health telemetry.

## Verification Protocol
1. **Responsive Viewport Check**: Test screens across `375px` (mobile), `768px` (tablet), `1024px` (laptop), and `1440px` (desktop).
2. **Build Verification**: Run `npm run build:frontend` and `npm run build:admin` to ensure zero compilation or bundling warnings.
3. **Modal & Drawer Isolation**: Ensure modals trap focus, handle Escape key dismissal, and restore body scroll upon closing.

