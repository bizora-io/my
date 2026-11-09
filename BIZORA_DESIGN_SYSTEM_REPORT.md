# BIZORA ERP — REFINED DESIGN SYSTEM & RESTORATION SPECIFICATION

**Document Version:** 2.0.0  
**Audit Date:** 2026-11-09  
**Target:** Bizora Public SaaS Platform (`https://bizora-app-io.vercel.app/`)  
**Auditor:** Agent 04 (Creative Director) & Agent 05 (UI/UX Design Specialist)  
**Status:** Approved for Implementation  

---

## 1. Visual Philosophy & Core Directive

The refined Bizora design system bridges the visual richness of the earlier design with the clean modularity and speed of the current architecture. It delivers:
1. **Commercial Credibility:** Communicates mission-critical reliability for retail counters and financial ledgers.
2. **Dual-Theme Harmonization:** Perfect visual balance in both Day Mode (clean, high-legibility light theme) and Night Mode (high-end obsidian dark theme).
3. **Signature Color Accents:** Re-introduces Bizora's amber/gold trust badges and cyan/indigo accents alongside the primary emerald growth color.

---

## 2. Color Palette & Dual-Theme Tokens

### 2.1 Day Mode (Light Theme)
- **Base Canvas:** `#ffffff` (`bg-white`) / `#f8fafc` (`bg-slate-50`)
- **Card Surfaces:** `#ffffff` (`bg-white`) with subtle borders `#e2e8f0` (`border-slate-200`)
- **Secondary Surfaces:** `#f1f5f9` (`bg-slate-100`) for table headers, inactive tabs, and code blocks
- **Primary Text:** `#0f172a` (`text-slate-900`) — WCAG AAA contrast ratio ($> 12:1$)
- **Secondary Text:** `#475569` (`text-slate-600`) — high readability
- **Muted Text:** `#64748b` (`text-slate-500`)

### 2.2 Night Mode (Dark Theme)
- **Base Canvas:** `#090d16` (`bg-slate-950`) / `#030712`
- **Card Surfaces:** `#0f172a` (`bg-slate-900/80`) with borders `#1e293b` (`border-slate-800`)
- **Secondary Surfaces:** `#020617` (`bg-slate-950/70`) for table headers and inner wells
- **Primary Text:** `#ffffff` (`text-white`) — high contrast
- **Secondary Text:** `#cbd5e1` (`text-slate-300`)
- **Muted Text:** `#94a3b8` (`text-slate-400`)

### 2.3 Semantic Accent Colors (Shared Across Themes)
- **Emerald (Growth, POS & Settled):**
  - Light Mode: `text-emerald-700`, `bg-emerald-50`, `border-emerald-200`, `bg-emerald-600` (buttons)
  - Dark Mode: `text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/30`, `bg-emerald-600` (buttons)
- **Amber/Gold (Trust, Expiry & Priority):**
  - Light Mode: `text-amber-700`, `bg-amber-50`, `border-amber-200`
  - Dark Mode: `text-amber-400`, `bg-amber-500/10`, `border-amber-500/30`
- **Cyan/Indigo (Platform Stability & Accounting):**
  - Light Mode: `text-blue-700`, `bg-blue-50`, `border-blue-200`
  - Dark Mode: `text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/30`

---

## 3. Typography Hierarchy

- **Hero Display H1:** `text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]`
- **Section Titles H2:** `text-3xl sm:text-4xl font-extrabold tracking-tight`
- **Card Titles H3:** `text-xl font-bold tracking-tight`
- **Sub-headings:** `text-lg sm:text-xl font-normal leading-relaxed`
- **Body Regular:** `text-sm sm:text-base leading-normal`
- **Mono / Data:** `font-mono text-xs sm:text-sm` for invoice IDs, batch lots, and account codes.

---

## 4. Re-Integrated Interactive 3D WebGL Canvas

The hero section restores `ThreeHeroScene.tsx`:
- Rendered in a dedicated right-hand container on desktop ($\ge 1024\text{px}$).
- Uses hardware-accelerated WebGL with ACES Filmic Tone Mapping.
- Features soft rotational drift with cursor parallax tracking.
- Automatically disabled if non-WebGL device or `prefers-reduced-motion` is detected.
- Light Mode: Clean pastel ambient lighting with white/slate backdrop.
- Dark Mode: Deep atmospheric neon glow with obsidian backdrop.
