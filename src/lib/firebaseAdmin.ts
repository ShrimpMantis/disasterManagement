import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value == null) continue;
    // Don't trim private keys — PEM formatting can matter; trim other values.
    const normalized = name.includes("PRIVATE_KEY") ? value : value.trim();
    if (normalized) return normalized;
  }
  throw new Error(
    `Missing Firebase Admin credentials. Set one of: ${names.join(", ")} (see .env.local.example).`,
  );
}

/**
 * Private keys in .env / Secret Manager are often stored with literal `\n` escapes.
 * Convert those to real newlines for the Admin SDK.
 */
function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n");
}

function buildServiceAccount(): ServiceAccount {
  return {
    projectId: firstEnv(
      "FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ),
    // App Hosting Secret Manager names first; local .env.local aliases second
    clientEmail: firstEnv(
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_CLIENT_EMAIL",
    ),
    privateKey: normalizePrivateKey(
      firstEnv("FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY"),
    ),
  };
}

/**
 * Singleton Firebase Admin app — safe under Next.js hot reload.
 * Prefers FIREBASE_ADMIN_* (App Hosting secrets); falls back to FIREBASE_* (.env.local).
 */
export function getFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const projectId = firstEnv(
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  );

  return initializeApp({
    credential: cert(buildServiceAccount()),
    projectId,
  });
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function tryGetAdminFirestore(): Firestore | null {
  try {
    return getAdminFirestore();
  } catch {
    return null;
  }
}
