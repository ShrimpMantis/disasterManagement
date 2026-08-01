"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Circle,
  Map,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MapMarkerLayer } from "@/components/maps/MapMarkerLayer";
import { MapsApiKeyMissing } from "@/components/maps/MapsApiProvider";
import {
  boatMarkers,
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  haversineKm,
  highLandMarkers,
} from "@/lib/maps/markers";
import { CENTRAL_DISPATCH_HUB } from "@/lib/maps/dispatchHub";
import type { MapLatLng, MapMarkerData, MapViewMode } from "@/types/map";
import type { CountryBoatOwner, HighLandZone } from "@/types/villageAssets";
import { X } from "lucide-react";

type ReliefDispatchMapModalProps = {
  open: boolean;
  destination: (MapLatLng & { label: string; villageId?: string }) | null;
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
  origin?: MapLatLng & { label: string };
  onClose: () => void;
};

function RoutePolyline({
  origin,
  destination,
}: {
  origin: MapLatLng;
  destination: MapLatLng;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const [path, setPath] = useState<MapLatLng[] | null>(null);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    if (!routesLib || !map) return;

    const service = new routesLib.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result?.routes?.[0]?.overview_path) {
          setRouteError("Directions unavailable — showing straight-line link.");
          setPath([origin, destination]);
          return;
        }
        setRouteError("");
        setPath(
          result.routes[0].overview_path.map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
          })),
        );
      },
    );
  }, [destination, map, origin, routesLib]);

  return (
    <>
      {path ? (
        <Polyline
          path={path}
          strokeColor="#0f6e56"
          strokeOpacity={0.9}
          strokeWeight={4}
        />
      ) : null}
      {routeError ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-[var(--ink-muted)] shadow">
          {routeError}
        </div>
      ) : null}
    </>
  );
}

function DispatchMapBody({
  destination,
  origin,
  boats,
  highLands,
}: {
  destination: MapLatLng & { label: string; villageId?: string };
  origin: MapLatLng & { label: string };
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
}) {
  const [mapMode, setMapMode] = useState<MapViewMode>("terrain");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nearbyAssets = useMemo(() => {
    const nearbyBoats = boatMarkers(boats).filter(
      (marker) => haversineKm(destination, marker) <= 5,
    );
    const nearbyHighLands = highLandMarkers(highLands).filter(
      (marker) => haversineKm(destination, marker) <= 5,
    );
    return [...nearbyBoats, ...nearbyHighLands];
  }, [boats, destination, highLands]);

  const hubMarker: MapMarkerData = {
    id: "warehouse-hub",
    type: "WAREHOUSE",
    title: origin.label,
    lat: origin.lat,
    lng: origin.lng,
    statusSeverity: "SAFE",
    metadata: { role: "Dispatch hub" },
  };

  const destMarker: MapMarkerData = {
    id: "dispatch-destination",
    type: "VILLAGE",
    title: destination.label,
    lat: destination.lat,
    lng: destination.lng,
    statusSeverity: "HIGH",
    metadata: { villageId: destination.villageId },
  };

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={destination}
        defaultZoom={11}
        mapId={getGoogleMapsMapId()}
        mapTypeId={mapMode}
        gestureHandling="greedy"
        className="h-full w-full"
      >
        <Circle
          center={destination}
          radius={5000}
          strokeColor="#0f6e56"
          strokeOpacity={0.7}
          strokeWeight={2}
          fillColor="#0f6e56"
          fillOpacity={0.08}
        />

        <RoutePolyline origin={origin} destination={destination} />

        <AdvancedMarker position={origin} title={origin.label}>
          <Pin background="#0f6e56" borderColor="#0b4f3d" glyphColor="#fff" glyph="W" />
        </AdvancedMarker>
        <AdvancedMarker position={destination} title={destination.label}>
          <Pin background="#ea580c" borderColor="#9a3412" glyphColor="#fff" glyph="D" />
        </AdvancedMarker>

        <MapMarkerLayer
          markers={nearbyAssets}
          selectedId={selectedId}
          onSelect={(marker) => setSelectedId(marker?.id ?? null)}
          pulseSos={false}
          renderInfo={(marker) => (
            <p className="text-xs">
              {marker.type === "BOAT"
                ? `${String(marker.metadata.status)} · ${String(marker.metadata.phone)}`
                : `Elevation ${String(marker.metadata.elevation)} m · Cap ${String(marker.metadata.capacity)}`}
            </p>
          )}
        />
      </Map>

      <div className="absolute left-3 top-3 z-10 max-w-xs rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 text-xs shadow">
        <p className="font-semibold text-[var(--ink)]">
          {hubMarker.title} → {destMarker.title}
        </p>
        <p className="mt-1 text-[var(--ink-muted)]">
          5 km radius shows nearby boats & high lands ({nearbyAssets.length} assets)
        </p>
      </div>

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

export function ReliefDispatchMapModal({
  open,
  destination,
  boats,
  highLands,
  origin = CENTRAL_DISPATCH_HUB,
  onClose,
}: ReliefDispatchMapModalProps) {
  if (!open || !destination) return null;

  const apiKey = getGoogleMapsApiKey();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(21,32,43,0.45)] px-0 py-0 sm:items-center sm:px-4 sm:py-6">
      <div className="flex h-[min(92dvh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)] sm:h-[min(85vh,720px)] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] sm:text-xs">
              Relief & supply route map
            </p>
            <h3 className="truncate font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)] sm:text-2xl">
              {destination.label}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1">
          {!apiKey ? (
            <MapsApiKeyMissing title="Dispatch map unavailable" />
          ) : (
            <APIProvider
              apiKey={apiKey}
              libraries={["marker", "routes", "geometry"]}
            >
              <DispatchMapBody
                destination={destination}
                origin={origin}
                boats={boats}
                highLands={highLands}
              />
            </APIProvider>
          )}
        </div>
      </div>
    </div>
  );
}
