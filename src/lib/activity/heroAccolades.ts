/**
 * Hero Accolades for 100% marketplace goal completion.
 * Pure text / CSS / emoji only — no meme images, GIFs, or external media APIs.
 */

import {
  HERO_ACCOLADE_KINDS,
  type HeroAccoladeKind,
} from "@/types/activityEvent";

export type { HeroAccoladeKind };
export { HERO_ACCOLADE_KINDS };

/** Fast completion window for ABSOLUTE CLUTCH. */
export const HERO_CLUTCH_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Volume threshold for GIGA IMPACT. */
export const HERO_GIGA_VOLUME = 200;

/** Unique donors required for GOATED SQUAD WORK. */
export const HERO_SQUAD_MIN_DONORS = 3;

export type HeroAccoladeDefinition = {
  kind: HeroAccoladeKind;
  /** High-energy badge copy shown on the hero banner. */
  badgeText: string;
  /** Supporting line under the badge. */
  subtext: string;
  /** Tailwind-friendly visual token for CSS gradients / borders. */
  visual: "emerald" | "amber" | "indigo" | "gold";
};

/**
 * Dictionary keyed by completion trigger.
 * Priority when multiple apply (highest first): GOATED_SQUAD → GIGA_IMPACT → ABSOLUTE_CLUTCH → MISSION_CLEARED.
 */
export const HERO_ACCOLADE_DICTIONARY: Record<
  HeroAccoladeKind,
  HeroAccoladeDefinition
> = {
  MISSION_CLEARED: {
    kind: "MISSION_CLEARED",
    badgeText: "MISSION CLEARED 🏁",
    subtext: "Village goal 100% fulfilled by the community!",
    visual: "emerald",
  },
  ABSOLUTE_CLUTCH: {
    kind: "ABSOLUTE_CLUTCH",
    badgeText: "ABSOLUTE CLUTCH ⚡",
    subtext: "Fulfilled in record time by ground heroes!",
    visual: "amber",
  },
  GIGA_IMPACT: {
    kind: "GIGA_IMPACT",
    badgeText: "GIGA IMPACT 💥",
    subtext: "Massive supply dispatch confirmed.",
    visual: "indigo",
  },
  GOATED_SQUAD: {
    kind: "GOATED_SQUAD",
    badgeText: "GOATED SQUAD WORK 👑",
    subtext: "Completed through joint community pledges!",
    visual: "gold",
  },
};

export type ResolveHeroAccoladeInput = {
  /** Must be 100 for any accolade. */
  progressPercent: number;
  /** Units cleared on the marketplace need. */
  impactQuantity?: number | null;
  /** Unique pledging entities that contributed. */
  donorCount?: number | null;
  /** Elapsed ms from need open → 100% coverage. */
  completionDurationMs?: number | null;
};

/**
 * Pick the single strongest hero accolade for a 100% completed goal.
 * Returns null when progress is not fully covered.
 */
export function resolveHeroAccolade(
  input: ResolveHeroAccoladeInput,
): HeroAccoladeDefinition | null {
  if (!Number.isFinite(input.progressPercent) || input.progressPercent < 100) {
    return null;
  }

  const donors = Math.max(0, Math.floor(input.donorCount ?? 0));
  const quantity = Math.max(0, Number(input.impactQuantity) || 0);
  const durationMs =
    input.completionDurationMs != null &&
    Number.isFinite(input.completionDurationMs)
      ? Math.max(0, input.completionDurationMs)
      : null;

  if (donors >= HERO_SQUAD_MIN_DONORS) {
    return HERO_ACCOLADE_DICTIONARY.GOATED_SQUAD;
  }
  if (quantity >= HERO_GIGA_VOLUME) {
    return HERO_ACCOLADE_DICTIONARY.GIGA_IMPACT;
  }
  if (durationMs != null && durationMs < HERO_CLUTCH_WINDOW_MS) {
    return HERO_ACCOLADE_DICTIONARY.ABSOLUTE_CLUTCH;
  }
  return HERO_ACCOLADE_DICTIONARY.MISSION_CLEARED;
}

export function isHeroAccoladeKind(value: unknown): value is HeroAccoladeKind {
  return (
    typeof value === "string" &&
    (HERO_ACCOLADE_KINDS as readonly string[]).includes(value)
  );
}

export function getHeroAccoladeDefinition(
  kind: HeroAccoladeKind | null | undefined,
): HeroAccoladeDefinition | null {
  if (!kind || !isHeroAccoladeKind(kind)) return null;
  return HERO_ACCOLADE_DICTIONARY[kind];
}

/** Impact quantifier line for the celebration banner. */
export function formatHeroImpactLine(input: {
  locationName: string;
  impactQuantity?: number | null;
  impactUnit?: string | null;
  itemName?: string | null;
}): string {
  const location = input.locationName.trim() || "the village";
  const qty =
    input.impactQuantity != null && Number.isFinite(input.impactQuantity)
      ? Math.max(0, Math.round(input.impactQuantity))
      : null;
  const unit =
    input.impactUnit?.trim() ||
    input.itemName?.trim() ||
    (qty != null ? "units" : null);

  if (qty != null && unit) {
    return `100% COVERED — ${qty} ${unit} delivered to ${location}!`;
  }
  return `100% COVERED — goal fulfilled at ${location}!`;
}

/** Unique donor count from a ticket's assigned pledges (+ assigned entity fallback). */
export function countTicketDonors(ticket: {
  assignedPledges?: Array<{ entityId?: string }> | null;
  assignedEntityId?: string | null;
}): number {
  const ids = new Set<string>();
  for (const pledge of ticket.assignedPledges ?? []) {
    if (typeof pledge.entityId === "string" && pledge.entityId.trim()) {
      ids.add(pledge.entityId.trim());
    }
  }
  if (ids.size === 0 && ticket.assignedEntityId?.trim()) {
    ids.add(ticket.assignedEntityId.trim());
  }
  return ids.size;
}
