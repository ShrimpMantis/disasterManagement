"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type ValueGetterParams,
} from "ag-grid-community";
import {
  AlertTriangle,
  Building2,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import {
  matchesNGOSearch,
  matchesSectorFilters,
  toNGODirectoryRow,
  type NGODirectoryRow,
} from "@/lib/ngo/status";
import {
  ALL_SECTORS,
  NGO_STATUS_LABELS,
  SECTOR_LABELS,
  type NGOProfile,
  type NGOStatus,
  type SectorCategory,
} from "@/types/ngo";

ModuleRegistry.registerModules([AllCommunityModule]);

type ViewMode = "grid" | "cards";

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

function StatusBadge({
  status,
  showWarning = false,
}: {
  status: NGOStatus;
  showWarning?: boolean;
}) {
  const styles: Record<NGOStatus, string> = {
    ACTIVE: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    STANDBY: "bg-[#eef3f8] text-[#35506b]",
    MAX_CAPACITY: "bg-[#fff1e6] text-[#9a3412] ring-1 ring-[#fdba74]",
    INACTIVE: "bg-[#f3f4f6] text-[#6b7280]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {(showWarning || status === "MAX_CAPACITY") && (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      )}
      {NGO_STATUS_LABELS[status]}
    </span>
  );
}

function MatchScoreMeter({ score, atMax }: { score: number; atMax: boolean }) {
  const tone =
    atMax || score <= 15
      ? "bg-[#ea580c]"
      : score <= 40
        ? "bg-[#d97706]"
        : "bg-[var(--accent)]";

  return (
    <div className="min-w-[88px]">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--ink)]">{score}</span>
        <span className="text-[var(--ink-muted)]">/ 100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(21,32,43,0.08)]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function StatusCell(params: ICellRendererParams<NGODirectoryRow, NGOStatus>) {
  if (!params.value || !params.data) return null;
  return (
    <StatusBadge
      status={params.value}
      showWarning={params.data.hasMaxedCapability}
    />
  );
}

function MatchScoreCell(params: ICellRendererParams<NGODirectoryRow, number>) {
  if (params.value == null || !params.data) return null;
  return (
    <MatchScoreMeter
      score={params.value}
      atMax={params.data.hasMaxedCapability}
    />
  );
}

function SectorsCell(params: ICellRendererParams<NGODirectoryRow>) {
  const keys = params.data?.sectorKeys ?? [];
  if (keys.length === 0) return <span className="text-[var(--ink-muted)]">—</span>;

  return (
    <div className="flex flex-wrap gap-1 py-1">
      {keys.map((sector) => {
        const maxed = params.data?.maxedSectors.includes(sector);
        return (
          <span
            key={sector}
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${
              maxed
                ? "bg-[#fff7ed] text-[#9a3412] ring-[#fdba74]"
                : "bg-white/90 text-[var(--ink)] ring-[var(--line)]"
            }`}
          >
            {SECTOR_LABELS[sector]}
          </span>
        );
      })}
    </div>
  );
}

export function NGODirectoryGrid({
  ngos = [],
  selectedNgoId = null,
  onSelectNgo,
}: {
  ngos?: NGOProfile[];
  selectedNgoId?: string | null;
  onSelectNgo?: (ngoId: string | null) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<SectorCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<NGOStatus | "ALL">("ALL");

  const allRows = useMemo(() => ngos.map(toNGODirectoryRow), [ngos]);

  const rowData = useMemo(() => {
    return allRows.filter((row) => {
      const searchOk = matchesNGOSearch(row, searchQuery);
      const sectorOk = matchesSectorFilters(row, selectedSectors);
      const statusOk =
        statusFilter === "ALL" || row.computedStatus === statusFilter;
      return searchOk && sectorOk && statusOk;
    });
  }, [allRows, searchQuery, selectedSectors, statusFilter]);

  const summary = useMemo(() => {
    const active = rowData.filter((row) => row.computedStatus === "ACTIVE").length;
    const maxCapacity = rowData.filter(
      (row) => row.computedStatus === "MAX_CAPACITY",
    ).length;
    const standby = rowData.filter((row) => row.computedStatus === "STANDBY").length;
    const avgMatch =
      rowData.length === 0
        ? 0
        : Math.round(
            rowData.reduce((sum, row) => sum + row.capabilityMatchScore, 0) /
              rowData.length,
          );
    return { active, maxCapacity, standby, total: rowData.length, avgMatch };
  }, [rowData]);

  function toggleSector(sector: SectorCategory) {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((item) => item !== sector)
        : [...prev, sector],
    );
  }

  const columnDefs = useMemo<ColDef<NGODirectoryRow>[]>(
    () => [
      {
        field: "name",
        headerName: "NGO",
        filter: "agTextColumnFilter",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "computedStatus",
        headerName: "Status",
        filter: "agTextColumnFilter",
        cellRenderer: StatusCell,
        flex: 1,
        minWidth: 140,
      },
      {
        field: "capabilityMatchScore",
        headerName: "Match Score",
        filter: "agNumberColumnFilter",
        cellRenderer: MatchScoreCell,
        flex: 1,
        minWidth: 140,
        sort: "desc",
      },
      {
        headerName: "Sectors",
        filter: "agTextColumnFilter",
        valueGetter: (params: ValueGetterParams<NGODirectoryRow>) =>
          (params.data?.sectorLabels ?? []).join(", "),
        cellRenderer: SectorsCell,
        flex: 1.6,
        minWidth: 220,
        autoHeight: true,
        wrapText: true,
      },
      {
        field: "totalDailyCapacity",
        headerName: "Daily Capacity",
        filter: "agNumberColumnFilter",
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: "totalAssignedUnits",
        headerName: "Assigned",
        filter: "agNumberColumnFilter",
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "remainingCapacity",
        headerName: "Remaining",
        filter: "agNumberColumnFilter",
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "utilizationPercent",
        headerName: "Utilization %",
        filter: "agNumberColumnFilter",
        flex: 0.9,
        minWidth: 130,
        valueFormatter: (params) =>
          params.value == null ? "" : `${params.value}%`,
      },
      {
        field: "villageCount",
        headerName: "Villages",
        filter: "agNumberColumnFilter",
        flex: 0.7,
        minWidth: 100,
      },
      {
        field: "contactName",
        headerName: "Primary Contact",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 150,
      },
      {
        field: "contactPhone",
        headerName: "Phone",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "contactEmail",
        headerName: "Email",
        filter: "agTextColumnFilter",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "capabilitiesSummary",
        headerName: "Capability Detail",
        filter: "agTextColumnFilter",
        flex: 1.8,
        minWidth: 260,
        tooltipField: "capabilitiesSummary",
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<NGODirectoryRow>>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
    }),
    [],
  );

  return (
    <section className="animate-rise flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <Building2 className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Sector directory
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-2xl lg:text-3xl">
            NGO & volunteer capability mapping
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Search NGOs, multi-select sectors, and rank by Capability Match Score.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryChip label="Shown" value={summary.total} />
          <SummaryChip label="Active" value={summary.active} />
          <SummaryChip label="Max capacity" value={summary.maxCapacity} />
          <SummaryChip label="Standby" value={summary.standby} />
          <SummaryChip label="Avg match" value={summary.avgMatch} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by NGO name, sector, or contact…"
              className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-10 pr-10 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="inline-flex rounded-xl border border-[var(--line)] bg-white/70 p-1">
            <ViewToggle
              active={viewMode === "cards"}
              label="Cards"
              icon={LayoutGrid}
              onClick={() => setViewMode("cards")}
            />
            <ViewToggle
              active={viewMode === "grid"}
              label="Grid"
              icon={List}
              onClick={() => setViewMode("grid")}
            />
          </div>
        </div>

        <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--ink)]">
            Sector filters
            <span className="ml-2 font-normal text-[var(--ink-muted)]">
              (multi-select)
            </span>
          </p>
          {selectedSectors.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedSectors([])}
              className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              Clear sectors
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_SECTORS.map((sector) => (
            <FilterChip
              key={sector}
              active={selectedSectors.includes(sector)}
              label={SECTOR_LABELS[sector]}
              onClick={() => toggleSector(sector)}
            />
          ))}
        </div>

        <div className="mb-2 mt-5 text-sm font-medium text-[var(--ink)]">Status filter</div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={statusFilter === "ALL"}
            label="All statuses"
            onClick={() => setStatusFilter("ALL")}
          />
          {(Object.keys(NGO_STATUS_LABELS) as NGOStatus[]).map((status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              label={NGO_STATUS_LABELS[status]}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-md sm:min-h-[400px] lg:min-h-[480px]">
          <div className="h-[min(50dvh,480px)] w-full p-2 sm:h-[min(70vh,720px)]">
            <AgGridReact<NGODirectoryRow>
              theme={gridTheme}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={(params) => params.data.id}
              animateRows
              tooltipShowDelay={400}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rowData.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
              No NGOs match the current search and filters.
            </p>
          ) : (
            rowData.map((row) => (
              <NGOCard
                key={row.id}
                row={row}
                selected={row.id === selectedNgoId}
                onSelect={() =>
                  onSelectNgo?.(selectedNgoId === row.id ? null : row.id)
                }
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function NGOCard({
  row,
  selected = false,
  onSelect,
}: {
  row: NGODirectoryRow;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-2xl border bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur-md transition ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
          : row.hasMaxedCapability
            ? "border-[#fdba74] ring-1 ring-[#fed7aa]"
            : "border-[var(--line)]"
      } ${onSelect ? "cursor-pointer hover:border-[var(--accent)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)]">
            {row.name}
          </h3>
          <p className="mt-1 truncate text-sm text-[var(--ink-muted)]">
            {row.contactName}
          </p>
        </div>
        <StatusBadge status={row.computedStatus} showWarning={row.hasMaxedCapability} />
      </div>

      {row.hasMaxedCapability ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Max capacity reached in{" "}
            {row.maxedSectors.map((sector) => SECTOR_LABELS[sector]).join(", ")}.
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          Capability match score
        </p>
        <MatchScoreMeter
          score={row.capabilityMatchScore}
          atMax={row.hasMaxedCapability}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {row.sectorKeys.map((sector) => {
          const maxed = row.maxedSectors.includes(sector);
          return (
            <span
              key={sector}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                maxed
                  ? "bg-[#fff7ed] text-[#9a3412] ring-1 ring-[#fdba74]"
                  : "bg-white/80 text-[var(--ink)] ring-1 ring-[var(--line)]"
              }`}
            >
              {SECTOR_LABELS[sector]}
            </span>
          );
        })}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4 text-sm">
        <div>
          <dt className="text-xs text-[var(--ink-muted)]">Capacity</dt>
          <dd className="font-semibold text-[var(--ink)]">{row.totalDailyCapacity}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--ink-muted)]">Assigned</dt>
          <dd className="font-semibold text-[var(--ink)]">{row.totalAssignedUnits}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--ink-muted)]">Remaining</dt>
          <dd className="font-semibold text-[var(--ink)]">{row.remainingCapacity}</dd>
        </div>
      </dl>

      <p className="mt-3 truncate text-xs text-[var(--ink-muted)]">
        {row.contactPhone} · {row.villageCount} village
        {row.villageCount === 1 ? "" : "s"}
      </p>
    </article>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{label}</p>
      <p className="text-lg font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--accent)] text-white"
          : "border border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function ViewToggle({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
