"use client";

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
  return (
    <div className="absolute right-3 top-3 z-10 w-[min(100%,220px)] rounded-xl border border-[var(--line)] bg-white/95 p-3 shadow-[var(--shadow)] backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        Map layers
      </p>
      <ul className="space-y-1.5">
        {layers.map((layer) => (
          <li key={layer}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                checked={enabled[layer]}
                onChange={() => onToggle(layer)}
                className="accent-[var(--accent)]"
              />
              {MAP_LAYER_LABELS[layer]}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
