/**
 * Bizora Centralized & Environment-Aware Cross-Portal URL Resolution
 * 
 * Dynamically resolves URLs across:
 * 1. Local Development (localhost:5173 / localhost:5174 / localhost:3000)
 * 2. Vercel Preview & Production (*.vercel.app)
 * 3. Verified Custom Domains (dynamic subdomain derivation, NEVER assuming a hardcoded domain)
 */

export type PortalType = 'landing' | 'shop' | 'employee' | 'customer' | 'admin';

/**
 * Derives the base root domain from a given hostname.
 * Example: 'shop.bizora.app' -> 'bizora.app'
 * Example: 'employee.my-domain.io' -> 'my-domain.io'
 * Example: 'bizora-app-io.vercel.app' -> 'vercel.app' (handled by vercel checker)
 */
export function extractRootDomain(hostname: string): string {
  if (!hostname) return '';
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  // Check if second-level domain (e.g. co.uk, com.bd, app.io)
  const lastTwo = parts.slice(-2).join('.');
  if (['com.bd', 'co.uk', 'gov.bd', 'org.bd'].includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Resolves the absolute or relative URL for any target portal.
 */
export function getPortalUrl(target: PortalType): string {
  // Safe default for Node.js / SSR / Unit Tests
  if (typeof window === 'undefined' || !window.location) {
    switch (target) {
      case 'admin':
        return (typeof process !== 'undefined' && process.env?.VITE_ADMIN_URL) || 'http://localhost:5174';
      case 'shop':
        return (typeof process !== 'undefined' && (process.env?.VITE_SHOP_URL || process.env?.VITE_APP_URL)) || 'http://localhost:5173/#/shop-login';
      case 'employee':
        return 'http://localhost:5173/#/employee-login';
      case 'customer':
        return 'http://localhost:5173/#/customer-login';
      case 'landing':
      default:
        return 'http://localhost:5173/#/landing';
    }
  }

  const hostname = window.location.hostname.toLowerCase();
  const origin = window.location.origin;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

  // 1. Local development
  if (isLocal) {
    const adminUrl = (import.meta as any).env?.VITE_ADMIN_URL;
    if (target === 'admin') {
      return (adminUrl && !adminUrl.includes('undefined')) ? adminUrl : `http://${hostname}:5174`;
    }
    const base = `http://${hostname}:5173`;
    if (target === 'landing') return `${base}/#/landing`;
    if (target === 'shop') return `${base}/#/shop-login`;
    if (target === 'employee') return `${base}/#/employee-login`;
    if (target === 'customer') return `${base}/#/customer-login`;
  }

  // 2. Vercel deployment / preview (*.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    if (target === 'admin') {
      const configured = (import.meta as any).env?.VITE_ADMIN_URL;
      if (configured && typeof configured === 'string' && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
        return configured.replace(/\/+$/, '');
      }
      return 'https://admin-bizora-app.vercel.app';
    }
    if (target === 'landing') return `${origin}/#/landing`;
    if (target === 'shop') return `${origin}/#/shop-login`;
    if (target === 'employee') return `${origin}/#/employee-login`;
    if (target === 'customer') return `${origin}/#/customer-login`;
  }

  // 3. Custom Domain (Dynamic Multi-Domain Resolution - Never Assumes bizora.io)
  const rootDomain = extractRootDomain(hostname);
  const protocol = window.location.protocol || 'https:';

  if (target === 'admin') {
    const configured = (import.meta as any).env?.VITE_ADMIN_URL;
    if (configured && typeof configured === 'string' && !configured.includes('localhost')) {
      return configured.replace(/\/+$/, '');
    }
    return `${protocol}//dashboard_admin.${rootDomain}`;
  }

  if (target === 'landing') return `${protocol}//${rootDomain}`;
  if (target === 'shop') return `${protocol}//shop.${rootDomain}`;
  if (target === 'employee') return `${protocol}//employee.${rootDomain}`;
  if (target === 'customer') return `${protocol}//customer.${rootDomain}`;

  return `${origin}/#/${target}`;
}

export function getAdminPortalUrl(): string {
  return getPortalUrl('admin');
}

export function getShopPortalUrl(): string {
  return getPortalUrl('shop');
}

export function getEmployeePortalUrl(): string {
  return getPortalUrl('employee');
}

export function getCustomerPortalUrl(): string {
  return getPortalUrl('customer');
}

export function getMarketingUrl(): string {
  return getPortalUrl('landing');
}
