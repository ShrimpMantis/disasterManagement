"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { Tent } from "lucide-react";
import type {
  CampBuildingType,
  CampStatus,
  ReliefCampFacility,
} from "@/types/villageAssets";
import {
  CAMP_BUILDING_LABELS,
  CAMP_STATUS_LABELS,
} from "@/types/villageAssets";

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

type ReliefCampGridProps = {
  camps: ReliefCampFacility[];
};

function OccupancyBar({ camp }: { camp: ReliefCampFacility }) {
  const pct =
    camp.maxCapacityPersons > 0
      ? Math.min(100, Math.round((camp.currentOccupancy / camp.maxCapacityPersons) * 100))
      : 0;
  return (
    <div className="flex min-w-[140px] flex-col gap-1 py-1">
      <div className="flex justify-between text-[11px] text-[var(--ink-muted)]">
        <span>
          {camp.currentOccupancy}/{camp.maxCapacityPersons}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8eef2]">
        <div
          className={`h-full rounded-full ${
            pct >= 95
              ? "bg-[#b91c1c]"
              : pct >= 70
                ? "bg-[#ea580c]"
                : "bg-[var(--accent)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CampStatus }) {
  const styles: Record<CampStatus, string> = {
    STANDBY: "bg-[#eef2ff] text-[#3730a3]",
    ACTIVE: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    FULL: "bg-[#fff7ed] text-[#9a3412]",
    CLOSED: "bg-[#f3f4f6] text-[#6b7280]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {CAMP_STATUS_LABELS[status]}
    </span>
  );
}

export function ReliefCampGrid({ camps }: ReliefCampGridProps) {
  const columnDefs = useMemo<ColDef<ReliefCampFacility>[]>(
    () => [
      { field: "campName", headerName: "Camp Name", flex: 1.4, minWidth: 180 },
      { field: "villageName", headerName: "Village", flex: 1.1, minWidth: 140 },
      {
        field: "buildingType",
        headerName: "Building Type",
        flex: 1.1,
        minWidth: 140,
        valueFormatter: (params) =>
          params.value
            ? CAMP_BUILDING_LABELS[params.value as CampBuildingType]
            : "",
      },
      {
        headerName: "GPS Coordinates",
        flex: 1.1,
        minWidth: 150,
        valueGetter: (params) => {
          const coords = params.data?.coordinates;
          if (!coords) return "—";
          return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
        },
      },
      {
        headerName: "Capacity vs Occupancy",
        flex: 1.3,
        minWidth: 170,
        sortable: false,
        cellRenderer: (params: ICellRendererParams<ReliefCampFacility>) =>
          params.data ? <OccupancyBar camp={params.data} /> : null,
      },
      {
        headerName: "Sanitation",
        flex: 1.2,
        minWidth: 160,
        valueGetter: (params) => {
          if (!params.data) return "";
          const water = params.data.hasRunningWater ? "Water" : "No water";
          const power = params.data.hasPowerGenerator ? "Gen" : "No gen";
          return `${params.data.toiletCount} toilets · ${water} · ${power}`;
        },
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.9,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<ReliefCampFacility, CampStatus>) =>
          params.value ? <StatusPill status={params.value} /> : null,
      },
      {
        headerName: "In-Charge Contact",
        flex: 1.4,
        minWidth: 180,
        valueGetter: (params) =>
          params.data
            ? `${params.data.inChargeName} · ${params.data.inChargePhone}`
            : "",
      },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
          <Tent className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-[0.14em]">
            Relief camp master list
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
          Shelter & camp infrastructure
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Schools, halls, cyclone shelters, and tents with occupancy, sanitation, and
          camp in-charge contacts.
        </p>
      </div>

      <div className="h-[min(42dvh,320px)] sm:h-[min(60vh,560px)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
        <AgGridReact<ReliefCampFacility>
          theme={gridTheme}
          rowData={camps}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            floatingFilter: true,
          }}
          getRowId={(params) => params.data.id}
        />
      </div>
    </section>
  );
}
