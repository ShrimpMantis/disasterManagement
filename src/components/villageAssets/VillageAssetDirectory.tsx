"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type RowClassParams,
} from "ag-grid-community";
import { Landmark, MapPinned, Mountain, Ship, Tent } from "lucide-react";
import { BoatOwnerRegistry } from "@/components/villageAssets/BoatOwnerRegistry";
import { HighGroundZones } from "@/components/villageAssets/HighGroundZones";
import { ReliefCampGrid } from "@/components/villageAssets/ReliefCampGrid";
import {
  filterSummariesByBounds,
  ReliefInfrastructureMap,
} from "@/components/maps/ReliefInfrastructureMap";
import { ReliefDispatchMapModal } from "@/components/maps/ReliefDispatchMapModal";
import { useVillageAssetsState } from "@/hooks/useVillageAssetsState";
import type { MapBoundsLiteral } from "@/types/map";
import type { VillageAssetSummary } from "@/types/villageAssets";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#0f6e56",
  backgroundColor: "rgba(255,255,255,0.92)",
  borderColor: "rgba(21, 32, 43, 0.12)",
  headerBackgroundColor: "#e8f2ee",
  headerTextColor: "#15202b",
  foregroundColor: "#15202b",
  fontFamily: "var(--font-outfit), system-ui, sans-serif",
  borderRadius: 8,
  spacing: 6,
});

type AssetTab = "summary" | "boats" | "high-grounds" | "camps";

export function VillageAssetDirectory() {
  const assets = useVillageAssetsState();
  const [tab, setTab] = useState<AssetTab>("summary");
  const [bounds, setBounds] = useState<MapBoundsLiteral | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [dispatchVillageId, setDispatchVillageId] = useState<string | null>(null);
  const gridApiRef = useRef<GridApi<VillageAssetSummary> | null>(null);

  const filteredSummaries = useMemo(
    () => filterSummariesByBounds(assets.summaries, bounds, assets.villages),
    [assets.summaries, bounds, assets.villages],
  );

  const dispatchDestination = useMemo(() => {
    if (!dispatchVillageId) return null;
    const village = assets.villages.find((entry) => entry.id === dispatchVillageId);
    if (!village) return null;
    return {
      label: village.name,
      villageId: village.id,
      lat: village.coordinates.lat,
      lng: village.coordinates.lng,
    };
  }, [assets.villages, dispatchVillageId]);

  const onVillageSelect = useCallback((villageId: string | null) => {
    setSelectedVillageId(villageId);
    if (!villageId || !gridApiRef.current) return;
    const node = gridApiRef.current.getRowNode(villageId);
    if (!node) return;
    gridApiRef.current.ensureNodeVisible(node, "middle");
    node.setSelected(true);
  }, []);

  const summaryColumns = useMemo<ColDef<VillageAssetSummary>[]>(
    () => [
      { field: "villageName", headerName: "Village", flex: 1.2, minWidth: 140 },
      {
        field: "gaonBurhaOrPradhan",
        headerName: "Gaon Burha / Gaon Pradhan",
        flex: 1.3,
        minWidth: 180,
      },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        flex: 1.1,
        minWidth: 130,
      },
      {
        field: "availableBoats",
        headerName: "Available Boats",
        flex: 1,
        minWidth: 130,
        valueGetter: (params) =>
          params.data
            ? `${params.data.availableBoats} / ${params.data.totalBoats}`
            : "",
      },
      {
        field: "safeHighLands",
        headerName: "Safe High Lands",
        flex: 1,
        minWidth: 130,
        valueGetter: (params) =>
          params.data
            ? `${params.data.safeHighLands} / ${params.data.totalHighLands}`
            : "",
      },
      {
        field: "nearestReliefCampName",
        headerName: "Nearest Relief Camp",
        flex: 1.5,
        minWidth: 180,
      },
      {
        field: "nearestReliefCampDistanceKm",
        headerName: "Distance (km)",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value == null ? "—" : String(params.value),
      },
      {
        headerName: "Route Map",
        flex: 0.9,
        minWidth: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<VillageAssetSummary>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={() => setDispatchVillageId(params.data!.villageId)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--accent-strong)]"
            >
              <MapPinned className="h-3 w-3" aria-hidden />
              Open map
            </button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {assets.loading ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Loading emergency asset data…
        </p>
      ) : null}

      <ReliefInfrastructureMap
        className="map-stage-compact"
        villages={assets.villages}
        boats={assets.boats}
        highLands={assets.highLands}
        camps={assets.camps}
        selectedVillageId={selectedVillageId}
        onVillageSelect={onVillageSelect}
        onBoundsChange={setBounds}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Available boats
            </p>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {assets.kpis.availableBoats}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Clear high lands
            </p>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {assets.kpis.clearHighLands}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Open camp beds
            </p>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {assets.kpis.openCampBeds}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-1"
        >
          {(
            [
              { id: "summary", label: "Village Summary", icon: Landmark },
              { id: "boats", label: "Boats & Transport", icon: Ship },
              { id: "high-grounds", label: "High Grounds", icon: Mountain },
              { id: "camps", label: "Relief Camps", icon: Tent },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {assets.flashMessage ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {assets.flashMessage}
        </div>
      ) : null}

      {tab === "boats" ? (
        <BoatOwnerRegistry boats={assets.boats} onDispatch={assets.dispatchBoatAlert} />
      ) : null}

      {tab === "high-grounds" ? <HighGroundZones zones={assets.highLands} /> : null}

      {tab === "camps" ? <ReliefCampGrid camps={assets.camps} /> : null}

      {tab === "summary" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
                Village-level asset aggregation
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Pan/zoom the map to filter this grid. Click a map marker to highlight a
                village row, or open the supply route map.
              </p>
            </div>
            <p className="text-sm text-[var(--ink-muted)]">
              Showing {filteredSummaries.length} of {assets.summaries.length} villages
            </p>
          </div>
          <div className="h-[min(42dvh,320px)] sm:h-[min(60vh,560px)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
            <AgGridReact<VillageAssetSummary>
              theme={gridTheme}
              rowData={filteredSummaries}
              columnDefs={summaryColumns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
              }}
              rowSelection={{ mode: "singleRow", checkboxes: false }}
              getRowId={(params) => params.data.villageId}
              getRowClass={(params: RowClassParams<VillageAssetSummary>) =>
                params.data?.villageId === selectedVillageId
                  ? "bg-[var(--accent-soft)]"
                  : undefined
              }
              onGridReady={(event) => {
                gridApiRef.current = event.api;
              }}
              onRowClicked={(event) => {
                if (!event.data) return;
                setSelectedVillageId(event.data.villageId);
              }}
            />
          </div>
        </section>
      ) : null}

      <ReliefDispatchMapModal
        open={Boolean(dispatchDestination)}
        destination={dispatchDestination}
        boats={assets.boats}
        highLands={assets.highLands}
        onClose={() => setDispatchVillageId(null)}
      />
    </div>
  );
}
