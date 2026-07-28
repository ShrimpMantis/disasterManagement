export type AuditSamplingReason =
  | "RANDOM_PERCENTAGE"
  | "LOCATION_MISMATCH_OVERRIDE"
  | "MANUAL_FLAG";

export type AuditStatus = "PENDING" | "PASSED" | "FAILED";

export interface ScannedItemQr {
  qrCodeId: string;
  scannedAt: string;
}

export interface FulfillmentProof {
  proofId: string;
  ticketId: string;
  scannedItems: ScannedItemQr[];
  totalExpectedItems: number;
  totalScannedItems: number;
  dropPhotoUrl: string;
  deliveryCoordinates: {
    lat: number;
    lng: number;
    accuracyMeters: number;
  };
  deliveryTimestamp: string;
  isLocationOverridden: boolean;
  locationOverrideReason?: string;
  deliveredByUserId: string;
  timestamp: string;
}

export interface AuditSamplingRecord {
  auditId: string;
  ticketId: string;
  samplingReason: AuditSamplingReason;
  auditStatus: AuditStatus;
  createdTimestamp: string;
  auditorNotes?: string;
  auditedByUserId?: string;
  auditedTimestamp?: string;
}

export const AUDIT_REASON_LABELS: Record<AuditSamplingReason, string> = {
  RANDOM_PERCENTAGE: "Random Percentage",
  LOCATION_MISMATCH_OVERRIDE: "Location Override",
  MANUAL_FLAG: "Manual Flag",
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  PENDING: "Pending Audit",
  PASSED: "Audit Passed",
  FAILED: "Audit Failed",
};
