import { slugifyDistrictId } from "@/lib/firestore/geohash";
import type {
  DistrictWarehouseSummary,
  WarehouseFacilityType,
  WarehouseLocation,
  WarehouseMacroSummary,
  WarehouseModuleSnapshot,
  WarehouseStatus,
} from "@/types/warehouseModule";

type WarehouseSeed = Omit<
  WarehouseLocation,
  | "districtId"
  | "outstandingCapacityTons"
  | "fillPercentage"
  | "capacityStatus"
> & {
  capacityStatus?: WarehouseStatus;
};

function deriveCapacityStatus(
  totalCapacityTons: number,
  currentStockTons: number,
  forced?: WarehouseStatus,
): WarehouseStatus {
  if (forced === "OFFLINE_FLOODED") return "OFFLINE_FLOODED";
  if (totalCapacityTons <= 0) return "OFFLINE_FLOODED";
  const fill = (currentStockTons / totalCapacityTons) * 100;
  if (currentStockTons <= 0) return "EMPTY";
  if (fill >= 95) return "FULL";
  if (fill >= 70) return "NEAR_CAPACITY";
  return "PARTIALLY_FILLED";
}

export function hydrateWarehouse(seed: WarehouseSeed): WarehouseLocation {
  const total = Math.max(0, seed.totalCapacityTons);
  const stock = Math.min(Math.max(0, seed.currentStockTons), total);
  const outstanding = Math.max(0, total - stock);
  const fillPercentage = total > 0 ? Math.round((stock / total) * 1000) / 10 : 0;
  return {
    ...seed,
    districtId: slugifyDistrictId(seed.district),
    totalCapacityTons: total,
    currentStockTons: stock,
    outstandingCapacityTons: outstanding,
    fillPercentage,
    capacityStatus: deriveCapacityStatus(total, stock, seed.capacityStatus),
  };
}

export function aggregateWarehouseModule(
  warehouses: WarehouseLocation[],
): Pick<WarehouseModuleSnapshot, "districts" | "macro"> {
  const byDistrict = new Map<string, WarehouseLocation[]>();
  for (const warehouse of warehouses) {
    const list = byDistrict.get(warehouse.district) ?? [];
    list.push(warehouse);
    byDistrict.set(warehouse.district, list);
  }

  const districts: DistrictWarehouseSummary[] = Array.from(byDistrict.entries())
    .map(([districtName, list]) => {
      const totalCapacityTons = list.reduce(
        (sum, entry) => sum + entry.totalCapacityTons,
        0,
      );
      const totalStockedTons = list.reduce(
        (sum, entry) => sum + entry.currentStockTons,
        0,
      );
      const totalOutstandingCapacityTons = list.reduce(
        (sum, entry) => sum + entry.outstandingCapacityTons,
        0,
      );
      const averageFillPercentage =
        totalCapacityTons > 0
          ? Math.round((totalStockedTons / totalCapacityTons) * 1000) / 10
          : 0;

      return {
        districtName,
        totalWarehousesCount: list.length,
        totalCapacityTons,
        totalStockedTons,
        totalOutstandingCapacityTons,
        averageFillPercentage,
        statusBreakdown: {
          criticalFullCount: list.filter(
            (entry) =>
              entry.capacityStatus !== "OFFLINE_FLOODED" &&
              entry.fillPercentage > 85,
          ).length,
          availableCount: list.filter(
            (entry) =>
              entry.capacityStatus !== "OFFLINE_FLOODED" &&
              entry.outstandingCapacityTons > 0,
          ).length,
          offlineFloodedCount: list.filter(
            (entry) => entry.capacityStatus === "OFFLINE_FLOODED",
          ).length,
        },
      };
    })
    .sort((a, b) => a.districtName.localeCompare(b.districtName));

  const totalCapacityTons = warehouses.reduce(
    (sum, entry) => sum + entry.totalCapacityTons,
    0,
  );
  const totalStockedTons = warehouses.reduce(
    (sum, entry) => sum + entry.currentStockTons,
    0,
  );
  const totalOutstandingCapacityTons = warehouses.reduce(
    (sum, entry) => sum + entry.outstandingCapacityTons,
    0,
  );

  const macro: WarehouseMacroSummary = {
    totalCapacityTons,
    totalStockedTons,
    totalOutstandingCapacityTons,
    fillPercentage:
      totalCapacityTons > 0
        ? Math.round((totalStockedTons / totalCapacityTons) * 1000) / 10
        : 0,
    totalWarehousesCount: warehouses.length,
    districtCount: districts.length,
  };

  return { districts, macro };
}

export function isWarehouseFacilityType(
  value: unknown,
): value is WarehouseFacilityType {
  return (
    value === "CENTRAL_HUB" ||
    value === "FIELD_STAGING" ||
    value === "TEMPORARY_SHELTER"
  );
}
