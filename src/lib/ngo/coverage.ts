import type { CoverageStatus, VillageGeoNode } from "@/types/geo";

/** Needs considered met when unmet needs are under 20% of population (>=80% covered). */
export function getNeedsMetPercent(village: VillageGeoNode): number {
  if (village.population <= 0) {
    return village.unmetNeedsCount <= 0 ? 100 : 0;
  }
  const unmetRatio = Math.min(1, village.unmetNeedsCount / village.population);
  return Math.round((1 - unmetRatio) * 100);
}

export function computeCoverageStatus(village: VillageGeoNode): CoverageStatus {
  const hasPartner = village.assignedNGOIds.length > 0;
  const needsMetPercent = getNeedsMetPercent(village);

  if (village.unmetNeedsCount > 0 && !hasPartner) {
    return "UNSERVED_CRITICAL";
  }

  if (hasPartner && needsMetPercent >= 80) {
    return "SERVED";
  }

  if (hasPartner) {
    return "PARTIALLY_SERVED";
  }

  return village.unmetNeedsCount > 0 ? "UNSERVED_CRITICAL" : "SERVED";
}

export function withComputedCoverage(village: VillageGeoNode): VillageGeoNode {
  return {
    ...village,
    coverageStatus: computeCoverageStatus(village),
  };
}

export type CoverageMetrics = {
  totalVillages: number;
  fullyCovered: number;
  partiallyCovered: number;
  criticalUnserved: number;
};

export function computeCoverageMetrics(villages: VillageGeoNode[]): CoverageMetrics {
  const computed = villages.map(withComputedCoverage);
  return {
    totalVillages: computed.length,
    fullyCovered: computed.filter((v) => v.coverageStatus === "SERVED").length,
    partiallyCovered: computed.filter((v) => v.coverageStatus === "PARTIALLY_SERVED").length,
    criticalUnserved: computed.filter((v) => v.coverageStatus === "UNSERVED_CRITICAL").length,
  };
}

export type MapPoint = VillageGeoNode & {
  xPercent: number;
  yPercent: number;
};

export function toMapPoints(villages: VillageGeoNode[]): MapPoint[] {
  if (villages.length === 0) return [];

  const lats = villages.map((v) => v.coordinates.lat);
  const lngs = villages.map((v) => v.coordinates.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(0.01, maxLat - minLat);
  const lngSpan = Math.max(0.01, maxLng - minLng);

  return villages.map((village) => {
    const xPercent = ((village.coordinates.lng - minLng) / lngSpan) * 80 + 10;
    const yPercent = (1 - (village.coordinates.lat - minLat) / latSpan) * 80 + 10;
    return {
      ...withComputedCoverage(village),
      xPercent,
      yPercent,
    };
  });
}
