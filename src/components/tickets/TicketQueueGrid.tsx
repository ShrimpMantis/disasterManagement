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
  type RowStyle,
  type SelectionChangedEvent,
} from "ag-grid-community";
import type { ReliefTicket, TicketPriority, TicketStatus } from "@/types/ticket";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/types/ticket";

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

type TicketQueueGridProps = {
  tickets: ReliefTicket[];
  selectedTicketIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenAssign: (ticketId: string) => void;
  onOpenDispatch: (ticketId: string) => void;
  onOpenFulfill: (ticketId: string) => void;
  onPartialFulfill: (ticketId: string) => void;
};

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    CRITICAL: "bg-[#7f1d1d] text-white",
    HIGH: "bg-[#9a3412] text-white",
    MEDIUM: "bg-[#a16207] text-white",
    LOW: "bg-[#334155] text-white",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  );
}

function StatusPill({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    REQUESTED: "bg-[#eef2ff] text-[#3730a3]",
    ASSIGNED: "bg-[#e0f2fe] text-[#075985]",
    DISPATCHED: "bg-[#fff7ed] text-[#9a3412]",
    FULFILLED: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    PARTIALLY_FULFILLED: "bg-[#fef9c3] text-[#854d0e]",
    SELECTED_FOR_AUDIT: "bg-[#f3e8ff] text-[#7e22ce]",
    AUDIT_VERIFIED: "bg-[#dcfce7] text-[#166534]",
    AUDIT_FAILED: "bg-[#fef2f2] text-[#b91c1c]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

export function TicketQueueGrid({
  tickets,
  selectedTicketIds,
  onSelectionChange,
  onOpenAssign,
  onOpenDispatch,
  onOpenFulfill,
  onPartialFulfill,
}: TicketQueueGridProps) {
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
    }),
    [],
  );

  const columnDefs = useMemo<ColDef<ReliefTicket>[]>(
    () => [
      {
        field: "id",
        headerName: "Ticket ID",
        filter: "agTextColumnFilter",
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: "villageName",
        headerName: "Village",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 140,
      },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        filter: "agTextColumnFilter",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "priority",
        headerName: "Priority",
        filter: "agTextColumnFilter",
        flex: 0.9,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<ReliefTicket, TicketPriority>) =>
          params.value ? <PriorityBadge priority={params.value} /> : null,
      },
      {
        headerName: "Item Summary",
        flex: 1.6,
        minWidth: 220,
        valueGetter: (params) =>
          (params.data?.items ?? [])
            .map((item) => `${item.itemName} (${item.totalRequestedQuantity} ${item.unit})`)
            .join(", "),
        tooltipValueGetter: (params) =>
          (params.data?.items ?? [])
            .map((item) => `${item.itemName}: ${item.totalRequestedQuantity} ${item.unit}`)
            .join(" · "),
      },
      {
        field: "status",
        headerName: "Status",
        filter: "agTextColumnFilter",
        flex: 1.1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<ReliefTicket, TicketStatus>) =>
          params.value ? <StatusPill status={params.value} /> : null,
      },
      {
        field: "assignedEntityName",
        headerName: "Assigned Entity",
        filter: "agTextColumnFilter",
        flex: 1.2,
        minWidth: 160,
        valueFormatter: (params) => params.value || "—",
      },
      {
        headerName: "SLA Alert",
        flex: 0.9,
        minWidth: 110,
        valueGetter: (params) => (params.data?.slaBreached ? "BREACHED" : "OK"),
        cellRenderer: (params: ICellRendererParams<ReliefTicket>) =>
          params.data?.slaBreached ? (
            <span className="rounded-md bg-[#7f1d1d] px-2 py-0.5 text-[11px] font-bold text-white">
              SLA BREACH
            </span>
          ) : (
            <span className="text-xs text-[var(--ink-muted)]">On track</span>
          ),
      },
      {
        headerName: "Actions",
        flex: 1.2,
        minWidth: 170,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ReliefTicket>) => {
          if (!params.data) return null;
          const ticket = params.data;
          return (
            <div className="flex items-center gap-1 py-1">
              <select
                className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs"
                value=""
                onChange={(event) => {
                  const action = event.target.value;
                  event.target.value = "";
                  if (action === "assign") onOpenAssign(ticket.id);
                  if (action === "dispatch") onOpenDispatch(ticket.id);
                  if (action === "fulfill") onOpenFulfill(ticket.id);
                  if (action === "partial") onPartialFulfill(ticket.id);
                  setActionTicketId(ticket.id);
                }}
              >
                <option value="">Quick action…</option>
                {ticket.status === "REQUESTED" ? (
                  <option value="assign">Assign NGO/Warehouse</option>
                ) : null}
                {ticket.status === "ASSIGNED" ? (
                  <option value="dispatch">Mark Dispatched</option>
                ) : null}
                {ticket.status === "DISPATCHED" ? (
                  <>
                    <option value="fulfill">Batch Scan + Fulfill</option>
                    <option value="partial">Partial Fulfill</option>
                  </>
                ) : null}
                {ticket.status === "REQUESTED" ? (
                  <option value="partial">Partial Fulfill</option>
                ) : null}
              </select>
              {actionTicketId === ticket.id && ticket.requiresManualVerification ? (
                <span className="text-[10px] font-semibold text-[#9a3412]">VERIFY</span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [actionTicketId, onOpenAssign, onOpenDispatch, onOpenFulfill, onPartialFulfill],
  );

  return (
    <div className="h-[min(70vh,720px)] w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
      <AgGridReact<ReliefTicket>
        theme={gridTheme}
        rowData={tickets}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          resizable: true,
          filter: true,
          floatingFilter: true,
        }}
        rowSelection={rowSelection}
        getRowId={(params) => params.data.id}
        tooltipShowDelay={350}
        onSelectionChanged={(event: SelectionChangedEvent<ReliefTicket>) => {
          const ids = event.api.getSelectedRows().map((row) => row.id);
          onSelectionChange(ids);
        }}
        onGridReady={(event) => {
          event.api.forEachNode((node) => {
            if (node.data && selectedTicketIds.includes(node.data.id)) {
              node.setSelected(true);
            }
          });
        }}
        getRowStyle={(params): RowStyle | undefined => {
          if (params.data?.slaBreached) {
            return {
              background: "#fef2f2",
              borderLeft: "3px solid #dc2626",
            };
          }
          return undefined;
        }}
      />
    </div>
  );
}
