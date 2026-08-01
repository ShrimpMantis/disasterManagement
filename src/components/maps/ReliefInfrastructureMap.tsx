"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  Map,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { MapLayerControls } from "@/components/maps/MapLayerControls";
import { MapMarkerLayer } from "@/components/maps/MapMarkerLayer";
import { MapsApiKeyMissing } from "@/components/maps/MapsApiProvider";
import {
  boatMarkers,
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  highLandMarkers,
  pointInBounds,
  reliefCampMarkers,
  villageMarkersFromSeeds,
} from "@/lib/maps/markers";
import type { VillageGeoNode } from "@/types/geo";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
  VillageAssetSummary,
} from "@/types/villageAssets";
import type {
  MapBoundsLiteral,
  MapLayerToggle,
  MapMarkerData,
  MapViewMode,
} from "@/types/map";
import { DEFAULT_MAP_CENTER } from "@/types/map";

const INFRA_LAYERS: MapLayerToggle[] = [
  "VILLAGE_BOUNDARIES",
  "HIGH_LANDS",
  "RELIEF_CAMPS",
  "COUNTRY_BOATS",
];

const MAP_LIBRARIES = ["marker", "routes", "geometry"];

type ReliefInfrastructureMapProps = {
  villages: VillageGeoNode[];
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
  camps: ReliefCampFacility[];
  selectedVillageId?: string | null;
  onVillageSelect?: (villageId: string | null) => void;
  onBoundsChange?: (bounds: MapBoundsLiteral | null) => void;
  className?: string;
};

function InfraMapInner({
  villages,
  boats,
  highLands,
  camps,
  selectedVillageId,
  onVillageSelect,
  onBoundsChange,
}: Omit<ReliefInfrastructureMapProps, "className">) {
  const [enabled, setEnabled] = useState<Record<MapLayerToggle, boolean>>({
    VILLAGE_BOUNDARIES: true,
    HIGH_LANDS: true,
    RELIEF_CAMPS: true,
    COUNTRY_BOATS: true,
    SOS_ALERTS: false,
    HAZARD_INUNDATION: false,
    TRUCK_HUBS: false,
    VOLUNTEER_CIRCLES: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapViewMode>("roadmap");

  const markers = useMemo(() => {
    const list: MapMarkerData[] = [];
    if (enabled.VILLAGE_BOUNDARIES) {
      list.push(...villageMarkersFromSeeds(villages));
    }
    if (enabled.HIGH_LANDS) list.push(...highLandMarkers(highLands));
    if (enabled.RELIEF_CAMPS) list.push(...reliefCampMarkers(camps));
    if (enabled.COUNTRY_BOATS) list.push(...boatMarkers(boats));
    return list;
  }, [boats, camps, enabled, highLands, villages]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedId(selectedVillageId ? `village-${selectedVillageId}` : null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedVillageId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <Map
        defaultCenter={DEFAULT_MAP_CENTER}
        defaultZoom={7.4}
        mapId={getGoogleMapsMapId()}
        mapTypeId={mapMode}
        gestureHandling="greedy"
        className="h-full w-full"
        onCameraChanged={(event: MapCameraChangedEvent) => {
          const detail = event.detail;
          if (!onBoundsChange || !detail.bounds) return;
          onBoundsChange({
            north: detail.bounds.north,
            south: detail.bounds.south,
            east: detail.bounds.east,
            west: detail.bounds.west,
          });
        }}
      >
        <MapMarkerLayer
          markers={markers}
          selectedId={selectedId}
          onSelect={(marker) => {
            setSelectedId(marker?.id ?? null);
            if (!marker) {
              onVillageSelect?.(null);
              return;
            }
            const villageId = marker.metadata.villageId;
            if (typeof villageId === "string") onVillageSelect?.(villageId);
          }}
          pulseSos={false}
          renderInfo={(marker) => (
            <p className="text-xs text-[#5b6b7c]">
              {marker.type.replaceAll("_", " ")}
              {marker.metadata.villageName
                ? ` · ${String(marker.metadata.villageName)}`
                : ""}
            </p>
          )}
        />
      </Map>

      <MapLayerControls
        layers={INFRA_LAYERS}
        enabled={enabled}
        onToggle={(layer) =>
          setEnabled((prev) => ({ ...prev, [layer]: !prev[layer] }))
        }
      />

      <div className="absolute bottom-3 left-3 z-10 flex gap-1 rounded-xl border border-[var(--line)] bg-white/95 p-1 shadow">
        {(["roadmap", "terrain", "satellite"] as MapViewMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMapMode(option)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize ${
              mapMode === option
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReliefInfrastructureMap(props: ReliefInfrastructureMapProps) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return (
      <div className={props.className}>
        <MapsApiKeyMissing title="Infrastructure map unavailable" />
      </div>
    );
  }

  return (
    <div className={props.className ?? "map-stage-compact"}>
      <APIProvider apiKey={apiKey} libraries={MAP_LIBRARIES}>
        <InfraMapInner {...props} />
      </APIProvider>
    </div>
  );
}

export function filterSummariesByBounds(
  summaries: VillageAssetSummary[],
  bounds: MapBoundsLiteral | null,
  villages: VillageGeoNode[],
): VillageAssetSummary[] {
  if (!bounds) return summaries;
  const visibleIds = new Set(
    villages
      .filter((village) =>
        pointInBounds(village.coordinates.lat, village.coordinates.lng, bounds),
      )
      .map((village) => village.id),
  );
  return summaries.filter((summary) => visibleIds.has(summary.villageId));
}
