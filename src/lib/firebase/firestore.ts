import { getFirebaseApp } from "@/lib/firebase/client";
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

let dbInstance: Firestore | null = null;
let persistenceReady: Promise<void> | null = null;

/**
 * Modular Firestore (firebase/firestore → @firebase/firestore).
 *
 * Offline: prefers v10+ `persistentLocalCache` + `persistentMultipleTabManager`
 * (successor to `enableMultiTabIndexedDbPersistence`). Falls back to the
 * legacy multi-tab IndexedDB API when needed.
 */
export function getFirestoreDb(): Firestore {
  if (dbInstance) return dbInstance;

  const app = getFirebaseApp();

  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialized (HMR / second call) — reuse existing instance.
    dbInstance = getFirestore(app);
  }

  if (typeof window !== "undefined" && !persistenceReady) {
    persistenceReady = ensureMultiTabOfflinePersistence(dbInstance);
  }

  return dbInstance;
}

/**
 * Ensures multi-tab IndexedDB offline persistence.
 * Safe to call repeatedly; ignores "already enabled" / unsupported browsers.
 */
export async function ensureMultiTabOfflinePersistence(
  db: Firestore = getFirestoreDb(),
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Legacy multi-tab API still exported by modular SDK; no-op if
    // persistentLocalCache already configured persistence on this instance.
    await enableMultiTabIndexedDbPersistence(db);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    // failed-precondition: another tab already enabled persistence
    // unimplemented: browser / private mode / SSR
    // invalid-argument: persistence already set via initializeFirestore localCache
    if (
      code === "failed-precondition" ||
      code === "unimplemented" ||
      code === "invalid-argument"
    ) {
      return;
    }
  }
}

export function tryGetFirestoreDb(): Firestore | null {
  try {
    return getFirestoreDb();
  } catch {
    return null;
  }
}
