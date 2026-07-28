export type SupplyFulfillmentSource =
  | "WAREHOUSE_STOCK"
  | "DIRECT_INBOUND_CONSIGNMENT"
  | "NGO_DIRECT_PLEDGE";

export type FulfillmentTransitStatus =
  | "DISPATCHED_IN_TRANSIT"
  | "DELIVERED_FULFILLED"
  | "REJECTED_DAMAGED";

export type InboundConsignmentStatus =
  | "ANNOUNCED"
  | "AT_TRANSIT_HUB"
  | "PARTIALLY_ALLOCATED"
  | "FULLY_ALLOCATED"
  | "RECEIVED_TO_WAREHOUSE";

export interface AllocatedLineItem {
  category: string;
  displayName: string;
  unit: string;
  quantityAllocated: number;
}

export interface TicketFulfillmentRecord {
  fulfillmentId: string;
  reliefTicketId: string;
  sourceType: SupplyFulfillmentSource;
  sourceWarehouseId?: string;
  sourceShipmentId?: string;
  sourceNgoId?: string;
  allocatedItems: AllocatedLineItem[];
  dispatchedTimestamp: string;
  receivedTimestamp?: string;
  proofOfReceiptUrl?: string;
  receivedByUserId: string;
  receivedByName?: string;
  receiptGps?: { lat: number; lng: number };
  status: FulfillmentTransitStatus;
  /** Virtual movement audit — does not change warehouse currentStockTons. */
  auditTrail: {
    originLabel: string;
    destinationLabel: string;
    vehicleNumber?: string;
  };
  digitalManifestId?: string;
}

export interface InboundLineItem {
  lineId: string;
  category: string;
  displayName: string;
  unit: string;
  quantityArriving: number;
  quantityRemaining: number;
}

export interface InboundConsignment {
  shipmentId: string;
  donorOrCarrierName: string;
  vehicleNumber: string;
  driverPhone: string;
  district: string;
  revenueCircle: string;
  transitHubName: string;
  etaOrArrivedAt: string;
  items: InboundLineItem[];
  status: InboundConsignmentStatus;
  notes?: string;
}

export interface DigitalTransitManifest {
  manifestId: string;
  fulfillmentId: string;
  reliefTicketId: string;
  vehicleNumber: string;
  driverPhone: string;
  originLabel: string;
  destinationLabel: string;
  destinationContactName?: string;
  destinationContactPhone?: string;
  villageName: string;
  revenueCircle: string;
  district: string;
  items: AllocatedLineItem[];
  issuedAt: string;
  gatePassCode: string;
}

export interface SuggestedDirectMatch {
  shipmentId: string;
  ticketId: string;
  villageName: string;
  revenueCircle: string;
  matchedItemName: string;
  matchedCategory: string;
  unit: string;
  ticketDeficit: number;
  availableQuantity: number;
  suggestedAllocateQuantity: number;
  score: number;
  bannerText: string;
}

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentTransitStatus, string> =
  {
    DISPATCHED_IN_TRANSIT: "In Transit",
    DELIVERED_FULFILLED: "Delivered",
    REJECTED_DAMAGED: "Rejected / Damaged",
  };

export const CONSIGNMENT_STATUS_LABELS: Record<InboundConsignmentStatus, string> =
  {
    ANNOUNCED: "Announced",
    AT_TRANSIT_HUB: "At Transit Hub",
    PARTIALLY_ALLOCATED: "Partially Allocated",
    FULLY_ALLOCATED: "Fully Allocated",
    RECEIVED_TO_WAREHOUSE: "Received to Warehouse",
  };

export const SOURCE_TYPE_LABELS: Record<SupplyFulfillmentSource, string> = {
  WAREHOUSE_STOCK: "Warehouse Stock",
  DIRECT_INBOUND_CONSIGNMENT: "Direct Inbound Consignment",
  NGO_DIRECT_PLEDGE: "NGO Direct Pledge",
};
