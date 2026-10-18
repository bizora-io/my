/**
 * Client-side guards for SaaS Login-As sessions.
 */
export function isImpersonating(user: { isImpersonated?: boolean } | null | undefined): boolean {
  return !!user?.isImpersonated;
}

/** Returns error message if action should be blocked; null if OK. */
export function impersonationBlockMessage(
  user: { isImpersonated?: boolean } | null | undefined,
  action: 'password' | '2fa' | 'delete' | 'security' | 'destructive' = 'destructive'
): string | null {
  if (!user?.isImpersonated) return null;
  const map = {
    password: 'Cannot change password during Login-As. Exit impersonation first.',
    '2fa': 'Cannot change 2FA during Login-As. Exit impersonation first.',
    delete: 'Destructive delete is blocked during Login-As.',
    security: 'Security settings are locked during Login-As.',
    destructive: 'This action is blocked during Login-As.',
  };
  return map[action];
}

export function assertNotImpersonated(
  user: { isImpersonated?: boolean } | null | undefined,
  action: 'password' | '2fa' | 'delete' | 'security' | 'destructive' = 'destructive'
): boolean {
  const msg = impersonationBlockMessage(user, action);
  if (msg) {
    try {
      alert(msg);
    } catch {
      console.warn(msg);
    }
    return false;
  }
  return true;
}
