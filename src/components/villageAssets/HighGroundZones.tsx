"use client";

import { useMemo, useState } from "react";
import {
  Helicopter,
  MapPinned,
  Mountain,
  Navigation,
  Users,
} from "lucide-react";
import type { AccessRouteStatus, HighLandZone } from "@/types/villageAssets";
import { ACCESS_ROUTE_LABELS } from "@/types/villageAssets";

type HighGroundZonesProps = {
  zones: HighLandZone[];
};

function RoutePill({ status }: { status: AccessRouteStatus }) {
  const styles: Record<AccessRouteStatus, string> = {
    CLEAR: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    WATERLOGGED: "bg-[#fff7ed] text-[#9a3412]",
    INACCESSIBLE: "bg-[#fef2f2] text-[#b91c1c]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {ACCESS_ROUTE_LABELS[status]}
    </span>
  );
}

export function HighGroundZones({ zones }: HighGroundZonesProps) {
  const [circleFilter, setCircleFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState<AccessRouteStatus | "ALL">("ALL");
  const [helipadOnly, setHelipadOnly] = useState(false);

  const revenueCircles = useMemo(
    () =>
      Array.from(new Set(zones.map((zone) => zone.revenueCircle))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [zones],
  );

  const filtered = useMemo(
    () =>
      zones.filter((zone) => {
        if (circleFilter !== "ALL" && zone.revenueCircle !== circleFilter) return false;
        if (routeFilter !== "ALL" && zone.accessRouteStatus !== routeFilter) return false;
        if (helipadOnly && !zone.hasHelipadSuitability) return false;
        return true;
      }),
    [circleFilter, helipadOnly, routeFilter, zones],
  );

  const mapBounds = useMemo(() => {
    if (filtered.length === 0) return null;
    const lats = filtered.map((zone) => zone.coordinates.lat);
    const lngs = filtered.map((zone) => zone.coordinates.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [filtered]);

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
          <Mountain className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-[0.14em]">
            High ground safe zones
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
          Elevated assembly & air-drop sites
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Pre-mapped high lands with elevation, holding capacity, helipad suitability, and
          access route status.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--ink-muted)]">Revenue circle</span>
          <select
            value={circleFilter}
            onChange={(event) => setCircleFilter(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="ALL">All circles</option>
            {revenueCircles.map((circle) => (
              <option key={circle} value={circle}>
                {circle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--ink-muted)]">Access route</span>
          <select
            value={routeFilter}
            onChange={(event) =>
              setRouteFilter(event.target.value as AccessRouteStatus | "ALL")
            }
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="ALL">All routes</option>
            {(Object.keys(ACCESS_ROUTE_LABELS) as AccessRouteStatus[]).map((status) => (
              <option key={status} value={status}>
                {ACCESS_ROUTE_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={helipadOnly}
            onChange={(event) => setHelipadOnly(event.target.checked)}
          />
          <span>Helipad-suitable only</span>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
              No high-ground zones match the current filters.
            </p>
          ) : (
            filtered.map((zone) => (
              <article
                key={zone.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {zone.villageName} · {zone.revenueCircle}
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-lg text-[var(--ink)]">
                      {zone.zoneName}
                    </h3>
                  </div>
                  <RoutePill status={zone.accessRouteStatus} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white/80 px-2.5 py-2 ring-1 ring-[var(--line)]">
                    <dt className="text-xs text-[var(--ink-muted)]">Elevation</dt>
                    <dd className="font-semibold text-[var(--ink)]">
                      {zone.elevationMetersAboveSea} m
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-2.5 py-2 ring-1 ring-[var(--line)]">
                    <dt className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                      <Users className="h-3 w-3" aria-hidden />
                      Capacity
                    </dt>
                    <dd className="font-semibold text-[var(--ink)]">
                      {zone.holdingCapacityPersons}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                  {zone.hasHelipadSuitability ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2 py-0.5 font-semibold text-[#075985]">
                      <Helicopter className="h-3 w-3" aria-hidden />
                      Helipad suitable
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 font-medium">
                      No helipad
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="h-3 w-3" aria-hidden />
                    {zone.coordinates.lat.toFixed(3)}, {zone.coordinates.lng.toFixed(3)}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <MapPinned className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            District plot (schematic)
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[linear-gradient(160deg,#d7ebe3_0%,#eef5f1_45%,#dce8f2_100%)] ring-1 ring-[var(--line)]">
            {mapBounds && filtered.length > 0
              ? filtered.map((zone) => {
                  const latSpan = Math.max(0.01, mapBounds.maxLat - mapBounds.minLat);
                  const lngSpan = Math.max(0.01, mapBounds.maxLng - mapBounds.minLng);
                  const x =
                    ((zone.coordinates.lng - mapBounds.minLng) / lngSpan) * 84 + 8;
                  const y =
                    (1 - (zone.coordinates.lat - mapBounds.minLat) / latSpan) * 84 + 8;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      title={`${zone.zoneName} (${ACCESS_ROUTE_LABELS[zone.accessRouteStatus]})`}
                      className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                        zone.accessRouteStatus === "CLEAR"
                          ? "bg-[var(--accent)]"
                          : zone.accessRouteStatus === "WATERLOGGED"
                            ? "bg-[#ea580c]"
                            : "bg-[#b91c1c]"
                      }`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    />
                  );
                })
              : (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ink-muted)]">
                  No zones to plot
                </p>
              )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> Clear
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ea580c]" /> Waterlogged
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#b91c1c]" /> Inaccessible
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
