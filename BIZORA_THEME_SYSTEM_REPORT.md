# BIZORA ERP — DAY/NIGHT THEME SYSTEM SPECIFICATION & ARCHITECTURE

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-09  
**Target:** Bizora Public SaaS Platform (`https://bizora-app-io.vercel.app/`)  
**Auditor:** Agent 08 (Theme System Engineer)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary

A core owner requirement is the implementation of a **complete, consistent Day Mode / Night Mode / System Preference public website theme system**. 

The earlier implementation had a non-functional toggle (switching only between two slightly different dark tones), while the current release omitted the toggle completely. This document specifies the complete Day/Night theme architecture, class tokens, persistence mechanism, and component coverage.

---

## 2. Theme Modes & Behavior

The website supports three distinct states:
1. **Light Mode / Day Mode (`light`):**
   - Background: Crisp, clean light surfaces (`bg-slate-50`, `bg-white`).
   - Cards: Elevated white cards (`bg-white`, `border-slate-200`, `shadow-sm`).
   - Typography: Deep, high-contrast slate text (`text-slate-900` headings, `text-slate-600` body).
   - Accents: Vibrant emerald and teal buttons (`bg-emerald-600`, `text-emerald-700`).
   - Tables & Borders: Subdued light dividers (`border-slate-200`, `bg-slate-100/50`).
2. **Dark Mode / Night Mode (`dark`):**
   - Background: Deep obsidian/navy canvas (`bg-slate-950`, `bg-[#090d16]`).
   - Cards: Semi-translucent dark slate (`bg-slate-900/80`, `border-slate-800`).
   - Typography: Bright white headings (`text-white`), muted slate body (`text-slate-300`).
   - Accents: Glowing emerald and cyan badges (`bg-emerald-500/10`, `text-emerald-400`).
3. **System Preference (`system`):**
   - Automatically adapts to `window.matchMedia('(prefers-color-scheme: dark)')`.
   - Listens to system changes dynamically via event listener.

---

## 3. Theme State Management & Persistence

### 3.1 Persistence Protocol
- **Storage Key:** `localStorage.getItem('bizora_theme_preference')`
- **Allowed Values:** `'light' | 'dark' | 'system'`
- **Fallback:** If no value exists in `localStorage`, default to `'dark'` (or system preference if preferred).

### 3.2 Anti-Flash Mechanism
To prevent a flash of the wrong theme on page load:
```typescript
// Initial resolution executed before render
const getInitialTheme = (): 'light' | 'dark' => {
  try {
    const saved = localStorage.getItem('bizora_theme_preference');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {}
  return 'dark'; // Authoritative SaaS default
};
```

---

## 4. Theme Switcher Component Specification

### Desktop Header:
- Circular or pill toggle button placed adjacent to the language switcher.
- Displays `<Sun />` icon when in Dark Mode (click to switch to Light).
- Displays `<Moon />` icon when in Light Mode (click to switch to Dark).
- Includes accessible `aria-label` and `title` tags ("Switch to Light Mode" / "Switch to Dark Mode").

### Mobile Navigation Drawer:
- Prominent segmented pill toggle with visual indicators for Light Mode, Dark Mode, and System Default.
- Full touch target size ($\ge 44\text{px}$).

---

## 5. Component-by-Component Theme Matrix

| Component | Light (Day) Mode Styling | Dark (Night) Mode Styling |
| :--- | :--- | :--- |
| **Navbar** | `bg-white/90 border-slate-200 text-slate-800` | `bg-slate-950/90 border-slate-800 text-slate-100` |
| **Hero Section** | `bg-gradient-to-b from-slate-50 to-white text-slate-900` | `bg-slate-950 text-white` |
| **Product Mockup** | `bg-white border-slate-200 shadow-xl text-slate-900` | `bg-slate-900 border-slate-800 shadow-2xl text-white` |
| **Core Features** | `bg-slate-50 border-slate-200` (Cards: `bg-white`) | `bg-slate-950 border-slate-800` (Cards: `bg-slate-900/60`) |
| **Product Preview** | `bg-white border-slate-200` (Tables: `bg-slate-50`) | `bg-slate-900/40 border-slate-800` (Tables: `bg-slate-950`) |
| **Industry Cards** | `bg-white border-slate-200 hover:border-slate-300` | `bg-slate-900/60 border-slate-800 hover:border-slate-700` |
| **Workflow Steps** | `bg-white border-slate-200` | `bg-slate-950 border-slate-800` |
| **Pricing Cards** | `bg-white border-slate-200` (Pro: `border-emerald-600`) | `bg-slate-900/60 border-slate-800` (Pro: `border-emerald-500`) |
| **FAQ Accordion** | `bg-white border-slate-200 text-slate-900` | `bg-slate-950/80 border-slate-800 text-white` |
| **Contact Section** | `bg-slate-100 border-slate-200` | `bg-slate-900/60 border-slate-800` |
| **Footer** | `bg-slate-900 text-slate-300` (Dark contrast anchor) | `bg-slate-950 text-slate-400 border-slate-800` |
| **Scroll to Top** | `bg-emerald-600 text-white shadow-lg` | `bg-emerald-600 text-white shadow-xl` |
| **Modals (Legal)** | `bg-white text-slate-900` (In dark mode: `bg-slate-900`) | `bg-slate-900 text-slate-100 border-slate-800` |

---

## 6. Verification Protocol

- Verify switching toggles CSS classes on the root container.
- Verify reload retains the selected theme.
- Verify zero text clipping, illegible contrast, or stuck inverse colors.
