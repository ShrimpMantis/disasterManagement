export type MapLayerToggle =
  | "VILLAGE_BOUNDARIES"
  | "HIGH_LANDS"
  | "RELIEF_CAMPS"
  | "COUNTRY_BOATS"
  | "SOS_ALERTS"
  | "HAZARD_INUNDATION"
  | "TRUCK_HUBS"
  | "VOLUNTEER_CIRCLES";

export type MapMarkerType =
  | "VILLAGE"
  | "HIGH_LAND"
  | "RELIEF_CAMP"
  | "BOAT"
  | "SOS"
  | "WAREHOUSE"
  | "TRUCK_HUB"
  | "VOLUNTEER";

export type StatusSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";

export type MapViewMode = "roadmap" | "terrain" | "satellite" | "hybrid";

export interface MapLatLng {
  lat: number;
  lng: number;
}

export interface MapBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarkerData {
  id: string;
  type: MapMarkerType;
  title: string;
  lat: number;
  lng: number;
  statusSeverity?: StatusSeverity;
  metadata: Record<string, string | number | boolean | null | undefined>;
}

export interface InundationPolygon {
  id: string;
  name: string;
  waterLevelMeters: number;
  coordinates: MapLatLng[];
}

export interface SosAlert {
  id: string;
  citizenName: string;
  phone: string;
  villageName: string;
  message: string;
  reportedAt: string;
  lat: number;
  lng: number;
  status: "OPEN" | "DISPATCHED" | "RESOLVED";
}

export interface DispatchRouteEndpoints {
  origin: MapLatLng & { label: string };
  destination: MapLatLng & { label: string };
}

export const MAP_LAYER_LABELS: Record<MapLayerToggle, string> = {
  VILLAGE_BOUNDARIES: "Villages",
  HIGH_LANDS: "High Lands",
  RELIEF_CAMPS: "Relief Camps",
  COUNTRY_BOATS: "Country Boats",
  SOS_ALERTS: "SOS Pins",
  HAZARD_INUNDATION: "Hazard Zones",
  TRUCK_HUBS: "Truck Hubs",
  VOLUNTEER_CIRCLES: "Volunteer Circles",
};

export const DEFAULT_MAP_CENTER: MapLatLng = { lat: 26.75, lng: 93.5 };
export const DEFAULT_MAP_ZOOM = 7.2;
