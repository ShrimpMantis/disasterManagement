"use client";

import {
  useCallback,
  useEffect,
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
  type GridApi,
  type GridReadyEvent,
  type RowSelectionOptions,
} from "ag-grid-community";
import { fetchDashboardOpsSnapshot } from "@/actions/dashboardOpsActions";
import { fetchEmergencyAssetsSnapshot } from "@/actions/emergencyAssetActions";
import {
  downloadTemplate,
  exportVillagesToExcel,
  parseExcelFile,
} from "@/lib/villages/excel";
import type { ValidationError, VillageReliefRow } from "@/lib/villages/types";
import { ValidationErrorModal } from "./ValidationErrorModal";
import {
  buildVillageAssetSummaries,
  getAssetSummaryByVillageId,
} from "@/lib/villageAssets/aggregation";
import type { VillageGeoNode } from "@/types/geo";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";

ModuleRegistry.registerModules([AllCommunityModule]);

type VillageGridRow = VillageReliefRow & {
  gaonBurhaOrPradhan: string;
  availableBoats: number;
  safeHighLands: number;
  nearestReliefCamp: string;
};

function withAssetIndicators(
  villages: VillageReliefRow[],
  assetVillages: VillageGeoNode[],
  boats: CountryBoatOwner[],
  highLands: HighLandZone[],
  camps: ReliefCampFacility[],
): VillageGridRow[] {
  const summaries = getAssetSummaryByVillageId(
    buildVillageAssetSummaries(
      assetVillages.map((village) => ({
        id: village.id,
        name: village.name,
        revenueCircle: village.revenueCircle,
        district: village.district,
        coordinates: village.coordinates,
      })),
      boats,
      highLands,
      camps,
    ),
  );

  return villages.map((village) => {
    const summary = summaries.get(village.id);
    const campLabel = summary
      ? summary.nearestReliefCampDistanceKm == null
        ? summary.nearestReliefCampName
        : `${summary.nearestReliefCampName} (${summary.nearestReliefCampDistanceKm} km)`
      : "—";
    return {
      ...village,
      gaonBurhaOrPradhan: summary?.gaonBurhaOrPradhan ?? "—",
      availableBoats: summary?.availableBoats ?? 0,
      safeHighLands: summary?.safeHighLands ?? 0,
      nearestReliefCamp: campLabel,
    };
  });
}

function toVillageGridRow(village: VillageGeoNode): VillageReliefRow {
  const fulfillmentStatus =
    village.coverageStatus === "SERVED"
      ? "Fulfilled"
      : village.coverageStatus === "PARTIALLY_SERVED"
        ? "Partial"
        : "Pending";
  return {
    id: village.id,
    villageName: village.name,
    area: "—",
    peopleLikelyAffected: village.population,
    vulnerability:
      village.coverageStatus === "UNSERVED_CRITICAL" ? "Critical" : "Medium",
    revenueCircle: village.revenueCircle,
    district: village.district,
    fulfillmentStatus,
    unmetNeeds:
      village.unmetNeedsCount > 0 ? `${village.unmetNeedsCount} pending units` : "None",
    lastReliefDelivered: "—",
  };
}

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

export function VillageReliefGrid() {
  const gridApiRef = useRef<GridApi<VillageGridRow> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetVillages, setAssetVillages] = useState<VillageGeoNode[]>([]);
  const [boats, setBoats] = useState<CountryBoatOwner[]>([]);
  const [highLands, setHighLands] = useState<HighLandZone[]>([]);
  const [camps, setCamps] = useState<ReliefCampFacility[]>([]);
  const [loading, setLoading] = useState(true);

  const [rowData, setRowData] = useState<VillageGridRow[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const [dashboardResult, assetResult] = await Promise.all([
          fetchDashboardOpsSnapshot(),
          fetchEmergencyAssetsSnapshot(),
        ]);

        if (dashboardResult.ok && assetResult.ok) {
          const villages = dashboardResult.data.villages;
          setAssetVillages(villages);
          setBoats(assetResult.data.boats);
          setHighLands(assetResult.data.highLands);
          setCamps(assetResult.data.camps);
          setRowData(
            withAssetIndicators(
              villages.map(toVillageGridRow),
              villages,
              assetResult.data.boats,
              assetResult.data.highLands,
              assetResult.data.camps,
            ),
          );
        } else {
          setUploadMessage(
            !dashboardResult.ok
              ? dashboardResult.error
              : !assetResult.ok
                ? assetResult.error
                : "Failed to load village relief data.",
          );
        }

        setLoading(false);
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const columnDefs = useMemo<ColDef<VillageGridRow>[]>(
    () => [
      {
        field: "villageName",
        headerName: "Village Name",
        filter: "agTextColumnFilter",
        flex: 1.2,
        minWidth: 150,
      },
      {
        field: "gaonBurhaOrPradhan",
        headerName: "Gaon Burha / Gaon Pradhan",
        filter: "agTextColumnFilter",
        flex: 1.3,
        minWidth: 180,
      },
      {
        field: "area",
        headerName: "Area",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "peopleLikelyAffected",
        headerName: "People Likely Affected",
        filter: "agNumberColumnFilter",
        flex: 1.1,
        minWidth: 160,
      },
      {
        field: "vulnerability",
        headerName: "Vulnerability",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 140,
      },
      {
        field: "district",
        headerName: "District",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "availableBoats",
        headerName: "Available Boats",
        filter: "agNumberColumnFilter",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "safeHighLands",
        headerName: "Safe High Lands",
        filter: "agNumberColumnFilter",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "nearestReliefCamp",
        headerName: "Nearest Relief Camp",
        filter: "agTextColumnFilter",
        flex: 1.5,
        minWidth: 200,
      },
      {
        field: "fulfillmentStatus",
        headerName: "Fulfillment Status",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 150,
      },
      {
        field: "unmetNeeds",
        headerName: "Unmet Needs",
        filter: "agTextColumnFilter",
        flex: 1.3,
        minWidth: 170,
      },
      {
        field: "lastReliefDelivered",
        headerName: "Last Relief Delivered",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 160,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<VillageGridRow>>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
    }),
    [],
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
    }),
    [],
  );

  const onGridReady = useCallback((event: GridReadyEvent<VillageGridRow>) => {
    gridApiRef.current = event.api;
  }, []);

  const onSelectionChanged = useCallback(() => {
    const count = gridApiRef.current?.getSelectedRows().length ?? 0;
    setSelectedCount(count);
  }, []);

  const handleDownload = useCallback(() => {
    const api = gridApiRef.current;
    const selected = api?.getSelectedRows() ?? [];
    const exportRows =
      selected.length > 0
        ? selected
        : (() => {
            const rows: VillageGridRow[] = [];
            api?.forEachNodeAfterFilterAndSort((node) => {
              if (node.data) rows.push(node.data);
            });
            return rows.length > 0 ? rows : rowData;
          })();

    exportVillagesToExcel(exportRows);
    setUploadMessage(
      selected.length > 0
        ? `Downloaded ${selected.length} selected row(s).`
        : `Downloaded ${exportRows.length} row(s).`,
    );
  }, [rowData]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
        setErrors([
          {
            row: 1,
            column: "A",
            field: "villageName",
            value: file.name,
            message:
              "row 1 column A invalid file — only .xlsx, .xls, or .csv files are supported",
          },
        ]);
        setShowErrors(true);
        setUploadMessage("");
        return;
      }

      setUploadBusy(true);
      setUploadMessage("");

      try {
        const buffer = await file.arrayBuffer();
        const { validRows, errors: parseErrors } = parseExcelFile(buffer);

        if (parseErrors.length > 0) {
          setErrors(parseErrors);
          setShowErrors(true);
          setUploadMessage("Upload rejected — fix validation errors and try again.");
          return;
        }

        setRowData(
          withAssetIndicators(validRows, assetVillages, boats, highLands, camps),
        );
        setSelectedCount(0);
        setUploadMessage(`Uploaded ${validRows.length} valid row(s) into the grid.`);
      } catch {
        setErrors([
          {
            row: 1,
            column: "A",
            field: "villageName",
            value: file.name,
            message:
              "row 1 column A invalid file — could not parse the spreadsheet",
          },
        ]);
        setShowErrors(true);
        setUploadMessage("Upload failed — the grid was not changed.");
      } finally {
        setUploadBusy(false);
      }
    },
    [assetVillages, boats, camps, highLands],
  );

  return (
    <section className="animate-rise flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-2xl lg:text-3xl">
            Village relief assessment
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Select rows, filter any column, and exchange data via Excel.
            {selectedCount > 0 ? ` ${selectedCount} selected.` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
          >
            Template
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploadBusy}
            className="rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadBusy ? "Uploading…" : "Upload Excel"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {uploadMessage ? (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {uploadMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading village data…</p>
      ) : null}

      <div className="min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] sm:min-h-[400px] lg:min-h-[480px]">
        <div className="h-[min(50dvh,480px)] w-full p-2 sm:h-[min(70vh,720px)]">
          <AgGridReact<VillageGridRow>
            theme={gridTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={rowSelection}
            getRowId={(params) => params.data.id}
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            animateRows
            suppressCellFocus={false}
          />
        </div>
      </div>

      <ValidationErrorModal
        open={showErrors}
        errors={errors}
        onClose={() => setShowErrors(false)}
      />
    </section>
  );
}
