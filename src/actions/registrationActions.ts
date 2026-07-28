"use server";

import { FieldValue } from "firebase-admin/firestore";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import { toPlainData } from "@/lib/firestore/serialize";
import type {
  NGORegistration,
  VerificationStatus,
  VolunteerRegistration,
} from "@/types/registration";
import type {
  CitizenGroup,
  GroupVerificationStatus,
} from "@/types/volunteerOnboarding";

export type RegistrationRosterSnapshot = {
  volunteers: VolunteerRegistration[];
  ngos: NGORegistration[];
  citizenGroups: CitizenGroup[];
};

export async function fetchRegistrationRosterSnapshot(): Promise<
  ActionResult<RegistrationRosterSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ volunteers: [], ngos: [], citizenGroups: [] });
  }

  try {
    const [volunteerSnap, ngoSnap, groupSnap] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.volunteerRegistrations).get(),
      db.collection(FIRESTORE_COLLECTIONS.ngoRegistrations).get(),
      db.collection(FIRESTORE_COLLECTIONS.citizenGroupRegistrations).get(),
    ]);

    const volunteers = volunteerSnap.docs
      .map((doc) => toPlainData(doc.data()) as VolunteerRegistration)
      .filter((entry) => isNonEmptyString(entry.volunteerId))
      .sort(
        (a, b) =>
          Date.parse(b.createdAtTimestamp) - Date.parse(a.createdAtTimestamp),
      );

    const ngos = ngoSnap.docs
      .map((doc) => toPlainData(doc.data()) as NGORegistration)
      .filter((entry) => isNonEmptyString(entry.ngoId))
      .sort(
        (a, b) =>
          Date.parse(b.createdAtTimestamp) - Date.parse(a.createdAtTimestamp),
      );

    const citizenGroups = groupSnap.docs
      .map((doc) => toPlainData(doc.data()) as CitizenGroup)
      .filter((entry) => isNonEmptyString(entry.groupId))
      .sort(
        (a, b) =>
          Date.parse(b.createdTimestamp) - Date.parse(a.createdTimestamp),
      );

    return actionOk({ volunteers, ngos, citizenGroups });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load registration roster.",
    );
  }
}

export async function createVolunteerRegistration(
  entry: VolunteerRegistration,
): Promise<ActionResult<VolunteerRegistration>> {
  const db = tryGetAdminFirestore();
  if (!db) return actionFail("Firebase Admin is not configured.");

  try {
    await db
      .collection(FIRESTORE_COLLECTIONS.volunteerRegistrations)
      .doc(entry.volunteerId)
      .set({
        ...entry,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    return actionOk(entry, "Volunteer registration saved.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to save volunteer registration.",
    );
  }
}

export async function createNgoRegistration(
  entry: NGORegistration,
): Promise<ActionResult<NGORegistration>> {
  const db = tryGetAdminFirestore();
  if (!db) return actionFail("Firebase Admin is not configured.");

  try {
    await db
      .collection(FIRESTORE_COLLECTIONS.ngoRegistrations)
      .doc(entry.ngoId)
      .set({
        ...entry,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    return actionOk(entry, "NGO registration saved.");
  } catch (error) {
    return actionFail(
      error instanceof Error ? error.message : "Failed to save NGO registration.",
    );
  }
}

export async function createCitizenGroupRegistration(
  entry: CitizenGroup,
): Promise<ActionResult<CitizenGroup>> {
  const db = tryGetAdminFirestore();
  if (!db) return actionFail("Firebase Admin is not configured.");

  try {
    await db
      .collection(FIRESTORE_COLLECTIONS.citizenGroupRegistrations)
      .doc(entry.groupId)
      .set({
        ...entry,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    return actionOk(entry, "Citizen group registration saved.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to save citizen group registration.",
    );
  }
}

export async function updateRegistrationVerification(input: {
  kind: "volunteers" | "ngos" | "citizenGroups";
  id: string;
  verificationStatus: VerificationStatus | GroupVerificationStatus;
  reviewNote?: string;
  verifiedByUserId?: string;
  uid?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!isNonEmptyString(input.id)) return actionFail("Registration ID is required.");

  const db = tryGetAdminFirestore();
  if (!db) return actionFail("Firebase Admin is not configured.");

  const collectionName =
    input.kind === "volunteers"
      ? FIRESTORE_COLLECTIONS.volunteerRegistrations
      : input.kind === "ngos"
        ? FIRESTORE_COLLECTIONS.ngoRegistrations
        : FIRESTORE_COLLECTIONS.citizenGroupRegistrations;

  try {
    const patch: Record<string, unknown> = {
      verificationStatus: input.verificationStatus,
      reviewedAtTimestamp: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    };
    if (input.reviewNote) patch.reviewNote = input.reviewNote;
    if (input.verifiedByUserId) patch.verifiedByUserId = input.verifiedByUserId;
    if (input.uid) patch.uid = input.uid;

    await db.collection(collectionName).doc(input.id).set(patch, { merge: true });
    return actionOk({ id: input.id }, "Registration status updated.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to update registration status.",
    );
  }
}
