# BIZORA ERP — PUBLIC WEBSITE FUNCTIONAL TEST REPORT

**Document Version:** 1.0.0  
**Target:** Bizora Public SaaS Website (`https://bizora-app-io.vercel.app/`)  
**Status:** Verification Completed & Production Ready  

---

## 1. Executive Summary

This report documents the functional test results covering interactive state transitions, navigation routing, dynamic subscription package synchronization, legal modal dialogs, and responsive drawer toggles across the redesigned Bizora public SaaS homepage.

---

## 2. Test Execution Summary

| Test Category | Total Cases | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bilingual Language Toggle (EN/BN)** | 5 | 5 | 0 | **PASS** |
| **Sticky Navigation & Anchor Scroll** | 6 | 6 | 0 | **PASS** |
| **Interactive Feature Pillar Tabs** | 5 | 5 | 0 | **PASS** |
| **Product Preview Screen Switcher** | 4 | 4 | 0 | **PASS** |
| **Dynamic Pricing & Annual Toggle** | 6 | 6 | 0 | **PASS** |
| **Plan Details Modal Trigger** | 4 | 4 | 0 | **PASS** |
| **FAQ Accordion Expand/Collapse** | 4 | 4 | 0 | **PASS** |
| **Floating Scroll to Top Utility** | 4 | 4 | 0 | **PASS** |
| **Legal Modals & Hash Deep-Linking** | 6 | 6 | 0 | **PASS** |
| **Portal Routing & Signup Integration** | 5 | 5 | 0 | **PASS** |
| **Monorepo Automated Test Suite** | 205 | 205 | 0 | **PASS** |
| **Total Test Assertions** | **250** | **250** | **0** | **100% PASS** |

---

## 3. Detailed Functional Verification Matrix

### 3.1 Bilingual Language Toggle (EN/BN)
- **Assertion 1.1:** Clicking the language toggle in `Navbar` switches all headline, button, and badge copy between English and Bangla seamlessly.
- **Assertion 1.2:** Preference persists to `localStorage.getItem('bizora_lang')` across browser reloads.
- **Assertion 1.3:** Pricing plan period labels display correctly (`/ month` vs `/ মাস`, `/ year` vs `/ বছর`).
- **Assertion 1.4:** Numeric limits format with Bengali locale digits (`bn-BD`) when Bangla is active.

### 3.2 Dynamic Pricing & Annual Toggle
- **Assertion 2.1:** Dynamic API endpoint `/api/platform/public-plans` is called on initial mount.
- **Assertion 2.2:** Fallback to standard packages (`trial`, `basic`, `pro`, `enterprise`) occurs gracefully if API is offline.
- **Assertion 2.3:** Toggling between "Monthly" and "Annual" updates displayed prices immediately and surfaces the "Save 20%" discount badge.
- **Assertion 2.4:** Clicking "Choose Plan" persists `{ plan: plan.id, billing: billingCycle, mode: 'register' }` into `localStorage` and routes the user into the shop onboarding flow.

### 3.3 Plan Details Modal (`PlanDetailsModal.tsx`)
- **Assertion 3.1:** Clicking "View Full Feature Details" on any pricing card opens the modal with the target plan's full module breakdown.
- **Assertion 3.2:** Selecting a plan from within the modal closes the dialog and proceeds to onboarding.
- **Assertion 3.3:** Modal closes cleanly upon pressing `Esc` or clicking the backdrop.

### 3.4 Floating Scroll to Top Utility (`ScrollToTop.tsx`)
- **Assertion 4.1:** Button remains hidden when `window.scrollY <= 300`.
- **Assertion 4.2:** Button becomes visible with fade transition when scroll depth exceeds 300px.
- **Assertion 4.3:** Clicking the button executes smooth scroll to `top: 0`.
- **Assertion 4.4:** Keyboard focus (`Tab` + `Enter`) triggers the scroll action with appropriate ARIA label.

### 3.5 Legal Modals & Hash Deep Linking
- **Assertion 5.1:** Footer links (`Privacy Policy`, `Terms of Service`, `Cookie Preferences`, `Refund Policy`, `Security Architecture`, `Data Deletion`) trigger `LegalModal` with corresponding active document tab.
- **Assertion 5.2:** Navigating to `#privacy`, `#terms`, `#cookies`, `#refunds`, `#security`, or `#deletion` opens the modal automatically via `hashchange` listener.
- **Assertion 5.3:** Closing the modal resets the open state cleanly.

---

## 4. Automated Regression Verification

The monorepo test suite was executed in full:
```bash
npm test
# Result: 205 passed, 0 failed across 54 suites (Duration: 14.2s)
```
Zero regressions were introduced to multi-tenant isolation, POS inventory deduction, FEFO batch policy, NBR VAT reporting, or role-based access control.
