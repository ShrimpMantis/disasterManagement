"use client";

import { AdvancedMarker, InfoWindow, Pin } from "@vis.gl/react-google-maps";
import type { MapMarkerData } from "@/types/map";

const SEVERITY_COLORS: Record<string, { background: string; border: string; glyph: string }> = {
  CRITICAL: { background: "#b91c1c", border: "#7f1d1d", glyph: "#fff" },
  HIGH: { background: "#ea580c", border: "#9a3412", glyph: "#fff" },
  MEDIUM: { background: "#ca8a04", border: "#854d0e", glyph: "#fff" },
  LOW: { background: "#0284c7", border: "#075985", glyph: "#fff" },
  SAFE: { background: "#0f6e56", border: "#0b4f3d", glyph: "#fff" },
};

function markerGlyph(type: MapMarkerData["type"]): string {
  switch (type) {
    case "SOS":
      return "!";
    case "RELIEF_CAMP":
      return "C";
    case "HIGH_LAND":
      return "H";
    case "BOAT":
      return "B";
    case "WAREHOUSE":
      return "W";
    case "TRUCK_HUB":
      return "T";
    case "VOLUNTEER":
      return "P";
    default:
      return "V";
  }
}

type MapMarkerLayerProps = {
  markers: MapMarkerData[];
  selectedId: string | null;
  onSelect: (marker: MapMarkerData | null) => void;
  pulseSos?: boolean;
  renderInfo?: (marker: MapMarkerData) => React.ReactNode;
};

export function MapMarkerLayer({
  markers,
  selectedId,
  onSelect,
  pulseSos = true,
  renderInfo,
}: MapMarkerLayerProps) {
  const selected = markers.find((marker) => marker.id === selectedId) ?? null;

  return (
    <>
      {markers.map((marker) => {
        const colors =
          SEVERITY_COLORS[marker.statusSeverity ?? "MEDIUM"] ?? SEVERITY_COLORS.MEDIUM;
        const isSos = marker.type === "SOS";

        return (
          <AdvancedMarker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={marker.title}
            onClick={() => onSelect(marker)}
            zIndex={isSos ? 20 : selectedId === marker.id ? 15 : 5}
          >
            <div className={isSos && pulseSos ? "animate-pulse" : undefined}>
              <Pin
                background={colors.background}
                borderColor={colors.border}
                glyphColor={colors.glyph}
                glyph={markerGlyph(marker.type)}
                scale={isSos ? 1.25 : 1}
              />
            </div>
          </AdvancedMarker>
        );
      })}

      {selected ? (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => onSelect(null)}
          headerContent={selected.title}
        >
          <div className="max-w-[240px] space-y-1.5 p-1 text-sm text-[#15202b]">
            {renderInfo ? (
              renderInfo(selected)
            ) : (
              <p className="text-xs text-[#5b6b7c]">
                {selected.type.replaceAll("_", " ")} · {selected.statusSeverity ?? "—"}
              </p>
            )}
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
}
