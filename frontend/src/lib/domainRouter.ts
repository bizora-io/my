/**
 * Bizora Multi-Domain & Portal Router
 *
 * Maps environment and hostnames to portal entry points:
 * - Root Domain (or www)              -> Main Website (Public Landing Page with 3D Experience)
 * - shop.<domain>                     -> Shop Owner Portal (Owner sign-in & ERP Dashboard)
 * - employee.<domain>                 -> Employee Portal (Employee login & workplace)
 * - customer.<domain>                 -> Customer Portal (Customer login & self-service dues)
 * - dashboard_admin.<domain> / admin  -> SaaS Admin Portal (SaaS Owner/Admin administration)
 *
 * Supports query params (?portal=shop) and hash routes (#/landing, #/shop-login, etc.)
 * for local development, Vercel deployments (*.vercel.app), and direct testing.
 */

import { getPortalUrl as resolvePortalUrl, extractRootDomain, type PortalType } from '@shared/lib/portalUrls';

export type { PortalType };

export interface PortalConfig {
  id: PortalType;
  title: string;
  titleBn: string;
  subdomain: string;
  description: string;
  descriptionBn: string;
  badge: string;
  badgeColor: string;
}

export const PORTAL_CONFIGS: Record<PortalType, PortalConfig> = {
  landing: {
    id: 'landing',
    title: 'Bizora Official Website',
    titleBn: 'বিজোরার মূল ওয়েবসাইট',
    subdomain: '',
    description: 'Public showcase, features, pricing, and 3D visual experience',
    descriptionBn: 'পণ্য পরিচিতি, ফিচার, সাবস্ক্রিপশন ও আধুনিক ৩ডি অভিজ্ঞতা',
    badge: 'Main Site',
    badgeColor: 'bg-amber-400 text-black',
  },
  shop: {
    id: 'shop',
    title: 'Shop Owner Portal',
    titleBn: 'দোকান মালিক পোর্টাল',
    subdomain: 'shop',
    description: 'Business management, point of sale, inventory, and accounting',
    descriptionBn: 'ব্যবসায়িক কার্যক্রম, পিওএস, স্টক, ইনভেন্টরি ও হিসাব ব্যবস্থাপনা',
    badge: 'Shop Owner',
    badgeColor: 'bg-emerald-600 text-white',
  },
  employee: {
    id: 'employee',
    title: 'Employee Workspace',
    titleBn: 'কর্মচারী পোর্টাল',
    subdomain: 'employee',
    description: 'Staff workspace, attendance, task access, and point of sale',
    descriptionBn: 'স্টাফ ওয়ার্কস্পেস, হাজিরা, নির্ধারিত কাজের অনুমতি ও বিক্রি',
    badge: 'Staff & Team',
    badgeColor: 'bg-blue-600 text-white',
  },
  customer: {
    id: 'customer',
    title: 'Customer Self-Service',
    titleBn: 'গ্রাহক সেলফ-সার্ভিস পোর্টাল',
    subdomain: 'customer',
    description: 'Invoices, outstanding due balance, purchase ledger, and online payments',
    descriptionBn: 'ইনভয়েস, বকেয়া হিসাব, কেনাকাটার রেকর্ড ও অনলাইন পেমেন্ট',
    badge: 'Customer Care',
    badgeColor: 'bg-purple-600 text-white',
  },
  admin: {
    id: 'admin',
    title: 'SaaS Administration',
    titleBn: 'SaaS প্ল্যাটফর্ম অ্যাডমিন',
    subdomain: 'dashboard_admin',
    description: 'Platform overview, tenant businesses, subscriptions, and system health',
    descriptionBn: 'প্ল্যাটফর্ম ব্যবস্থাপনা, সাবস্ক্রিপশন ও সার্বিক মনিটরিং',
    badge: 'SaaS Admin',
    badgeColor: 'bg-slate-900 text-amber-400 border border-amber-400/30',
  },
};

/**
 * Detect the active portal based on current hostname, query params, or hash routes.
 * Fully dynamic: handles any domain, vercel deployments, and localhost.
 */
export function detectCurrentPortal(): PortalType {
  if (typeof window === 'undefined') return 'landing';

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  // 1. Explicit query parameter override (e.g. ?portal=shop)
  const queryPortal = searchParams.get('portal')?.toLowerCase() as PortalType | null;
  if (queryPortal && PORTAL_CONFIGS[queryPortal]) {
    return queryPortal;
  }

  // 2. Hash route overrides (allows seamless navigation on single-domain deployments like *.vercel.app)
  if (hash.startsWith('#/landing')) return 'landing';
  if (hash.startsWith('#/shop-login') || hash.startsWith('#/shop')) return 'shop';
  if (hash.startsWith('#/employee-login') || hash.startsWith('#/employee')) return 'employee';
  if (hash.startsWith('#/customer-login') || hash.startsWith('#/customer')) return 'customer';
  if (hash.startsWith('#/admin-login') || hash.startsWith('#/admin')) return 'admin';

  // 3. Subdomain matching on any domain (e.g. shop.bizora.app, shop.bizora.io, employee.anydomain.com)
  if (hostname.startsWith('dashboard_admin.') || hostname.startsWith('admin.')) {
    return 'admin';
  }
  if (hostname.startsWith('shop.')) {
    return 'shop';
  }
  if (hostname.startsWith('employee.')) {
    return 'employee';
  }
  if (hostname.startsWith('customer.')) {
    return 'customer';
  }

  // 4. Stored dev portal for localhost testing
  const storedDevPortal = sessionStorage.getItem('bizora_dev_portal') as PortalType | null;
  if (storedDevPortal && PORTAL_CONFIGS[storedDevPortal]) {
    return storedDevPortal;
  }

  // Default to landing page on root domain
  return 'landing';
}

/**
 * Get navigation URL for a target portal.
 * Environment-aware: delegates to centralized shared portal resolver.
 */
export function getPortalUrl(target: PortalType): string {
  return resolvePortalUrl(target);
}

/**
 * Switch the active portal in development or single-page mode and reload/navigate.
 */
export function setDevPortal(portal: PortalType): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('bizora_dev_portal', portal);
  const targetUrl = getPortalUrl(portal);
  if (targetUrl.includes('#')) {
    const hashPart = targetUrl.split('#')[1];
    window.location.hash = hashPart;
  } else {
    window.location.href = targetUrl;
  }
}
