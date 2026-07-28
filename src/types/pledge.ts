export interface SupplyPledge {
  id: string;
  ngoId: string;
  ngoName: string;
  reliefItemCategory: string; // e.g., "Water Cans (20L)", "Tarpaulins"
  unit: string;
  quantityPledged: number;
  quantityInTransit: number;
  quantityDelivered: number;
  estimatedArrival: string; // ISO Timestamp
  lastDeliveryTimestamp?: string;
}

export type PledgeFulfillmentBand = "CRITICAL" | "IN_PROGRESS" | "FULFILLED";

export type PledgeAuditRow = SupplyPledge & {
  variance: number;
  fulfillmentPercent: number;
  fulfillmentBand: PledgeFulfillmentBand;
  isOverdue: boolean;
};
