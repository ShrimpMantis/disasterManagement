import {
  doc,
  getDoc,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { listenDoc } from "@/lib/firestore/listeners";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type { UserProfile, UserType } from "@/types/userProfile";

function usersDoc(uid: string) {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  return doc(db, FIRESTORE_COLLECTIONS.users, uid);
}

function normalizeProfile(
  uid: string,
  raw: Record<string, unknown> | null | undefined,
): UserProfile | null {
  if (!raw) return null;
  const userType = raw.userType;
  if (
    userType !== "INDIVIDUAL" &&
    userType !== "NON_PROFIT" &&
    userType !== "ADMIN"
  ) {
    return null;
  }

  const phone =
    typeof raw.phone === "string" ? raw.phone : raw.phone === null ? null : null;

  const statusRaw = raw.status;
  const status =
    statusRaw === "ACTIVE" || statusRaw === "INACTIVE"
      ? statusRaw
      : undefined;

  const roleRaw = raw.role;
  const role =
    roleRaw === "CITIZEN" || roleRaw === "VOLUNTEER" || roleRaw === "NON_PROFIT" || roleRaw === "ADMIN"
      ? roleRaw
      : undefined;

  return {
    uid,
    userType,
    phone,
    organizationId:
      typeof raw.organizationId === "string" ? raw.organizationId : null,
    organizationName:
      typeof raw.organizationName === "string" ? raw.organizationName : null,
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : null,
    email: typeof raw.email === "string" ? raw.email : null,
    status,
    role,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    totalUnitsDelivered:
      typeof raw.totalUnitsDelivered === "number"
        ? Math.max(0, raw.totalUnitsDelivered)
        : undefined,
    milestoneBadges: Array.isArray(raw.milestoneBadges)
      ? raw.milestoneBadges.filter(
          (badge): badge is string => typeof badge === "string",
        )
      : undefined,
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = usersDoc(uid);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeProfile(uid, snap.data() as Record<string, unknown>);
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = usersDoc(uid);
  if (!ref) {
    onData(null);
    return () => undefined;
  }

  return listenDoc(ref, {
    onData: (raw) =>
      onData(normalizeProfile(uid, raw as Record<string, unknown> | null)),
    onError,
  });
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const ref = usersDoc(profile.uid);
  if (!ref) return;

  const now = new Date().toISOString();
  await setDoc(
    ref,
    {
      ...profile,
      organizationId: profile.organizationId ?? null,
      organizationName: profile.organizationName ?? null,
      updatedAt: now,
      createdAt: profile.createdAt ?? now,
    },
    { merge: true },
  );
}

export type UserProfileSeed = {
  userType?: UserType;
  organizationId?: string | null;
  organizationName?: string | null;
  isAdmin?: boolean;
};

/**
 * Ensures `/users/{uid}` exists. Explicit seed.userType / org affiliation
 * always wins over a stale profile (e.g. previous ADMIN placeholder).
 */
export async function ensureUserProfile(
  authUser: User,
  seed: UserProfileSeed = {},
): Promise<UserProfile> {
  const existing = await getUserProfile(authUser.uid);
  const now = new Date().toISOString();

  const userType: UserType =
    seed.userType ??
    (seed.isAdmin ? "ADMIN" : undefined) ??
    existing?.userType ??
    "INDIVIDUAL";

  const organizationId =
    userType === "NON_PROFIT" || userType === "ADMIN"
      ? (seed.organizationId !== undefined
          ? seed.organizationId
          : (existing?.organizationId ?? null))
      : null;

  const organizationName =
    userType === "NON_PROFIT" || userType === "ADMIN"
      ? (seed.organizationName !== undefined
          ? seed.organizationName
          : (existing?.organizationName ?? null))
      : null;

  const role: UserProfile["role"] =
    userType === "ADMIN"
      ? "ADMIN"
      : userType === "NON_PROFIT"
        ? "NON_PROFIT"
        : "CITIZEN";

  const nextPhone =
    typeof authUser.phoneNumber === "string"
      ? authUser.phoneNumber
      : existing?.phone ?? null;

  const next: UserProfile = {
    uid: authUser.uid,
    userType,
    phone: nextPhone,
    organizationId,
    organizationName,
    displayName: authUser.displayName ?? existing?.displayName ?? null,
    email: authUser.email ?? existing?.email ?? null,
    // Crowdsourced onboarding: OTP sign-in should immediately unblock the user.
    status: "ACTIVE",
    role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const changed =
    !existing ||
    existing.userType !== next.userType ||
    existing.organizationId !== next.organizationId ||
    existing.organizationName !== next.organizationName ||
    existing.displayName !== next.displayName ||
    existing.email !== next.email ||
    existing.status !== next.status ||
    existing.role !== next.role ||
    existing.phone !== next.phone;

  if (changed) {
    await upsertUserProfile(next);
  }

  return next;
}
