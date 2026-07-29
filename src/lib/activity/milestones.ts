import {
  ENTITY_CONTRIBUTION_THRESHOLDS,
  RAPID_RESPONSE_WINDOW_MS,
  type ActivityMilestoneType,
} from "@/types/activityEvent";
import type { ConsolidatedItemNeed, ReliefTicket } from "@/types/ticket";
import { HERO_ACCOLADE_DICTIONARY } from "@/lib/activity/heroAccolades";

export type CoveredItem = {
  itemName: string;
  unit: string;
  totalRequestedQuantity: number;
};

function itemCoverage(item: ConsolidatedItemNeed): number {
  return item.quantityPledged ?? item.fulfilledQuantity;
}

function isItemFullyCovered(item: ConsolidatedItemNeed): boolean {
  return itemCoverage(item) >= item.totalRequestedQuantity;
}

/** Items that newly reached 100% coverage after a ticket update. */
export function newlyFullyCoveredItems(
  before: ReliefTicket,
  after: ReliefTicket,
): CoveredItem[] {
  return after.items
    .filter((item) => {
      if (!isItemFullyCovered(item)) return false;
      const prev = before.items.find(
        (entry) =>
          entry.itemName === item.itemName && entry.unit === item.unit,
      );
      if (!prev) return true;
      return !isItemFullyCovered(prev);
    })
    .map((item) => ({
      itemName: item.itemName,
      unit: item.unit,
      totalRequestedQuantity: item.totalRequestedQuantity,
    }));
}

export function communityGoalTitle(
  locationName: string,
  itemType: string,
): string {
  return `🎉 ${locationName} reached 100% of ${itemType} needed!`;
}

export function communityGoalBadgeLabel(itemType?: string): string {
  // Prefer hero accolade copy; item-specific detail lives in the impact line.
  void itemType;
  return HERO_ACCOLADE_DICTIONARY.MISSION_CLEARED.badgeText;
}

export function entityThresholdBadgeLabel(
  threshold: number,
  unitLabel = "Units",
): string {
  return `⭐ ${threshold}+ ${unitLabel} Delivered`;
}

export function rapidResponseBadgeLabel(): string {
  return "⚡ Rapid Response";
}

/** Thresholds crossed when moving from previousTotal → newTotal. */
export function crossedContributionThresholds(
  previousTotal: number,
  newTotal: number,
): number[] {
  return ENTITY_CONTRIBUTION_THRESHOLDS.filter(
    (threshold) => previousTotal < threshold && newTotal >= threshold,
  );
}

export function isRapidResponse(
  pledgeCreatedAt: string | undefined,
  deliveredAt: Date = new Date(),
): boolean {
  if (!pledgeCreatedAt) return false;
  const createdMs = Date.parse(pledgeCreatedAt);
  if (!Number.isFinite(createdMs)) return false;
  return deliveredAt.getTime() - createdMs <= RAPID_RESPONSE_WINDOW_MS;
}

/**
 * Format: [Entity Name] delivered [Quantity] [Unit] to [Location] — [Progress Context]
 */
export function formatImpactDeliveryTitle(input: {
  entityName: string;
  quantity: number;
  unit: string;
  locationName: string;
  progressContext: string;
}): string {
  const qty = Number.isFinite(input.quantity)
    ? Math.max(0, Math.round(input.quantity))
    : 0;
  return `${input.entityName} delivered ${qty} ${input.unit} to ${input.locationName} — ${input.progressContext}`;
}

export function sumPledgeImpactQuantity(input: {
  ticketMatchedItems?: Array<{ pledgedQuantity?: number; quantity?: number }>;
  customItems?: Array<{ quantity?: number }>;
  itemsPledged?: Array<{ quantity?: number }>;
}): number {
  const matched = (input.ticketMatchedItems ?? []).reduce(
    (sum, item) => sum + (item.pledgedQuantity ?? item.quantity ?? 0),
    0,
  );
  const custom = (input.customItems ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  const pledged = (input.itemsPledged ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  return matched + custom + pledged;
}

export function primaryImpactUnit(input: {
  ticketMatchedItems?: Array<{
    pledgedQuantity?: number;
    unit?: string;
    itemName?: string;
  }>;
  customItems?: Array<{ quantity?: number; unit?: string; itemName?: string }>;
}): string {
  const matched = (input.ticketMatchedItems ?? []).find(
    (item) => (item.pledgedQuantity ?? 0) > 0,
  );
  if (matched?.unit?.trim()) return matched.unit.trim();
  if (matched?.itemName?.trim()) return matched.itemName.trim();

  const custom = (input.customItems ?? []).find(
    (item) => (item.quantity ?? 0) > 0,
  );
  if (custom?.unit?.trim()) return custom.unit.trim();
  if (custom?.itemName?.trim()) return custom.itemName.trim();

  return "Units";
}

export type MilestoneDecorations = {
  isMilestone: boolean;
  milestoneType: ActivityMilestoneType | null;
  badgeLabel: string | null;
};

/** Prefer entity threshold, then rapid response, for a delivery activity card. */
export function resolveDeliveryMilestoneDecorations(input: {
  crossedThresholds: number[];
  unitLabel: string;
  rapid: boolean;
}): MilestoneDecorations {
  const highest = input.crossedThresholds[input.crossedThresholds.length - 1];
  if (highest != null) {
    return {
      isMilestone: true,
      milestoneType: "ENTITY_THRESHOLD",
      badgeLabel: entityThresholdBadgeLabel(highest, input.unitLabel),
    };
  }
  if (input.rapid) {
    return {
      isMilestone: true,
      milestoneType: "RAPID_RESPONSE",
      badgeLabel: rapidResponseBadgeLabel(),
    };
  }
  return {
    isMilestone: false,
    milestoneType: null,
    badgeLabel: null,
  };
}
