"use server";

import { FieldValue } from "firebase-admin/firestore";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import { withComputedCoverage } from "@/lib/ngo/coverage";
import { slugifyDistrictId } from "@/lib/firestore/geohash";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type { CoverageStatus, VillageGeoNode } from "@/types/geo";
import type { NGOProfile } from "@/types/ngo";
import type { SupplyPledge } from "@/types/pledge";

type VillageDoc = {
  villageId?: string;
  villageName?: string;
  revenueCircle?: string;
  district?: string;
  population?: number;
  unmetNeedsCount?: number;
  assignedNGOIds?: unknown;
  serviceStatus?: string;
  coverageStatus?: string;
  coordinates?: { lat?: number; lng?: number };
  demands?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function mapCoverageStatus(raw: string | undefined): CoverageStatus {
  if (raw === "SERVED" || raw === "FULLY_SERVED") return "SERVED";
  if (raw === "PARTIALLY_SERVED") return "PARTIALLY_SERVED";
  return "UNSERVED_CRITICAL";
}

function deriveUnmetNeedsCount(demands: unknown): number {
  if (!Array.isArray(demands)) return 0;
  return demands.reduce((sum: number, entry) => {
    if (!entry || typeof entry !== "object") return sum;
    const record = entry as Record<string, unknown>;
    const assessed =
      typeof record.quantityAssessed === "number" &&
      Number.isFinite(record.quantityAssessed)
        ? Math.max(0, record.quantityAssessed)
        : 0;
    const delivered =
      typeof record.quantityDelivered === "number" &&
      Number.isFinite(record.quantityDelivered)
        ? Math.max(0, record.quantityDelivered)
        : 0;
    const inTransit =
      typeof record.quantityInTransit === "number" &&
      Number.isFinite(record.quantityInTransit)
        ? Math.max(0, record.quantityInTransit)
        : 0;
    return sum + Math.max(0, assessed - delivered - inTransit);
  }, 0);
}

function mapVillageDoc(raw: VillageDoc): VillageGeoNode | null {
  if (
    !raw.villageId ||
    !raw.villageName ||
    !raw.revenueCircle ||
    !raw.district ||
    !raw.coordinates ||
    typeof raw.coordinates.lat !== "number" ||
    typeof raw.coordinates.lng !== "number"
  ) {
    return null;
  }

  return withComputedCoverage({
    id: raw.villageId,
    name: raw.villageName,
    revenueCircle: raw.revenueCircle,
    district: raw.district,
    population: Math.max(0, Number(raw.population) || 0),
    unmetNeedsCount:
      typeof raw.unmetNeedsCount === "number"
        ? Math.max(0, raw.unmetNeedsCount)
        : deriveUnmetNeedsCount(raw.demands),
    assignedNGOIds: asStringArray(raw.assignedNGOIds),
    coverageStatus:
      raw.coverageStatus === "SERVED" ||
      raw.coverageStatus === "PARTIALLY_SERVED" ||
      raw.coverageStatus === "UNSERVED_CRITICAL"
        ? raw.coverageStatus
        : mapCoverageStatus(raw.serviceStatus),
    coordinates: {
      lat: raw.coordinates.lat,
      lng: raw.coordinates.lng,
    },
  });
}

function mapSupplyPledge(raw: Record<string, unknown>): SupplyPledge | null {
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.ngoId)) return null;
  if (!isFiniteNumber(raw.quantityPledged)) return null;

  return {
    id: raw.id,
    ngoId: raw.ngoId,
    ngoName: isNonEmptyString(raw.ngoName) ? raw.ngoName : "NGO",
    reliefItemCategory: isNonEmptyString(raw.reliefItemCategory)
      ? raw.reliefItemCategory
      : "Relief item",
    unit: isNonEmptyString(raw.unit) ? raw.unit : "units",
    quantityPledged: Math.max(0, raw.quantityPledged),
    quantityInTransit: isFiniteNumber(raw.quantityInTransit)
      ? Math.max(0, raw.quantityInTransit)
      : 0,
    quantityDelivered: isFiniteNumber(raw.quantityDelivered)
      ? Math.max(0, raw.quantityDelivered)
      : 0,
    estimatedArrival: isNonEmptyString(raw.estimatedArrival)
      ? raw.estimatedArrival
      : new Date().toISOString(),
    lastDeliveryTimestamp: isNonEmptyString(raw.lastDeliveryTimestamp)
      ? raw.lastDeliveryTimestamp
      : undefined,
  };
}

export type NgoCoordinationSnapshot = {
  ngos: NGOProfile[];
  villages: VillageGeoNode[];
  pledges: SupplyPledge[];
};

export async function fetchNgoCoordinationSnapshot(): Promise<
  ActionResult<NgoCoordinationSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ ngos: [], villages: [], pledges: [] });
  }

  try {
    const [ngoSnap, villageSnap, pledgeSnap] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.ngos).get(),
      db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get(),
      db.collection(FIRESTORE_COLLECTIONS.pledges).get(),
    ]);

    const ngos = ngoSnap.docs
      .map((doc) => doc.data() as NGOProfile)
      .filter((entry) => isNonEmptyString(entry.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const villages = villageSnap.docs
      .map((doc) => mapVillageDoc(doc.data() as VillageDoc))
      .filter((entry): entry is VillageGeoNode => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const pledges = pledgeSnap.docs
      .map((doc) => mapSupplyPledge(doc.data() as Record<string, unknown>))
      .filter((entry): entry is SupplyPledge => entry !== null)
      .sort(
        (a, b) =>
          Date.parse(a.estimatedArrival) - Date.parse(b.estimatedArrival),
      );

    return actionOk({ ngos, villages, pledges });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load NGO coordination data.",
    );
  }
}

export async function assignNgoToVillage(input: {
  villageId: string;
  district: string;
  ngoId: string;
}): Promise<
  ActionResult<{
    villageId: string;
    ngoId: string;
    assignedNGOIds: string[];
    assignedVillageIds: string[];
  }>
> {
  if (!isNonEmptyString(input.villageId)) {
    return actionFail("Village ID is required.");
  }
  if (!isNonEmptyString(input.ngoId)) {
    return actionFail("NGO ID is required.");
  }
  if (!isNonEmptyString(input.district)) {
    return actionFail("District is required.");
  }

  const db = tryGetAdminFirestore();
  if (!db) return actionFail("Firebase Admin is not configured.");

  try {
    const districtId = slugifyDistrictId(input.district);
    const villageRef = db
      .collection(FIRESTORE_COLLECTIONS.districts)
      .doc(districtId)
      .collection(FIRESTORE_COLLECTIONS.villages)
      .doc(input.villageId);
    const ngoRef = db.collection(FIRESTORE_COLLECTIONS.ngos).doc(input.ngoId);

    const result = await db.runTransaction(async (tx) => {
      const [villageSnap, ngoSnap] = await Promise.all([
        tx.get(villageRef),
        tx.get(ngoRef),
      ]);
      if (!villageSnap.exists) throw new Error("Village not found.");
      if (!ngoSnap.exists) throw new Error("NGO not found.");

      const village = villageSnap.data() as VillageDoc;
      const ngo = ngoSnap.data() as NGOProfile;
      const assignedNGOIds = Array.from(
        new Set([...asStringArray(village.assignedNGOIds), input.ngoId]),
      );
      const assignedVillageIds = Array.from(
        new Set([...(ngo.assignedVillageIds ?? []), input.villageId]),
      );

      tx.set(
        villageRef,
        {
          assignedNGOIds,
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(
        ngoRef,
        {
          assignedVillageIds,
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { assignedNGOIds, assignedVillageIds };
    });

    return actionOk(
      {
        villageId: input.villageId,
        ngoId: input.ngoId,
        assignedNGOIds: result.assignedNGOIds,
        assignedVillageIds: result.assignedVillageIds,
      },
      "NGO assigned to village.",
    );
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to assign NGO to village.",
    );
  }
}
