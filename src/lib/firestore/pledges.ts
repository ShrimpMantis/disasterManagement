import {
  collection,
  doc,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { listenQuery } from "@/lib/firestore/listeners";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type { NGOPledgeSubmission } from "@/types/pledgeIntake";

/** Firestore rejects `undefined` anywhere in document data. */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => stripUndefinedDeep(entry)) as T;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      next[key] = stripUndefinedDeep(entry);
    }
    return next as T;
  }

  return value;
}

function asIsoTimestamp(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

export function normalizePledgeDoc(
  raw: DocumentData,
  fallbackId?: string,
): NGOPledgeSubmission {
  const id =
    (typeof raw.id === "string" && raw.id) ||
    fallbackId ||
    `pledge-${Date.now()}`;

  return {
    ...(raw as NGOPledgeSubmission),
    id,
    createdAt: asIsoTimestamp(raw.createdAt),
    estimatedDeliveryDate: asIsoTimestamp(
      raw.estimatedDeliveryDate ?? raw.createdAt,
    ),
    organizationId:
      typeof raw.organizationId === "string"
        ? raw.organizationId
        : raw.organizationId === null
          ? null
          : undefined,
  };
}

export async function upsertPledgeSubmission(pledge: NGOPledgeSubmission): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.pledges, pledge.id),
    stripUndefinedDeep(pledge),
    { merge: true },
  );
}

export async function updatePledgeSubmission(
  pledgeId: string,
  patch: Partial<NGOPledgeSubmission>,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  await updateDoc(
    doc(db, FIRESTORE_COLLECTIONS.pledges, pledgeId),
    stripUndefinedDeep(patch),
  );
}

function pledgesCollection() {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  return collection(db, FIRESTORE_COLLECTIONS.pledges);
}

/** Live pledges created by the authenticated user. */
export function subscribePledgesByUserId(
  userId: string,
  onData: (pledges: NGOPledgeSubmission[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = pledgesCollection();
  if (!col || !userId) {
    onData([]);
    return () => undefined;
  }

  const q = query(col, where("userId", "==", userId));
  return listenQuery(q, {
    onData: (items) =>
      onData(
        items
          .map((item) => normalizePledgeDoc(item))
          .sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
          ),
      ),
    onError,
  });
}

/** Live pledges for an affiliated non-profit organization. */
export function subscribePledgesByOrganizationId(
  organizationId: string,
  onData: (pledges: NGOPledgeSubmission[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = pledgesCollection();
  if (!col || !organizationId) {
    onData([]);
    return () => undefined;
  }

  const q = query(col, where("organizationId", "==", organizationId));
  return listenQuery(q, {
    onData: (items) =>
      onData(
        items
          .map((item) => normalizePledgeDoc(item))
          .sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
          ),
      ),
    onError,
  });
}
