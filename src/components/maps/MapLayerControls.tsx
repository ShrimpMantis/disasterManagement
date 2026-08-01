"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { MapLayerToggle } from "@/types/map";
import { MAP_LAYER_LABELS } from "@/types/map";

type MapLayerControlsProps = {
  layers: MapLayerToggle[];
  enabled: Record<MapLayerToggle, boolean>;
  onToggle: (layer: MapLayerToggle) => void;
};

export function MapLayerControls({
  layers,
  enabled,
  onToggle,
}: MapLayerControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-2 top-2 z-10 max-w-[calc(100%-1rem)] sm:right-3 sm:top-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="map-layer-panel"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-[var(--shadow)] backdrop-blur-md sm:hidden"
      >
        <Layers className="h-3.5 w-3.5" aria-hidden />
        Layers
      </button>

      <div
        id="map-layer-panel"
        className={`mt-1 w-[min(100%,200px)] rounded-xl border border-[var(--line)] bg-white/95 p-2.5 shadow-[var(--shadow)] backdrop-blur-md sm:mt-0 sm:w-[min(100%,220px)] sm:p-3 ${
          open ? "block" : "hidden sm:block"
        }`}
      >
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)] sm:text-[11px]">
          Map layers
        </p>
        <ul className="max-h-[40dvh] space-y-1 overflow-y-auto sm:max-h-none sm:space-y-1.5">
          {layers.map((layer) => (
            <li key={layer}>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--ink)] sm:text-sm">
                <input
                  type="checkbox"
                  checked={enabled[layer]}
                  onChange={() => onToggle(layer)}
                  className="accent-[var(--accent)]"
                />
                <span className="truncate">{MAP_LAYER_LABELS[layer]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
