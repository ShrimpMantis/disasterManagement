"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClassParams,
  type RowStyle,
} from "ag-grid-community";
import { ClipboardCheck } from "lucide-react";
import type { PledgeAuditRow } from "@/types/pledge";

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

type PledgeAuditLedgerProps = {
  rows: PledgeAuditRow[];
  selectedNgoId?: string | null;
  onSelectNgo?: (ngoId: string | null) => void;
};

function formatInt(value: number | null | undefined): string {
  if (value == null) return "";
  return value.toLocaleString();
}

function CategoryCell(params: ICellRendererParams<PledgeAuditRow, string>) {
  if (!params.value) return null;
  return (
    <span className="inline-flex rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-[var(--ink)] ring-1 ring-[var(--line)]">
      {params.value}
    </span>
  );
}

function FulfillmentCell(params: ICellRendererParams<PledgeAuditRow, number>) {
  if (params.value == null || !params.data) return null;
  const percent = params.value;
  const band = params.data.fulfillmentBand;

  const barColor =
    band === "FULFILLED"
      ? "bg-[var(--accent)]"
      : band === "CRITICAL"
        ? "bg-[#dc2626]"
        : "bg-[#ca8a04]";

  const badge =
    band === "FULFILLED"
      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
      : band === "CRITICAL"
        ? "bg-[#fef2f2] text-[#b91c1c]"
        : "bg-[#fffbeb] text-[#a16207]";

  return (
    <div className="flex min-w-[140px] flex-col gap-1 py-1">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${badge}`}>
          {band === "FULFILLED" ? "Fulfilled" : `${percent}%`}
        </span>
        {params.data.isOverdue ? (
          <span className="rounded-md bg-[#7f1d1d] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            OVERDUE_DELIVERY
          </span>
        ) : null}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(21,32,43,0.08)]">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PledgeAuditLedger({
  rows,
  selectedNgoId = null,
  onSelectNgo,
}: PledgeAuditLedgerProps) {
  const overdueCount = useMemo(
    () => rows.filter((row) => row.isOverdue).length,
    [rows],
  );

  const columnDefs = useMemo<ColDef<PledgeAuditRow>[]>(
    () => [
      {
        field: "ngoName",
        headerName: "NGO Name",
        filter: "agTextColumnFilter",
        flex: 1.3,
        minWidth: 180,
      },
      {
        field: "reliefItemCategory",
        headerName: "Relief Item",
        filter: "agTextColumnFilter",
        cellRenderer: CategoryCell,
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: "quantityPledged",
        headerName: "Quantity Pledged",
        filter: "agNumberColumnFilter",
        valueFormatter: (params) => formatInt(params.value as number | null),
        flex: 1,
        minWidth: 140,
      },
      {
        field: "quantityDelivered",
        headerName: "Quantity Delivered",
        filter: "agNumberColumnFilter",
        valueFormatter: (params) => formatInt(params.value as number | null),
        flex: 1,
        minWidth: 150,
      },
      {
        field: "quantityInTransit",
        headerName: "In Transit",
        filter: "agNumberColumnFilter",
        valueFormatter: (params) => formatInt(params.value as number | null),
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "variance",
        headerName: "Variance",
        filter: "agNumberColumnFilter",
        valueFormatter: (params) => formatInt(params.value as number | null),
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "fulfillmentPercent",
        headerName: "Fulfillment Status",
        filter: "agNumberColumnFilter",
        cellRenderer: FulfillmentCell,
        flex: 1.5,
        minWidth: 220,
        autoHeight: true,
      },
      {
        field: "estimatedArrival",
        headerName: "ETA",
        filter: "agTextColumnFilter",
        valueFormatter: (params) => {
          if (!params.value) return "";
          const date = new Date(params.value as string);
          return Number.isNaN(date.getTime()) ? String(params.value) : date.toLocaleString();
        },
        flex: 1.1,
        minWidth: 160,
      },
    ],
    [],
  );

  return (
    <section className="animate-rise flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Pledge audit ledger
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-2xl lg:text-3xl">
            Resource commitment vs delivery
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Audit pledged supplies against verified deliveries. Overdue rows are highlighted.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm">
          <span className="text-[var(--ink-muted)]">Overdue deliveries: </span>
          <span className="font-semibold text-[#b91c1c]">{overdueCount}</span>
        </div>
      </div>

      <div className="min-h-[280px] flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] sm:min-h-[400px] lg:min-h-[520px]">
        <div className="h-[min(50dvh,480px)] w-full p-2 sm:h-[min(72vh,740px)]">
          <AgGridReact<PledgeAuditRow>
            theme={gridTheme}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.id}
            animateRows
            onRowClicked={(event) => {
              if (!event.data || !onSelectNgo) return;
              onSelectNgo(
                selectedNgoId === event.data.ngoId ? null : event.data.ngoId,
              );
            }}
            getRowClass={(params: RowClassParams<PledgeAuditRow>) =>
              params.data?.isOverdue ? "pledge-overdue-row" : undefined
            }
            getRowStyle={(params): RowStyle | undefined => {
              if (params.data?.ngoId && params.data.ngoId === selectedNgoId) {
                return {
                  background: "#e8f2ee",
                  borderLeft: "3px solid #0f6e56",
                };
              }
              if (!params.data?.isOverdue) return undefined;
              return {
                background: "#fef2f2",
                borderLeft: "3px solid #dc2626",
              };
            }}
          />
        </div>
      </div>
    </section>
  );
}
