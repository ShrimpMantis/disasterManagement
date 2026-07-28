import type {
  DistrictVillageCoverageSummary,
  VillageDemandMetric,
  VillageItemDemand,
  VillageServiceStatus,
} from "@/types/villageCoordination";

export function computeServiceStatus(
  demands: VillageItemDemand[],
): { status: VillageServiceStatus; fulfillmentPercentage: number } {
  const assessed = demands.reduce((sum, d) => sum + d.quantityAssessed, 0);
  const delivered = demands.reduce((sum, d) => sum + d.quantityDelivered, 0);
  if (assessed <= 0) {
    return { status: "FULLY_SERVED", fulfillmentPercentage: 100 };
  }
  const pct = Math.round((delivered / assessed) * 1000) / 10;
  if (pct <= 0) return { status: "UNSERVED", fulfillmentPercentage: 0 };
  if (pct >= 100) return { status: "FULLY_SERVED", fulfillmentPercentage: 100 };
  return { status: "PARTIALLY_SERVED", fulfillmentPercentage: pct };
}

export function buildDistrictCoverageSummaries(
  villages: VillageDemandMetric[],
): DistrictVillageCoverageSummary[] {
  const byDistrict = new Map<string, VillageDemandMetric[]>();
  for (const village of villages) {
    const list = byDistrict.get(village.district) ?? [];
    list.push(village);
    byDistrict.set(village.district, list);
  }

  return Array.from(byDistrict.entries())
    .map(([districtName, list]) => {
      const villagesServedCount = list.filter(
        (entry) => entry.serviceStatus === "FULLY_SERVED",
      ).length;
      const villagesPartiallyServedCount = list.filter(
        (entry) => entry.serviceStatus === "PARTIALLY_SERVED",
      ).length;
      const villagesUnservedCount = list.filter(
        (entry) => entry.serviceStatus === "UNSERVED",
      ).length;
      const totalVillagesAffected = list.length;
      return {
        districtName,
        totalVillagesAffected,
        villagesServedCount,
        villagesPartiallyServedCount,
        villagesUnservedCount,
        coveragePercentage:
          totalVillagesAffected > 0
            ? Math.round(
                (villagesServedCount / totalVillagesAffected) * 1000,
              ) / 10
            : 0,
      };
    })
    .sort((a, b) => a.districtName.localeCompare(b.districtName));
}
