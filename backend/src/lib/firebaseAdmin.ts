import { readFileSync } from "fs";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Server-side Firebase Admin SDK.
//
// Credentials (first match wins):
//   1. FIREBASE_SERVICE_ACCOUNT_JSON  — full JSON string
//   2. FIREBASE_SERVICE_ACCOUNT_PATH — path to service-account .json file
//   3. GOOGLE_APPLICATION_CREDENTIALS — same as (2), Google ADC convention
//   4. Ambient ADC on GCP / Firebase hosting

let app: App | null = null;

function getFirebaseApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else if (serviceAccountPath) {
    const raw = readFileSync(serviceAccountPath, "utf8");
    const serviceAccount = JSON.parse(raw);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = initializeApp();
  }

  return app;
}

import { ResilientFirestore } from "./resilientDb.js";

let resilientDbInstance: ResilientFirestore | null = null;

export function getDb(): Firestore {
  if (!resilientDbInstance) {
    try {
      const databaseId = process.env.FIRESTORE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixbizora-570ce51f-dfd4-4c90-ba35-f978aaa9f905';
      const realDb = databaseId ? getFirestore(getFirebaseApp(), databaseId) : getFirestore(getFirebaseApp());
      resilientDbInstance = new ResilientFirestore(realDb);
    } catch (e) {
      console.warn("[firebaseAdmin] Real Firestore init failed, using pure resilient local store:", e);
      resilientDbInstance = new ResilientFirestore(null);
    }
  }
  return resilientDbInstance as unknown as Firestore;
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseApp());
}
