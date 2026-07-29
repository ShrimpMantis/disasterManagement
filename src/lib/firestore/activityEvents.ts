import {
  collection,
  limit,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { listenQuery } from "@/lib/firestore/listeners";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type { ActivityEvent, ActivityMilestoneType, HeroAccoladeKind } from "@/types/activityEvent";
import {
  ACTIVITY_EVENT_FEED_LIMIT,
  ACTIVITY_EVENT_RETENTION_MS,
  ACTIVITY_MILESTONE_TYPES,
  DEMO_ACTIVITY_EVENTS,
  HERO_ACCOLADE_KINDS,
} from "@/types/activityEvent";
import { resolveHeroAccolade } from "@/lib/activity/heroAccolades";

function normalizeActivityEvent(row: ActivityEvent): ActivityEvent | null {
  if (typeof row?.id !== "string" || typeof row?.title !== "string") return null;
  const milestoneType =
    typeof row.milestoneType === "string" &&
    (ACTIVITY_MILESTONE_TYPES as readonly string[]).includes(row.milestoneType)
      ? (row.milestoneType as ActivityMilestoneType)
      : null;

  const impactQuantity =
    typeof row.impactQuantity === "number" && Number.isFinite(row.impactQuantity)
      ? Math.max(0, row.impactQuantity)
      : null;
  const progressPercent =
    typeof row.progressPercent === "number" && Number.isFinite(row.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(row.progressPercent)))
      : null;
  const donorCount =
    typeof row.donorCount === "number" && Number.isFinite(row.donorCount)
      ? Math.max(0, Math.floor(row.donorCount))
      : null;
  const completionDurationMs =
    typeof row.completionDurationMs === "number" &&
    Number.isFinite(row.completionDurationMs)
      ? Math.max(0, Math.floor(row.completionDurationMs))
      : null;

  let heroAccolade: HeroAccoladeKind | null =
    typeof row.heroAccolade === "string" &&
    (HERO_ACCOLADE_KINDS as readonly string[]).includes(row.heroAccolade)
      ? (row.heroAccolade as HeroAccoladeKind)
      : null;

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
    ...row,
    isMilestone: row.isMilestone === true || milestoneType !== null,
    milestoneType,
    badgeLabel:
      typeof row.badgeLabel === "string" && row.badgeLabel.trim()
        ? row.badgeLabel.trim()
        : null,
    impactQuantity,
    impactUnit:
      typeof row.impactUnit === "string" && row.impactUnit.trim()
        ? row.impactUnit.trim()
        : null,
    progressPercent,
    donorCount,
    completionDurationMs,
    heroAccolade,
  };
}

/**
 * Real-time activity ticker feed via onSnapshot:
 * /activityEvents where createdAt >= (now - 72h), orderBy createdAt desc, limit 20.
 * Falls back to demo rows when Firestore client is unavailable.
 */
export function subscribeActivityEvents(
  onData: (events: ActivityEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData(DEMO_ACTIVITY_EVENTS.slice(0, ACTIVITY_EVENT_FEED_LIMIT));
    return () => undefined;
  }

  const threeDaysAgo = new Date(
    Date.now() - ACTIVITY_EVENT_RETENTION_MS,
  ).toISOString();

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.activityEvents),
    where("createdAt", ">=", threeDaysAgo),
    orderBy("createdAt", "desc"),
    limit(ACTIVITY_EVENT_FEED_LIMIT),
  );

  return listenQuery(q, {
    onData: (items) => {
      const rows = (items as ActivityEvent[])
        .map(normalizeActivityEvent)
        .filter((row): row is ActivityEvent => row !== null);
      onData(
        rows.length > 0
          ? rows
          : DEMO_ACTIVITY_EVENTS.slice(0, ACTIVITY_EVENT_FEED_LIMIT),
      );
    },
    onError: (error) => {
      onData(DEMO_ACTIVITY_EVENTS.slice(0, ACTIVITY_EVENT_FEED_LIMIT));
      onError?.(error);
    },
  });
}
