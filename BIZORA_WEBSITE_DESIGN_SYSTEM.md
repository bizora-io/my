# BIZORA ERP — PUBLIC WEBSITE DESIGN SYSTEM & TOKEN SPECIFICATION

**Document Version:** 1.0.0  
**Target:** Bizora Public SaaS Website (`https://bizora-app-io.vercel.app/`)  
**Status:** Approved for Production Implementation  

---

## 1. Design System Philosophy

The Bizora visual aesthetic is engineered to communicate enterprise reliability, precision, and commercial capability. It avoids excessive glowing neon effects or distracting particle canvases in favor of crisp typography, subtle borders, high contrast, and smooth micro-interactions.

---

## 2. Color Palette & Semantic Tokens

### Backgrounds & Surfaces
- **Canvas Base (`bg-slate-950` / `#090d16`):** Deep, ultra-dark navy-slate baseline that eliminates harsh pure black `#000000`.
- **Card Surface (`bg-slate-900/70` / `#0f172a`):** Semi-translucent dark slate with `backdrop-blur-md` for structural card elevation.
- **Card Surface Elevated (`bg-slate-800/80`):** Used for hover states, active tabs, and highlighted interactive elements.
- **Border Subtle (`border-slate-800` / `border-slate-800/80`):** Delivers clean separation without visually overwhelming the user.
- **Border Highlight (`border-emerald-500/40` / `border-blue-500/40`):** Used on active cards and featured pricing tiers.

### Brand Accents & Gradients
- **Primary Emerald (Growth & Finance):**
  - Text: `text-emerald-400`
  - Button/Fill: `bg-emerald-600 hover:bg-emerald-500`
  - Gradient: `from-emerald-600 to-teal-600`
  - Glow/Ring: `ring-emerald-500/30`
- **Secondary Indigo/Blue (Trust & Platform Stability):**
  - Text: `text-blue-400`
  - Gradient: `from-blue-600 to-indigo-600`
- **Warning Amber (Expiry & Alerts):**
  - Text: `text-amber-400`
  - Background: `bg-amber-500/10`
  - Border: `border-amber-500/30`

### Typography Colors
- **Headline Primary:** `text-white` (High contrast, 100% opacity)
- **Sub-headline & Body:** `text-slate-300` / `text-slate-400` (High readability, WCAG AAA compliant contrast against `#090d16`)
- **Muted / Metadata:** `text-slate-500` (Labels, captions, secondary timestamps)

---

## 3. Typography Scale & Font Hierarchy

- **Hero Title (`h1`):** `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]`
- **Section Heading (`h2`):** `text-3xl sm:text-4xl font-bold tracking-tight text-white`
- **Card Heading (`h3`):** `text-lg sm:text-xl font-semibold text-white`
- **Body Large:** `text-lg sm:text-xl text-slate-300 leading-relaxed`
- **Body Regular:** `text-sm sm:text-base text-slate-400 leading-normal`
- **Pills & Badges:** `text-xs font-semibold tracking-wide uppercase`

---

## 4. Component Token Specifications

### 4.1 Buttons
- **Primary CTA (`Emerald Gradient`):**
  - Classes: `inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 transition-all duration-200 active:scale-[0.98]`
- **Secondary / Ghost Button:**
  - Classes: `inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 transition-all duration-200`
- **Small Action Button:**
  - Classes: `px-4 py-2 rounded-lg text-sm font-medium transition-colors`

### 4.2 Interactive Cards
- **Standard Card:**
  - Classes: `rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-6 sm:p-8 hover:border-slate-700 transition-all duration-200`
- **Popular / Highlighted Card (Pricing Pro Tier):**
  - Classes: `rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-b from-slate-900/95 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-emerald-950/50 relative overflow-hidden`

### 4.3 Badge Pills
- **Status / Module Pill:**
  - Classes: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border`
  - Emerald: `border-emerald-500/30 bg-emerald-500/10 text-emerald-400`
  - Blue: `border-blue-500/30 bg-blue-500/10 text-blue-400`
  - Amber: `border-amber-500/30 bg-amber-500/10 text-amber-400`

### 4.4 Floating Scroll to Top Button
- **Floating Button (`ScrollToTop`):**
  - Position: `fixed bottom-6 right-6 z-50`
  - Classes: `flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-black/40 border border-emerald-400/30 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950`
  - Icon: `<ArrowUp className="w-5 h-5" />`
  - Accessibility: `aria-label="Scroll to top of page"`

---

## 5. Spacing, Rhythm & Container Layout

- **Max Container Width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Padding Vertical:** `py-16 sm:py-24` (Consistent rhythm without artificial yawning gaps)
- **Section Header Separation:** `mb-12 sm:mb-16 text-center max-w-3xl mx-auto`
- **Grid Layouts:**
  - Feature Pillars: 5-tab switcher with detailed preview panel
  - Industry Solutions: 3 columns on desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`)
  - Pricing Cards: 4 columns on large screens (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`)
  - Footer: 4 columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8`)
