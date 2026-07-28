import type { VillageGeoNode } from "@/types/geo";
import type { MapBoundsLiteral, MapMarkerData, SosAlert } from "@/types/map";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function getGoogleMapsMapId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
}

export function pointInBounds(
  lat: number,
  lng: number,
  bounds: MapBoundsLiteral | null,
): boolean {
  if (!bounds) return true;
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
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

export function villageMarkersFromSeeds(
  villages: Array<{
    id: string;
    name: string;
    revenueCircle: string;
    district: string;
    coordinates: { lat: number; lng: number };
    coverageStatus?: VillageGeoNode["coverageStatus"];
  }> = [],
): MapMarkerData[] {
  return villages.map((village) => {
    const severity =
      village.coverageStatus === "UNSERVED_CRITICAL"
        ? ("CRITICAL" as const)
        : village.coverageStatus === "PARTIALLY_SERVED"
          ? ("HIGH" as const)
          : village.coverageStatus === "SERVED"
            ? ("SAFE" as const)
            : ("MEDIUM" as const);

    return {
      id: `village-${village.id}`,
      type: "VILLAGE",
      title: village.name,
      lat: village.coordinates.lat,
      lng: village.coordinates.lng,
      statusSeverity: severity,
      metadata: {
        villageId: village.id,
        revenueCircle: village.revenueCircle,
        district: village.district,
      },
    };
  });
}

export function highLandMarkers(zones: HighLandZone[]): MapMarkerData[] {
  return zones.map((zone) => ({
    id: zone.id,
    type: "HIGH_LAND",
    title: zone.zoneName,
    lat: zone.coordinates.lat,
    lng: zone.coordinates.lng,
    statusSeverity:
      zone.accessRouteStatus === "CLEAR"
        ? "SAFE"
        : zone.accessRouteStatus === "WATERLOGGED"
          ? "HIGH"
          : "CRITICAL",
    metadata: {
      villageId: zone.villageId,
      villageName: zone.villageName,
      elevation: zone.elevationMetersAboveSea,
      capacity: zone.holdingCapacityPersons,
      helipad: zone.hasHelipadSuitability,
      access: zone.accessRouteStatus,
    },
  }));
}

export function reliefCampMarkers(camps: ReliefCampFacility[]): MapMarkerData[] {
  return camps
    .filter((camp) => camp.coordinates)
    .map((camp) => {
      const occupancyPct =
        camp.maxCapacityPersons > 0
          ? (camp.currentOccupancy / camp.maxCapacityPersons) * 100
          : 0;
      return {
        id: camp.id,
        type: "RELIEF_CAMP" as const,
        title: camp.campName,
        lat: camp.coordinates!.lat,
        lng: camp.coordinates!.lng,
        statusSeverity:
          occupancyPct >= 100
            ? ("CRITICAL" as const)
            : occupancyPct >= 80
              ? ("HIGH" as const)
              : ("SAFE" as const),
        metadata: {
          villageId: camp.villageId,
          occupancyPct: Math.round(occupancyPct),
          occupancy: camp.currentOccupancy,
          capacity: camp.maxCapacityPersons,
          status: camp.status,
          inCharge: camp.inChargeName,
          phone: camp.inChargePhone,
        },
      };
    });
}

/** Approximate boat pin near village center with slight offset by index. */
export function boatMarkers(boats: CountryBoatOwner[]): MapMarkerData[] {
  const countByVillage = new Map<string, number>();
  return boats.map((boat) => {
    const index = countByVillage.get(boat.villageId) ?? 0;
    countByVillage.set(boat.villageId, index + 1);
    const base = boat.coordinates ?? { lat: 26.75, lng: 94.2 };
    const offset = (index - 1) * 0.008;
    return {
      id: boat.id,
      type: "BOAT" as const,
      title: boat.ownerName,
      lat: base.lat + offset,
      lng: base.lng + offset * 0.6,
      statusSeverity: boat.status === "AVAILABLE" ? "SAFE" : "HIGH",
      metadata: {
        villageId: boat.villageId,
        villageName: boat.villageName,
        phone: boat.primaryPhone,
        boatType: boat.boatType,
        status: boat.status,
        capacity: boat.passengerCapacity,
      },
    };
  });
}

export function sosMarkers(alerts: SosAlert[]): MapMarkerData[] {
  return alerts.map((alert) => ({
    id: alert.id,
    type: "SOS",
    title: `SOS · ${alert.citizenName}`,
    lat: alert.lat,
    lng: alert.lng,
    statusSeverity: alert.status === "OPEN" ? "CRITICAL" : "HIGH",
    metadata: {
      citizenName: alert.citizenName,
      phone: alert.phone,
      villageName: alert.villageName,
      message: alert.message,
      reportedAt: alert.reportedAt,
      status: alert.status,
    },
  }));
}

export function truckHubMarkers(
  trucks: Array<{
    id: string;
    operatorOrVendorName: string;
    operatingBaseLocation: string;
    status: string;
    truckCategory: string;
    primaryPhone: string;
    coordinates: { lat: number; lng: number };
  }>,
): MapMarkerData[] {
  return trucks.map((truck) => ({
    id: `truck-hub-${truck.id}`,
    type: "TRUCK_HUB",
    title: truck.operatingBaseLocation,
    lat: truck.coordinates.lat,
    lng: truck.coordinates.lng,
    statusSeverity: truck.status === "AVAILABLE" ? "SAFE" : "HIGH",
    metadata: {
      operator: truck.operatorOrVendorName,
      category: truck.truckCategory,
      status: truck.status,
      phone: truck.primaryPhone,
    },
  }));
}

export function volunteerCircleMarkers(
  deployments: Array<{
    revenueCircle: string;
    district: string;
    volunteersDeployed: number;
    lat: number;
    lng: number;
  }>,
): MapMarkerData[] {
  return deployments.map((entry) => ({
    id: `volunteer-${entry.revenueCircle}`,
    type: "VOLUNTEER",
    title: `${entry.revenueCircle} volunteers`,
    lat: entry.lat,
    lng: entry.lng,
    statusSeverity: entry.volunteersDeployed >= 150 ? "HIGH" : "MEDIUM",
    metadata: {
      revenueCircle: entry.revenueCircle,
      district: entry.district,
      volunteersDeployed: entry.volunteersDeployed,
    },
  }));
}
