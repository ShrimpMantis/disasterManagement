"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { Download, MapPin, Package, Upload } from "lucide-react";
import type { WarehouseLocation } from "@/types/warehouseModule";
import {
  FACILITY_TYPE_LABELS,
  HEADROOM_BAND_CLASS,
  WAREHOUSE_STATUS_BADGE_CLASS,
  WAREHOUSE_STATUS_LABELS,
  headroomBand,
} from "@/types/warehouseModule";
import {
  exportWarehousesToExcel,
  parseWarehouseExcelFile,
} from "@/lib/warehouse/excel";

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

type WarehouseDirectoryGridProps = {
  warehouses: WarehouseLocation[];
  selectedDistrict?: string | null;
  focusedWarehouseId?: string | null;
  canUpload?: boolean;
  onClearDistrictFilter?: () => void;
  onSelectWarehouse: (
    coordinates: { lat: number; lng: number },
    warehouseId: string,
  ) => void;
  onAuditStock: (
    warehouseId: string,
    currentStockTons: number,
  ) => Promise<boolean>;
  onImportWarehouses: (warehouses: WarehouseLocation[]) => void;
  onFlash?: (message: string) => void;
};

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function WarehouseDirectoryGrid({
  warehouses,
  selectedDistrict,
  focusedWarehouseId,
  canUpload = false,
  onClearDistrictFilter,
  onSelectWarehouse,
  onAuditStock,
  onImportWarehouses,
  onFlash,
}: WarehouseDirectoryGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auditTarget, setAuditTarget] = useState<WarehouseLocation | null>(null);
  const [auditValue, setAuditValue] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const columnDefs = useMemo<ColDef<WarehouseLocation>[]>(
    () => [
      {
        headerName: "Warehouse & type",
        flex: 1.6,
        minWidth: 200,
        valueGetter: (params) => params.data?.warehouseName ?? "",
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data) return null;
          return (
            <div className="flex h-full flex-col justify-center py-1">
              <span className="font-medium text-[var(--ink)]">
                {params.data.warehouseName}
              </span>
              <span className="text-[11px] text-[var(--ink-muted)]">
                {FACILITY_TYPE_LABELS[params.data.facilityType]}
              </span>
            </div>
          );
        },
      },
      {
        field: "district",
        headerName: "District",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "revenueCircle",
        headerName: "Revenue circle",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "villageTown",
        headerName: "Village / town",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "address",
        headerName: "Address",
        flex: 1.3,
        minWidth: 160,
      },
      {
        headerName: "Point of contact",
        flex: 1.4,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data) return null;
          return (
            <div className="flex h-full items-center gap-1.5 overflow-hidden text-[12px]">
              <span className="shrink-0 font-medium text-[var(--ink)]">
                {params.data.pointOfContactName}
              </span>
              <span className="shrink-0 text-[var(--ink-muted)]" aria-hidden>
                ·
              </span>
              <span className="min-w-0 truncate text-[var(--ink-muted)]">
                Owner: {params.data.ownerName}
              </span>
            </div>
          );
        },
      },
      {
        field: "pointOfContactPhone",
        headerName: "Phone",
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data?.pointOfContactPhone) return null;
          return (
            <div className="flex h-full items-center">
              <a
                href={telHref(params.data.pointOfContactPhone)}
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                {params.data.pointOfContactPhone}
              </a>
            </div>
          );
        },
      },
      {
        field: "totalCapacityTons",
        headerName: "Capacity (MT)",
        flex: 0.8,
        minWidth: 110,
        type: "numericColumn",
      },
      {
        field: "currentStockTons",
        headerName: "Stocked (MT)",
        flex: 0.8,
        minWidth: 110,
        type: "numericColumn",
      },
      {
        field: "outstandingCapacityTons",
        headerName: "Outstanding (MT)",
        flex: 1,
        minWidth: 140,
        type: "numericColumn",
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data) return null;
          const band = headroomBand(params.data);
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEADROOM_BAND_CLASS[band]}`}
            >
              {params.data.outstandingCapacityTons} MT
            </span>
          );
        },
      },
      {
        field: "capacityStatus",
        headerName: "Status",
        flex: 1.1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data) return null;
          return (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${WAREHOUSE_STATUS_BADGE_CLASS[params.data.capacityStatus]}`}
            >
              {WAREHOUSE_STATUS_LABELS[params.data.capacityStatus]}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        flex: 1.5,
        minWidth: 220,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<WarehouseLocation>) => {
          if (!params.data) return null;
          const row = params.data;
          return (
            <div className="flex h-full items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onSelectWarehouse(row.coordinates, row.warehouseId)
                }
                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--ink)] hover:bg-[var(--accent-soft)]"
              >
                <MapPin className="h-3 w-3" aria-hidden />
                Focus Map
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuditTarget(row);
                  setAuditValue(String(row.currentStockTons));
                }}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white"
              >
                <Package className="h-3 w-3" aria-hidden />
                Audit Stock
              </button>
            </div>
          );
        },
      },
    ],
    [onSelectWarehouse],
  );

  const handleDownload = useCallback(() => {
    const filename = exportWarehousesToExcel(
      warehouses,
      selectedDistrict
        ? `warehouse-directory-${selectedDistrict.toLowerCase().replace(/\s+/g, "-")}.xlsx`
        : "warehouse-directory.xlsx",
    );
    onFlash?.(`Downloaded ${warehouses.length} warehouse row(s): ${filename}`);
  }, [warehouses, selectedDistrict, onFlash]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!canUpload) {
        onFlash?.("Only admin users can upload warehouse spreadsheets.");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "xlsx" && extension !== "xls") {
        setUploadErrors([
          "Only .xlsx or .xls files are supported for warehouse uploads.",
        ]);
        return;
      }

      setUploadBusy(true);
      setUploadErrors([]);
      try {
        const buffer = await file.arrayBuffer();
        const { warehouses: parsed, errors } =
          await parseWarehouseExcelFile(buffer);
        if (errors.length > 0) {
          setUploadErrors(errors.slice(0, 8).map((entry) => entry.message));
          onFlash?.(
            "Upload rejected — fix validation errors and try again.",
          );
          return;
        }
        if (parsed.length === 0) {
          setUploadErrors(["No warehouse rows found in the spreadsheet."]);
          return;
        }
        onImportWarehouses(parsed);
        setUploadErrors([]);
      } catch {
        setUploadErrors(["Could not parse the spreadsheet."]);
        onFlash?.("Upload failed — the directory was not changed.");
      } finally {
        setUploadBusy(false);
      }
    },
    [canUpload, onFlash, onImportWarehouses],
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Warehouse directory
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            {selectedDistrict
              ? `Filtered to ${selectedDistrict}`
              : "All monitored districts"}{" "}
            · {warehouses.length} facilities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedDistrict ? (
            <button
              type="button"
              onClick={onClearDistrictFilter}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
            >
              Clear district filter
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--accent-soft)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download Excel
          </button>
          {/* Upload is admin-only — never mount for non-admin users */}
          {canUpload === true ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {uploadBusy ? "Uploading…" : "Upload XLSX"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {uploadErrors.length > 0 ? (
        <div className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]">
          <p className="font-semibold">Upload validation errors</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {uploadErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="h-[min(62vh,640px)] w-full overflow-hidden rounded-xl border border-[var(--line)] bg-white/70 p-2">
        <AgGridReact<WarehouseLocation>
          theme={gridTheme}
          rowData={warehouses}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            floatingFilter: true,
          }}
          getRowId={(params) => params.data.warehouseId}
          rowHeight={64}
          getRowClass={(params) =>
            params.data?.warehouseId === focusedWarehouseId
              ? "bg-[var(--accent-soft)]"
              : undefined
          }
        />
      </div>

      {auditTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-stock-title"
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl"
          >
            <h3
              id="audit-stock-title"
              className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]"
            >
              Audit stock · {auditTarget.warehouseName}
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Capacity {auditTarget.totalCapacityTons} MT · last audited{" "}
              {new Date(auditTarget.lastAuditedTimestamp).toLocaleString()}
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">
                Current stocked weight (MT)
              </span>
              <input
                type="number"
                min={0}
                max={auditTarget.totalCapacityTons}
                step={0.1}
                value={auditValue}
                onChange={(event) => setAuditValue(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAuditTarget(null)}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={auditing}
                onClick={async () => {
                  const value = Number(auditValue);
                  if (!Number.isFinite(value) || value < 0) return;
                  setAuditing(true);
                  const ok = await onAuditStock(auditTarget.warehouseId, value);
                  setAuditing(false);
                  if (ok) setAuditTarget(null);
                }}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {auditing ? "Saving…" : "Save audit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
