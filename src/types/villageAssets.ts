export type BoatType = "MECHANIZED" | "MANUAL_ROW" | "SPEED_BOAT";

export type AssetStatus = "AVAILABLE" | "DEPLOYED" | "UNAVAILABLE" | "DAMAGED";

export type AccessRouteStatus = "CLEAR" | "WATERLOGGED" | "INACCESSIBLE";

export type CampBuildingType =
  | "SCHOOL"
  | "COMMUNITY_HALL"
  | "CYCLONE_SHELTER"
  | "TEMPORARY_TENT";

export type CampStatus = "STANDBY" | "ACTIVE" | "FULL" | "CLOSED";

export interface CountryBoatOwner {
  id: string;
  villageId: string;
  villageName: string;
  revenueCircle: string;
  coordinates?: { lat: number; lng: number };
  ownerName: string;
  primaryPhone: string;
  alternatePhone?: string;
  boatType: BoatType;
  passengerCapacity: number;
  maxWeightKg: number;
  status: AssetStatus;
  currentAssignmentLocation?: string;
}

export interface HighLandZone {
  id: string;
  villageId: string;
  villageName: string;
  revenueCircle: string;
  zoneName: string;
  elevationMetersAboveSea: number;
  holdingCapacityPersons: number;
  hasHelipadSuitability: boolean;
  accessRouteStatus: AccessRouteStatus;
  coordinates: { lat: number; lng: number };
}

export interface ReliefCampFacility {
  id: string;
  villageId: string;
  villageName: string;
  revenueCircle: string;
  campName: string;
  buildingType: CampBuildingType;
  maxCapacityPersons: number;
  currentOccupancy: number;
  toiletCount: number;
  hasRunningWater: boolean;
  hasPowerGenerator: boolean;
  inChargeName: string;
  inChargePhone: string;
  status: CampStatus;
  coordinates?: { lat: number; lng: number };
}

export interface VillageAssetSummary {
  villageId: string;
  villageName: string;
  revenueCircle: string;
  district: string;
  gaonBurhaOrPradhan: string;
  availableBoats: number;
  totalBoats: number;
  safeHighLands: number;
  totalHighLands: number;
  nearestReliefCampName: string;
  nearestReliefCampDistanceKm: number | null;
  campCapacityRemaining: number;
}

export const BOAT_TYPE_LABELS: Record<BoatType, string> = {
  MECHANIZED: "Mechanized",
  MANUAL_ROW: "Manual / Oar",
  SPEED_BOAT: "Speed Boat",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: "Available",
  DEPLOYED: "Deployed",
  UNAVAILABLE: "Unavailable",
  DAMAGED: "Damaged",
};

export const ACCESS_ROUTE_LABELS: Record<AccessRouteStatus, string> = {
  CLEAR: "Clear",
  WATERLOGGED: "Waterlogged",
  INACCESSIBLE: "Inaccessible",
};

export const CAMP_BUILDING_LABELS: Record<CampBuildingType, string> = {
  SCHOOL: "School",
  COMMUNITY_HALL: "Community Hall",
  CYCLONE_SHELTER: "Cyclone Shelter",
  TEMPORARY_TENT: "Temporary Tent",
};

export const CAMP_STATUS_LABELS: Record<CampStatus, string> = {
  STANDBY: "Standby",
  ACTIVE: "Active",
  FULL: "Full",
  CLOSED: "Closed",
};
