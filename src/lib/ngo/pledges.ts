import type { PledgeAuditRow, PledgeFulfillmentBand, SupplyPledge } from "@/types/pledge";

export function getFulfillmentPercent(pledge: SupplyPledge): number {
  if (pledge.quantityPledged <= 0) return 0;
  return Math.min(
    100,
    Math.round((pledge.quantityDelivered / pledge.quantityPledged) * 100),
  );
}

export function getFulfillmentBand(percent: number): PledgeFulfillmentBand {
  if (percent >= 100) return "FULFILLED";
  if (percent <= 30) return "CRITICAL";
  return "IN_PROGRESS";
}

export function isPledgeOverdue(pledge: SupplyPledge, now = Date.now()): boolean {
  const eta = Date.parse(pledge.estimatedArrival);
  if (Number.isNaN(eta)) return false;
  return now > eta && pledge.quantityDelivered < pledge.quantityPledged;
}

export function toPledgeAuditRow(pledge: SupplyPledge, now = Date.now()): PledgeAuditRow {
  const fulfillmentPercent = getFulfillmentPercent(pledge);
  return {
    ...pledge,
    variance: pledge.quantityPledged - pledge.quantityDelivered,
    fulfillmentPercent,
    fulfillmentBand: getFulfillmentBand(fulfillmentPercent),
    isOverdue: isPledgeOverdue(pledge, now),
  };
}
