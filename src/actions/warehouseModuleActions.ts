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
  aggregateWarehouseModule,
  hydrateWarehouse,
  isWarehouseFacilityType,
} from "@/lib/warehouse/model";
import type {
  WarehouseLocation,
  WarehouseModuleSnapshot,
  WarehouseStatus,
} from "@/types/warehouseModule";

function emptyWarehouseModuleSnapshot(): WarehouseModuleSnapshot {
  return {
    warehouses: [],
    districts: [],
    macro: {
      totalCapacityTons: 0,
      totalStockedTons: 0,
      totalOutstandingCapacityTons: 0,
      fillPercentage: 0,
      totalWarehousesCount: 0,
      districtCount: 0,
    },
    source: "firestore",
  };
}

function parseWarehouseDoc(
  data: Record<string, unknown>,
  fallbackId: string,
): WarehouseLocation | null {
  const warehouseId = isNonEmptyString(data.warehouseId)
    ? data.warehouseId
    : fallbackId;
  const warehouseName = data.warehouseName;
  const district = data.district;
  const revenueCircle = data.revenueCircle;
  const villageTown = data.villageTown;
  const address = data.address;
  const ownerName = data.ownerName;
  const pointOfContactName = data.pointOfContactName;
  const pointOfContactPhone = data.pointOfContactPhone;
  const facilityType = data.facilityType;
  const coordinates = data.coordinates as
    | { lat?: unknown; lng?: unknown }
    | undefined;
  const lat = coordinates?.lat ?? data.lat;
  const lng = coordinates?.lng ?? data.lng;
  const totalCapacityTons = data.totalCapacityTons;
  const currentStockTons = data.currentStockTons;
  const lastAuditedTimestamp = data.lastAuditedTimestamp;

  if (
    !isNonEmptyString(warehouseName) ||
    !isNonEmptyString(district) ||
    !isNonEmptyString(revenueCircle) ||
    !isNonEmptyString(villageTown) ||
    !isNonEmptyString(address) ||
    !isNonEmptyString(ownerName) ||
    !isNonEmptyString(pointOfContactName) ||
    !isNonEmptyString(pointOfContactPhone) ||
    !isWarehouseFacilityType(facilityType) ||
    !isFiniteNumber(lat) ||
    !isFiniteNumber(lng) ||
    !isFiniteNumber(totalCapacityTons) ||
    !isFiniteNumber(currentStockTons) ||
    !isNonEmptyString(lastAuditedTimestamp)
  ) {
    return null;
  }

  return hydrateWarehouse({
    warehouseId,
    warehouseName,
    facilityType,
    district,
    revenueCircle,
    villageTown,
    address,
    coordinates: { lat, lng },
    ownerName,
    pointOfContactName,
    pointOfContactPhone,
    totalCapacityTons,
    currentStockTons,
    capacityStatus:
      data.capacityStatus === "OFFLINE_FLOODED"
        ? "OFFLINE_FLOODED"
        : (data.capacityStatus as WarehouseStatus | undefined),
    lastAuditedTimestamp,
  });
}

/**
 * Fetch all warehouses via collectionGroup('warehouses') under
 * /districts/{districtId}/warehouses/{warehouseId}, aggregate district
 * sub-tile metrics server-side.
 */
export async function fetchWarehouseModuleSnapshot(): Promise<
  ActionResult<WarehouseModuleSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk(emptyWarehouseModuleSnapshot());
  }

  try {
    const snap = await db
      .collectionGroup(FIRESTORE_COLLECTIONS.warehouses)
      .get();

    const warehouses = snap.docs
      .map((doc) =>
        parseWarehouseDoc(doc.data() as Record<string, unknown>, doc.id),
      )
      .filter((entry): entry is WarehouseLocation => entry !== null);

    if (warehouses.length === 0) return actionOk(emptyWarehouseModuleSnapshot());

    const { districts, macro } = aggregateWarehouseModule(warehouses);
    return actionOk({
      warehouses,
      districts,
      macro,
      source: "firestore",
    });
  } catch (error) {
    console.error("fetchWarehouseModuleSnapshot failed", error);
    return actionOk(emptyWarehouseModuleSnapshot());
  }
}

export async function fetchWarehousesByDistrict(
  district: string,
): Promise<ActionResult<WarehouseLocation[]>> {
  if (!isNonEmptyString(district)) {
    return actionFail("District is required.");
  }

  const result = await fetchWarehouseModuleSnapshot();
  if (!result.ok) return result;

  const filtered = result.data.warehouses.filter(
    (entry) => entry.district.toLowerCase() === district.trim().toLowerCase(),
  );
  return actionOk(filtered);
}

/**
 * Persist an audited stock level for a warehouse document.
 */
export async function auditWarehouseStock(input: {
  warehouseId: string;
  district: string;
  currentStockTons: number;
}): Promise<ActionResult<WarehouseLocation>> {
  if (!isNonEmptyString(input.warehouseId)) {
    return actionFail("Warehouse ID is required.");
  }
  if (!isNonEmptyString(input.district)) {
    return actionFail("District is required.");
  }
  if (!isFiniteNumber(input.currentStockTons) || input.currentStockTons < 0) {
    return actionFail("Current stock must be a non-negative number.");
  }

  const snapshot = await fetchWarehouseModuleSnapshot();
  if (!snapshot.ok) return snapshot;

  const existing = snapshot.data.warehouses.find(
    (entry) => entry.warehouseId === input.warehouseId,
  );
  if (!existing) {
    return actionFail("Warehouse not found.");
  }

  const next = hydrateWarehouse({
    ...existing,
    currentStockTons: Math.min(
      input.currentStockTons,
      existing.totalCapacityTons,
    ),
    capacityStatus:
      existing.capacityStatus === "OFFLINE_FLOODED"
        ? "OFFLINE_FLOODED"
        : undefined,
    lastAuditedTimestamp: new Date().toISOString(),
  });

  const db = tryGetAdminFirestore();
  if (!db) {
    return actionFail("Firebase Admin is not configured.");
  }

  try {
    const districtId =
      existing.districtId || slugifyDistrictId(input.district);
    await db
      .collection(FIRESTORE_COLLECTIONS.districts)
      .doc(districtId)
      .collection(FIRESTORE_COLLECTIONS.warehouses)
      .doc(input.warehouseId)
      .set(next, { merge: true });
    return actionOk(next, "Warehouse stock audit saved.");
  } catch (error) {
    console.error("auditWarehouseStock failed", error);
    return actionFail("Could not save warehouse stock audit.");
  }
}
