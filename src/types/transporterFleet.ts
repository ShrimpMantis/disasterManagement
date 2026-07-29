import type { TransportModalType } from "@/types/transportationDispatch";
import { ASSAM_REGISTRATION_DISTRICTS } from "@/types/registration";

export const FLEET_VEHICLE_TYPES = [
  "4x4 Truck",
  "Flatbed",
  "Mini-Truck",
  "Dumper",
  "Tractor",
] as const;

export type FleetVehicleType = (typeof FLEET_VEHICLE_TYPES)[number];

export const TRANSPORTER_AVAILABILITY = [
  "AVAILABLE",
  "EN_ROUTE",
  "MAINTENANCE",
] as const;

export type TransporterAvailability =
  (typeof TRANSPORTER_AVAILABILITY)[number];

export const TRANSPORTER_AVAILABILITY_LABELS: Record<
  TransporterAvailability,
  string
> = {
  AVAILABLE: "Available",
  EN_ROUTE: "En Route",
  MAINTENANCE: "Maintenance",
};

export const TRANSPORTER_AVAILABILITY_BADGE_CLASS: Record<
  TransporterAvailability,
  string
> = {
  AVAILABLE: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  EN_ROUTE: "bg-[#e0f2fe] text-[#075985]",
  MAINTENANCE: "bg-[#fff7ed] text-[#9a3412]",
};

export const FLEET_VEHICLE_BADGE_CLASS: Record<FleetVehicleType, string> = {
  "4x4 Truck": "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  Flatbed: "bg-[#e0f2fe] text-[#075985]",
  "Mini-Truck": "bg-[#ecfeff] text-[#0e7490]",
  Dumper: "bg-[#fff7ed] text-[#9a3412]",
  Tractor: "bg-[#fef3c7] text-[#92400e]",
};

/** Assam districts used for transporter base / dispatch filters. */
export const TRANSPORTER_BASE_DISTRICTS = [
  ...ASSAM_REGISTRATION_DISTRICTS,
  "Nagaon",
  "Guwahati",
] as const;

export type TransporterBaseDistrict =
  (typeof TRANSPORTER_BASE_DISTRICTS)[number];

/** Document at `/transporters/{id}` */
export interface TransporterRecord {
  id: string;
  name: string;
  vehicleType: FleetVehicleType;
  capacity: string;
  baseDistrict: string;
  phone: string;
  availability: TransporterAvailability;
  verificationCount: number;
  isOfficial: boolean;
  /** Auth uids that have community-confirmed this row. */
  verifiedBy: string[];
  address?: string;
  fleetSize?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateTransporterInput = {
  name: string;
  vehicleType: FleetVehicleType;
  capacity: string;
  baseDistrict: string;
  phone: string;
  availability?: TransporterAvailability;
  address?: string;
  fleetSize?: number;
  isOfficial?: boolean;
  createdBy: string;
};

export type TransporterGridFilter = {
  vehicleTypes?: FleetVehicleType[] | null;
  district?: string | null;
  matchedRequestId?: string | null;
};

/**
 * Maps a transport capability modality onto road-fleet vehicle types
 * for Dispatch / Match filtering.
 */
export function modalityToFleetVehicleTypes(
  modality: TransportModalType,
): FleetVehicleType[] | null {
  switch (modality) {
    case "TRUCK_MINI_4X4":
      return ["Mini-Truck", "4x4 Truck"];
    case "TRUCK_HEAVY":
      return ["Flatbed", "4x4 Truck", "Dumper"];
    case "TRACTOR_TRAILER":
      return ["Tractor", "Flatbed"];
    case "PASSENGER_CAR_4X4":
      return ["4x4 Truck", "Mini-Truck"];
    default:
      return null;
  }
}

/** Normalize Guwahati ↔ Kamrup Metropolitan for filter matching. */
export function districtsMatch(a: string, b: string): boolean {
  const normalize = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "guwahati" || trimmed === "kamrup metropolitan") {
      return "guwahati";
    }
    return trimmed;
  };
  return normalize(a) === normalize(b);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••••••";
  const visibleStart = digits.slice(0, 2);
  const visibleEnd = digits.slice(-3);
  return `${visibleStart}${"•".repeat(Math.max(4, digits.length - 5))}${visibleEnd}`;
}

export const DEMO_TRANSPORTERS: TransporterRecord[] = [
  {
    id: "demo-tr-1",
    name: "Nagaon Highland Logistics",
    vehicleType: "4x4 Truck",
    capacity: "5 Tons",
    baseDistrict: "Nagaon",
    phone: "+91 94350 11223",
    availability: "AVAILABLE",
    verificationCount: 4,
    isOfficial: false,
    verifiedBy: [],
    address: "Near Circuit House, Nagaon",
    fleetSize: 3,
    createdBy: "seed",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    id: "demo-tr-2",
    name: "Brahmaputra Flatbed Services",
    vehicleType: "Flatbed",
    capacity: "12 Cubic Meters",
    baseDistrict: "Guwahati",
    phone: "+91 98640 55441",
    availability: "EN_ROUTE",
    verificationCount: 12,
    isOfficial: true,
    verifiedBy: [],
    address: "NH-27 Yard, Guwahati",
    fleetSize: 6,
    createdBy: "seed",
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-27T14:00:00.000Z",
  },
  {
    id: "demo-tr-3",
    name: "Dibrugarh Mini Fleet Co-op",
    vehicleType: "Mini-Truck",
    capacity: "1.5 Tons",
    baseDistrict: "Dibrugarh",
    phone: "+91 99544 77880",
    availability: "AVAILABLE",
    verificationCount: 1,
    isOfficial: false,
    verifiedBy: [],
    address: "Mancotta Road",
    fleetSize: 2,
    createdBy: "seed",
    createdAt: "2026-07-22T09:30:00.000Z",
    updatedAt: "2026-07-22T09:30:00.000Z",
  },
  {
    id: "demo-tr-4",
    name: "Majuli Tractor Pool",
    vehicleType: "Tractor",
    capacity: "3 Tons trailer",
    baseDistrict: "Majuli",
    phone: "+91 97060 22110",
    availability: "MAINTENANCE",
    verificationCount: 0,
    isOfficial: false,
    verifiedBy: [],
    address: "Garamur Chariali",
    fleetSize: 4,
    createdBy: "seed",
    createdAt: "2026-07-15T12:00:00.000Z",
    updatedAt: "2026-07-25T16:00:00.000Z",
  },
  {
    id: "demo-tr-5",
    name: "Jorhat Public Works Dumpers",
    vehicleType: "Dumper",
    capacity: "8 Tons",
    baseDistrict: "Jorhat",
    phone: "+91 94350 99887",
    availability: "AVAILABLE",
    verificationCount: 7,
    isOfficial: true,
    verifiedBy: [],
    address: "AT Road Depot",
    fleetSize: 5,
    createdBy: "seed",
    createdAt: "2026-07-10T07:00:00.000Z",
    updatedAt: "2026-07-26T11:00:00.000Z",
  },
];
