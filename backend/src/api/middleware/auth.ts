import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../../lib/firebaseAdmin.js';
import { checkBusinessHasFeature } from '../../lib/planFeatures.js';
import { getJwtSecret } from '../../lib/jwtSecret.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      /** Set by requireBusinessContext */
      businessId?: string;
    }
  }
}

function isSaasRole(role: string | undefined): boolean {
  const r = String(role || '').toUpperCase();
  return r === 'SAAS_OWNER' || r === 'SAAS_ADMIN';
}

/**
 * Business context for tenant data access:
 * - SHOP_OWNER / impersonated: user.id is the business document id
 * - EMPLOYEE: user.businessId is the active employment's business
 * - SAAS_*: returns null (must use /api/admin/* — never tenant subcollections as "saas-owner")
 */
export function getActingBusinessId(req: Request): string | null {
  const u = req.user;
  if (!u) return null;
  if (u.impersonated && u.id) return String(u.id);
  if (isSaasRole(u.role)) return null;
  if (u.role === 'EMPLOYEE') return u.businessId ? String(u.businessId) : null;
  if (u.role === 'SHOP_OWNER') return u.id ? String(u.id) : null;
  // CUSTOMER / SUPPLIER: no shop tenant scope
  return null;
}

/**
 * Resolve business id or fail. Prefer over `getActingBusinessId() || user.id`
 * which incorrectly used SaaS ids as tenant paths.
 */
export function requireBusinessId(req: Request, res: Response): string | null {
  const bid = getActingBusinessId(req);
  if (!bid) {
    res.status(403).json({
      error: 'No business context. Shop owner/employee token required for this resource.',
      code: 'missing_business_context',
    });
    return null;
  }
  return bid;
}

/** Express middleware: attach req.businessId or 403. Blocks pure SaaS tokens on tenant routes. */
export const requireBusinessContext = (req: Request, res: Response, next: NextFunction): void => {
  const bid = getActingBusinessId(req);
  if (!bid) {
    res.status(403).json({
      error: 'No business context. Shop owner/employee token required for this resource.',
      code: 'missing_business_context',
    });
    return;
  }
  req.businessId = bid;
  next();
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as any;

    if (decoded.typ === 'refresh' || decoded.preAuth) {
      res.status(403).json({ error: 'Invalid token type for this endpoint.' });
      return;
    }

    // Employee must carry businessId claim for tenant routes
    if (decoded.role === 'EMPLOYEE' && !decoded.businessId) {
      res.status(403).json({ error: 'Employee token missing businessId.' });
      return;
    }

    const targetBusinessId = decoded.role === 'EMPLOYEE'
      ? decoded.businessId
      : (decoded.role === 'SHOP_OWNER' || decoded.impersonated ? decoded.id : null);

    if (targetBusinessId) {
      const doc = await getDb().collection('businesses').doc(targetBusinessId).get();
      if (!doc.exists) {
        res.status(403).json({ error: 'Business account no longer exists.' });
        return;
      }
      const data = doc.data() || {};
      if (data.accountStatus === 'Suspended') {
        res.status(403).json({ error: 'This business account has been suspended. Please contact support.' });
        return;
      }
      if (data.subscriptionStatus === 'Expired' && data.subscriptionEnforce === true) {
        res.status(402).json({ error: 'Subscription expired. Please renew to continue.' });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    const msg = error?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or expired token.';
    console.warn('[auth] JWT verify failed:', error?.message || error);
    res.status(401).json({ error: msg, code: 'invalid_token' });
    return;
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    return;
  }
  next();
};

export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction): void => {
  // Platform owner document id is always allowed on SaaS-admin routes
  if (req.user && String(req.user.id) === 'saas-owner') {
    next();
    return;
  }
  const raw = String(req.user?.role || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const allowed = roles.map((r) => String(r).toUpperCase().replace(/[\s-]+/g, '_'));
  const aliases: Record<string, string[]> = {
    SAAS_OWNER: ['SAAS_OWNER', 'OWNER', 'SUPER_ADMIN'],
    SAAS_ADMIN: ['SAAS_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'],
  };
  const expanded = new Set(allowed);
  for (const a of allowed) {
    (aliases[a] || []).forEach((x) => expanded.add(x));
  }
  if (!req.user || !expanded.has(raw)) {
    res.status(403).json({
      error: 'Access denied. Insufficient privileges.',
      code: 'insufficient_role',
      got: req.user?.role ?? null,
      id: req.user?.id ?? null,
      need: roles,
    });
    return;
  }
  next();
};


/**
 * Enforce feature permissions for EMPLOYEE tokens.
 * SHOP_OWNER, SAAS_OWNER, SAAS_ADMIN always pass.
 * EMPLOYEE must have at least one of the listed permission keys in JWT.permissions[].
 */
export const requirePermission = (...permissionKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'Access denied.' });
      return;
    }
    if (u.role === 'SHOP_OWNER' || u.role === 'SAAS_OWNER' || u.role === 'SAAS_ADMIN' || u.impersonated) {
      next();
      return;
    }
    if (u.role === 'EMPLOYEE') {
      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
      const ok = permissionKeys.length === 0 || permissionKeys.some((k) => perms.includes(k) || perms.includes('all'));
      if (!ok) {
        res.status(403).json({
          error: 'Missing permission.',
          required: permissionKeys,
          mode: 'any',
        });
        return;
      }
      next();
      return;
    }
    res.status(403).json({ error: 'Access denied.' });
  };
};

/** AND semantics — employee must have every listed key (or "all"). */
export const requireAllPermissions = (...permissionKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'Access denied.' });
      return;
    }
    if (u.role === 'SHOP_OWNER' || u.role === 'SAAS_OWNER' || u.role === 'SAAS_ADMIN' || u.impersonated) {
      next();
      return;
    }
    if (u.role === 'EMPLOYEE') {
      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
      if (perms.includes('all')) {
        next();
        return;
      }
      const missing = permissionKeys.filter((k) => !perms.includes(k));
      if (missing.length) {
        res.status(403).json({
          error: 'Missing permission.',
          required: permissionKeys,
          missing,
          mode: 'all',
        });
        return;
      }
      next();
      return;
    }
    res.status(403).json({ error: 'Access denied.' });
  };
};

/**
 * Block support Login-As sessions from sensitive account/security mutations.
 * Normal inventory/sales edits stay allowed so support can fix shop data.
 */
export const forbidImpersonation = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.impersonated) {
    res.status(403).json({
      error: 'This action is blocked during Login-As. Exit impersonation and use the shop owner account, or ask the owner to perform it.',
      code: 'impersonation_forbidden',
    });
    return;
  }
  next();
};

/** Optional strict mode: block all non-GET when impersonating (IMPERSONATE_READ_ONLY=1). */
export const enforceImpersonationPolicy = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.impersonated) {
    next();
    return;
  }
  const readOnly = (process.env.IMPERSONATE_READ_ONLY || '').toLowerCase();
  if (readOnly === '1' || readOnly === 'true' || readOnly === 'yes') {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      res.status(403).json({
        error: 'Login-As is read-only on this environment.',
        code: 'impersonation_read_only',
      });
      return;
    }
  }
  next();
};

/**
 * Enforce subscription package feature entitlements on backend routes.
 * SaaS owners/admins bypass.
 * Shop owners and employees must belong to a business that has the required feature enabled in its plan or business settings.
 */
export const requireSubscriptionFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: 'Access denied. Authentication required.' });
      return;
    }
    // SaaS staff and full-access roles bypass
    const rawRole = String(u.role || '').toUpperCase();
    if (rawRole === 'SAAS_OWNER' || rawRole === 'SAAS_ADMIN' || u.impersonated) {
      next();
      return;
    }

    const businessId = getActingBusinessId(req);
    if (!businessId) {
      res.status(403).json({
        error: 'No business context for feature verification.',
        code: 'missing_business_context',
      });
      return;
    }

    const hasAccess = await checkBusinessHasFeature(businessId, featureKey);
    if (!hasAccess) {
      res.status(403).json({
        error: `Feature "${featureKey}" is not included in your active subscription plan. Please upgrade your plan to access this functionality.`,
        code: 'feature_not_subscribed',
        requiredFeature: featureKey,
      });
      return;
    }

    next();
  };
};

