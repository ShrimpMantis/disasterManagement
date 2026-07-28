export type PledgeStatus =
  | "OFFERED"
  | "CONFIRMED"
  | "IN_TRANSIT"
  | "FULFILLED"
  | "REJECTED";

export type PledgeType = "TICKET_MATCHED" | "SPONTANEOUS_OFFER";

export type AdminApprovalStatus = "APPROVED" | "PENDING_REVIEW" | "REJECTED";

export type CustomItemCategory =
  | "Clothing"
  | "Sanitary/Hygiene"
  | "Baby Care"
  | "Medical Equipment"
  | "Other";

export type CustomItemUnit = "Pieces" | "Boxes" | "Kits" | "Kg";

export type CustomPledgeTarget = "VILLAGE_TICKET" | "DISTRICT_POOL";

export interface ItemPledgeInput {
  ticketItemId: string;
  itemName: string;
  category: string;
  requiredQuantity: number;
  pledgedQuantity: number;
  unit: string;
}

export interface CustomPledgeItem {
  id: string;
  itemName: string; // e.g., "Warm Clothes (Adults)", "Baby Blankets"
  category: string; // e.g., "Clothing", "Hygiene", "Medical", "Other"
  quantity: number;
  unit: string; // e.g., "boxes", "pieces", "kits"
  description?: string; // e.g., "Assorted winter clothing sizes S-XL"
}

export interface NGOPledgeSubmission {
  id: string;
  ngoId: string;
  ngoName: string;
  entityType?: "REGISTERED_NGO" | "CITIZEN_GROUP" | "INDIVIDUAL_VOLUNTEER";
  pledgeType: PledgeType;
  ticketId?: string; // Optional: null if general district offer
  targetVillageId?: string; // Optional: null if allocating to district central pool
  targetVillageName?: string;
  targetDistrict?: string;
  ticketMatchedItems?: ItemPledgeInput[]; // Standard ticket items
  customItems?: CustomPledgeItem[]; // Unlisted/spontaneous items
  estimatedDeliveryDate: string; // ISO timestamp
  dispatchHubOrLocation?: string;
  contactPersonName: string;
  contactPersonPhone: string;
  pledgedFinancialAmount?: number;
  providesDistributionManpower?: boolean;
  pledgedManpowerCount?: number;
  notes?: string;
  status: PledgeStatus;
  adminApprovalStatus: AdminApprovalStatus; // Safety gate for unlisted items
  rejectionReason?: string;
  createdAt: string;
  dispatchVehicleNumber?: string;
  dispatchDriverPhone?: string;
  proofOfDeliveryUrl?: string;
  fieldConfirmationCode?: string;
}

export interface DistrictPoolItem {
  id: string;
  pledgeId: string;
  ngoId: string;
  ngoName: string;
  district: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  description?: string;
  acceptedAt: string;
}

export const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  OFFERED: "Offered",
  CONFIRMED: "Confirmed",
  IN_TRANSIT: "In Transit",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected",
};

export const ADMIN_APPROVAL_LABELS: Record<AdminApprovalStatus, string> = {
  APPROVED: "Approved",
  PENDING_REVIEW: "Pending Review",
  REJECTED: "Rejected",
};

export const CUSTOM_ITEM_CATEGORIES: CustomItemCategory[] = [
  "Clothing",
  "Sanitary/Hygiene",
  "Baby Care",
  "Medical Equipment",
  "Other",
];

export const CUSTOM_ITEM_UNITS: CustomItemUnit[] = ["Pieces", "Boxes", "Kits", "Kg"];

export function makeTicketItemId(
  ticketId: string,
  itemName: string,
  unit: string,
): string {
  return `${ticketId}::${itemName.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

/** Back-compat helper for dashboards still reading matched item lines. */
export function getMatchedItems(pledge: NGOPledgeSubmission): ItemPledgeInput[] {
  return pledge.ticketMatchedItems ?? [];
}

export function getCustomItems(pledge: NGOPledgeSubmission): CustomPledgeItem[] {
  return pledge.customItems ?? [];
}
