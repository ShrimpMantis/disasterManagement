export type SectorCategory =
  | "WATER_SANITATION"
  | "MEDICAL_CAMPS"
  | "DRY_RATIONS"
  | "COOKED_MEALS"
  | "SHELTER_TARPAULINS"
  | "SEARCH_RESCUE";

export type NGOStatus = "ACTIVE" | "STANDBY" | "MAX_CAPACITY" | "INACTIVE";

export interface NGOPersonnel {
  name: string;
  phone: string;
  altPhone?: string;
  email: string;
}

export interface NGOCapability {
  sector: SectorCategory;
  dailyCapacityUnits: number;
  unitLabel: string; // e.g., "meals/day", "kits/day", "mobile units"
  currentAssignedUnits: number;
}

export interface NGOProfile {
  id: string;
  name: string;
  status: NGOStatus;
  primaryContact: NGOPersonnel;
  capabilities: NGOCapability[];
  assignedVillageIds: string[];
  /** Lifetime units delivered by this organization. */
  totalUnitsDelivered?: number;
  /** Badge labels unlocked from contribution thresholds. */
  milestoneBadges?: string[];
}

export const SECTOR_LABELS: Record<SectorCategory, string> = {
  WATER_SANITATION: "Water & Sanitation",
  MEDICAL_CAMPS: "Medical Camps",
  DRY_RATIONS: "Dry Rations",
  COOKED_MEALS: "Cooked Meals",
  SHELTER_TARPAULINS: "Shelter / Tarpaulins",
  SEARCH_RESCUE: "Search & Rescue",
};

export const NGO_STATUS_LABELS: Record<NGOStatus, string> = {
  ACTIVE: "Active",
  STANDBY: "Standby",
  MAX_CAPACITY: "Max Capacity",
  INACTIVE: "Inactive",
};

export const ALL_SECTORS = Object.keys(SECTOR_LABELS) as SectorCategory[];
