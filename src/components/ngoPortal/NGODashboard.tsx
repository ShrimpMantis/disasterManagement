"use client";

import { FormEvent, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { PackageCheck, Truck, X } from "lucide-react";
import type { NGOPledgeSubmission, PledgeStatus } from "@/types/pledgeIntake";
import {
  ADMIN_APPROVAL_LABELS,
  getCustomItems,
  getMatchedItems,
  PLEDGE_STATUS_LABELS,
} from "@/types/pledgeIntake";

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

type NGODashboardProps = {
  pledges: NGOPledgeSubmission[];
  onMarkInTransit: (pledgeId: string, vehicle: string, phone: string) => Promise<boolean>;
  onCompleteDelivery: (
    pledgeId: string,
    proofUrl: string,
    fieldCode?: string,
  ) => Promise<boolean>;
};

type PledgeRow = NGOPledgeSubmission & {
  villageName: string;
  itemSummary: string;
  progressPercent: number;
};

function StatusPill({ status }: { status: PledgeStatus }) {
  const styles: Record<PledgeStatus, string> = {
    OFFERED: "bg-[#eef2ff] text-[#3730a3]",
    CONFIRMED: "bg-[#e0f2fe] text-[#075985]",
    IN_TRANSIT: "bg-[#fff7ed] text-[#9a3412]",
    FULFILLED: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    REJECTED: "bg-[#f3f4f6] text-[#6b7280]",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {PLEDGE_STATUS_LABELS[status]}
    </span>
  );
}

export function NGODashboard({
  pledges,
  onMarkInTransit,
  onCompleteDelivery,
}: NGODashboardProps) {
  const [dispatchPledgeId, setDispatchPledgeId] = useState<string | null>(null);
  const [completePledgeId, setCompletePledgeId] = useState<string | null>(null);

  const rows = useMemo<PledgeRow[]>(
    () =>
      pledges.map((pledge) => {
        const matched = getMatchedItems(pledge);
        const custom = getCustomItems(pledge);
        const required = matched.reduce((sum, item) => sum + item.requiredQuantity, 0);
        const pledgedQty = matched.reduce((sum, item) => sum + item.pledgedQuantity, 0);
        const matchedSummary = matched.map(
          (item) => `${item.itemName}: ${item.pledgedQuantity}/${item.requiredQuantity}`,
        );
        const customSummary = custom.map(
          (item) => `${item.itemName}: ${item.quantity} ${item.unit} (custom)`,
        );
        return {
          ...pledge,
          villageName: pledge.targetVillageName || "District pool",
          itemSummary: [...matchedSummary, ...customSummary].join(", ") || "—",
          progressPercent:
            pledge.status === "FULFILLED"
              ? 100
              : pledge.status === "IN_TRANSIT"
                ? 70
                : pledge.adminApprovalStatus === "PENDING_REVIEW"
                  ? 15
                  : required > 0
                    ? Math.round((pledgedQty / required) * 100)
                    : custom.length > 0
                      ? 40
                      : 0,
        };
      }),
    [pledges],
  );

  const columnDefs = useMemo<ColDef<PledgeRow>[]>(
    () => [
      { field: "id", headerName: "Pledge ID", flex: 1.1, minWidth: 140, filter: true },
      { field: "villageName", headerName: "Destination Village", flex: 1.2, minWidth: 150, filter: true },
      { field: "ticketId", headerName: "Ticket", flex: 1.1, minWidth: 140, filter: true },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<PledgeRow, PledgeStatus>) =>
          params.value ? <StatusPill status={params.value} /> : null,
      },
      {
        field: "adminApprovalStatus",
        headerName: "Review",
        flex: 1,
        minWidth: 130,
        valueFormatter: (params) =>
          params.value
            ? ADMIN_APPROVAL_LABELS[
                params.value as NGOPledgeSubmission["adminApprovalStatus"]
              ]
            : "",
      },
      {
        field: "progressPercent",
        headerName: "Progress",
        flex: 0.9,
        minWidth: 110,
        valueFormatter: (params) => `${params.value ?? 0}%`,
      },
      {
        field: "estimatedDeliveryDate",
        headerName: "ETA",
        flex: 1.1,
        minWidth: 150,
        valueFormatter: (params) => {
          if (!params.value) return "";
          const date = new Date(params.value as string);
          return Number.isNaN(date.getTime()) ? String(params.value) : date.toLocaleString();
        },
      },
      {
        field: "itemSummary",
        headerName: "Items",
        flex: 1.6,
        minWidth: 220,
        tooltipField: "itemSummary",
      },
      {
        headerName: "Actions",
        flex: 1.4,
        minWidth: 210,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<PledgeRow>) => {
          if (!params.data) return null;
          const pledge = params.data;
          return (
            <div className="flex flex-wrap gap-1 py-1">
              {pledge.status === "CONFIRMED" &&
              pledge.adminApprovalStatus === "APPROVED" ? (
                <button
                  type="button"
                  onClick={() => setDispatchPledgeId(pledge.id)}
                  className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-white"
                >
                  Mark In-Transit
                </button>
              ) : null}
              {(pledge.status === "IN_TRANSIT" || pledge.status === "CONFIRMED") &&
              pledge.adminApprovalStatus === "APPROVED" ? (
                <button
                  type="button"
                  onClick={() => setCompletePledgeId(pledge.id)}
                  className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold"
                >
                  Complete Delivery
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
          <PackageCheck className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-[0.14em]">
            My pledges & active shipments
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
          NGO commitment dashboard
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Track confirmed pledges, mark shipments in-transit, and upload proof of delivery.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          No pledges yet. Open the marketplace and pledge help for a village.
        </p>
      ) : (
        <div className="h-[min(65vh,640px)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
          <AgGridReact<PledgeRow>
            theme={gridTheme}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true, filter: true, floatingFilter: true }}
            getRowId={(params) => params.data.id}
            tooltipShowDelay={300}
          />
        </div>
      )}

      <DispatchModal
        open={Boolean(dispatchPledgeId)}
        pledgeId={dispatchPledgeId}
        onClose={() => setDispatchPledgeId(null)}
        onSubmit={async (vehicle, phone) => {
          if (!dispatchPledgeId) return;
          const ok = await onMarkInTransit(dispatchPledgeId, vehicle, phone);
          if (ok) setDispatchPledgeId(null);
        }}
      />

      <CompleteDeliveryModal
        open={Boolean(completePledgeId)}
        pledgeId={completePledgeId}
        onClose={() => setCompletePledgeId(null)}
        onSubmit={async (proofUrl, fieldCode) => {
          if (!completePledgeId) return;
          const ok = await onCompleteDelivery(completePledgeId, proofUrl, fieldCode);
          if (ok) setCompletePledgeId(null);
        }}
      />
    </section>
  );
}

function DispatchModal({
  open,
  pledgeId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pledgeId: string | null;
  onClose: () => void;
  onSubmit: (vehicle: string, phone: string) => Promise<void>;
}) {
  const [vehicle, setVehicle] = useState("");
  const [phone, setPhone] = useState("");

  if (!open || !pledgeId) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(vehicle.trim(), phone.trim());
    setVehicle("");
    setPhone("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Mark in-transit
            </p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">{pledgeId}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Vehicle number</span>
            <input
              required
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Driver phone</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Confirm dispatch
          </button>
        </form>
      </div>
    </div>
  );
}

function CompleteDeliveryModal({
  open,
  pledgeId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pledgeId: string | null;
  onClose: () => void;
  onSubmit: (proofUrl: string, fieldCode?: string) => Promise<void>;
}) {
  const [proofUrl, setProofUrl] = useState("");
  const [fieldCode, setFieldCode] = useState("");

  if (!open || !pledgeId) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(proofUrl.trim(), fieldCode.trim() || undefined);
    setProofUrl("");
    setFieldCode("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Complete delivery
            </p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">{pledgeId}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">PoD photo / receipt URL</span>
            <input
              value={proofUrl}
              onChange={(event) => setProofUrl(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
              placeholder="https://..."
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Field confirmation code</span>
            <input
              value={fieldCode}
              onChange={(event) => setFieldCode(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
              placeholder="OTP / waybill code"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Confirm delivery
          </button>
        </form>
      </div>
    </div>
  );
}
