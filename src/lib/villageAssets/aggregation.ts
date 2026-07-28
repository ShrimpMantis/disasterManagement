import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
  VillageAssetSummary,
} from "@/types/villageAssets";

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Approximate great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function buildVillageAssetSummaries(
  villages: Array<{
    id: string;
    name: string;
    revenueCircle: string;
    district: string;
    gaonBurhaOrPradhan?: string;
    coordinates: { lat: number; lng: number };
  }>,
  boats: CountryBoatOwner[],
  highLands: HighLandZone[],
  camps: ReliefCampFacility[],
): VillageAssetSummary[] {
  const openCamps = camps.filter(
    (camp) => camp.status !== "CLOSED" && camp.coordinates,
  );

  return villages.map((village) => {
    const villageBoats = boats.filter((boat) => boat.villageId === village.id);
    const villageHighLands = highLands.filter(
      (zone) => zone.villageId === village.id,
    );
    const safeHighLands = villageHighLands.filter(
      (zone) => zone.accessRouteStatus !== "INACCESSIBLE",
    );

    let nearestReliefCampName = "—";
    let nearestReliefCampDistanceKm: number | null = null;
    let campCapacityRemaining = 0;

    for (const camp of openCamps) {
      if (!camp.coordinates) continue;
      const distance = haversineKm(village.coordinates, camp.coordinates);
      if (
        nearestReliefCampDistanceKm === null ||
        distance < nearestReliefCampDistanceKm
      ) {
        nearestReliefCampDistanceKm = distance;
        nearestReliefCampName = camp.campName;
        campCapacityRemaining = Math.max(
          0,
          camp.maxCapacityPersons - camp.currentOccupancy,
        );
      }
    }

    return {
      villageId: village.id,
      villageName: village.name,
      revenueCircle: village.revenueCircle,
      district: village.district,
      gaonBurhaOrPradhan: village.gaonBurhaOrPradhan?.trim() || "—",
      availableBoats: villageBoats.filter((boat) => boat.status === "AVAILABLE")
        .length,
      totalBoats: villageBoats.length,
      safeHighLands: safeHighLands.length,
      totalHighLands: villageHighLands.length,
      nearestReliefCampName,
      nearestReliefCampDistanceKm:
        nearestReliefCampDistanceKm === null
          ? null
          : Math.round(nearestReliefCampDistanceKm * 10) / 10,
      campCapacityRemaining,
    };
  });
}

export function getAssetSummaryByVillageId(
  summaries: VillageAssetSummary[],
): Map<string, VillageAssetSummary> {
  return new Map(summaries.map((summary) => [summary.villageId, summary]));
}
