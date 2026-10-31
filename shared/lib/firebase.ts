/**
 * Client Firebase bootstrap — resilient so a missing/misconfigured Firestore
 * never white-screens the whole app (Auth/API still work via backend).
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import firebaseConfig from '../firebase-applet-config.json';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const effectiveProjectId =
  env.VITE_FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId || 'test-saas2552';

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || (firebaseConfig as any).apiKey,
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    (firebaseConfig as any).authDomain ||
    `${effectiveProjectId}.firebaseapp.com`,
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL ||
    (firebaseConfig as any).databaseURL ||
    'https://test-saas2552-default-rtdb.firebaseio.com',
  projectId: effectiveProjectId,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    (firebaseConfig as any).storageBucket ||
    `${effectiveProjectId}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfig as any).messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || (firebaseConfig as any).appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || (firebaseConfig as any).measurementId || undefined,
};

let app: FirebaseApp;
try {
  app = getApps().length ? getApps()[0]! : initializeApp(config);
} catch (e) {
  console.error('[firebase] initializeApp failed', e);
  app = initializeApp(config, 'bizora-fallback');
}

function initFirestore(application: FirebaseApp): Firestore | null {
  const namedId = String((firebaseConfig as any).firestoreDatabaseId || '').trim();
  if (namedId && namedId !== '(default)') {
    try {
      return getFirestore(application, namedId);
    } catch (e) {
      console.warn('[firebase] named Firestore unavailable:', namedId, e);
    }
  }
  try {
    return getFirestore(application);
  } catch (e) {
    console.warn('[firebase] default Firestore unavailable:', e);
  }
  return null;
}

export const db: Firestore | null = initFirestore(app);

let authInstance: Auth | null = null;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn('[firebase] Auth unavailable', e);
}
export const auth = authInstance;

let appCheckInstance: AppCheck | null = null;
if (typeof window !== 'undefined') {
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const siteKey =
      env.VITE_FIREBASE_APPCHECK_SITE_KEY ||
      (firebaseConfig as any).appCheckSiteKey ||
      '6LexM_YtAAAAAAsKa3SUpD7K89R81FYDRSTPpS8-';
    if (siteKey) {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (e) {
    console.warn('[firebase] AppCheck init warning:', e);
  }
}
export const appCheck = appCheckInstance;

export function isClientFirestoreReady(): boolean {
  return db != null;
}

export default app;
