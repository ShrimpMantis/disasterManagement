export type ArmyReadinessStatus = "DEPLOYED" | "STANDBY_READY" | "MOBILIZING";

export type EmergencyDirectoryTab = "hospitals" | "police" | "army";

export interface HospitalFacilityRecord {
  hospitalId: string;
  hospitalName: string;
  facilityType: "DISTRICT_HOSPITAL" | "CHC" | "PHC" | "PRIVATE_MULTI";
  district: string;
  revenueCircle: string;
  coordinates: { lat: number; lng: number };
  availableIcuBeds: number;
  totalIcuBeds: number;
  antiSnakeVenomStock: number;
  emergencyContactName: string;
  emergencyPhone: string;
  hasTraumaBay: boolean;
}

export interface PolicePersonnelRecord {
  stationId: string;
  policeStationName: string;
  district: string;
  revenueCircle: string;
  coordinates: { lat: number; lng: number };
  officerInChargeName: string;
  designation: string;
  primaryPhone: string;
  altPhone?: string;
  activeForceCount: number;
  hasWaterRescueBoats: boolean;
}

export interface ArmyCampRecord {
  campId: string;
  unitName: string;
  brigadeOrDivision: string;
  district: string;
  campLocationName: string;
  coordinates: { lat: number; lng: number };
  liaisonOfficerName: string;
  liaisonOfficerRank: string;
  contactPhone: string;
  assignedEquipment: string[];
  readinessStatus: ArmyReadinessStatus;
}

export type EmergencyDirectoryEntity =
  | { kind: "HOSPITAL"; record: HospitalFacilityRecord }
  | { kind: "POLICE"; record: PolicePersonnelRecord }
  | { kind: "ARMY"; record: ArmyCampRecord };

export interface EmergencyMapFocus {
  id: string;
  kind: "HOSPITAL" | "POLICE" | "ARMY" | "SOS";
  title: string;
  lat: number;
  lng: number;
}

export const ARMY_READINESS_LABELS: Record<ArmyReadinessStatus, string> = {
  DEPLOYED: "Deployed",
  STANDBY_READY: "Standby Ready",
  MOBILIZING: "Mobilizing",
};

export const ARMY_READINESS_BADGE_CLASS: Record<ArmyReadinessStatus, string> = {
  DEPLOYED: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  STANDBY_READY: "bg-[#e0f2fe] text-[#075985]",
  MOBILIZING: "bg-[#fff7ed] text-[#9a3412]",
};

export const HOSPITAL_TYPE_LABELS: Record<
  HospitalFacilityRecord["facilityType"],
  string
> = {
  DISTRICT_HOSPITAL: "District Hospital",
  CHC: "CHC",
  PHC: "PHC",
  PRIVATE_MULTI: "Private Multi-specialty",
};
