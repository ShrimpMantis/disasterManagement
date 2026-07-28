import { slugifyDistrictId } from "@/lib/firestore/geohash";
import type {
  ReliefCategoryVolume,
  ReliefFulfillmentSummary,
  ReliefKpiChartSegment,
  ReliefScopeOption,
} from "@/types/reliefKpi";
import { RELIEF_KPI_SEGMENT_COLORS } from "@/types/reliefKpi";
import type { VillageDemandMetric } from "@/types/villageCoordination";
import { DEMAND_CATEGORY_LABELS } from "@/types/villageCoordination";

const UNIT_LABELS: Record<string, string> = {
  FOOD_RATIONS: "packs",
  WATER_CANS: "cans",
  MEDICAL_KITS: "kits",
  TARPAULINS: "sheets",
  FOOD: "packs",
  WATER: "cans",
  MEDICAL: "kits",
  SHELTER: "sheets",
};

export function buildScopeOptions(
  villages: VillageDemandMetric[],
): ReliefScopeOption[] {
  const options: ReliefScopeOption[] = [
    { id: "ALL", label: "All districts", kind: "ALL" },
  ];

  const districts = Array.from(
    new Set(villages.map((entry) => entry.district)),
  ).sort((a, b) => a.localeCompare(b));

  for (const district of districts) {
    options.push({
      id: `district:${slugifyDistrictId(district)}`,
      label: district,
      kind: "DISTRICT",
      districtId: slugifyDistrictId(district),
    });
  }

  const circles = Array.from(
    new Map(
      villages.map((entry) => [
        `${entry.district}::${entry.revenueCircle}`,
        entry,
      ]),
    ).values(),
  ).sort((a, b) =>
    `${a.district} ${a.revenueCircle}`.localeCompare(
      `${b.district} ${b.revenueCircle}`,
    ),
  );

  for (const entry of circles) {
    options.push({
      id: `circle:${slugifyDistrictId(entry.district)}:${slugifyDistrictId(entry.revenueCircle)}`,
      label: `${entry.revenueCircle} (${entry.district})`,
      kind: "REVENUE_CIRCLE",
      districtId: slugifyDistrictId(entry.district),
    });
  }

  return options;
}

export function filterVillagesForScope(
  villages: VillageDemandMetric[],
  scopeId?: string | null,
): { filtered: VillageDemandMetric[]; scopeLabel: string; districtId: string; districtName: string } {
  if (!scopeId || scopeId === "ALL") {
    return {
      filtered: villages,
      scopeLabel: "All districts",
      districtId: "all",
      districtName: "All districts",
    };
  }

  if (scopeId.startsWith("district:")) {
    const districtId = scopeId.slice("district:".length);
    const filtered = villages.filter(
      (entry) => slugifyDistrictId(entry.district) === districtId,
    );
    const districtName = filtered[0]?.district ?? districtId;
    return {
      filtered,
      scopeLabel: districtName,
      districtId,
      districtName,
    };
  }

  if (scopeId.startsWith("circle:")) {
    const [, districtId, circleId] = scopeId.split(":");
    const filtered = villages.filter(
      (entry) =>
        slugifyDistrictId(entry.district) === districtId &&
        slugifyDistrictId(entry.revenueCircle) === circleId,
    );
    const label = filtered[0]
      ? `${filtered[0].revenueCircle} (${filtered[0].district})`
      : scopeId;
    return {
      filtered,
      scopeLabel: label,
      districtId: districtId ?? "all",
      districtName: filtered[0]?.district ?? "All districts",
    };
  }

  // Treat bare district name / slug
  const needle = scopeId.trim().toLowerCase();
  const filtered = villages.filter(
    (entry) =>
      slugifyDistrictId(entry.district) === needle ||
      entry.district.toLowerCase() === needle,
  );
  const districtName = filtered[0]?.district ?? scopeId;
  return {
    filtered,
    scopeLabel: districtName,
    districtId: slugifyDistrictId(districtName),
    districtName,
  };
}

export function aggregateReliefFulfillment(
  villages: VillageDemandMetric[],
  scopeId?: string | null,
  source: ReliefFulfillmentSummary["source"] = "firestore",
): ReliefFulfillmentSummary {
  const scopeOptions = buildScopeOptions(villages);
  const { filtered, scopeLabel, districtId, districtName } =
    filterVillagesForScope(villages, scopeId);

  let totalAssessedDemandUnits = 0;
  let totalDeliveredUnits = 0;
  let totalInTransitUnits = 0;
  let totalPendingUnits = 0;

  const categoryMap = new Map<
    string,
    {
      displayName: string;
      unitLabel: string;
      assessed: number;
      pledged: number;
      delivered: number;
      inTransit: number;
      pending: number;
    }
  >();

  for (const village of filtered) {
    for (const demand of village.demands) {
      totalAssessedDemandUnits += demand.quantityAssessed;
      totalDeliveredUnits += demand.quantityDelivered;
      totalInTransitUnits += demand.quantityInTransit;
      totalPendingUnits += demand.quantityPending;

      const existing = categoryMap.get(demand.category) ?? {
        displayName:
          demand.displayName ||
          DEMAND_CATEGORY_LABELS[
            demand.category as keyof typeof DEMAND_CATEGORY_LABELS
          ] ||
          demand.category,
        unitLabel: UNIT_LABELS[demand.category] ?? "units",
        assessed: 0,
        pledged: 0,
        delivered: 0,
        inTransit: 0,
        pending: 0,
      };
      existing.assessed += demand.quantityAssessed;
      existing.pledged += demand.quantityPledged;
      existing.delivered += demand.quantityDelivered;
      existing.inTransit += demand.quantityInTransit;
      existing.pending += demand.quantityPending;
      categoryMap.set(demand.category, existing);
    }
  }

  const overallFulfillmentPercentage =
    totalAssessedDemandUnits > 0
      ? Math.round(
          (totalDeliveredUnits / totalAssessedDemandUnits) * 1000,
        ) / 10
      : 0;

  const chartSegments: ReliefKpiChartSegment[] = [
    {
      name: "Fulfilled",
      value: totalDeliveredUnits,
      color: RELIEF_KPI_SEGMENT_COLORS.Fulfilled,
    },
    {
      name: "In-Transit",
      value: totalInTransitUnits,
      color: RELIEF_KPI_SEGMENT_COLORS["In-Transit"],
    },
    {
      name: "Pending",
      value: totalPendingUnits,
      color: RELIEF_KPI_SEGMENT_COLORS.Pending,
    },
  ];

  const categoryBreakdown: ReliefCategoryVolume[] = Array.from(
    categoryMap.entries(),
  )
    .map(([category, entry]) => ({
      category,
      displayName: entry.displayName,
      unitLabel: entry.unitLabel,
      quantityAssessed: entry.assessed,
      quantityPledged: entry.pledged,
      quantityDelivered: entry.delivered,
      quantityInTransit: entry.inTransit,
      quantityPending: entry.pending,
      fulfillmentPercentage:
        entry.assessed > 0
          ? Math.round((entry.delivered / entry.assessed) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    districtId,
    districtName,
    scopeLabel,
    totalAssessedDemandUnits,
    totalDeliveredUnits,
    totalInTransitUnits,
    totalPendingUnits,
    overallFulfillmentPercentage,
    chartSegments,
    categoryBreakdown,
    scopeOptions,
    source,
  };
}
