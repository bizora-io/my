/**
 * Bizora Cross-Portal URL Resolution
 * 
 * Provides production-resilient URLs for cross-portal navigation
 * between the Main Shop ERP app and the SaaS Admin app.
 */

export function getAdminPortalUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_ADMIN_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://admin-bizora-app.vercel.app';
      }
    }
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://admin-bizora-app.vercel.app';
  }
  return 'http://localhost:5174';
}

export function getShopPortalUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SHOP_URL || (import.meta as any).env?.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://bizora-app-io.vercel.app';
      }
    }
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://bizora-app-io.vercel.app';
  }
  return 'http://localhost:5173';
}
