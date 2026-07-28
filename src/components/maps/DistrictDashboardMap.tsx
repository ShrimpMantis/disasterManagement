"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  Polygon,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapLayerControls } from "@/components/maps/MapLayerControls";
import { MapMarkerLayer } from "@/components/maps/MapMarkerLayer";
import { MapsApiKeyMissing } from "@/components/maps/MapsApiProvider";
import {
  boatMarkers,
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  highLandMarkers,
  reliefCampMarkers,
  sosMarkers,
  truckHubMarkers,
  villageMarkersFromSeeds,
  volunteerCircleMarkers,
} from "@/lib/maps/markers";
import type {
  InundationPolygon,
  MapBoundsLiteral,
  MapLayerToggle,
  MapMarkerData,
  MapViewMode,
  SosAlert,
} from "@/types/map";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "@/types/map";
import type { VillageGeoNode } from "@/types/geo";
import type { EmergencyMapFocus } from "@/types/emergencyDirectory";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";
import type {
  RentalTruckOperator,
  VolunteerCircleDeployment,
} from "@/types/workforceLogistics";

const DASHBOARD_LAYERS: MapLayerToggle[] = [
  "SOS_ALERTS",
  "HIGH_LANDS",
  "RELIEF_CAMPS",
  "COUNTRY_BOATS",
  "TRUCK_HUBS",
  "VOLUNTEER_CIRCLES",
  "HAZARD_INUNDATION",
  "VILLAGE_BOUNDARIES",
];

type DistrictDashboardMapProps = {
  className?: string;
  villages: VillageGeoNode[];
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
  camps: ReliefCampFacility[];
  trucks?: RentalTruckOperator[];
  volunteerDeployments?: VolunteerCircleDeployment[];
  inundationPolygons?: InundationPolygon[];
  onBoundsChange?: (bounds: MapBoundsLiteral | null) => void;
  onVillageSelect?: (villageId: string | null) => void;
  selectedVillageId?: string | null;
  onDispatchSos?: (sosId: string) => void;
  volunteerFocus?: boolean;
  mapFocus?: EmergencyMapFocus | null;
  sosAlerts?: SosAlert[];
};

function MapTypeSwitcher({
  mode,
  onChange,
}: {
  mode: MapViewMode;
  onChange: (mode: MapViewMode) => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-1 rounded-xl border border-[var(--line)] bg-white/95 p-1 shadow-[var(--shadow)]">
      {(["roadmap", "terrain", "satellite"] as MapViewMode[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize ${
            mode === option
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function BoundsReporter({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: MapBoundsLiteral | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onBoundsChange) return;
    const publish = () => {
      const bounds = map.getBounds();
      if (!bounds) {
        onBoundsChange(null);
        return;
      }
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onBoundsChange({
        north: ne.lat(),
        east: ne.lng(),
        south: sw.lat(),
        west: sw.lng(),
      });
    };
    publish();
    const listener = map.addListener("idle", publish);
    return () => listener.remove();
  }, [map, onBoundsChange]);

  return null;
}

function MapFocusController({
  mapFocus,
}: {
  mapFocus?: EmergencyMapFocus | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapFocus) return;
    map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
    map.setZoom(mapFocus.kind === "SOS" ? 14 : 12);
  }, [map, mapFocus]);

  return null;
}

function DistrictMapInner({
  villages,
  boats,
  highLands,
  camps,
  trucks = [],
  volunteerDeployments = [],
  inundationPolygons = [],
  onBoundsChange,
  onVillageSelect,
  selectedVillageId,
  onDispatchSos,
  volunteerFocus = false,
  mapFocus = null,
  sosAlerts = [],
}: Omit<DistrictDashboardMapProps, "className">) {
  const [enabled, setEnabled] = useState<Record<MapLayerToggle, boolean>>({
    VILLAGE_BOUNDARIES: true,
    HIGH_LANDS: true,
    RELIEF_CAMPS: true,
    COUNTRY_BOATS: false,
    SOS_ALERTS: true,
    HAZARD_INUNDATION: false,
    TRUCK_HUBS: trucks.length > 0,
    VOLUNTEER_CIRCLES: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapViewMode>("roadmap");
  const [flashSosId, setFlashSosId] = useState<string | null>(null);
  const sosState = sosAlerts;

  useEffect(() => {
    if (!volunteerFocus) return;
    const timer = window.setTimeout(() => {
      setEnabled((prev) => ({
        ...prev,
        VOLUNTEER_CIRCLES: true,
        VILLAGE_BOUNDARIES: true,
      }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [volunteerFocus]);

  useEffect(() => {
    if (!mapFocus || mapFocus.kind !== "SOS") return;
    const timer = window.setTimeout(() => {
      setEnabled((prev) => ({ ...prev, SOS_ALERTS: true }));
      setSelectedId(mapFocus.id);
      setFlashSosId(mapFocus.id);
    }, 0);
    const clearFlashTimer = window.setTimeout(() => setFlashSosId(null), 2800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearFlashTimer);
    };
  }, [mapFocus]);

  const markers = useMemo(() => {
    const list: MapMarkerData[] = [];
    if (enabled.VILLAGE_BOUNDARIES) {
      list.push(...villageMarkersFromSeeds(villages));
    }
    if (enabled.HIGH_LANDS) list.push(...highLandMarkers(highLands));
    if (enabled.RELIEF_CAMPS) list.push(...reliefCampMarkers(camps));
    if (enabled.COUNTRY_BOATS) list.push(...boatMarkers(boats));
    if (enabled.SOS_ALERTS) list.push(...sosMarkers(sosState));
    if (enabled.TRUCK_HUBS) list.push(...truckHubMarkers(trucks));
    if (enabled.VOLUNTEER_CIRCLES || volunteerFocus) {
      list.push(...volunteerCircleMarkers(volunteerDeployments));
    }
    return list;
  }, [
    boats,
    camps,
    enabled,
    highLands,
    sosState,
    trucks,
    villages,
    volunteerDeployments,
    volunteerFocus,
  ]);

  useEffect(() => {
    if (!selectedVillageId) return;
    const timer = window.setTimeout(() => {
      setSelectedId(`village-${selectedVillageId}`);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedVillageId]);

  function handleSelect(marker: MapMarkerData | null) {
    setSelectedId(marker?.id ?? null);
    if (!marker) {
      onVillageSelect?.(null);
      return;
    }
    if (marker.type === "VILLAGE" && typeof marker.metadata.villageId === "string") {
      onVillageSelect?.(marker.metadata.villageId);
    }
  }

  function dispatchSos(sosId: string) {
    onDispatchSos?.(sosId);
    setSelectedId(null);
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <Map
        defaultCenter={DEFAULT_MAP_CENTER}
        defaultZoom={DEFAULT_MAP_ZOOM}
        mapId={getGoogleMapsMapId()}
        mapTypeId={mapMode}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
        onCameraChanged={() => {
          /* BoundsReporter handles idle updates */
        }}
      >
        <BoundsReporter onBoundsChange={onBoundsChange} />
        <MapFocusController mapFocus={mapFocus} />

        {mapFocus ? (
          <AdvancedMarker
            position={{ lat: mapFocus.lat, lng: mapFocus.lng }}
            title={mapFocus.title}
            zIndex={50}
          >
            <div
              className={
                mapFocus.kind === "SOS" && flashSosId === mapFocus.id
                  ? "animate-pulse rounded-full ring-4 ring-[#fecaca]"
                  : undefined
              }
            >
              <Pin
                background={
                  mapFocus.kind === "SOS"
                    ? "#b91c1c"
                    : mapFocus.kind === "HOSPITAL"
                      ? "#0f6e56"
                      : mapFocus.kind === "POLICE"
                        ? "#075985"
                        : "#9a3412"
                }
                borderColor="#15202b"
                glyphColor="#fff"
                glyph={
                  mapFocus.kind === "SOS"
                    ? "!"
                    : mapFocus.kind === "HOSPITAL"
                      ? "H"
                      : mapFocus.kind === "POLICE"
                        ? "P"
                        : "A"
                }
                scale={mapFocus.kind === "SOS" ? 1.55 : 1.4}
              />
            </div>
          </AdvancedMarker>
        ) : null}

        {enabled.HAZARD_INUNDATION
          ? inundationPolygons.map((polygon) => (
              <Polygon
                key={polygon.id}
                paths={polygon.coordinates}
                strokeColor="#b91c1c"
                strokeOpacity={0.85}
                strokeWeight={2}
                fillColor="#dc2626"
                fillOpacity={0.22}
              />
            ))
          : null}

        <MapMarkerLayer
          markers={markers}
          selectedId={selectedId}
          onSelect={handleSelect}
          renderInfo={(marker) => {
            if (marker.type === "SOS") {
              return (
                <div className="space-y-2">
                  <p className="text-xs text-[#5b6b7c]">
                    {String(marker.metadata.villageName)} ·{" "}
                    {new Date(String(marker.metadata.reportedAt)).toLocaleString()}
                  </p>
                  <p className="text-sm">{String(marker.metadata.message)}</p>
                  <p className="text-xs">{String(marker.metadata.phone)}</p>
                  {marker.metadata.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => dispatchSos(marker.id)}
                      className="rounded-lg bg-[#b91c1c] px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Dispatch Help
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-[#9a3412]">
                      {String(marker.metadata.status)}
                    </p>
                  )}
                </div>
              );
            }

            if (marker.type === "RELIEF_CAMP") {
              return (
                <p className="text-xs">
                  Occupancy {String(marker.metadata.occupancy)}/
                  {String(marker.metadata.capacity)} (
                  {String(marker.metadata.occupancyPct)}%)
                  <br />
                  In-charge: {String(marker.metadata.inCharge)}
                </p>
              );
            }

            if (marker.type === "HIGH_LAND") {
              return (
                <p className="text-xs">
                  Elevation {String(marker.metadata.elevation)} m · Capacity{" "}
                  {String(marker.metadata.capacity)}
                  <br />
                  Access: {String(marker.metadata.access)}
                  {marker.metadata.helipad ? " · Helipad suitable" : ""}
                </p>
              );
            }

            if (marker.type === "BOAT") {
              return (
                <p className="text-xs">
                  {String(marker.metadata.status)} · Cap{" "}
                  {String(marker.metadata.capacity)}
                  <br />
                  {String(marker.metadata.phone)}
                </p>
              );
            }

            if (marker.type === "TRUCK_HUB") {
              return (
                <p className="text-xs">
                  {String(marker.metadata.operator)}
                  <br />
                  {String(marker.metadata.category)} · {String(marker.metadata.status)}
                  <br />
                  {String(marker.metadata.phone)}
                </p>
              );
            }

            if (marker.type === "VOLUNTEER") {
              return (
                <p className="text-xs">
                  {String(marker.metadata.volunteersDeployed)} volunteers in{" "}
                  {String(marker.metadata.revenueCircle)} ({String(marker.metadata.district)})
                </p>
              );
            }

            return (
              <p className="text-xs">
                {String(marker.metadata.revenueCircle)} ·{" "}
                {String(marker.metadata.district)}
              </p>
            );
          }}
        />
      </Map>

      <MapLayerControls
        layers={DASHBOARD_LAYERS}
        enabled={enabled}
        onToggle={(layer) =>
          setEnabled((prev) => ({ ...prev, [layer]: !prev[layer] }))
        }
      />
      <MapTypeSwitcher mode={mapMode} onChange={setMapMode} />

      <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 text-xs shadow-[var(--shadow)]">
        <span className="font-semibold text-[var(--ink)]">District situational map</span>
        <span className="ml-2 text-[var(--ink-muted)]">
          {villages.length} villages · {sosState.filter((s) => s.status === "OPEN").length}{" "}
          open SOS
        </span>
      </div>
    </div>
  );
}

export function DistrictDashboardMap(props: DistrictDashboardMapProps) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return (
      <div className={props.className}>
        <MapsApiKeyMissing title="District map unavailable" />
      </div>
    );
  }

  return (
    <div className={props.className ?? "h-[min(70vh,640px)] w-full"}>
      <APIProvider
        apiKey={apiKey}
        libraries={["marker", "routes", "geometry"]}
      >
        <DistrictMapInner {...props} />
      </APIProvider>
    </div>
  );
}
