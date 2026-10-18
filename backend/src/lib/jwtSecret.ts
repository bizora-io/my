/**
 * Centralized, secure JWT Secret provider for Bizora ERP.
 * Strictly prevents hardcoded fallback secrets in production.
 */

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    console.warn('[SECURITY WARNING] JWT_SECRET is unset. Using temporary development secret.');
    cachedSecret = 'bizora_dev_only_unpredictable_secret_' + Math.random().toString(36).slice(2);
    return cachedSecret;
  }

  if (isProd) {
    if (secret.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production.');
    }
    if (/fallback|change|your_super_secret|default/i.test(secret)) {
      throw new Error('FATAL: JWT_SECRET contains an insecure placeholder word in production.');
    }
  }

  cachedSecret = String(secret);
  return cachedSecret;
}

