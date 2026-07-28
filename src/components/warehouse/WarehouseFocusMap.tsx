"use client";

import { useEffect, useMemo } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapsApiKeyMissing } from "@/components/maps/MapsApiProvider";
import {
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
} from "@/lib/maps/markers";
import type { WarehouseLocation } from "@/types/warehouseModule";
import {
  FACILITY_TYPE_LABELS,
  WAREHOUSE_STATUS_LABELS,
} from "@/types/warehouseModule";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";

const MAP_LIBRARIES = ["marker"];

type WarehouseFocusMapProps = {
  warehouses: WarehouseLocation[];
  focusedWarehouse: WarehouseLocation | null;
  onSelectWarehouse: (
    coordinates: { lat: number; lng: number },
    warehouseId: string,
  ) => void;
  className?: string;
};

function FocusCamera({ warehouse }: { warehouse: WarehouseLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !warehouse) return;
    map.panTo(warehouse.coordinates);
    map.setZoom(13);
  }, [map, warehouse]);
  return null;
}

function WarehouseFocusMapInner({
  warehouses,
  focusedWarehouse,
  onSelectWarehouse,
}: Omit<WarehouseFocusMapProps, "className">) {
  const center = useMemo(() => {
    if (focusedWarehouse) return focusedWarehouse.coordinates;
    if (warehouses[0]) return warehouses[0].coordinates;
    return DEFAULT_MAP_CENTER;
  }, [focusedWarehouse, warehouses]);

  return (
    <Map
      defaultCenter={center}
      defaultZoom={DEFAULT_MAP_ZOOM}
      mapId={getGoogleMapsMapId()}
      gestureHandling="greedy"
      disableDefaultUI={false}
      className="h-full w-full"
    >
      <FocusCamera warehouse={focusedWarehouse} />
      {warehouses.map((warehouse) => {
        const focused = warehouse.warehouseId === focusedWarehouse?.warehouseId;
        return (
          <AdvancedMarker
            key={warehouse.warehouseId}
            position={warehouse.coordinates}
            title={warehouse.warehouseName}
            onClick={() =>
              onSelectWarehouse(warehouse.coordinates, warehouse.warehouseId)
            }
          >
            <Pin
              background={focused ? "#0f6e56" : "#334155"}
              borderColor="#fff"
              glyphColor="#fff"
              scale={focused ? 1.25 : 1}
            />
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

export function WarehouseFocusMap({
  warehouses,
  focusedWarehouse,
  onSelectWarehouse,
  className,
}: WarehouseFocusMapProps) {
  const apiKey = getGoogleMapsApiKey();

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] ${className ?? ""}`}
    >
      <div className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--ink)]">
          Operational map
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          {focusedWarehouse
            ? `${focusedWarehouse.warehouseName} · ${FACILITY_TYPE_LABELS[focusedWarehouse.facilityType]} · ${WAREHOUSE_STATUS_LABELS[focusedWarehouse.capacityStatus]}`
            : "Select Focus Map on a warehouse row to center and open its stock summary."}
        </p>
      </div>

      <div className="relative min-h-[280px] flex-1">
        {!apiKey ? (
          <MapsApiKeyMissing />
        ) : (
          <APIProvider apiKey={apiKey} libraries={MAP_LIBRARIES}>
            <WarehouseFocusMapInner
              warehouses={warehouses}
              focusedWarehouse={focusedWarehouse}
              onSelectWarehouse={onSelectWarehouse}
            />
          </APIProvider>
        )}

        {focusedWarehouse ? (
          <aside className="absolute bottom-3 left-3 right-3 rounded-xl border border-[var(--line)] bg-white/95 p-3 shadow-md backdrop-blur sm:left-auto sm:right-3 sm:w-80">
            <p className="font-semibold text-[var(--ink)]">
              {focusedWarehouse.warehouseName}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              {focusedWarehouse.villageTown}, {focusedWarehouse.district}
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-[var(--accent-soft)] px-2 py-1.5">
                <dt className="text-[10px] uppercase text-[var(--ink-muted)]">
                  Capacity
                </dt>
                <dd className="font-semibold tabular-nums">
                  {focusedWarehouse.totalCapacityTons} MT
                </dd>
              </div>
              <div className="rounded-lg bg-[#fff7ed] px-2 py-1.5">
                <dt className="text-[10px] uppercase text-[var(--ink-muted)]">
                  Stocked
                </dt>
                <dd className="font-semibold tabular-nums">
                  {focusedWarehouse.currentStockTons} MT
                </dd>
              </div>
              <div className="rounded-lg bg-[#dcfce7] px-2 py-1.5">
                <dt className="text-[10px] uppercase text-[var(--ink-muted)]">
                  Free
                </dt>
                <dd className="font-semibold tabular-nums">
                  {focusedWarehouse.outstandingCapacityTons} MT
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
              POC{" "}
              <a
                href={`tel:${focusedWarehouse.pointOfContactPhone.replace(/[^\d+]/g, "")}`}
                className="font-semibold text-[var(--accent)]"
              >
                {focusedWarehouse.pointOfContactName}
              </a>{" "}
              · {WAREHOUSE_STATUS_LABELS[focusedWarehouse.capacityStatus]}
            </p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
