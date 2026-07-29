"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import { toPlainData } from "@/lib/firestore/serialize";
import {
  ACTIVITY_EVENT_CATEGORIES,
  ACTIVITY_EVENT_FEED_LIMIT,
  ACTIVITY_EVENT_RETENTION_MS,
  ACTIVITY_EVENT_STATUSES,
  ACTIVITY_MILESTONE_TYPES,
  activityEventExpireAtIso,
  DEMO_ACTIVITY_EVENTS,
  type ActivityEvent,
  type ActivityEventCategory,
  type ActivityEventStatus,
  type ActivityMilestoneType,
  type HeroAccoladeKind,
  type RecordActivityEventInput,
} from "@/types/activityEvent";
import {
  crossedContributionThresholds,
  entityThresholdBadgeLabel,
} from "@/lib/activity/milestones";
import {
  isHeroAccoladeKind,
  resolveHeroAccolade,
} from "@/lib/activity/heroAccolades";

function coerceExpireAt(raw: unknown, createdAt: string): string {
  if (isNonEmptyString(raw)) return raw;
  if (
    raw &&
    typeof raw === "object" &&
    "toDate" in raw &&
    typeof (raw as { toDate: () => Date }).toDate === "function"
  ) {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }
  return activityEventExpireAtIso(new Date(createdAt));
}

function isCategory(value: unknown): value is ActivityEventCategory {
  return (
    typeof value === "string" &&
    (ACTIVITY_EVENT_CATEGORIES as readonly string[]).includes(value)
  );
}

function isStatus(value: unknown): value is ActivityEventStatus {
  return (
    typeof value === "string" &&
    (ACTIVITY_EVENT_STATUSES as readonly string[]).includes(value)
  );
}

function isMilestoneType(value: unknown): value is ActivityMilestoneType {
  return (
    typeof value === "string" &&
    (ACTIVITY_MILESTONE_TYPES as readonly string[]).includes(value)
  );
}

function coerceMilestoneFields(raw: Record<string, unknown>): Pick<
  ActivityEvent,
  | "isMilestone"
  | "milestoneType"
  | "badgeLabel"
  | "impactQuantity"
  | "impactUnit"
  | "progressPercent"
  | "donorCount"
  | "completionDurationMs"
  | "heroAccolade"
> {
  const milestoneType = isMilestoneType(raw.milestoneType)
    ? raw.milestoneType
    : null;
  const impactQuantity = isFiniteNumber(raw.impactQuantity)
    ? Math.max(0, raw.impactQuantity)
    : null;
  const progressPercent = isFiniteNumber(raw.progressPercent)
    ? Math.max(0, Math.min(100, Math.round(raw.progressPercent)))
    : null;
  const donorCount = isFiniteNumber(raw.donorCount)
    ? Math.max(0, Math.floor(raw.donorCount))
    : null;
  const completionDurationMs = isFiniteNumber(raw.completionDurationMs)
    ? Math.max(0, Math.floor(raw.completionDurationMs))
    : null;

  let heroAccolade: HeroAccoladeKind | null = isHeroAccoladeKind(raw.heroAccolade)
    ? raw.heroAccolade
    : null;

  // Derive hero accolade for legacy 100% goal docs that lack the field.
  if (
    !heroAccolade &&
    (progressPercent === 100 || milestoneType === "GOAL_100_PERCENT")
  ) {
    heroAccolade =
      resolveHeroAccolade({
        progressPercent: progressPercent ?? 100,
        impactQuantity,
        donorCount,
        completionDurationMs,
      })?.kind ?? null;
  }

  return {
    isMilestone: raw.isMilestone === true || milestoneType !== null,
    milestoneType,
    badgeLabel: isNonEmptyString(raw.badgeLabel) ? raw.badgeLabel.trim() : null,
    impactQuantity,
    impactUnit: isNonEmptyString(raw.impactUnit) ? raw.impactUnit.trim() : null,
    progressPercent,
    donorCount,
    completionDurationMs,
    heroAccolade,
  };
}

function coerceActivityEvent(
  raw: Record<string, unknown>,
): ActivityEvent | null {
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.title)) return null;
  if (!isCategory(raw.category) || !isStatus(raw.status)) return null;
  if (!isNonEmptyString(raw.locationName)) return null;

  const upvotedBy = Array.isArray(raw.upvotedBy)
    ? raw.upvotedBy.filter((uid): uid is string => typeof uid === "string")
    : [];

  const upvoteCount = isFiniteNumber(raw.upvoteCount)
    ? Math.max(0, Math.floor(raw.upvoteCount))
    : upvotedBy.length;

  const createdAt = isNonEmptyString(raw.createdAt)
    ? raw.createdAt
    : new Date().toISOString();

  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    category: raw.category,
    status: raw.status,
    locationName: raw.locationName.trim(),
    description: isNonEmptyString(raw.description)
      ? raw.description.trim()
      : "",
    proofImageUrl: isNonEmptyString(raw.proofImageUrl)
      ? raw.proofImageUrl.trim()
      : null,
    upvoteCount,
    upvotedBy,
    createdAt,
    updatedAt: isNonEmptyString(raw.updatedAt)
      ? raw.updatedAt
      : new Date().toISOString(),
    expireAt: coerceExpireAt(raw.expireAt, createdAt),
    ...coerceMilestoneFields(raw),
  };
}

/** In-memory demo upvote state for local / credential-less runs. */
const demoUpvoteState = new Map<string, ActivityEvent>(
  DEMO_ACTIVITY_EVENTS.map((event) => [event.id, { ...event }]),
);

function demoSnapshot(): ActivityEvent[] {
  return Array.from(demoUpvoteState.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function fetchActivityEvents(): Promise<
  ActionResult<ActivityEvent[]>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk(demoSnapshot());
  }

  try {
    const threeDaysAgo = new Date(
      Date.now() - ACTIVITY_EVENT_RETENTION_MS,
    ).toISOString();

    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.activityEvents)
      .where("createdAt", ">=", threeDaysAgo)
      .orderBy("createdAt", "desc")
      .limit(ACTIVITY_EVENT_FEED_LIMIT)
      .get();

    const rows = snap.docs
      .map((doc) =>
        coerceActivityEvent({
          id: doc.id,
          ...(doc.data() as Record<string, unknown>),
        }),
      )
      .filter((entry): entry is ActivityEvent => entry !== null);

    if (rows.length === 0) {
      return actionOk(demoSnapshot().slice(0, ACTIVITY_EVENT_FEED_LIMIT));
    }

    return actionOk(toPlainData(rows));
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to load activity events.",
    );
  }
}

/**
 * Records a system-generated activity event (no free-text comments).
 * Called from operational actions when pledges, dispatches, or deliveries occur.
 */
export async function recordActivityEvent(
  input: RecordActivityEventInput,
): Promise<ActionResult<ActivityEvent>> {
  if (!isNonEmptyString(input.title)) {
    return actionFail("Activity title is required.");
  }
  if (!isCategory(input.category)) {
    return actionFail("Invalid activity category.");
  }
  if (!isStatus(input.status)) {
    return actionFail("Invalid activity status.");
  }
  if (!isNonEmptyString(input.locationName)) {
    return actionFail("Location name is required.");
  }

  const createdDate = new Date();
  const now = createdDate.toISOString();
  const expireAtIso = activityEventExpireAtIso(createdDate);
  const milestoneType =
    input.milestoneType && isMilestoneType(input.milestoneType)
      ? input.milestoneType
      : null;
  const impactQuantity =
    input.impactQuantity != null && isFiniteNumber(input.impactQuantity)
      ? Math.max(0, input.impactQuantity)
      : null;
  const progressPercent =
    input.progressPercent != null && isFiniteNumber(input.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(input.progressPercent)))
      : null;
  const donorCount =
    input.donorCount != null && isFiniteNumber(input.donorCount)
      ? Math.max(0, Math.floor(input.donorCount))
      : null;
  const completionDurationMs =
    input.completionDurationMs != null &&
    isFiniteNumber(input.completionDurationMs)
      ? Math.max(0, Math.floor(input.completionDurationMs))
      : null;

  const resolvedHero =
    input.heroAccolade && isHeroAccoladeKind(input.heroAccolade)
      ? input.heroAccolade
      : resolveHeroAccolade({
          progressPercent: progressPercent ?? 0,
          impactQuantity,
          donorCount,
          completionDurationMs,
        })?.kind ?? null;

  const milestoneFields = {
    isMilestone: input.isMilestone === true || milestoneType !== null,
    milestoneType,
    badgeLabel: input.badgeLabel?.trim() || null,
    impactQuantity,
    impactUnit: input.impactUnit?.trim() || null,
    progressPercent,
    donorCount,
    completionDurationMs,
    heroAccolade: resolvedHero,
  };
  const db = tryGetAdminFirestore();

  if (!db) {
    const event: ActivityEvent = {
      id: `demo-act-${Date.now()}`,
      title: input.title.trim(),
      category: input.category,
      status: input.status,
      locationName: input.locationName.trim(),
      description: input.description?.trim() || "",
      proofImageUrl: input.proofImageUrl?.trim() || null,
      upvoteCount: 0,
      upvotedBy: [],
      createdAt: now,
      updatedAt: now,
      expireAt: expireAtIso,
      ...milestoneFields,
    };
    demoUpvoteState.set(event.id, event);
    return actionOk(event, "Activity event recorded.");
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.activityEvents).doc();
    const event: ActivityEvent = {
      id: docRef.id,
      title: input.title.trim(),
      category: input.category,
      status: input.status,
      locationName: input.locationName.trim(),
      description: input.description?.trim() || "",
      proofImageUrl: input.proofImageUrl?.trim() || null,
      upvoteCount: 0,
      upvotedBy: [],
      createdAt: now,
      updatedAt: now,
      expireAt: expireAtIso,
      ...milestoneFields,
    };

    // Store expireAt as Timestamp so Firestore TTL can purge after 72h.
    await docRef.set({
      ...event,
      expireAt: Timestamp.fromDate(new Date(expireAtIso)),
      serverCreatedAt: FieldValue.serverTimestamp(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(toPlainData(event), "Activity event recorded.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to record activity event.",
    );
  }
}

export type CreditEntityContributionResult = {
  previousTotal: number;
  newTotal: number;
  crossedThresholds: number[];
  badgeLabel: string | null;
};

/**
 * Increments lifetime delivered units on user and/or NGO profile docs.
 * Returns thresholds newly crossed so callers can attach entity badges.
 */
export async function creditEntityContribution(input: {
  userId?: string | null;
  organizationId?: string | null;
  units: number;
  unitLabel?: string;
}): Promise<ActionResult<CreditEntityContributionResult>> {
  const units = Math.max(0, Math.floor(input.units));
  if (units <= 0) {
    return actionOk({
      previousTotal: 0,
      newTotal: 0,
      crossedThresholds: [],
      badgeLabel: null,
    });
  }

  const unitLabel = input.unitLabel?.trim() || "Units";
  const db = tryGetAdminFirestore();

  if (!db) {
    // Demo / credential-less: treat as crossing from 0 for local UX previews.
    const crossed = crossedContributionThresholds(0, units);
    const highest = crossed[crossed.length - 1];
    return actionOk({
      previousTotal: 0,
      newTotal: units,
      crossedThresholds: crossed,
      badgeLabel:
        highest != null ? entityThresholdBadgeLabel(highest, unitLabel) : null,
    });
  }

  try {
    let previousTotal = 0;
    let newTotal = 0;
    const now = new Date().toISOString();

    if (isNonEmptyString(input.userId)) {
      const userRef = db
        .collection(FIRESTORE_COLLECTIONS.users)
        .doc(input.userId);
      const snap = await userRef.get();
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      previousTotal = isFiniteNumber(data.totalUnitsDelivered)
        ? Math.max(0, data.totalUnitsDelivered)
        : 0;
      newTotal = previousTotal + units;
      const crossed = crossedContributionThresholds(previousTotal, newTotal);
      const existingBadges = Array.isArray(data.milestoneBadges)
        ? data.milestoneBadges.filter(
            (badge): badge is string => typeof badge === "string",
          )
        : [];
      const nextBadges = [
        ...existingBadges,
        ...crossed.map((threshold) =>
          entityThresholdBadgeLabel(threshold, unitLabel),
        ),
      ];
      await userRef.set(
        {
          totalUnitsDelivered: newTotal,
          milestoneBadges: Array.from(new Set(nextBadges)),
          updatedAt: now,
        },
        { merge: true },
      );
    }

    if (isNonEmptyString(input.organizationId)) {
      const ngoRef = db
        .collection(FIRESTORE_COLLECTIONS.ngos)
        .doc(input.organizationId);
      const snap = await ngoRef.get();
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      const orgPrevious = isFiniteNumber(data.totalUnitsDelivered)
        ? Math.max(0, data.totalUnitsDelivered)
        : 0;
      const orgNext = orgPrevious + units;
      // Prefer org totals when both user + org are credited.
      if (!isNonEmptyString(input.userId)) {
        previousTotal = orgPrevious;
        newTotal = orgNext;
      } else {
        // Keep user totals as primary for badge attachment; still update org.
      }
      const crossed = crossedContributionThresholds(orgPrevious, orgNext);
      const existingBadges = Array.isArray(data.milestoneBadges)
        ? data.milestoneBadges.filter(
            (badge): badge is string => typeof badge === "string",
          )
        : [];
      const nextBadges = [
        ...existingBadges,
        ...crossed.map((threshold) =>
          entityThresholdBadgeLabel(threshold, unitLabel),
        ),
      ];
      await ngoRef.set(
        {
          totalUnitsDelivered: orgNext,
          milestoneBadges: Array.from(new Set(nextBadges)),
          updatedAt: now,
        },
        { merge: true },
      );
      if (!isNonEmptyString(input.userId)) {
        const highest = crossed[crossed.length - 1];
        return actionOk({
          previousTotal,
          newTotal,
          crossedThresholds: crossed,
          badgeLabel:
            highest != null
              ? entityThresholdBadgeLabel(highest, unitLabel)
              : null,
        });
      }
    }

    const crossed = crossedContributionThresholds(previousTotal, newTotal);
    const highest = crossed[crossed.length - 1];
    return actionOk({
      previousTotal,
      newTotal,
      crossedThresholds: crossed,
      badgeLabel:
        highest != null ? entityThresholdBadgeLabel(highest, unitLabel) : null,
    });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to credit entity contribution.",
    );
  }
}

/**
 * Toggle community upvote / confirmation on an activity event.
 */
export async function toggleActivityUpvote(input: {
  eventId: string;
  userId: string;
}): Promise<ActionResult<ActivityEvent>> {
  if (!isNonEmptyString(input.eventId)) {
    return actionFail("Activity event ID is required.");
  }
  if (!isNonEmptyString(input.userId)) {
    return actionFail("Sign in to upvote and confirm ground activity.");
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    const current = demoUpvoteState.get(input.eventId);
    if (!current) return actionFail("Activity event not found.");

    const already = current.upvotedBy.includes(input.userId);
    const upvotedBy = already
      ? current.upvotedBy.filter((uid) => uid !== input.userId)
      : [...current.upvotedBy, input.userId];
    const updated: ActivityEvent = {
      ...current,
      upvotedBy,
      upvoteCount: upvotedBy.length,
      updatedAt: new Date().toISOString(),
    };
    demoUpvoteState.set(updated.id, updated);
    return actionOk(
      updated,
      already ? "Upvote removed." : "Ground activity confirmed.",
    );
  }

  try {
    const docRef = db
      .collection(FIRESTORE_COLLECTIONS.activityEvents)
      .doc(input.eventId);
    const snap = await docRef.get();

    if (!snap.exists) {
      const demo = demoUpvoteState.get(input.eventId);
      if (!demo) return actionFail("Activity event not found.");

      const already = demo.upvotedBy.includes(input.userId);
      const upvotedBy = already
        ? demo.upvotedBy.filter((uid) => uid !== input.userId)
        : [...demo.upvotedBy, input.userId];
      const now = new Date().toISOString();
      const record: ActivityEvent = {
        ...demo,
        upvotedBy,
        upvoteCount: upvotedBy.length,
        updatedAt: now,
      };
      await docRef.set({
        ...record,
        expireAt: Timestamp.fromDate(new Date(record.expireAt)),
        serverCreatedAt: FieldValue.serverTimestamp(),
        serverUpdatedAt: FieldValue.serverTimestamp(),
      });
      demoUpvoteState.set(record.id, record);
      return actionOk(
        toPlainData(record),
        already ? "Upvote removed." : "Ground activity confirmed.",
      );
    }

    const current = coerceActivityEvent({
      id: snap.id,
      ...(snap.data() as Record<string, unknown>),
    });
    if (!current) return actionFail("Invalid activity event.");

    const already = current.upvotedBy.includes(input.userId);
    const upvotedBy = already
      ? current.upvotedBy.filter((uid) => uid !== input.userId)
      : [...current.upvotedBy, input.userId];

    const updated: ActivityEvent = {
      ...current,
      upvotedBy,
      upvoteCount: upvotedBy.length,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update({
      upvotedBy: updated.upvotedBy,
      upvoteCount: updated.upvoteCount,
      updatedAt: updated.updatedAt,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(
      toPlainData(updated),
      already ? "Upvote removed." : "Ground activity confirmed.",
    );
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to update activity upvote.",
    );
  }
}
