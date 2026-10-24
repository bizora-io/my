/**
 * Bizora Firebase Authentication Service
 * 
 * Implements client-side Firebase Authentication for:
 * 1. SMS Phone Verification using OTP (with reCAPTCHA verification)
 * 2. Email Verification & Password registration
 * 3. Sign in with Google (OAuth web SDK popup + redirect fallback)
 * 4. Token exchange with Bizora backend (mapping Firebase UID to Bizora role/tenant)
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase.js';
import { apiFetch, setAuthTokens } from './apiClient.js';

export interface FirebaseBizoraAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  requireEmailVerification?: boolean;
  error?: string;
  detail?: string;
}

/**
 * Validates and normalizes phone numbers to standard E.164 international format.
 * Defaults to Bangladesh (+880) if no country code is present.
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode = '+880'): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }
  const codeDigits = defaultCountryCode.replace('+', '');
  if (cleaned.startsWith(codeDigits)) {
    return `+${cleaned}`;
  }
  return `${defaultCountryCode}${cleaned}`;
}

/**
 * Global singleton reference for RecaptchaVerifier to prevent re-initialization crashes.
 */
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

export function getOrCreateRecaptchaVerifier(containerId = 'recaptcha-container', invisible = true): RecaptchaVerifier {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized on this client.');
  }

  // Clear existing if container changed or widget destroyed
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      /* ignore cleanup error */
    }
    activeRecaptchaVerifier = null;
  }

  activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: invisible ? 'invisible' : 'normal',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('[firebaseAuth] reCAPTCHA expired, refresh required.');
    },
  });

  return activeRecaptchaVerifier;
}

/**
 * 1. FIREBASE PHONE AUTHENTICATION — SMS OTP
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId = 'recaptcha-container'
): Promise<ConfirmationResult> {
  if (!auth) throw new Error('Firebase Auth unavailable.');

  const formattedPhone = normalizePhoneNumber(phoneNumber);
  if (!formattedPhone || formattedPhone.length < 9) {
    throw new Error('Please enter a valid phone number with country code.');
  }

  const verifier = getOrCreateRecaptchaVerifier(containerId, true);
  return await signInWithPhoneNumber(auth, formattedPhone, verifier);
}

export async function confirmFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string,
  targetRole: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER' = 'SHOP_OWNER',
  metadata?: { businessName?: string; businessType?: string; location?: string; name?: string }
): Promise<FirebaseBizoraAuthResult> {
  const credential = await confirmationResult.confirm(otpCode.trim());
  const firebaseUser = credential.user;
  const idToken = await firebaseUser.getIdToken();

  return await exchangeFirebaseTokenWithBackend({
    idToken,
    targetRole,
    ...metadata,
  });
}

/**
 * 2. FIREBASE EMAIL & PASSWORD VERIFICATION
 */
export async function registerWithFirebaseEmail(
  email: string,
  password: string,
  metadata?: { businessName?: string; businessType?: string; location?: string; name?: string }
): Promise<FirebaseBizoraAuthResult> {
  if (!auth) throw new Error('Firebase Auth unavailable.');

  const trimmedEmail = email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const firebaseUser = credential.user;

  if (metadata?.name) {
    try {
      await updateProfile(firebaseUser, { displayName: metadata.name });
    } catch {
      /* non-blocking */
    }
  }

  // Dispatch email verification link
  try {
    await sendEmailVerification(firebaseUser);
  } catch (e) {
    console.warn('[firebaseAuth] sendEmailVerification error:', e);
  }

  const idToken = await firebaseUser.getIdToken();
  return await exchangeFirebaseTokenWithBackend({
    idToken,
    targetRole: 'SHOP_OWNER',
    ...metadata,
  });
}

export async function sendEmailVerificationToCurrent(): Promise<boolean> {
  if (!auth || !auth.currentUser) return false;
  await sendEmailVerification(auth.currentUser);
  return true;
}

export async function reloadAndCheckEmailVerified(): Promise<boolean> {
  if (!auth || !auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

/**
 * 3. GOOGLE SIGN-IN WITH FIREBASE
 */
export async function signInWithGoogle(
  targetRole: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER' = 'SHOP_OWNER',
  metadata?: { businessName?: string; businessType?: string; location?: string; name?: string }
): Promise<FirebaseBizoraAuthResult> {
  if (!auth) throw new Error('Firebase Auth unavailable.');

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  let firebaseUser: FirebaseUser;
  try {
    const result = await signInWithPopup(auth, provider);
    firebaseUser = result.user;
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      throw new Error(
        `Google Sign-In Domain Error: "${currentHost}" is not authorized in Firebase Authentication. Please visit the official production URL (https://bizora-app-io.vercel.app) or add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`
      );
    }
    // If popup was blocked or unsupported, fallback to redirect flow
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, provider);
      return { success: false, error: 'redirect_started' };
    }
    throw err;
  }

  const idToken = await firebaseUser.getIdToken();
  return await exchangeFirebaseTokenWithBackend({
    idToken,
    targetRole,
    name: metadata?.name || firebaseUser.displayName || undefined,
    ...metadata,
  });
}

/**
 * Handle OAuth redirect result if user completed sign-in via redirect (especially mobile web).
 */
export async function handleRedirectAuthResult(): Promise<FirebaseBizoraAuthResult | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;
    const idToken = await result.user.getIdToken();
    return await exchangeFirebaseTokenWithBackend({
      idToken,
      targetRole: 'SHOP_OWNER',
      name: result.user.displayName || undefined,
    });
  } catch (err: any) {
    if (err?.code !== 'auth/popup-closed-by-user') {
      console.warn('[firebaseAuth] Redirect auth result error:', err?.message || err);
    }
    return null;
  }
}

/**
 * 4. TOKEN EXCHANGE & BIZORA APPLICATION ROLE MAPPING
 * Sends verified Firebase ID token to backend for role-based authorization and session issuance.
 */
export async function exchangeFirebaseTokenWithBackend(payload: {
  idToken: string;
  targetRole: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER';
  businessName?: string;
  businessType?: string;
  location?: string;
  name?: string;
}): Promise<FirebaseBizoraAuthResult> {
  try {
    const res = await apiFetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: body.error || 'firebase_auth_failed',
        detail: body.detail || res.statusText,
      };
    }

    const { user, token, accessToken, refreshToken, requireEmailVerification } = body;
    if (token || accessToken) {
      setAuthTokens({ token, accessToken, refreshToken });
    }

    return {
      success: true,
      user,
      token: token || accessToken,
      accessToken,
      refreshToken,
      requireEmailVerification: !!requireEmailVerification,
    };
  } catch (err: any) {
    console.error('[firebaseAuth] exchange error:', err);
    return {
      success: false,
      error: 'network_error',
      detail: err?.message || 'Failed to reach authentication server.',
    };
  }
}

