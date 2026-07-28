import { doc, setDoc, updateDoc } from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type { NGOPledgeSubmission } from "@/types/pledgeIntake";

export async function upsertPledgeSubmission(pledge: NGOPledgeSubmission): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.pledges, pledge.id), pledge, { merge: true });
}

export async function updatePledgeSubmission(
  pledgeId: string,
  patch: Partial<NGOPledgeSubmission>,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.pledges, pledgeId), patch);
}
