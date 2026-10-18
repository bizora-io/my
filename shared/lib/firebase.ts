/**
 * Client Firebase bootstrap — resilient so a missing/misconfigured Firestore
 * never white-screens the whole app (Auth/API still work via backend).
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const config = {
  apiKey: (firebaseConfig as any).apiKey,
  authDomain: (firebaseConfig as any).authDomain,
  projectId: (firebaseConfig as any).projectId,
  storageBucket: (firebaseConfig as any).storageBucket,
  messagingSenderId: (firebaseConfig as any).messagingSenderId,
  appId: (firebaseConfig as any).appId,
  measurementId: (firebaseConfig as any).measurementId || undefined,
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

export function isClientFirestoreReady(): boolean {
  return db != null;
}

export default app;
