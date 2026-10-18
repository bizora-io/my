/**
 * Bizora Multi-Domain & Portal Router
 *
 * Maps production hostnames to portal entry points:
 * - bizora.io / www.bizora.io         -> Main Website (Public Landing Page with 3D Experience)
 * - shop.bizora.io                     -> Shop Owner Portal (Owner sign-in & ERP Dashboard)
 * - employee.bizora.io                 -> Employee Portal (Employee login & workplace)
 * - customer.bizora.io                 -> Customer Portal (Customer login & self-service dues)
 * - dashboard_admin.bizora.io          -> SaaS Admin Portal (SaaS Owner/Admin administration)
 *
 * Supports query params (?portal=shop) and hash routes (#/landing, #/shop-login, etc.)
 * for local development and direct testing.
 */

export type PortalType = 'landing' | 'shop' | 'employee' | 'customer' | 'admin';

export interface PortalConfig {
  id: PortalType;
  title: string;
  titleBn: string;
  subdomain: string;
  productionDomain: string;
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
    productionDomain: 'https://bizora.io',
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
    productionDomain: 'https://shop.bizora.io',
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
    productionDomain: 'https://employee.bizora.io',
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
    productionDomain: 'https://customer.bizora.io',
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
    productionDomain: 'https://dashboard_admin.bizora.io',
    description: 'Platform overview, tenant businesses, subscriptions, and system health',
    descriptionBn: 'প্ল্যাটফর্ম ব্যবস্থাপনা, সাবস্ক্রিপশন ও সার্বিক মনিটরিং',
    badge: 'SaaS Admin',
    badgeColor: 'bg-slate-900 text-amber-400 border border-amber-400/30',
  },
};

/**
 * Detect the active portal based on current hostname, query params, or hash routes.
 */
export function detectCurrentPortal(): PortalType {
  if (typeof window === 'undefined') return 'landing';

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  // 1. Explicit query parameter override (works in dev and prod testing: ?portal=shop)
  const queryPortal = searchParams.get('portal')?.toLowerCase() as PortalType | null;
  if (queryPortal && PORTAL_CONFIGS[queryPortal]) {
    return queryPortal;
  }

  // 2. Hash route overrides (allows easy testing e.g. #/landing, #/shop-login, #/customer-login)
  if (hash.startsWith('#/landing')) return 'landing';
  if (hash.startsWith('#/shop-login') || hash.startsWith('#/shop')) return 'shop';
  if (hash.startsWith('#/employee-login') || hash.startsWith('#/employee')) return 'employee';
  if (hash.startsWith('#/customer-login') || hash.startsWith('#/customer')) return 'customer';
  if (hash.startsWith('#/admin-login') || hash.startsWith('#/admin')) return 'admin';

  // 3. Subdomain matching in production or custom hosts
  if (hostname === 'dashboard_admin.bizora.io' || hostname.startsWith('dashboard_admin.')) {
    return 'admin';
  }
  if (hostname === 'shop.bizora.io' || hostname.startsWith('shop.')) {
    return 'shop';
  }
  if (hostname === 'employee.bizora.io' || hostname.startsWith('employee.')) {
    return 'employee';
  }
  if (hostname === 'customer.bizora.io' || hostname.startsWith('customer.')) {
    return 'customer';
  }
  if (hostname === 'bizora.io' || hostname === 'www.bizora.io') {
    return 'landing';
  }

  // 4. Default for localhost / 127.0.0.1
  // If stored in sessionStorage, respect the developer's selected portal
  const storedDevPortal = sessionStorage.getItem('bizora_dev_portal') as PortalType | null;
  if (storedDevPortal && PORTAL_CONFIGS[storedDevPortal]) {
    return storedDevPortal;
  }

  // Default to landing page on root domain
  return 'landing';
}

/**
 * Get navigation URL for a target portal.
 * In production returns full domain (https://shop.bizora.io).
 * In local dev returns appropriate hash or query param.
 */
export function getPortalUrl(target: PortalType): string {
  if (typeof window === 'undefined') return PORTAL_CONFIGS[target].productionDomain;

  const hostname = window.location.hostname.toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');

  if (isLocal) {
    if (target === 'admin') {
      // Admin is on port 5174 in dev
      return `http://${window.location.hostname}:5174`;
    }
    if (target === 'landing') return '#/landing';
    if (target === 'shop') return '#/shop-login';
    if (target === 'employee') return '#/employee-login';
    if (target === 'customer') return '#/customer-login';
  }

  return PORTAL_CONFIGS[target].productionDomain;
}

/**
 * Switch the active portal in development mode and reload/navigate.
 */
export function setDevPortal(portal: PortalType): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('bizora_dev_portal', portal);
  const targetUrl = getPortalUrl(portal);
  if (targetUrl.startsWith('#')) {
    window.location.hash = targetUrl.replace('#', '');
  } else {
    window.location.href = targetUrl;
  }
}

