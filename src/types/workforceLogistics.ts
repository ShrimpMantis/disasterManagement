export type TruckCategory =
  | "MINI_TRUCK_4X4"
  | "MEDIUM_DUTY"
  | "HEAVY_DUTY"
  | "TRACTOR_TRAILER"
  | "REFRIGERATED_VAN";

export type LogisticsVendorStatus =
  | "AVAILABLE"
  | "HIRED_ACTIVE"
  | "IN_TRANSIT"
  | "MAINTENANCE";

export type AssamTransportHub =
  | "ALL_ASSAM"
  | "GUWAHATI"
  | "SILCHAR"
  | "DIBRUGARH"
  | "JORHAT"
  | "LAKHIMPUR_DHEMAJI";

export interface WorkforceMetrics {
  totalRegisteredNGOs: number;
  activeNGOsOnGround: number;
  totalRegisteredVolunteers: number;
  volunteersDeployedToday: number;
  medicalPersonnelDeployed: number;
  searchAndRescuePersonnel: number;
}

export interface VolunteerCircleDeployment {
  revenueCircle: string;
  district: string;
  volunteersDeployed: number;
  lat: number;
  lng: number;
}

export interface RentalTruckOperator {
  id: string;
  operatorOrVendorName: string;
  contactPersonName: string;
  primaryPhone: string;
  altPhone?: string;
  district: string;
  revenueCircle: string;
  operatingBaseLocation: string;
  truckCategory: TruckCategory;
  vehicleRegistrationNumber: string;
  payloadCapacityTons: number;
  rentalRatePerDayINR: number;
  status: LogisticsVendorStatus;
  currentAssignedVillageId?: string;
  hubId: AssamTransportHub;
  coordinates: { lat: number; lng: number };
}

export interface TruckHireRequisition {
  id: string;
  truckIds: string[];
  destinationVillageId: string;
  destinationVillageName: string;
  createdAt: string;
  gatePassCode: string;
}

export const TRUCK_CATEGORY_LABELS: Record<TruckCategory, string> = {
  MINI_TRUCK_4X4: "Mini Truck 4×4",
  MEDIUM_DUTY: "Medium Duty",
  HEAVY_DUTY: "Heavy Duty",
  TRACTOR_TRAILER: "Tractor / Trailer",
  REFRIGERATED_VAN: "Refrigerated Van",
};

export const TRUCK_CATEGORY_BADGE_CLASS: Record<TruckCategory, string> = {
  MINI_TRUCK_4X4: "bg-[#e0f2fe] text-[#075985]",
  MEDIUM_DUTY: "bg-[#f3f4f6] text-[#374151]",
  HEAVY_DUTY: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  TRACTOR_TRAILER: "bg-[#fff7ed] text-[#9a3412]",
  REFRIGERATED_VAN: "bg-[#eef2ff] text-[#3730a3]",
};

export const LOGISTICS_STATUS_LABELS: Record<LogisticsVendorStatus, string> = {
  AVAILABLE: "Available",
  HIRED_ACTIVE: "Hired Active",
  IN_TRANSIT: "In Transit",
  MAINTENANCE: "Maintenance",
};

export const ASSAM_HUB_LABELS: Record<AssamTransportHub, string> = {
  ALL_ASSAM: "All Assam",
  GUWAHATI: "Guwahati (Kamrup)",
  SILCHAR: "Silchar (Cachar)",
  DIBRUGARH: "Dibrugarh",
  JORHAT: "Jorhat",
  LAKHIMPUR_DHEMAJI: "Lakhimpur / Dhemaji",
};

export const ASSAM_HUB_DISTRICT_MATCH: Record<
  Exclude<AssamTransportHub, "ALL_ASSAM">,
  string[]
> = {
  GUWAHATI: ["Kamrup Metropolitan", "Kamrup", "Nalbari", "Goalpara"],
  SILCHAR: ["Cachar", "Karimganj", "Hailakandi"],
  DIBRUGARH: ["Dibrugarh", "Tinsukia", "Sivasagar"],
  JORHAT: ["Jorhat", "Majuli", "Golaghat"],
  LAKHIMPUR_DHEMAJI: ["Lakhimpur", "Dhemaji", "Morigaon"],
};
