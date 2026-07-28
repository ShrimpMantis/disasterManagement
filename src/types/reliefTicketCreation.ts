import type { EntityPledgeCommitment } from "@/types/pledgeManagement";

export type TicketPriority = "CRITICAL_LIFE_SAFETY" | "URGENT" | "STANDARD_RELIEF";

export type TicketSourceChannel =
  | "PHONE_CALL"
  | "WHATSAPP_SOS"
  | "FIELD_AGENT"
  | "GOVT_HELPLINE";

export type ReliefItemCategory =
  | "FOOD"
  | "WATER"
  | "MEDICAL"
  | "SHELTER"
  | "HYGIENE"
  | "CLOTHING"
  | "RESCUE_OPERATION";

export interface TicketItemRequest {
  itemId?: string;
  category: ReliefItemCategory;
  itemDisplayName: string;
  unitType: string;
  quantityRequested: number;
  quantityPledged?: number;
  quantityFulfilled: number;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
}

export interface CreateReliefTicketInput {
  districtId: string;
  districtName: string;
  revenueCircle: string;
  villageOrShelterName: string;
  /** Optional internal linkage so district village demand docs can be updated precisely. */
  villageOrShelterId?: string;
  dropCoordinates: {
    lat: number;
    lng: number;
  };
  landmarkNotes?: string;
  sourceChannel: TicketSourceChannel;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonRole?: string;
  priority: TicketPriority;
  items: TicketItemRequest[];
  specialInstructions?: string;
  createdById: string;
  createdByName: string;
}

export interface ReliefTicketDocument extends CreateReliefTicketInput {
  ticketId: string;
  ticketCode: string;
  status:
    | "OPEN_UNMET"
    | "PARTIALLY_PLEDGED"
    | "FULLY_PLEDGED"
    | "DISPATCHED"
    | "FULFILLED"
    | "CANCELLED";
  totalEstimatedCost: number;
  totalPledgedCost: number;
  assignedPledges?: EntityPledgeCommitment[];
  totalAssignedManpower: number;
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
}

export const RELIEF_ITEM_CATEGORY_LABELS: Record<ReliefItemCategory, string> = {
  FOOD: "Food",
  WATER: "Water",
  MEDICAL: "Medical",
  SHELTER: "Shelter",
  HYGIENE: "Hygiene",
  CLOTHING: "Clothing",
  RESCUE_OPERATION: "Rescue Operation",
};

export const TICKET_CREATION_PRIORITY_LABELS: Record<TicketPriority, string> = {
  CRITICAL_LIFE_SAFETY: "Critical Life Safety",
  URGENT: "Urgent",
  STANDARD_RELIEF: "Standard Relief",
};

export const TICKET_SOURCE_CHANNEL_LABELS: Record<TicketSourceChannel, string> = {
  PHONE_CALL: "Phone Call",
  WHATSAPP_SOS: "WhatsApp SOS",
  FIELD_AGENT: "Field Agent",
  GOVT_HELPLINE: "Government Helpline",
};

export const RELIEF_ITEM_PRESETS: Record<
  ReliefItemCategory,
  Array<{ itemDisplayName: string; unitType: string }>
> = {
  FOOD: [
    { itemDisplayName: "Dry Ration Packs", unitType: "PACKS" },
    { itemDisplayName: "Cooked Meals", unitType: "MEALS" },
  ],
  WATER: [
    { itemDisplayName: "Water Cans", unitType: "CANS" },
    { itemDisplayName: "Purification Tablets", unitType: "STRIPS" },
  ],
  MEDICAL: [
    { itemDisplayName: "First Aid Kits", unitType: "KITS" },
    { itemDisplayName: "Anti-Venom", unitType: "VIALS" },
    { itemDisplayName: "Insulin", unitType: "VIALS" },
  ],
  SHELTER: [
    { itemDisplayName: "Tarpaulins", unitType: "SHEETS" },
    { itemDisplayName: "Tents", unitType: "TENTS" },
  ],
  HYGIENE: [
    { itemDisplayName: "Sanitary Kits", unitType: "KITS" },
    { itemDisplayName: "Soaps", unitType: "BARS" },
  ],
  CLOTHING: [
    { itemDisplayName: "Blankets", unitType: "BLANKETS" },
    { itemDisplayName: "Dry Clothes", unitType: "SETS" },
  ],
  RESCUE_OPERATION: [
    { itemDisplayName: "Boat Evacuation Count", unitType: "PERSONS" },
    { itemDisplayName: "Life Jackets", unitType: "JACKETS" },
  ],
};
