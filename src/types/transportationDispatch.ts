export type TransportModalType =
  | "TRUCK_MINI_4X4"
  | "TRUCK_HEAVY"
  | "TRACTOR_TRAILER"
  | "RESCUE_BOAT"
  | "BOAT_AMBULANCE"
  | "TERRESTRIAL_AMBULANCE"
  | "MOTORCYCLE_AMBULANCE"
  | "PASSENGER_CAR_4X4"
  | "DRONE_SUPPLY"
  | "HELICOPTER_AIRLIFT"
  | "VOLUNTEER_FORCE";

export type RequestUrgency = "CRITICAL_IMMEDIATE" | "HIGH_24HR" | "STANDARD_SCHEDULED";

export type RequestStatus = "OPEN" | "IN_NEGOTIATION" | "FULFILLED" | "CANCELLED";

export type DispatchSenderRole = "REQUESTOR" | "ASSET_OWNER" | "VOLUNTEER_LEAD";

export type ModalityFilterGroup =
  | "ALL"
  | "TRUCKS"
  | "BOATS"
  | "AMBULANCES"
  | "AIR"
  | "VOLUNTEERS";

export interface TransportCapabilityRequest {
  requestId: string;
  district: string;
  revenueCircle: string;
  pickupLocation: string;
  destinationLocation?: string;
  modalityType: TransportModalType;
  quantityNeeded: number;
  quantityFulfilled: number;
  urgency: RequestUrgency;
  cargoOrTaskDescription: string;
  requestorId: string;
  requestorName: string;
  requestorDesignation: string;
  requestorPhone: string;
  status: RequestStatus;
  createdAtTimestamp: string;
}

export interface AssetOfferDetails {
  registrationOrCallsign: string;
  operatorOrDriverPhone: string;
  operatorOrTeamLeadName: string;
  assetCapacity: string;
  proposedRateINR: number | null;
  isVolunteerService: boolean;
  rateUnit?: "PER_DAY" | "PER_TRIP" | "PER_MISSION";
}

export interface DispatchChatMessage {
  messageId: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: DispatchSenderRole;
  messageText: string;
  proposedRateINR?: number | null;
  offeredAssetDetails?: {
    registrationOrCallsign: string;
    operatorOrDriverPhone: string;
    assetCapacity: string;
    operatorOrTeamLeadName?: string;
  };
  offerAccepted?: boolean;
  isVolunteerService?: boolean;
  timestamp: string;
  isRead: boolean;
}

export const TRANSPORT_MODALITY_LABELS: Record<TransportModalType, string> = {
  TRUCK_MINI_4X4: "Mini-Truck 4×4",
  TRUCK_HEAVY: "Heavy Truck",
  TRACTOR_TRAILER: "Tractor / Trailer",
  RESCUE_BOAT: "Rescue Boat",
  BOAT_AMBULANCE: "Boat Ambulance",
  TERRESTRIAL_AMBULANCE: "ALS/BLS Ambulance",
  MOTORCYCLE_AMBULANCE: "Motorcycle Ambulance",
  PASSENGER_CAR_4X4: "Passenger 4×4",
  DRONE_SUPPLY: "Supply Drone",
  HELICOPTER_AIRLIFT: "Helicopter Airlift",
  VOLUNTEER_FORCE: "Volunteer Force",
};

export const TRANSPORT_MODALITY_BADGE_CLASS: Record<TransportModalType, string> = {
  TRUCK_MINI_4X4: "bg-[#e0f2fe] text-[#075985]",
  TRUCK_HEAVY: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  TRACTOR_TRAILER: "bg-[#fff7ed] text-[#9a3412]",
  RESCUE_BOAT: "bg-[#dbeafe] text-[#1d4ed8]",
  BOAT_AMBULANCE: "bg-[#dbeafe] text-[#1e40af]",
  TERRESTRIAL_AMBULANCE: "bg-[#fef2f2] text-[#b91c1c]",
  MOTORCYCLE_AMBULANCE: "bg-[#fff7ed] text-[#9a3412]",
  PASSENGER_CAR_4X4: "bg-[#f3f4f6] text-[#374151]",
  DRONE_SUPPLY: "bg-[#ecfeff] text-[#0e7490]",
  HELICOPTER_AIRLIFT: "bg-[#ecfeff] text-[#155e75]",
  VOLUNTEER_FORCE: "bg-[#f3e8ff] text-[#6b21a8]",
};

export const URGENCY_LABELS: Record<RequestUrgency, string> = {
  CRITICAL_IMMEDIATE: "Critical Immediate",
  HIGH_24HR: "High · 24hr",
  STANDARD_SCHEDULED: "Standard",
};

export const URGENCY_BADGE_CLASS: Record<RequestUrgency, string> = {
  CRITICAL_IMMEDIATE: "animate-pulse bg-[#fef2f2] text-[#b91c1c] ring-1 ring-[#fecaca]",
  HIGH_24HR: "bg-[#fff7ed] text-[#9a3412]",
  STANDARD_SCHEDULED: "bg-[#e0f2fe] text-[#075985]",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_NEGOTIATION: "In Negotiation",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export const MODALITY_FILTER_GROUPS: Array<{
  id: ModalityFilterGroup;
  label: string;
  modalities: TransportModalType[] | "ALL";
}> = [
  { id: "ALL", label: "All", modalities: "ALL" },
  {
    id: "TRUCKS",
    label: "Trucks",
    modalities: ["TRUCK_MINI_4X4", "TRUCK_HEAVY", "TRACTOR_TRAILER", "PASSENGER_CAR_4X4"],
  },
  {
    id: "BOATS",
    label: "Boats",
    modalities: ["RESCUE_BOAT", "BOAT_AMBULANCE"],
  },
  {
    id: "AMBULANCES",
    label: "Ambulances",
    modalities: ["TERRESTRIAL_AMBULANCE", "MOTORCYCLE_AMBULANCE", "BOAT_AMBULANCE"],
  },
  {
    id: "AIR",
    label: "Air & Drones",
    modalities: ["DRONE_SUPPLY", "HELICOPTER_AIRLIFT"],
  },
  {
    id: "VOLUNTEERS",
    label: "Volunteers",
    modalities: ["VOLUNTEER_FORCE"],
  },
];

export const DISTRICT_FILTERS = [
  "ALL",
  "Jorhat",
  "Kamrup Metropolitan",
  "Lakhimpur",
  "Cachar",
  "Majuli",
  "Dhemaji",
] as const;

export type DistrictFilter = (typeof DISTRICT_FILTERS)[number];
