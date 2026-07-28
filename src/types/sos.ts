export type SOSCategory =
  | "MEDICAL_CRITICAL"
  | "TRAPPED_WATER"
  | "SNAKE_BITE"
  | "FOOD_WATER_OUT"
  | "INFANT_ELDERLY";

export type SOSUrgency = "P1_CRITICAL_LIFE" | "P2_HIGH_RISK" | "P3_MODERATE";

export type SOSStatus = "UNASSIGNED" | "DISPATCHED" | "RESCUED" | "CANCELLED";

export type RapidDispatchAssetType =
  | "BOAT_AMBULANCE"
  | "RESCUE_BOAT"
  | "HELICOPTER_AIRLIFT"
  | "TERRESTRIAL_AMBULANCE"
  | "MOTORCYCLE_AMBULANCE";

export interface SOSAlertTicket {
  sosId: string;
  citizenName: string;
  contactPhone: string;
  district: string;
  revenueCircle: string;
  villageName: string;
  coordinates: { lat: number; lng: number };
  category: SOSCategory;
  urgency: SOSUrgency;
  peopleCount: number;
  specialNotes?: string;
  status: SOSStatus;
  createdAtTimestamp: string;
  assignedAssetId?: string;
  assignedAssetLabel?: string;
}

export type SOSQueueFilter = "ALL" | "P1" | "P2" | "SLA_BREACHED";

export const SOS_SLA_BREACH_MINUTES = 30;

export const SOS_CATEGORY_LABELS: Record<SOSCategory, string> = {
  MEDICAL_CRITICAL: "Medical Critical",
  TRAPPED_WATER: "Trapped in Water",
  SNAKE_BITE: "Snake Bite / Envenomation",
  FOOD_WATER_OUT: "Food / Water Out",
  INFANT_ELDERLY: "Infant / Elderly Care",
};

export const SOS_URGENCY_LABELS: Record<SOSUrgency, string> = {
  P1_CRITICAL_LIFE: "P1 · Critical",
  P2_HIGH_RISK: "P2 · High Risk",
  P3_MODERATE: "P3 · Moderate",
};

export const SOS_URGENCY_BADGE_CLASS: Record<SOSUrgency, string> = {
  P1_CRITICAL_LIFE:
    "animate-pulse bg-[#fef2f2] text-[#b91c1c] ring-1 ring-[#fecaca]",
  P2_HIGH_RISK: "bg-[#fff7ed] text-[#9a3412] ring-1 ring-[#fed7aa]",
  P3_MODERATE: "bg-[#e0f2fe] text-[#075985]",
};

export const SOS_STATUS_LABELS: Record<SOSStatus, string> = {
  UNASSIGNED: "Unassigned",
  DISPATCHED: "Dispatched",
  RESCUED: "Rescued",
  CANCELLED: "Cancelled",
};

export const RAPID_DISPATCH_ASSET_LABELS: Record<RapidDispatchAssetType, string> =
  {
    BOAT_AMBULANCE: "Boat Ambulance",
    RESCUE_BOAT: "Rescue Boat",
    HELICOPTER_AIRLIFT: "Helicopter Airlift",
    TERRESTRIAL_AMBULANCE: "ALS/BLS Ambulance",
    MOTORCYCLE_AMBULANCE: "Motorcycle Ambulance",
  };

export const URGENCY_SORT_RANK: Record<SOSUrgency, number> = {
  P1_CRITICAL_LIFE: 0,
  P2_HIGH_RISK: 1,
  P3_MODERATE: 2,
};
