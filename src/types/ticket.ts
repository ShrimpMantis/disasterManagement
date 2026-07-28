import type {
  AuditSamplingRecord,
  FulfillmentProof,
} from "@/types/fulfillmentAudit";
import type { EntityPledgeCommitment } from "@/types/pledgeManagement";

export type RequestChannel = "VILLAGE_LEAD" | "RELIEF_CAMP" | "CITIZEN_SOS";
export type TicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "DISPATCHED"
  | "FULFILLED"
  | "PARTIALLY_FULFILLED"
  | "SELECTED_FOR_AUDIT"
  | "AUDIT_VERIFIED"
  | "AUDIT_FAILED";

export interface RawReliefRequest {
  id: string;
  sourceChannel: RequestChannel;
  villageId: string;
  villageName: string;
  revenueCircle: string;
  itemCategory: string; // e.g., "Water & Sanitation", "Shelter"
  itemName: string; // e.g., "20L Water Cans", "Tarpaulins"
  requestedQuantity: number;
  unit: string;
  requestedAt: string; // ISO timestamp
  senderContact?: string;
  rawMessage?: string;
}

export interface ConsolidatedItemNeed {
  itemId?: string;
  itemName: string;
  category: string;
  totalRequestedQuantity: number;
  quantityPledged?: number;
  fulfilledQuantity: number;
  unit: string;
  estimatedUnitCost?: number;
  estimatedTotalCost?: number;
  underlyingRequestIds: string[]; // Audit link to raw requests
}

export interface ReliefTicket {
  id: string; // Formatted ticket code, e.g., "TKT-VIL102-0826"
  villageId: string;
  villageName: string;
  revenueCircle: string;
  district: string;
  priority: TicketPriority;
  status: TicketStatus;
  sourceChannel?: RequestChannel;
  items: ConsolidatedItemNeed[];
  assignedEntityId?: string; // NGO ID or Warehouse ID
  assignedEntityName?: string;
  dispatchVehicleNumber?: string;
  dispatchDriverPhone?: string;
  estimatedArrival?: string; // ISO timestamp
  proofOfDeliveryUrl?: string; // Image link or signed receipt
  proofOfFulfillment?: FulfillmentProof;
  auditSampling?: AuditSamplingRecord;
  totalEstimatedTicketCost?: number;
  totalPledgedCost?: number;
  totalAssignedManpower?: number;
  assignedPledges?: EntityPledgeCommitment[];
  requesterName?: string;
  requesterPhone?: string;
  requesterRole?: string;
  dropCoordinates?: { lat: number; lng: number };
  landmarkNotes?: string;
  specialInstructions?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  slaBreached: boolean; // True if in REQUESTED/ASSIGNED > 12h
  /** Aggregated quantity exceeds 3x village population — needs manual verification */
  requiresManualVerification?: boolean;
  parentTicketId?: string;
}

export type VillageLookup = {
  id: string;
  name: string;
  revenueCircle: string;
  district: string;
  population: number;
  coordinates: { lat: number; lng: number };
};

export const REQUEST_CHANNEL_LABELS: Record<RequestChannel, string> = {
  VILLAGE_LEAD: "Village Lead",
  RELIEF_CAMP: "Relief Camp",
  CITIZEN_SOS: "Citizen SOS",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  REQUESTED: "Requested",
  ASSIGNED: "Assigned",
  DISPATCHED: "Dispatched",
  FULFILLED: "Fulfilled",
  PARTIALLY_FULFILLED: "Partially Fulfilled",
  SELECTED_FOR_AUDIT: "Selected For Audit",
  AUDIT_VERIFIED: "Audit Verified",
  AUDIT_FAILED: "Audit Failed",
};

export const KANBAN_COLUMNS: TicketStatus[] = [
  "REQUESTED",
  "ASSIGNED",
  "DISPATCHED",
  "FULFILLED",
  "SELECTED_FOR_AUDIT",
];
