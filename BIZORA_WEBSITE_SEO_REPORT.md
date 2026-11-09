# BIZORA ERP — PUBLIC WEBSITE SEO & STRUCTURED DATA REPORT

**Document Version:** 1.0.0  
**Target:** Bizora Public SaaS Website (`https://bizora-app-io.vercel.app/`)  
**Status:** Verification Completed & Production Ready  

---

## 1. Executive Summary

Search Engine Optimization (SEO) and structured data metadata for the Bizora SaaS platform have been updated to ensure maximum search visibility, accurate OpenGraph/Twitter social previews, and Google rich results eligibility (via Schema.org JSON-LD).

---

## 2. Meta Tags & Canonical Configuration

The `<SEOHead>` component in `frontend/src/components/common/SEOHead.tsx` dynamically generates authoritative metadata depending on the active language (`en` or `bn`):

### English Primary Metadata
- **Title:** `Bizora ERP & POS — Intelligent Cloud Platform for Retail & Multi-Branch Commerce`
- **Description:** `Sub-second barcode billing, FEFO batch expiry control, automated double-entry accounting, and multi-store distribution. Start your 14-day free trial today.`
- **Canonical URL:** `https://bizora-app-io.vercel.app/`
- **Keywords:** `ERP, POS, Retail POS, FEFO batch tracking, expiry control, double-entry accounting, multi-branch inventory, Bangladesh VAT 9.1, thermal receipt printing, offline POS`
- **Robots:** `index, follow`

### Bangla (বাংলা) Metadata
- **Title:** `বিজোরা ইআরপি ও পিওএস — আধুনিক রিটেল ও মাল্টি-ব্রাঞ্চ বিজনেসের স্মার্ট সমাধান`
- **Description:** `সাব-সেকেন্ড বারকোড বিলিং, এফইএফও ব্যাচ মেয়াদ সুরক্ষা, স্বয়ংক্রিয় ডাবল-এন্ট্রি হিসাব ও এনবিআর ভ্যাট ৯.১। আজই ১৪ দিনের ফ্রি ট্রায়াল শুরু করুন।`

---

## 3. OpenGraph & Social Cards

- `og:type`: `website`
- `og:url`: `https://bizora-app-io.vercel.app/`
- `og:site_name`: `Bizora ERP`
- `og:title`: Contextualized to user language selection
- `og:description`: Value-focused SaaS proposition
- `twitter:card`: `summary_large_image`
- `twitter:title` & `twitter:description`: Aligned with brand messaging

---

## 4. Schema.org JSON-LD Structured Data

Two authoritative Schema.org entities are injected:

### 4.1 SoftwareApplication Entity
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bizora ERP & POS",
  "operatingSystem": "Web, Cloud, Windows, macOS, Android, iOS",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "BDT",
    "lowPrice": "0",
    "highPrice": "4999",
    "offerCount": "4"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "128"
  }
}
```

### 4.2 FAQPage Entity
Injected for Google rich snippets on search results pages, providing structured Q&A for:
1. What is Bizora ERP?
2. Which modules are included in the platform?
3. How do I create an account and start a free trial?
4. How are packages and subscriptions priced?
5. Can I manage multiple branch stores under one account?
6. Does the POS terminal work offline without internet?

---

## 5. Semantic HTML5 & Accessibility Audit

- **Document Outline:** Strict hierarchical structure with a single `<h1>` in `HeroSection`, followed by `<h2>` for major sections, and `<h3>` for cards.
- **Image Assets:** All icons and SVGs include `aria-hidden="true"` or relevant semantic labels.
- **Anchor Fragment Linking:** Clean IDs (`#features`, `#solutions`, `#preview`, `#pricing`, `#faq`) that support deep linking, search sitelinks, and smooth scrolling.
