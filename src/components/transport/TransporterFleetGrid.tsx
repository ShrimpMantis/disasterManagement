"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { BadgeCheck, Phone, Plus, ShieldCheck } from "lucide-react";
import { FeatureGate } from "@/components/features/FeatureGate";
import { useOperationalMode } from "@/hooks/useOperationalMode";
import {
  allowsCommunityVerification,
} from "@/lib/features/operationalMode";
import type {
  CreateTransporterInput,
  FleetVehicleType,
  TransporterAvailability,
  TransporterGridFilter,
  TransporterRecord,
} from "@/types/transporterFleet";
import {
  FLEET_VEHICLE_BADGE_CLASS,
  FLEET_VEHICLE_TYPES,
  TRANSPORTER_AVAILABILITY,
  TRANSPORTER_AVAILABILITY_BADGE_CLASS,
  TRANSPORTER_AVAILABILITY_LABELS,
  TRANSPORTER_BASE_DISTRICTS,
  districtsMatch,
  maskPhone,
} from "@/types/transporterFleet";

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

const inputClass =
  "w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

type TransporterFleetGridProps = {
  transporters: TransporterRecord[];
  filter: TransporterGridFilter;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  onRequireAuth: (message: string) => void;
  onAddTransporter: (
    input: Omit<CreateTransporterInput, "createdBy">,
  ) => Promise<{ ok: boolean; error?: string }>;
  onVerifyTransporter: (transporterId: string) => Promise<boolean>;
  onClearFilter?: () => void;
};

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

type VerifyCellProps = {
  data: TransporterRecord;
  currentUserId?: string | null;
  isAuthenticated: boolean;
  allowCommunityVerify: boolean;
  onRequireAuth: (message: string) => void;
  onVerify: (id: string) => Promise<boolean>;
};

function VerifyCell({
  data,
  currentUserId,
  isAuthenticated,
  allowCommunityVerify,
  onRequireAuth,
  onVerify,
}: VerifyCellProps) {
  const [busy, setBusy] = useState(false);
  const alreadyVerified =
    Boolean(currentUserId) && data.verifiedBy.includes(currentUserId!);

  async function handleVerify() {
    if (!allowCommunityVerify) return;
    if (!isAuthenticated) {
      onRequireAuth("Sign in to verify this transporter or driver.");
      return;
    }
    if (alreadyVerified || busy) return;
    setBusy(true);
    await onVerify(data.id);
    setBusy(false);
  }

  if (data.isOfficial) {
    return (
      <div className="flex h-full items-center gap-1.5 overflow-hidden">
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#dcfce7] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#166534]">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Official
        </span>
        {data.verificationCount > 0 ? (
          <span className="truncate text-[10px] text-[var(--ink-muted)]">
            {data.verificationCount}↑
          </span>
        ) : null}
      </div>
    );
  }

  if (data.verificationCount > 0) {
    return (
      <div className="flex h-full items-center gap-1 overflow-hidden">
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#fef9c3] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#854d0e]">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          {data.verificationCount} confirmed
        </span>
        {allowCommunityVerify ? (
          <button
            type="button"
            disabled={busy || alreadyVerified}
            onClick={() => void handleVerify()}
            title={alreadyVerified ? "Already confirmed" : "Confirm accurate"}
            className="inline-flex h-6 shrink-0 items-center rounded-md border border-[var(--line)] bg-white px-1.5 text-[10px] font-semibold leading-none text-[var(--ink)] disabled:opacity-50"
          >
            {alreadyVerified ? "✓" : busy ? "…" : "+1"}
          </button>
        ) : null}
      </div>
    );
  }

  if (!allowCommunityVerify) {
    return (
      <span className="text-[10px] text-[var(--ink-muted)]">Unverified</span>
    );
  }

  return (
    <div className="flex h-full items-center overflow-hidden">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleVerify()}
        className="inline-flex h-6 items-center rounded-md border border-dashed border-[var(--accent)] bg-white px-2 text-[10px] font-semibold leading-none text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
      >
        {busy ? "…" : "Verify"}
      </button>
    </div>
  );
}

export function TransporterFleetGrid({
  transporters,
  filter,
  isAuthenticated,
  currentUserId,
  onRequireAuth,
  onAddTransporter,
  onVerifyTransporter,
  onClearFilter,
}: TransporterFleetGridProps) {
  const { canOperationalWrite, isCrowdMode: crowdMode } = useOperationalMode();
  const allowCommunityVerify = allowsCommunityVerification();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    vehicleType: "Mini-Truck" as FleetVehicleType,
    capacity: "",
    baseDistrict: "Guwahati",
    phone: "",
    availability: "AVAILABLE" as TransporterAvailability,
  });

  const filtered = useMemo(() => {
    return transporters.filter((row) => {
      if (filter.vehicleTypes && filter.vehicleTypes.length > 0) {
        if (!filter.vehicleTypes.includes(row.vehicleType)) return false;
      }
      if (filter.district) {
        if (!districtsMatch(row.baseDistrict, filter.district)) return false;
      }
      return true;
    });
  }, [filter.district, filter.vehicleTypes, transporters]);

  const openAddRow = useCallback(() => {
    if (!canOperationalWrite) return;
    if (!isAuthenticated) {
      onRequireAuth("Sign in to list a transporter or driver.");
      return;
    }
    setAdding(true);
    setFormError("");
  }, [canOperationalWrite, isAuthenticated, onRequireAuth]);

  async function submitAdd(event: FormEvent) {
    event.preventDefault();
    if (!canOperationalWrite) return;
    if (!isAuthenticated) {
      onRequireAuth("Sign in to list a transporter or driver.");
      return;
    }
    setSaving(true);
    setFormError("");
    const result = await onAddTransporter({
      name: draft.name.trim(),
      vehicleType: draft.vehicleType,
      capacity: draft.capacity.trim(),
      baseDistrict: draft.baseDistrict.trim(),
      phone: draft.phone.trim(),
      availability: draft.availability,
    });
    setSaving(false);
    if (result.ok) {
      setAdding(false);
      setDraft({
        name: "",
        vehicleType: "Mini-Truck",
        capacity: "",
        baseDistrict: "Guwahati",
        phone: "",
        availability: "AVAILABLE",
      });
    } else {
      setFormError(
        result.error ?? "Could not save transporter. Check fields and try again.",
      );
    }
  }

  const columnDefs = useMemo<ColDef<TransporterRecord>[]>(
    () => [
      {
        field: "name",
        headerName: "Transporter / Agency Name",
        flex: 1.5,
        minWidth: 180,
      },
      {
        field: "vehicleType",
        headerName: "Vehicle Type",
        flex: 1,
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams<TransporterRecord>) => {
          if (!params.data) return null;
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                FLEET_VEHICLE_BADGE_CLASS[params.data.vehicleType]
              }`}
            >
              {params.data.vehicleType}
            </span>
          );
        },
      },
      {
        field: "capacity",
        headerName: "Capacity / Payload",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "baseDistrict",
        headerName: "Current Base / District",
        flex: 1.1,
        minWidth: 140,
      },
      {
        field: "phone",
        headerName: "Contact Phone",
        flex: 1.1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams<TransporterRecord>) => {
          if (!params.data) return null;
          if (!isAuthenticated) {
            return (
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                {maskPhone(params.data.phone)}
              </span>
            );
          }
          return (
            <a
              href={telHref(params.data.phone)}
              className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
            >
              <Phone className="h-3 w-3" aria-hidden />
              {params.data.phone}
            </a>
          );
        },
      },
      {
        field: "availability",
        headerName: "Availability Status",
        flex: 1,
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams<TransporterRecord>) => {
          if (!params.data) return null;
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                TRANSPORTER_AVAILABILITY_BADGE_CLASS[params.data.availability]
              }`}
            >
              {TRANSPORTER_AVAILABILITY_LABELS[params.data.availability]}
            </span>
          );
        },
      },
      {
        headerName: "Verification",
        flex: 1.2,
        minWidth: 160,
        maxWidth: 220,
        sortable: false,
        cellClass: "!overflow-visible flex items-center",
        cellRenderer: (params: ICellRendererParams<TransporterRecord>) => {
          if (!params.data) return null;
          return (
            <VerifyCell
              data={params.data}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              allowCommunityVerify={allowCommunityVerify}
              onRequireAuth={onRequireAuth}
              onVerify={onVerifyTransporter}
            />
          );
        },
      },
    ],
    [
      allowCommunityVerify,
      currentUserId,
      isAuthenticated,
      onRequireAuth,
      onVerifyTransporter,
    ],
  );

  const hasActiveFilter = Boolean(
    (filter.vehicleTypes && filter.vehicleTypes.length > 0) || filter.district,
  );

  const addControls = (
    <>
      <button
        type="button"
        onClick={openAddRow}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add transporter
      </button>
    </>
  );

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
            {crowdMode ? "Crowdsourced fleet directory" : "Verified fleet directory"}
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Transporters & drivers across Assam
          </h2>
          <p className="text-xs text-[var(--ink-muted)]">
            {filtered.length} listing{filtered.length === 1 ? "" : "s"}
            {hasActiveFilter ? " · filtered for dispatch match" : ""}
            {!isAuthenticated ? " · phones masked until you sign in" : ""}
            {!crowdMode ? " · managed by transport admins" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilter && onClearFilter ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink-muted)]"
            >
              Clear match filter
            </button>
          ) : null}
          <FeatureGate mode="CROWDSOURCED" fallback={canOperationalWrite ? addControls : null}>
            {addControls}
          </FeatureGate>
        </div>
      </header>

      {adding && canOperationalWrite ? (
        <form
          onSubmit={(event) => void submitAdd(event)}
          className="grid gap-2 border-b border-[var(--line)] bg-[#f7fbf9] px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <label className="text-xs text-[var(--ink-muted)]">
            Name
            <input
              className={`${inputClass} mt-1`}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
              placeholder="Agency or driver"
            />
          </label>
          <label className="text-xs text-[var(--ink-muted)]">
            Vehicle type
            <select
              className={`${inputClass} mt-1`}
              value={draft.vehicleType}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  vehicleType: e.target.value as FleetVehicleType,
                }))
              }
            >
              {FLEET_VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--ink-muted)]">
            Capacity / payload
            <input
              className={`${inputClass} mt-1`}
              value={draft.capacity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, capacity: e.target.value }))
              }
              required
              placeholder="5 Tons"
            />
          </label>
          <label className="text-xs text-[var(--ink-muted)]">
            Base / district
            <select
              className={`${inputClass} mt-1`}
              value={draft.baseDistrict}
              onChange={(e) =>
                setDraft((d) => ({ ...d, baseDistrict: e.target.value }))
              }
            >
              {TRANSPORTER_BASE_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--ink-muted)]">
            Contact phone
            <input
              className={`${inputClass} mt-1`}
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              required
              placeholder="+91 …"
            />
          </label>
          <label className="text-xs text-[var(--ink-muted)]">
            Availability
            <select
              className={`${inputClass} mt-1`}
              value={draft.availability}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  availability: e.target.value as TransporterAvailability,
                }))
              }
            >
              {TRANSPORTER_AVAILABILITY.map((status) => (
                <option key={status} value={status}>
                  {TRANSPORTER_AVAILABILITY_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
            {formError ? (
              <p className="flex-1 text-xs text-[var(--danger)]">{formError}</p>
            ) : (
              <p className="flex-1 text-xs text-[var(--ink-muted)]">
                Inline add row — saves to the shared Assam fleet directory.
              </p>
            )}
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save transporter"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="h-[min(40dvh,300px)] sm:h-[min(52vh,480px)] w-full p-2">
        <AgGridReact<TransporterRecord>
          theme={gridTheme}
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
          }}
          rowHeight={44}
          headerHeight={40}
          animateRows
          suppressCellFocus
        />
      </div>

      {canOperationalWrite ? (
        <div className="border-t border-[var(--line)] px-3 py-2">
          <button
            type="button"
            onClick={openAddRow}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-white/70 py-2.5 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add transporter / driver row
          </button>
        </div>
      ) : null}
    </section>
  );
}
