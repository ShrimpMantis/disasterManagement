"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowSelectionOptions,
  type SelectionChangedEvent,
} from "ag-grid-community";
import { Phone, Radio } from "lucide-react";
import type { AssetStatus, BoatType, CountryBoatOwner } from "@/types/villageAssets";
import {
  ASSET_STATUS_LABELS,
  BOAT_TYPE_LABELS,
} from "@/types/villageAssets";
import { DispatchSmsDrawer } from "@/components/villageAssets/DispatchSmsDrawer";

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

type BoatOwnerRegistryProps = {
  boats: CountryBoatOwner[];
  onDispatch: (payload: {
    boatIds: string[];
    destinationLabel: string;
    coordinates: string;
    message: string;
  }) => void;
};

function StatusPill({ status }: { status: AssetStatus }) {
  const styles: Record<AssetStatus, string> = {
    AVAILABLE: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    DEPLOYED: "bg-[#fff7ed] text-[#9a3412]",
    UNAVAILABLE: "bg-[#f3f4f6] text-[#6b7280]",
    DAMAGED: "bg-[#fef2f2] text-[#b91c1c]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}

export function BoatOwnerRegistry({ boats, onDispatch }: BoatOwnerRegistryProps) {
  const [boatTypeFilter, setBoatTypeFilter] = useState<BoatType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [circleFilter, setCircleFilter] = useState("ALL");
  const [selected, setSelected] = useState<CountryBoatOwner[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const revenueCircles = useMemo(
    () =>
      Array.from(new Set(boats.map((boat) => boat.revenueCircle))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [boats],
  );

  const filtered = useMemo(
    () =>
      boats.filter((boat) => {
        if (boatTypeFilter !== "ALL" && boat.boatType !== boatTypeFilter) return false;
        if (statusFilter !== "ALL" && boat.status !== statusFilter) return false;
        if (circleFilter !== "ALL" && boat.revenueCircle !== circleFilter) return false;
        return true;
      }),
    [boatTypeFilter, boats, circleFilter, statusFilter],
  );

  const columnDefs = useMemo<ColDef<CountryBoatOwner>[]>(
    () => [
      {
        field: "ownerName",
        headerName: "Owner Name",
        flex: 1.2,
        minWidth: 150,
      },
      { field: "primaryPhone", headerName: "Phone", flex: 1.1, minWidth: 140 },
      { field: "villageName", headerName: "Village", flex: 1.1, minWidth: 140 },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        flex: 1.1,
        minWidth: 140,
      },
      {
        field: "boatType",
        headerName: "Boat Type",
        flex: 1,
        minWidth: 130,
        valueFormatter: (params) =>
          params.value ? BOAT_TYPE_LABELS[params.value as BoatType] : "",
      },
      {
        field: "passengerCapacity",
        headerName: "Passenger Capacity",
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<CountryBoatOwner, AssetStatus>) =>
          params.value ? <StatusPill status={params.value} /> : null,
      },
      {
        headerName: "Quick Call",
        flex: 0.9,
        minWidth: 110,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<CountryBoatOwner>) => {
          if (!params.data) return null;
          const phone = params.data.primaryPhone.replace(/\s+/g, "");
          return (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--accent-strong)]"
            >
              <Phone className="h-3 w-3" aria-hidden />
              Call
            </a>
          );
        },
      },
    ],
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: "multiRow", checkboxes: true, headerCheckbox: true }),
    [],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <Radio className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Boat & local transport
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
            Country boat owner registry
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Select operators and dispatch a mobilization SMS with destination coordinates.
          </p>
        </div>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => setDrawerOpen(true)}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Dispatch Alert SMS ({selected.length})
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--ink-muted)]">Boat type</span>
          <select
            value={boatTypeFilter}
            onChange={(event) =>
              setBoatTypeFilter(event.target.value as BoatType | "ALL")
            }
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="ALL">All types</option>
            {(Object.keys(BOAT_TYPE_LABELS) as BoatType[]).map((type) => (
              <option key={type} value={type}>
                {BOAT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--ink-muted)]">Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as AssetStatus | "ALL")
            }
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          >
            <option value="ALL">All statuses</option>
            {(Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      <div className="h-[min(60vh,560px)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
        <AgGridReact<CountryBoatOwner>
          theme={gridTheme}
          rowData={filtered}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: true, floatingFilter: true }}
          rowSelection={rowSelection}
          getRowId={(params) => params.data.id}
          onSelectionChanged={(event: SelectionChangedEvent<CountryBoatOwner>) => {
            setSelected(event.api.getSelectedRows());
          }}
        />
      </div>

      <DispatchSmsDrawer
        open={drawerOpen}
        boats={selected}
        onClose={() => setDrawerOpen(false)}
        onSend={(payload) => {
          onDispatch(payload);
          setDrawerOpen(false);
          setSelected([]);
        }}
      />
    </section>
  );
}
