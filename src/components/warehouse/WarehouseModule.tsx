"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Map } from "lucide-react";
import { WarehouseDirectoryGrid } from "@/components/warehouse/WarehouseDirectoryGrid";
import { WarehouseFocusMap } from "@/components/warehouse/WarehouseFocusMap";
import { WarehouseSummaryTile } from "@/components/warehouse/WarehouseSummaryTile";
import { useAppRole } from "@/hooks/useAppRole";
import { useWarehouseModuleState } from "@/hooks/useWarehouseModuleState";

type DirectoryView = "grid" | "map";

export function WarehouseModule() {
  const searchParams = useSearchParams();
  const initialDistrict = useMemo(
    () => searchParams.get("district"),
    [searchParams],
  );
  const { isAdmin, loading: roleLoading } = useAppRole();
  const [view, setView] = useState<DirectoryView>("grid");
  const canUpload = !roleLoading && isAdmin;

  const state = useWarehouseModuleState(initialDistrict);

  return (
    <div className="flex flex-col gap-6">
      {state.flash ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {state.flash}
        </div>
      ) : null}

      {state.loading ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading warehouse data…</p>
      ) : null}

      <WarehouseSummaryTile
        macro={state.snapshot.macro}
        districts={state.snapshot.districts}
        selectedDistrict={state.selectedDistrict}
        onSelectDistrict={state.selectDistrict}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Directory & operations map
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Toggle between the warehouse grid and the operational map. Anyone can
            download Excel; only admins can upload.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Warehouse directory view"
          className="inline-flex rounded-xl border border-[var(--line)] bg-white/80 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "grid"}
            onClick={() => setView("grid")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
              view === "grid"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Grid
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "map"}
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
              view === "map"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <Map className="h-4 w-4" aria-hidden />
            Map
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <WarehouseDirectoryGrid
          warehouses={state.warehouses}
          selectedDistrict={state.selectedDistrict}
          focusedWarehouseId={state.focusedWarehouseId}
          canUpload={canUpload}
          onClearDistrictFilter={() => state.selectDistrict(null)}
          onSelectWarehouse={(coordinates, warehouseId) => {
            state.selectWarehouse(coordinates, warehouseId);
            setView("map");
          }}
          onAuditStock={state.auditStock}
          onImportWarehouses={state.upsertWarehouses}
          onFlash={state.setFlash}
        />
      ) : (
        <WarehouseFocusMap
          className="h-[min(70vh,720px)] min-h-[420px]"
          warehouses={state.warehouses}
          focusedWarehouse={state.focusedWarehouse}
          onSelectWarehouse={state.selectWarehouse}
        />
      )}
    </div>
  );
}
