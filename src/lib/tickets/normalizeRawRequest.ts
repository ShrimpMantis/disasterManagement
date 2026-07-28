import type {
  RawReliefRequest,
  RequestChannel,
  VillageLookup,
} from "@/types/ticket";

type UnknownRecord = Record<string, unknown>;

function asRecord(input: unknown): UnknownRecord {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as UnknownRecord;
  }
  return {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeChannel(value: unknown): RequestChannel {
  const raw = asString(value).toUpperCase().replace(/[\s-]+/g, "_");
  if (raw === "VILLAGE_LEAD" || raw === "LEAD" || raw === "VILLAGE") {
    return "VILLAGE_LEAD";
  }
  if (raw === "RELIEF_CAMP" || raw === "CAMP") {
    return "RELIEF_CAMP";
  }
  if (raw === "CITIZEN_SOS" || raw === "SOS" || raw === "CITIZEN") {
    return "CITIZEN_SOS";
  }
  return "CITIZEN_SOS";
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function resolveVillage(
  input: UnknownRecord,
  villages: VillageLookup[],
): VillageLookup | null {
  const villageId = asString(input.villageId || input.village_id || input.vilId);
  if (villageId) {
    const byId = villages.find((village) => village.id === villageId);
    if (byId) return byId;
  }

  const villageName = asString(
    input.villageName || input.village_name || input.village || input.locationName,
  ).toLowerCase();
  if (villageName) {
    const byName = villages.find(
      (village) => village.name.toLowerCase() === villageName,
    );
    if (byName) return byName;
  }

  const lat = asNumber(input.lat ?? input.latitude ?? asRecord(input.gps).lat, NaN);
  const lng = asNumber(
    input.lng ?? input.longitude ?? asRecord(input.gps).lng,
    NaN,
  );
  if (Number.isFinite(lat) && Number.isFinite(lng) && villages.length > 0) {
    let best: VillageLookup | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const village of villages) {
      const distance = haversineKm({ lat, lng }, village.coordinates);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = village;
      }
    }
    if (best && bestDistance <= 25) return best;
  }

  return null;
}

function categoryFromChannelAndItem(
  channel: RequestChannel,
  itemName: string,
  explicitCategory: string,
): string {
  if (explicitCategory) return explicitCategory;
  const lower = itemName.toLowerCase();
  if (lower.includes("water") || lower.includes("sanitation") || lower.includes("ors")) {
    return "Water & Sanitation";
  }
  if (lower.includes("tarpaulin") || lower.includes("shelter") || lower.includes("tent")) {
    return "Shelter";
  }
  if (lower.includes("meal") || lower.includes("ration") || lower.includes("food")) {
    return "Food & Nutrition";
  }
  if (lower.includes("medic") || lower.includes("first aid")) {
    return "Medical";
  }
  if (channel === "RELIEF_CAMP") return "Camp Supplies";
  if (channel === "CITIZEN_SOS") return "Emergency SOS";
  return "General Relief";
}

/**
 * Normalize heterogeneous multi-channel payloads into RawReliefRequest.
 */
export function normalizeRawRequest(
  input: unknown,
  villages: VillageLookup[] = [],
): RawReliefRequest {
  const record = asRecord(input);
  const channel = normalizeChannel(
    record.sourceChannel || record.channel || record.source || record.type,
  );
  const village = resolveVillage(record, villages);

  const itemName = asString(
    record.itemName ||
      record.item ||
      record.reliefItem ||
      record.need ||
      record.commodity,
    "Unspecified Item",
  );

  const quantity = asNumber(
    record.requestedQuantity ||
      record.quantity ||
      record.qty ||
      record.amount ||
      record.count,
    1,
  );

  const unit = asString(record.unit || record.units || record.uom, "units");
  const requestedAt = asString(
    record.requestedAt || record.timestamp || record.createdAt || record.time,
    new Date().toISOString(),
  );

  const id = asString(
    record.id || record.requestId || record.messageId,
    `raw-${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  return {
    id,
    sourceChannel: channel,
    villageId: village?.id || asString(record.villageId, "unknown"),
    villageName: village?.name || asString(record.villageName, "Unknown Village"),
    revenueCircle:
      village?.revenueCircle || asString(record.revenueCircle, "Unknown Circle"),
    itemCategory: categoryFromChannelAndItem(
      channel,
      itemName,
      asString(record.itemCategory || record.category || record.sector),
    ),
    itemName,
    requestedQuantity: Math.max(0, Math.round(quantity)),
    unit,
    requestedAt: new Date(requestedAt).toISOString(),
    senderContact: asString(
      record.senderContact || record.contact || record.phone || record.mobile,
    ) || undefined,
    rawMessage: asString(record.rawMessage || record.message || record.text) || undefined,
  };
}
