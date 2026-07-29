/** System-generated live activity feed events at `/activityEvents/{id}`. */

export const ACTIVITY_EVENT_CATEGORIES = [
  "VILLAGE_NEED",
  "TRANSPORT_DISPATCH",
  "SHELTER_UPDATE",
  "WAREHOUSE_PLEDGE",
] as const;

export type ActivityEventCategory = (typeof ACTIVITY_EVENT_CATEGORIES)[number];

export const ACTIVITY_EVENT_STATUSES = ["IN_PROGRESS", "COMPLETED"] as const;

export type ActivityEventStatus = (typeof ACTIVITY_EVENT_STATUSES)[number];

export const ACTIVITY_MILESTONE_TYPES = [
  "GOAL_100_PERCENT",
  "ENTITY_THRESHOLD",
  "RAPID_RESPONSE",
] as const;

export type ActivityMilestoneType = (typeof ACTIVITY_MILESTONE_TYPES)[number];

/** Hero accolades for 100% marketplace goal completion (text/CSS only — no memes). */
export const HERO_ACCOLADE_KINDS = [
  "MISSION_CLEARED",
  "ABSOLUTE_CLUTCH",
  "GIGA_IMPACT",
  "GOATED_SQUAD",
] as const;

export type HeroAccoladeKind = (typeof HERO_ACCOLADE_KINDS)[number];

/** Retention window for ticker docs — matches Firestore TTL on `expireAt`. */
export const ACTIVITY_EVENT_RETENTION_MS = 72 * 60 * 60 * 1000;

/** Hard cap on live ticker / feed reads. */
export const ACTIVITY_EVENT_FEED_LIMIT = 20;

/** Cumulative delivery thresholds that unlock entity badges. */
export const ENTITY_CONTRIBUTION_THRESHOLDS = [50, 100, 500] as const;

/** Deliveries completed within this window earn RAPID_RESPONSE. */
export const RAPID_RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** `expireAt = createdAt + 72h` for Firestore TTL auto-deletion. */
export function activityEventExpireAtIso(createdAt: Date = new Date()): string {
  return new Date(createdAt.getTime() + ACTIVITY_EVENT_RETENTION_MS).toISOString();
}

export const ACTIVITY_EVENT_CATEGORY_LABELS: Record<
  ActivityEventCategory,
  string
> = {
  VILLAGE_NEED: "Village need",
  TRANSPORT_DISPATCH: "Transport dispatch",
  SHELTER_UPDATE: "Shelter update",
  WAREHOUSE_PLEDGE: "Warehouse pledge",
};

export const ACTIVITY_EVENT_STATUS_LABELS: Record<ActivityEventStatus, string> =
  {
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };

/** Short status sublabels shown on activity cards. */
export const ACTIVITY_EVENT_STATUS_DETAIL: Record<ActivityEventStatus, string> =
  {
    IN_PROGRESS: "Pledge Claimed / En Route",
    COMPLETED: "Supplies Delivered",
  };

export interface ActivityEvent {
  id: string;
  title: string;
  category: ActivityEventCategory;
  status: ActivityEventStatus;
  locationName: string;
  /** Brief system-generated summary (not user-authored). */
  description: string;
  proofImageUrl: string | null;
  upvoteCount: number;
  upvotedBy: string[];
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp; stored as Firestore Timestamp for TTL purge after 72h. */
  expireAt: string;
  /** True when this event fulfills a village goal or entity threshold. */
  isMilestone: boolean;
  milestoneType: ActivityMilestoneType | null;
  /** Display badge, e.g. "MISSION CLEARED 🏁". */
  badgeLabel: string | null;
  /** Numeric amount delivered / pledged for impact formatting. */
  impactQuantity: number | null;
  /** Item unit/category, e.g. "Boxes", "Liters", "Kits". */
  impactUnit: string | null;
  /** Marketplace need progress 0–100; 100 unlocks hero accolades. */
  progressPercent: number | null;
  /** Unique pledging entities that contributed to this goal. */
  donorCount: number | null;
  /** Elapsed ms from need open → 100% coverage (for clutch accolades). */
  completionDurationMs: number | null;
  /**
   * Resolved hero accolade for 100% goals.
   * Text/CSS only — never meme images or external GIF media.
   */
  heroAccolade: HeroAccoladeKind | null;
}

export type ActivityFeedFilter = "ALL" | "IN_PROGRESS" | "COMPLETED";

export type RecordActivityEventInput = {
  title: string;
  category: ActivityEventCategory;
  status: ActivityEventStatus;
  locationName: string;
  description?: string;
  proofImageUrl?: string | null;
  isMilestone?: boolean;
  milestoneType?: ActivityMilestoneType | null;
  badgeLabel?: string | null;
  impactQuantity?: number | null;
  impactUnit?: string | null;
  progressPercent?: number | null;
  donorCount?: number | null;
  completionDurationMs?: number | null;
  heroAccolade?: HeroAccoladeKind | null;
};

function demoEvent(
  partial: Omit<
    ActivityEvent,
    | "expireAt"
    | "isMilestone"
    | "milestoneType"
    | "badgeLabel"
    | "impactQuantity"
    | "impactUnit"
    | "progressPercent"
    | "donorCount"
    | "completionDurationMs"
    | "heroAccolade"
  > &
    Partial<
      Pick<
        ActivityEvent,
        | "expireAt"
        | "isMilestone"
        | "milestoneType"
        | "badgeLabel"
        | "impactQuantity"
        | "impactUnit"
        | "progressPercent"
        | "donorCount"
        | "completionDurationMs"
        | "heroAccolade"
      >
    >,
): ActivityEvent {
  const createdAt = partial.createdAt;
  return {
    isMilestone: false,
    milestoneType: null,
    badgeLabel: null,
    impactQuantity: null,
    impactUnit: null,
    progressPercent: null,
    donorCount: null,
    completionDurationMs: null,
    heroAccolade: null,
    ...partial,
    expireAt: partial.expireAt ?? activityEventExpireAtIso(new Date(createdAt)),
  };
}

export const DEMO_ACTIVITY_EVENTS: ActivityEvent[] = [
  demoEvent({
    id: "demo-act-1",
    title: "4x4 Truck dispatched to Barpeta",
    category: "TRANSPORT_DISPATCH",
    status: "IN_PROGRESS",
    locationName: "Barpeta",
    description:
      "Dispatch authorized for flood-relief cargo. Asset en route to the revenue circle staging point.",
    proofImageUrl: null,
    upvoteCount: 12,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  }),
  demoEvent({
    id: "demo-act-2",
    title:
      "Assam Relief Network delivered 100 Crates to Majuli — Need fully covered",
    category: "VILLAGE_NEED",
    status: "COMPLETED",
    locationName: "Majuli",
    description:
      "Delivery confirmed at the village relief point. Community verifications welcome.",
    proofImageUrl: null,
    upvoteCount: 34,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 52 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    isMilestone: true,
    milestoneType: "GOAL_100_PERCENT",
    badgeLabel: "ABSOLUTE CLUTCH ⚡",
    impactQuantity: 100,
    impactUnit: "Water Crates",
    progressPercent: 100,
    donorCount: 2,
    completionDurationMs: 52 * 60_000,
    heroAccolade: "ABSOLUTE_CLUTCH",
  }),
  demoEvent({
    id: "demo-act-3",
    title: "50 Blankets En Route to Nagaon",
    category: "WAREHOUSE_PLEDGE",
    status: "IN_PROGRESS",
    locationName: "Nagaon",
    description:
      "Warehouse pledge claimed and marked in transit toward the highland base.",
    proofImageUrl: null,
    upvoteCount: 8,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    impactQuantity: 50,
    impactUnit: "Blankets",
  }),
  demoEvent({
    id: "demo-act-4",
    title: "🎉 Morigaon Highland Base reached 100% of Shelter capacity needed!",
    category: "SHELTER_UPDATE",
    status: "COMPLETED",
    locationName: "Morigaon Highland Base",
    description:
      "Camp capacity and occupancy figures refreshed after inbound family intake.",
    proofImageUrl: null,
    upvoteCount: 5,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    isMilestone: true,
    milestoneType: "GOAL_100_PERCENT",
    badgeLabel: "MISSION CLEARED 🏁",
    impactQuantity: 120,
    impactUnit: "Shelter beds",
    progressPercent: 100,
    donorCount: 1,
    completionDurationMs: 5 * 60 * 60_000,
    heroAccolade: "MISSION_CLEARED",
  }),
  demoEvent({
    id: "demo-act-5",
    title: "Medical kits pledged for Lakhimpur villages",
    category: "WAREHOUSE_PLEDGE",
    status: "IN_PROGRESS",
    locationName: "Lakhimpur",
    description:
      "NGO pledge confirmed against open village need tickets in the district pool.",
    proofImageUrl: null,
    upvoteCount: 3,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
    impactQuantity: 40,
    impactUnit: "Kits",
  }),
  demoEvent({
    id: "demo-act-6",
    title:
      "Riverbank Volunteers delivered 250 Tarpaulins to Dhemaji — Need fully covered",
    category: "SHELTER_UPDATE",
    status: "COMPLETED",
    locationName: "Dhemaji",
    description:
      "Drop-off completed at the designated shelter. Proof photo attached where available.",
    proofImageUrl: null,
    upvoteCount: 21,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 10 * 60 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 60 * 60_000).toISOString(),
    isMilestone: true,
    milestoneType: "GOAL_100_PERCENT",
    badgeLabel: "GIGA IMPACT 💥",
    impactQuantity: 250,
    impactUnit: "Tarpaulins",
    progressPercent: 100,
    donorCount: 2,
    completionDurationMs: 10 * 60 * 60_000,
    heroAccolade: "GIGA_IMPACT",
  }),
  demoEvent({
    id: "demo-act-7",
    title: "🎉 Barpeta reached 100% of Food Rations needed!",
    category: "VILLAGE_NEED",
    status: "COMPLETED",
    locationName: "Barpeta",
    description:
      "Joint NGO and citizen-group pledges closed the village food gap.",
    proofImageUrl: null,
    upvoteCount: 18,
    upvotedBy: [],
    createdAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    isMilestone: true,
    milestoneType: "GOAL_100_PERCENT",
    badgeLabel: "GOATED SQUAD WORK 👑",
    impactQuantity: 180,
    impactUnit: "Food Rations",
    progressPercent: 100,
    donorCount: 4,
    completionDurationMs: 8 * 60 * 60_000,
    heroAccolade: "GOATED_SQUAD",
  }),
];
