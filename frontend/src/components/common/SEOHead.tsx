import React, { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  item: string; // URL path or absolute URL
}

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  keywords?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  ogImageAlt?: string;
  noIndex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const BASE_URL = 'https://bizora-app-io.vercel.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/assets/bizora-og.png`;
const DEFAULT_OG_ALT = 'Bizora ERP — Smart Business. Better Tomorrow.';

/**
 * SEOHead - High-performance dynamic SEO and structured data head manager
 * Updates document title, canonical tags, OpenGraph/Twitter cards, and JSON-LD schemas on client route changes.
 */
export const SEOHead: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  keywords,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = DEFAULT_OG_ALT,
  noIndex = false,
  breadcrumbs,
  structuredData,
}) => {
  useEffect(() => {
    // 1. Update Document Title
    const originalTitle = document.title;
    document.title = title;

    // Helper to find or create meta tag
    const setMeta = (attr: 'name' | 'property', key: string, value: string) => {
      let meta = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, key);
        document.head.appendChild(meta);
      }
      meta.content = value;
    };

    // 2. Primary Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'title', title);
    if (keywords) {
      setMeta('name', 'keywords', keywords);
    }

    // 3. Robots Meta Directive
    const robotsDirective = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMeta('name', 'robots', robotsDirective);

    // 4. Canonical Tag
    const resolvedCanonical = canonicalUrl
      ? canonicalUrl.startsWith('http') ? canonicalUrl : `${BASE_URL}${canonicalUrl}`
      : BASE_URL;

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = resolvedCanonical;

    // 5. OpenGraph Tags
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', resolvedCanonical);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:alt', ogImageAlt);

    // 6. Twitter / X Cards
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);
    setMeta('name', 'twitter:image:alt', ogImageAlt);

    // 7. Dynamic JSON-LD Structured Data
    const ldJsonId = 'bizora-dynamic-seo-ldjson';
    let scriptTag = document.getElementById(ldJsonId) as HTMLScriptElement | null;

    const schemas: Array<Record<string, unknown>> = [];

    // BreadcrumbList schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item.startsWith('http') ? crumb.item : `${BASE_URL}${crumb.item}`,
        })),
      });
    }

    // Custom or FAQ structured data
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        schemas.push(...structuredData);
      } else {
        schemas.push(structuredData);
      }
    }

    if (schemas.length > 0) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = ldJsonId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : {
        '@context': 'https://schema.org',
        '@graph': schemas,
      });
    } else if (scriptTag) {
      scriptTag.remove();
    }

    // Cleanup on unmount or page change
    return () => {
      document.title = originalTitle;
      const dynamicScript = document.getElementById(ldJsonId);
      if (dynamicScript) {
        dynamicScript.remove();
      }
    };
  }, [title, description, canonicalUrl, keywords, ogType, ogImage, ogImageAlt, noIndex, breadcrumbs, structuredData]);

  return null;
};

export default SEOHead;

