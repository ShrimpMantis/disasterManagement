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
import { aggregateReliefFulfillment } from "@/lib/dashboard/reliefKpi";
import { computeServiceStatus } from "@/lib/ngo/villageDemandAnalytics";
import type { ReliefFulfillmentSummary } from "@/types/reliefKpi";
import type {
  VillageDemandCategory,
  VillageDemandMetric,
  VillageItemDemand,
  VillageServiceStatus,
} from "@/types/villageCoordination";
import { DEMAND_CATEGORY_LABELS } from "@/types/villageCoordination";

function emptyReliefFulfillmentSummary(scopeId: string): ReliefFulfillmentSummary {
  return aggregateReliefFulfillment([], scopeId, "firestore");
}

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
    const delivered = Math.min(
      assessed,
      isFiniteNumber(record.quantityDelivered)
        ? Math.max(0, record.quantityDelivered)
        : 0,
    );
    const inTransit = Math.min(
      Math.max(0, assessed - delivered),
      isFiniteNumber(record.quantityInTransit)
        ? Math.max(0, record.quantityInTransit)
        : 0,
    );
    const pledged = Math.min(
      assessed,
      Math.max(
        delivered + inTransit,
        isFiniteNumber(record.quantityPledged)
          ? Math.max(0, record.quantityPledged)
          : delivered + inTransit,
      ),
    );

    demands.push({
      category,
      displayName: isNonEmptyString(record.displayName)
        ? record.displayName
        : DEMAND_CATEGORY_LABELS[category],
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
): VillageDemandMetric | null {
  const villageName =
    (isNonEmptyString(data.villageName) && data.villageName) ||
    (isNonEmptyString(data.name) && data.name) ||
    "";
  const revenueCircle = isNonEmptyString(data.revenueCircle)
    ? data.revenueCircle
    : "";
  const district = isNonEmptyString(data.district) ? data.district : "";
  if (!villageName || !revenueCircle || !district) return null;

  const demands = parseDemandEntries(data.demands);
  const computed = computeServiceStatus(demands);
  const serviceStatus =
    data.serviceStatus === "UNSERVED" ||
    data.serviceStatus === "PARTIALLY_SERVED" ||
    data.serviceStatus === "FULLY_SERVED"
      ? (data.serviceStatus as VillageServiceStatus)
      : computed.status;

  return {
    villageId: isNonEmptyString(data.villageId) ? data.villageId : fallbackId,
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

/**
 * Aggregate district-wide (or scoped) relief fulfillment KPI for the
 * dashboard donut tile. Pass `ALL` / omit for statewide collectionGroup.
 */
export async function getDistrictReliefFulfillmentKPI(
  districtId?: string,
): Promise<ActionResult<ReliefFulfillmentSummary>> {
  const scopeId =
    !districtId || districtId === "ALL" || districtId === "all"
      ? "ALL"
      : districtId.startsWith("district:") || districtId.startsWith("circle:")
        ? districtId
        : `district:${slugifyDistrictId(districtId)}`;

  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk(emptyReliefFulfillmentSummary(scopeId));
  }

  try {
    let snap;
    if (scopeId === "ALL") {
      snap = await db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get();
    } else if (scopeId.startsWith("district:")) {
      const id = scopeId.slice("district:".length);
      snap = await db
        .collection(FIRESTORE_COLLECTIONS.districts)
        .doc(id)
        .collection(FIRESTORE_COLLECTIONS.villages)
        .get();
    } else if (scopeId.startsWith("circle:")) {
      // Fetch district villages then filter by circle in memory
      const [, districtSlug] = scopeId.split(":");
      snap = await db
        .collection(FIRESTORE_COLLECTIONS.districts)
        .doc(districtSlug ?? "")
        .collection(FIRESTORE_COLLECTIONS.villages)
        .get();
    } else {
      snap = await db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get();
    }

    const villages = snap.docs
      .map((doc) =>
        parseVillageDoc(doc.data() as Record<string, unknown>, doc.id),
      )
      .filter((entry): entry is VillageDemandMetric => entry !== null);

    if (villages.length === 0) {
      return actionOk(emptyReliefFulfillmentSummary(scopeId));
    }

    return actionOk(
      aggregateReliefFulfillment(villages, scopeId, "firestore"),
    );
  } catch (error) {
    console.error("getDistrictReliefFulfillmentKPI failed", error);
    return actionOk(emptyReliefFulfillmentSummary(scopeId));
  }
}
/** Convenience list of scopes for the tile dropdown. */
export async function getReliefKpiScopeOptions(): Promise<
  ActionResult<ReliefFulfillmentSummary["scopeOptions"]>
> {
  const result = await getDistrictReliefFulfillmentKPI("ALL");
  if (!result.ok) return actionFail(result.error);
  return actionOk(result.data.scopeOptions);
}
