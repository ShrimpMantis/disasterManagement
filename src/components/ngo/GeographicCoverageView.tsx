"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowStyle,
} from "ag-grid-community";
import { AdvancedMarker, APIProvider, InfoWindow, Map as GoogleMap, Pin } from "@vis.gl/react-google-maps";
import { Map as MapIcon } from "lucide-react";
import type { DispatchAlert } from "@/hooks/useNGOCoordinationState";
import { getNeedsMetPercent, type CoverageMetrics } from "@/lib/ngo/coverage";
import { MapsApiKeyMissing } from "@/components/maps/MapsApiProvider";
import {
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
} from "@/lib/maps/markers";
import {
  COVERAGE_STATUS_COLORS,
  COVERAGE_STATUS_LABELS,
  type CoverageStatus,
  type VillageGeoNode,
} from "@/types/geo";
import type { NGOProfile } from "@/types/ngo";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/types/map";
import { AssignPartnerDrawer } from "./AssignPartnerDrawer";

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

type GeographicCoverageViewProps = {
  villages: VillageGeoNode[];
  ngos: NGOProfile[];
  metrics: CoverageMetrics;
  selectedVillage: VillageGeoNode | null;
  highlightedVillageId?: string | null;
  highlightedNgoId?: string | null;
  assignableNgos: NGOProfile[];
  dispatchAlerts: DispatchAlert[];
  onSelectVillage: (villageId: string) => void;
  onCloseDrawer: () => void;
  onAssign: (villageId: string, ngoId: string) => void;
};

type VillageRow = VillageGeoNode & {
  needsMetPercent: number;
  partnerNames: string;
};

function CoverageBadge({ status }: { status: CoverageStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: COVERAGE_STATUS_COLORS[status] }}
    >
      {status === "UNSERVED_CRITICAL" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      ) : null}
      {COVERAGE_STATUS_LABELS[status]}
    </span>
  );
}

function CoverageCell(params: ICellRendererParams<VillageRow, CoverageStatus>) {
  if (!params.value) return null;
  return <CoverageBadge status={params.value} />;
}

function CoverageGoogleMap({
  villages,
  ngoNameById,
  highlightedVillageId,
  highlightedNgoId,
  selectedVillageId,
  onSelectVillage,
}: {
  villages: VillageGeoNode[];
  ngoNameById: Map<string, string>;
  highlightedVillageId: string | null;
  highlightedNgoId: string | null;
  selectedVillageId: string | null;
  onSelectVillage: (villageId: string) => void;
}) {
  const [infoVillageId, setInfoVillageId] = useState<string | null>(null);
  const apiKey = getGoogleMapsApiKey();

  const infoVillage =
    villages.find((village) => village.id === infoVillageId) ?? null;

  if (!apiKey) {
    return (
      <div className="min-h-[240px] sm:min-h-[360px] lg:min-h-[480px]">
        <MapsApiKeyMissing title="Coverage map unavailable" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] sm:min-h-[360px] lg:min-h-[480px]">
      <APIProvider
        apiKey={apiKey}
        libraries={["marker", "routes", "geometry"]}
      >
        <GoogleMap
          defaultCenter={DEFAULT_MAP_CENTER}
          defaultZoom={DEFAULT_MAP_ZOOM}
          mapId={getGoogleMapsMapId()}
          gestureHandling="greedy"
          className="map-stage-tall"
        >
          {villages.map((village) => {
            const isHighlighted = village.id === highlightedVillageId;
            const linkedToSelectedNgo =
              Boolean(highlightedNgoId) &&
              village.assignedNGOIds.includes(highlightedNgoId ?? "");
            const active =
              isHighlighted ||
              linkedToSelectedNgo ||
              village.id === selectedVillageId;
            const color = COVERAGE_STATUS_COLORS[village.coverageStatus];

            return (
              <AdvancedMarker
                key={village.id}
                position={village.coordinates}
                title={`${village.name} · ${COVERAGE_STATUS_LABELS[village.coverageStatus]}`}
                zIndex={
                  village.coverageStatus === "UNSERVED_CRITICAL"
                    ? 30
                    : active
                      ? 20
                      : 5
                }
                onClick={() => {
                  setInfoVillageId(village.id);
                  onSelectVillage(village.id);
                }}
              >
                <div
                  className={
                    village.coverageStatus === "UNSERVED_CRITICAL"
                      ? "animate-pulse"
                      : undefined
                  }
                >
                  <Pin
                    background={color}
                    borderColor={active ? "#15202b" : "#ffffff"}
                    glyphColor="#ffffff"
                    scale={
                      active || village.coverageStatus === "UNSERVED_CRITICAL"
                        ? 1.25
                        : 1
                    }
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {infoVillage ? (
            <InfoWindow
              position={infoVillage.coordinates}
              onCloseClick={() => setInfoVillageId(null)}
              headerContent={infoVillage.name}
            >
              <div className="max-w-[220px] space-y-1 p-1 text-sm text-[#15202b]">
                <CoverageBadge status={infoVillage.coverageStatus} />
                <p className="text-xs text-[#5b6b7c]">
                  {infoVillage.district} · {infoVillage.revenueCircle}
                </p>
                <p className="text-xs">
                  Unmet needs: {infoVillage.unmetNeedsCount} · Partners:{" "}
                  {infoVillage.assignedNGOIds.length
                    ? infoVillage.assignedNGOIds
                        .map((id) => ngoNameById.get(id) ?? id)
                        .join(", ")
                    : "None"}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectVillage(infoVillage.id)}
                  className="mt-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  Assign partner
                </button>
              </div>
            </InfoWindow>
          ) : null}
        </GoogleMap>
      </APIProvider>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 text-xs shadow backdrop-blur">
        {(Object.keys(COVERAGE_STATUS_LABELS) as CoverageStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "UNSERVED_CRITICAL" ? "animate-pulse" : ""
              }`}
              style={{ backgroundColor: COVERAGE_STATUS_COLORS[status] }}
            />
            {COVERAGE_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GeographicCoverageView({
  villages,
  ngos,
  metrics,
  selectedVillage,
  highlightedVillageId = null,
  highlightedNgoId = null,
  assignableNgos,
  dispatchAlerts,
  onSelectVillage,
  onCloseDrawer,
  onAssign,
}: GeographicCoverageViewProps) {
  const [viewMode, setViewMode] = useState<"map" | "table">("map");

  const ngoNameById = useMemo(() => {
    const map = new Map<string, string>();
    ngos.forEach((ngo) => map.set(ngo.id, ngo.name));
    return map;
  }, [ngos]);

  const rowData = useMemo<VillageRow[]>(
    () =>
      villages.map((village) => ({
        ...village,
        needsMetPercent: getNeedsMetPercent(village),
        partnerNames: village.assignedNGOIds
          .map((id) => ngoNameById.get(id) ?? id)
          .join(", "),
      })),
    [villages, ngoNameById],
  );

  const columnDefs = useMemo<ColDef<VillageRow>[]>(
    () => [
      { field: "name", headerName: "Village", filter: "agTextColumnFilter", flex: 1.2, minWidth: 150 },
      { field: "district", headerName: "District", filter: "agTextColumnFilter", flex: 1, minWidth: 120 },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "population",
        headerName: "Population",
        filter: "agNumberColumnFilter",
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "unmetNeedsCount",
        headerName: "Unmet Needs",
        filter: "agNumberColumnFilter",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "needsMetPercent",
        headerName: "Needs Met %",
        filter: "agNumberColumnFilter",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value == null ? "" : `${params.value}%`,
      },
      {
        field: "coverageStatus",
        headerName: "Coverage",
        filter: "agTextColumnFilter",
        cellRenderer: CoverageCell,
        flex: 1.1,
        minWidth: 160,
      },
      {
        field: "partnerNames",
        headerName: "Assigned NGOs",
        filter: "agTextColumnFilter",
        flex: 1.4,
        minWidth: 180,
      },
    ],
    [],
  );

  return (
    <section className="animate-rise flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <MapIcon className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Geographic coverage
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-2xl lg:text-3xl">
            Assignment & unserved zone map
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Google Map coverage overlay. Select a critical/unserved village pin to assign
            a partner.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[var(--line)] bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              viewMode === "map"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              viewMode === "table"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard label="Total Villages" value={metrics.totalVillages} />
        <MetricCard label="Fully Covered" value={metrics.fullyCovered} tone="green" />
        <MetricCard label="Partially Covered" value={metrics.partiallyCovered} tone="yellow" />
        <MetricCard label="Critical Unserved" value={metrics.criticalUnserved} tone="red" />
      </div>

      {viewMode === "map" ? (
        <CoverageGoogleMap
          villages={villages}
          ngoNameById={ngoNameById}
          highlightedVillageId={highlightedVillageId}
          highlightedNgoId={highlightedNgoId}
          selectedVillageId={selectedVillage?.id ?? null}
          onSelectVillage={onSelectVillage}
        />
      ) : (
        <div className="min-h-[240px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] sm:min-h-[360px] lg:min-h-[480px]">
          <div className="map-stage-tall w-full p-2">
            <AgGridReact<VillageRow>
              theme={gridTheme}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
              }}
              getRowId={(params) => params.data.id}
              onRowClicked={(event) => {
                if (event.data) onSelectVillage(event.data.id);
              }}
              getRowStyle={(params): RowStyle | undefined => {
                if (params.data?.id === highlightedVillageId) {
                  return {
                    background: "#e8f2ee",
                    borderLeft: "3px solid #0f6e56",
                  };
                }
                if (params.data?.coverageStatus === "UNSERVED_CRITICAL") {
                  return { background: "#fef2f2" };
                }
                if (params.data?.coverageStatus === "PARTIALLY_SERVED") {
                  return { background: "#fffbeb" };
                }
                if (params.data?.coverageStatus === "SERVED") {
                  return { background: "#f0fdf6" };
                }
                return undefined;
              }}
            />
          </div>
        </div>
      )}

      <AssignPartnerDrawer
        village={selectedVillage}
        assignableNgos={assignableNgos}
        dispatchAlerts={dispatchAlerts}
        onClose={onCloseDrawer}
        onAssign={onAssign}
      />
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "yellow" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-[#86efac] bg-[#f0fdf4]"
      : tone === "yellow"
        ? "border-[#fde68a] bg-[#fffbeb]"
        : tone === "red"
          ? "border-[#fecaca] bg-[#fef2f2]"
          : "border-[var(--line)] bg-white/70";

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}
