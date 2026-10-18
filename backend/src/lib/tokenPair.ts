import jwt from "jsonwebtoken";
import { getDb } from "./firebaseAdmin.js";

import { getJwtSecret } from "./jwtSecret.js";
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || "7d";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type TokenClaims = {
  id: string;
  email?: string;
  role: string;
  businessId?: string;
  staffId?: string | null;
  permissions?: string[];
  [key: string]: any;
};

export function signAccessToken(payload: TokenClaims) {
  const { id, email = "", role, ...rest } = payload;
  return jwt.sign({ id, email, role, ...rest, typ: "access" }, getJwtSecret(), { expiresIn: ACCESS_TTL as any });
}

export function signRefreshToken(payload: TokenClaims & { jti: string }) {
  const { id, email = "", role, jti, ...rest } = payload;
  return jwt.sign({ id, email, role, jti, ...rest, typ: "refresh" }, getJwtSecret(), { expiresIn: REFRESH_TTL as any });
}

/** Access + refresh pair with server-side refresh jti for rotation. */
export async function issueTokenPair(user: TokenClaims) {
  const jti = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const base = {
    id: user.id,
    email: user.email || "",
    role: user.role,
    businessId: user.businessId,
    staffId: user.staffId,
    permissions: user.permissions,
  };
  // Strip undefined for clean JWT
  const clean: TokenClaims = { id: base.id, email: base.email, role: base.role };
  if (base.businessId) clean.businessId = base.businessId;
  if (base.staffId) clean.staffId = base.staffId;
  if (base.permissions) clean.permissions = base.permissions;

  const accessToken = signAccessToken(clean);
  const refreshToken = signRefreshToken({ ...clean, jti });
  try {
    await getDb()
      .collection("refreshTokens")
      .doc(jti)
      .set({
        jti,
        userId: clean.id,
        email: clean.email,
        role: clean.role,
        businessId: clean.businessId || null,
        staffId: clean.staffId || null,
        permissions: clean.permissions || null,
        claims: clean,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
        revoked: false,
      });
  } catch (e) {
    console.warn("[tokenPair] refreshTokens write failed:", e);
  }
  return { accessToken, refreshToken, token: accessToken };
}
