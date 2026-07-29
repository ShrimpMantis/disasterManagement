/**
 * Canonical Firestore collection layout for ReliefNet disaster ops.
 *
 * Paths:
 * - /districts/{districtId}/tickets/{ticketId}
 * - /districts/{districtId}/villages/{villageId}
 * - /districts/{districtId}/warehouses/{warehouseId}
 * - /chats/{requestId}/messages/{messageId}
 * - /emergencyAssets/{assetId}  (indexed `geohash` for map spatial queries)
 * - /volunteerRegistrations/{volunteerId}
 * - /ngoRegistrations/{ngoId}
 * - /citizenGroupRegistrations/{groupId}
 * - /reliefTickets/{ticketId}
 * - /transportRequests/{requestId}  (parent metadata for chat threads)
 * - /transporters/{transporterId}   (crowdsourced fleet directory)
 * - /sosAlerts/{sosId}              (map SOS pins)
 * - /ticketFulfillments/{fulfillmentId}
 * - /auditQueue/{auditId}
 * - /transitManifests/{manifestId}
 * - /inboundConsignments/{shipmentId}
 * - /consolidatedReliefMetrics/{docId}
 * - /users/{uid}  (auth profile: userType, organization affiliation)
 * - /pledges/{pledgeId}  (marketplace pledges linked to userId + needId)
 * - /activityEvents/{eventId}  (system-generated live activity log; TTL via expireAt)
 */

import type { AuditSamplingRecord } from "@/types/fulfillmentAudit";
import type { ReliefTicketDocument } from "@/types/reliefTicketCreation";
import type { DispatchChatMessage } from "@/types/transportationDispatch";
import type { ReliefTicket } from "@/types/ticket";
import type { MapMarkerType, SosAlert, StatusSeverity } from "@/types/map";
import type {
  NGORegistration,
  VolunteerRegistration,
} from "@/types/registration";
import type { CitizenGroup } from "@/types/volunteerOnboarding";
import type { TransportCapabilityRequest } from "@/types/transportationDispatch";
import type { TransporterRecord } from "@/types/transporterFleet";
import type { WarehouseLocation } from "@/types/warehouseModule";
import type { VillageDemandMetric } from "@/types/villageCoordination";
import type { ActivityEvent } from "@/types/activityEvent";

export const FIRESTORE_COLLECTIONS = {
  districts: "districts",
  tickets: "tickets",
  villages: "villages",
  warehouses: "warehouses",
  chats: "chats",
  messages: "messages",
  emergencyAssets: "emergencyAssets",
  volunteerRegistrations: "volunteerRegistrations",
  ngoRegistrations: "ngoRegistrations",
  citizenGroupRegistrations: "citizenGroupRegistrations",
  reliefTickets: "reliefTickets",
  ngos: "ngos",
  pledges: "pledges",
  users: "users",
  transportRequests: "transportRequests",
  transporters: "transporters",
  sosAlerts: "sosAlerts",
  ticketFulfillments: "ticketFulfillments",
  auditQueue: "auditQueue",
  transitManifests: "transitManifests",
  inboundConsignments: "inboundConsignments",
  consolidatedReliefMetrics: "consolidatedReliefMetrics",
  keyOfficials: "keyOfficials",
  districtProgress: "districtProgress",
  activityEvents: "activityEvents",
} as const;

export type EmergencyAssetKind =
  | "BOAT"
  | "HIGH_LAND"
  | "RELIEF_CAMP"
  | "HOSPITAL"
  | "POLICE"
  | "ARMY"
  | "TRUCK_HUB"
  | "WAREHOUSE"
  | "VOLUNTEER"
  | "SOS";

/** Document stored at /emergencyAssets/{assetId} */
export interface EmergencyAssetDoc {
  assetId: string;
  kind: EmergencyAssetKind;
  markerType: MapMarkerType;
  title: string;
  districtId: string;
  district: string;
  revenueCircle?: string;
  villageId?: string;
  villageName?: string;
  lat: number;
  lng: number;
  /** Geohash for spatial range queries (map pins). */
  geohash: string;
  statusSeverity?: StatusSeverity;
  status?: string;
  phone?: string;
  metadata?: Record<string, string | number | boolean | null>;
  updatedAt: string;
  createdAt: string;
}

/** Ticket under /districts/{districtId}/tickets/{ticketId} */
export type TicketDoc = ReliefTicket & {
  districtId: string;
};

/** Warehouse under /districts/{districtId}/warehouses/{warehouseId} */
export type WarehouseDoc = WarehouseLocation;

/**
 * Village coordination doc under /districts/{districtId}/villages/{villageId}.
 * Demands store assessed vs delivered; quantityPending is derived in actions.
 */
export type VillageCoordinationDoc = Omit<
  VillageDemandMetric,
  "fulfillmentPercentage" | "demands"
> & {
  districtId: string;
  demands: Array<{
    category: string;
    displayName: string;
    quantityAssessed: number;
    quantityPledged: number;
    quantityDelivered: number;
    quantityInTransit: number;
  }>;
};

/** Chat message under /chats/{requestId}/messages/{messageId} */
export type ChatMessageDoc = DispatchChatMessage;

/** Parent transport request at /transportRequests/{requestId} */
export type TransportRequestDoc = TransportCapabilityRequest;

/** Crowdsourced fleet row at /transporters/{transporterId} */
export type TransporterDoc = TransporterRecord;

export type SosAlertDoc = SosAlert & {
  districtId?: string;
  geohash: string;
};

export type VolunteerRegistrationDoc = VolunteerRegistration;
export type NgoRegistrationDoc = NGORegistration;
export type CitizenGroupRegistrationDoc = CitizenGroup;
export type AuditQueueDoc = AuditSamplingRecord;
export type ReliefTicketCreationDoc = ReliefTicketDocument;
/** System ops log at /activityEvents/{eventId} */
export type ActivityEventDoc = ActivityEvent;

export function districtTicketsPath(districtId: string): [string, string, string] {
  return [
    FIRESTORE_COLLECTIONS.districts,
    districtId,
    FIRESTORE_COLLECTIONS.tickets,
  ];
}

export function districtWarehousesPath(
  districtId: string,
): [string, string, string] {
  return [
    FIRESTORE_COLLECTIONS.districts,
    districtId,
    FIRESTORE_COLLECTIONS.warehouses,
  ];
}

export function districtVillagesPath(
  districtId: string,
): [string, string, string] {
  return [
    FIRESTORE_COLLECTIONS.districts,
    districtId,
    FIRESTORE_COLLECTIONS.villages,
  ];
}

export function chatMessagesPath(requestId: string): [string, string, string] {
  return [
    FIRESTORE_COLLECTIONS.chats,
    requestId,
    FIRESTORE_COLLECTIONS.messages,
  ];
}
