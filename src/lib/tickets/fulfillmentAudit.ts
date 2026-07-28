import type {
  AuditSamplingReason,
  AuditSamplingRecord,
  FulfillmentProof,
  ScannedItemQr,
} from "@/types/fulfillmentAudit";
import type { ReliefTicket } from "@/types/ticket";

export const DEFAULT_AUDIT_SAMPLE_PERCENT = 5;
export const LOCATION_OVERRIDE_THRESHOLD_METERS = 500;

export function buildExpectedItemQrs(ticket: ReliefTicket): string[] {
  return ticket.items.flatMap((item) =>
    Array.from({ length: item.totalRequestedQuantity }, (_, index) => {
      const itemSlug = item.itemName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return `${ticket.id}-${itemSlug}-${String(index + 1).padStart(2, "0")}`;
    }),
  );
}

export function normalizeScannedItems(items: ScannedItemQr[]): ScannedItemQr[] {
  const byCode = new Map<string, ScannedItemQr>();
  for (const item of items) {
    const code = item.qrCodeId.trim();
    if (!code) continue;
    if (!byCode.has(code)) {
      byCode.set(code, {
        qrCodeId: code,
        scannedAt: item.scannedAt,
      });
    }
  }
  return Array.from(byCode.values());
}

export function haversineDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadius = 6371000;
  const dLat = degreesToRadians(to.lat - from.lat);
  const dLng = degreesToRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(from.lat)) *
      Math.cos(degreesToRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function pickAuditReason(
  ticketId: string,
  proof: FulfillmentProof,
  samplePercentage = DEFAULT_AUDIT_SAMPLE_PERCENT,
): AuditSamplingReason | null {
  if (proof.isLocationOverridden) return "LOCATION_MISMATCH_OVERRIDE";

  const sum = `${ticketId}:${proof.proofId}`
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bucket = sum % 100;
  return bucket < samplePercentage ? "RANDOM_PERCENTAGE" : null;
}

export function createAuditSamplingRecord(params: {
  ticketId: string;
  reason: AuditSamplingReason;
  now?: number;
}): AuditSamplingRecord {
  const now = params.now ?? Date.now();
  return {
    auditId: `AUD-${now}-${params.ticketId}`,
    ticketId: params.ticketId,
    samplingReason: params.reason,
    auditStatus: "PENDING",
    createdTimestamp: new Date(now).toISOString(),
  };
}
