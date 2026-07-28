"use server";

import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import { slugifyDistrictId } from "@/lib/firestore/geohash";
import {
  buildDistrictCoverageSummaries,
  computeServiceStatus,
} from "@/lib/ngo/villageDemandAnalytics";
import type {
  DistrictVillageCoverageSummary,
  VillageDemandCategory,
  VillageDemandMetric,
  VillageItemDemand,
  VillageServiceStatus,
} from "@/types/villageCoordination";
import { DEMAND_CATEGORY_LABELS } from "@/types/villageCoordination";

const SERVICE_STATUSES: VillageServiceStatus[] = [
  "UNSERVED",
  "PARTIALLY_SERVED",
  "FULLY_SERVED",
];

function isServiceStatus(value: unknown): value is VillageServiceStatus {
  return (
    typeof value === "string" &&
    SERVICE_STATUSES.includes(value as VillageServiceStatus)
  );
}

/** Map Firestore/assessment category aliases onto chart categories. */
function normalizeDemandCategory(raw: unknown): VillageDemandCategory | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim().toUpperCase().replace(/\s+/g, "_");

  if (value === "FOOD" || value === "FOOD_RATIONS" || value === "DRY_RATIONS") {
    return "FOOD_RATIONS";
  }
  if (value === "WATER" || value === "WATER_CANS" || value === "WATER_CAN") {
    return "WATER_CANS";
  }
  if (
    value === "MEDICAL" ||
    value === "MEDICAL_KITS" ||
    value === "MEDICINE" ||
    value === "MEDICAL_KIT"
  ) {
    return "MEDICAL_KITS";
  }
  if (
    value === "SHELTER" ||
    value === "TARPAULINS" ||
    value === "TARP" ||
    value === "TARPS"
  ) {
    return "TARPAULINS";
  }

  return null;
}

function parseDemandEntries(raw: unknown): VillageItemDemand[] {
  if (!Array.isArray(raw)) return [];

  const demands: VillageItemDemand[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const category = normalizeDemandCategory(record.category);
    if (!category) continue;

    const assessed = isFiniteNumber(record.quantityAssessed)
      ? Math.max(0, record.quantityAssessed)
      : 0;
    const deliveredRaw = isFiniteNumber(record.quantityDelivered)
      ? Math.max(0, record.quantityDelivered)
      : 0;
    const delivered = Math.min(assessed, deliveredRaw);
    const inTransitRaw = isFiniteNumber(record.quantityInTransit)
      ? Math.max(0, record.quantityInTransit)
      : 0;
    const inTransit = Math.min(Math.max(0, assessed - delivered), inTransitRaw);
    const pledgedRaw = isFiniteNumber(record.quantityPledged)
      ? Math.max(0, record.quantityPledged)
      : delivered + inTransit;
    const pledged = Math.min(
      assessed,
      Math.max(delivered + inTransit, pledgedRaw),
    );
    const displayName =
      isNonEmptyString(record.displayName)
        ? record.displayName
        : DEMAND_CATEGORY_LABELS[category];

    demands.push({
      category,
      displayName,
      quantityAssessed: assessed,
      quantityPledged: pledged,
      quantityDelivered: delivered,
      quantityInTransit: inTransit,
      quantityPending: Math.max(0, assessed - delivered - inTransit),
    });
  }
  return demands;
}

function parseVillageDoc(
  data: Record<string, unknown>,
  fallbackId: string,
  fallbackDistrict?: string,
): VillageDemandMetric | null {
  const villageId = isNonEmptyString(data.villageId)
    ? data.villageId
    : isNonEmptyString(data.id)
      ? data.id
      : fallbackId;
  const villageName =
    (isNonEmptyString(data.villageName) && data.villageName) ||
    (isNonEmptyString(data.name) && data.name) ||
    "";
  const revenueCircle = isNonEmptyString(data.revenueCircle)
    ? data.revenueCircle
    : "";
  const district =
    (isNonEmptyString(data.district) && data.district) ||
    (fallbackDistrict ?? "");

  if (!villageName || !revenueCircle || !district) return null;

  const demands = parseDemandEntries(data.demands);
  const computed = computeServiceStatus(demands);
  const serviceStatus = isServiceStatus(data.serviceStatus)
    ? data.serviceStatus
    : computed.status;

  return {
    villageId,
    villageName,
    revenueCircle,
    district,
    serviceStatus,
    demands,
    fulfillmentPercentage: computed.fulfillmentPercentage,
    lastDispatchedTimestamp: isNonEmptyString(data.lastDispatchedTimestamp)
      ? data.lastDispatchedTimestamp
      : undefined,
  };
}

export type VillageCoverageSource = "firestore" | "empty";

export type DistrictCoverageSummariesPayload = {
  districts: DistrictVillageCoverageSummary[];
  source: VillageCoverageSource;
};

export type VillageDemandsPayload = {
  villages: VillageDemandMetric[];
  source: VillageCoverageSource;
};

/**
 * collectionGroup('villages') → aggregate FULLY_SERVED / PARTIALLY_SERVED /
 * UNSERVED counts by district for the overview chart.
 */
export async function getDistrictVillageCoverageSummaries(): Promise<
  ActionResult<DistrictCoverageSummariesPayload>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({
      districts: [],
      source: "empty",
    });
  }

  try {
    const snap = await db
      .collectionGroup(FIRESTORE_COLLECTIONS.villages)
      .get();

    const villages = snap.docs
      .map((doc) =>
        parseVillageDoc(doc.data() as Record<string, unknown>, doc.id),
      )
      .filter((entry): entry is VillageDemandMetric => entry !== null);

    return actionOk({
      districts: buildDistrictCoverageSummaries(villages),
      source: "firestore",
    });
  } catch (error) {
    console.error("getDistrictVillageCoverageSummaries failed", error);
    return actionOk({
      districts: [],
      source: "empty",
    });
  }
}

/**
 * districts/{districtId}/villages → VillageDemandMetric[] with
 * quantityPending = max(0, quantityAssessed - quantityDelivered).
 */
export async function getVillageDemandsByDistrict(
  districtId: string,
): Promise<ActionResult<VillageDemandsPayload>> {
  if (!isNonEmptyString(districtId)) {
    return actionFail("District ID is required.");
  }

  const normalizedId = slugifyDistrictId(districtId);
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({
      villages: [],
      source: "empty",
    });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.districts)
      .doc(normalizedId)
      .collection(FIRESTORE_COLLECTIONS.villages)
      .get();

    let villages = snap.docs
      .map((doc) =>
        parseVillageDoc(
          doc.data() as Record<string, unknown>,
          doc.id,
          districtId,
        ),
      )
      .filter((entry): entry is VillageDemandMetric => entry !== null);

    if (villages.length === 0) {
      const allSnap = await db
        .collectionGroup(FIRESTORE_COLLECTIONS.villages)
        .get();
      villages = allSnap.docs
        .map((doc) =>
          parseVillageDoc(doc.data() as Record<string, unknown>, doc.id),
        )
        .filter((entry): entry is VillageDemandMetric => entry !== null)
        .filter(
          (entry) =>
            entry.district === districtId ||
            slugifyDistrictId(entry.district) === normalizedId,
        );
    }

    return actionOk({ villages, source: "firestore" });
  } catch (error) {
    console.error("getVillageDemandsByDistrict failed", error);
    return actionOk({
      villages: [],
      source: "empty",
    });
  }
}
