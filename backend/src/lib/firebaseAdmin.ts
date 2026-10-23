import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Server-side Firebase Admin SDK.
//
// Credentials (first match wins):
//   1. FIREBASE_SERVICE_ACCOUNT_JSON  — full JSON string
//   2. FIREBASE_SERVICE_ACCOUNT_PATH — path to service-account .json file
//   3. GOOGLE_APPLICATION_CREDENTIALS — same as (2), Google ADC convention
//   4. Candidate fallback paths: ./firebase-service-account.json, ../firebase-service-account.json, d:/Bizora/firebase-service-account.json
//   5. Ambient ADC on GCP / Firebase hosting

let app: App | null = null;

function getFirebaseApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson && serviceAccountJson.trim().startsWith("{")) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
      return app;
    } catch (e) {
      console.warn("[firebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resolve(process.cwd(), "firebase-service-account.json"),
    resolve(process.cwd(), "../firebase-service-account.json"),
    "d:/Bizora/firebase-service-account.json",
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    try {
      if (existsSync(p)) {
        const raw = readFileSync(p, "utf8");
        const serviceAccount = JSON.parse(raw);
        app = initializeApp({
          credential: cert(serviceAccount),
        });
        return app;
      }
    } catch (e) {
      console.warn(`[firebaseAdmin] Candidate path ${p} exists but could not be loaded:`, e);
    }
  }

  app = initializeApp();
  return app;
}

import { ResilientFirestore } from "./resilientDb.js";

let resilientDbInstance: ResilientFirestore | null = null;

export function getDb(): Firestore {
  if (!resilientDbInstance) {
    if (process.env.BIZORA_USE_LOCAL_DB === "true" || process.env.TEST_OFFLINE_DB === "true") {
      resilientDbInstance = new ResilientFirestore(null);
      return resilientDbInstance as unknown as Firestore;
    }
    try {
      const databaseId = process.env.FIRESTORE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID;
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
