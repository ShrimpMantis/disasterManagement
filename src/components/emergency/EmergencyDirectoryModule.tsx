"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClickedEvent,
} from "ag-grid-community";
import {
  Building2,
  Hospital,
  Phone,
  Search,
  Shield,
  Ticket,
} from "lucide-react";
import type {
  ArmyCampRecord,
  ArmyReadinessStatus,
  EmergencyDirectoryTab,
  EmergencyMapFocus,
  HospitalFacilityRecord,
  PolicePersonnelRecord,
} from "@/types/emergencyDirectory";
import {
  ARMY_READINESS_BADGE_CLASS,
  ARMY_READINESS_LABELS,
  HOSPITAL_TYPE_LABELS,
} from "@/types/emergencyDirectory";
import {
  DIRECTORY_PROXIMITY_ORIGINS,
  distanceKmFromOrigin,
  type ProximityOrigin,
} from "@/lib/emergency/proximity";

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

type EmergencyDirectoryModuleProps = {
  hospitals: HospitalFacilityRecord[];
  police: PolicePersonnelRecord[];
  armyCamps: ArmyCampRecord[];
  initialTab?: EmergencyDirectoryTab;
  initialDistrict?: string | null;
  onLocate: (focus: EmergencyMapFocus) => void;
  onRequestSupport?: (payload: {
    kind: EmergencyMapFocus["kind"];
    entityId: string;
    entityName: string;
    contactPhone: string;
  }) => void;
};

type HospitalRow = HospitalFacilityRecord & { distanceKm: number | null };
type PoliceRow = PolicePersonnelRecord & { distanceKm: number | null };
type ArmyRow = ArmyCampRecord & { distanceKm: number | null };

function CallButton({ phone, label = "Call" }: { phone: string; label?: string }) {
  const href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  return (
    <a
      href={href}
      onClick={(event) => event.stopPropagation()}
      title={phone}
      aria-label={`Call ${phone}`}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
    >
      <Phone className="h-2.5 w-2.5" aria-hidden />
      {label}
    </a>
  );
}

function ReadinessBadge({ status }: { status: ArmyReadinessStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ARMY_READINESS_BADGE_CLASS[status]}`}
    >
      {ARMY_READINESS_LABELS[status]}
    </span>
  );
}

export function EmergencyDirectoryModule({
  hospitals,
  police,
  armyCamps,
  initialTab = "hospitals",
  initialDistrict = null,
  onLocate,
  onRequestSupport,
}: EmergencyDirectoryModuleProps) {
  const [tab, setTab] = useState<EmergencyDirectoryTab>(initialTab);
  const [districtFilter, setDistrictFilter] = useState<string>(
    initialDistrict ?? "ALL",
  );
  const [search, setSearch] = useState("");
  const [originLabel, setOriginLabel] = useState(
    DIRECTORY_PROXIMITY_ORIGINS[0]?.label ?? "",
  );
  const [supportDraft, setSupportDraft] = useState<{
    kind: EmergencyMapFocus["kind"];
    entityId: string;
    entityName: string;
    contactPhone: string;
  } | null>(null);
  const [supportNote, setSupportNote] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTab(initialTab);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDistrictFilter(initialDistrict ?? "ALL");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialDistrict]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const hospital of hospitals) set.add(hospital.district);
    for (const station of police) set.add(station.district);
    for (const camp of armyCamps) set.add(camp.district);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [armyCamps, hospitals, police]);

  const origin: ProximityOrigin | null = useMemo(
    () =>
      DIRECTORY_PROXIMITY_ORIGINS.find((entry) => entry.label === originLabel) ??
      null,
    [originLabel],
  );

  const query = search.trim().toLowerCase();

  const hospitalRows = useMemo<HospitalRow[]>(() => {
    return hospitals
      .map((hospital) => ({
        ...hospital,
        distanceKm: distanceKmFromOrigin(hospital.coordinates, origin),
      }))
      .filter((hospital) =>
        districtFilter === "ALL" ? true : hospital.district === districtFilter,
      )
      .filter((hospital) => {
        if (!query) return true;
        return (
          hospital.hospitalName.toLowerCase().includes(query) ||
          hospital.district.toLowerCase().includes(query) ||
          hospital.revenueCircle.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [districtFilter, hospitals, origin, query]);

  const policeRows = useMemo<PoliceRow[]>(() => {
    return police
      .map((station) => ({
        ...station,
        distanceKm: distanceKmFromOrigin(station.coordinates, origin),
      }))
      .filter((station) =>
        districtFilter === "ALL" ? true : station.district === districtFilter,
      )
      .filter((station) => {
        if (!query) return true;
        return (
          station.policeStationName.toLowerCase().includes(query) ||
          station.district.toLowerCase().includes(query) ||
          station.revenueCircle.toLowerCase().includes(query) ||
          station.officerInChargeName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [districtFilter, origin, police, query]);

  const armyRows = useMemo<ArmyRow[]>(() => {
    return armyCamps
      .map((camp) => ({
        ...camp,
        distanceKm: distanceKmFromOrigin(camp.coordinates, origin),
      }))
      .filter((camp) =>
        districtFilter === "ALL" ? true : camp.district === districtFilter,
      )
      .filter((camp) => {
        if (!query) return true;
        return (
          camp.unitName.toLowerCase().includes(query) ||
          camp.district.toLowerCase().includes(query) ||
          camp.campLocationName.toLowerCase().includes(query) ||
          camp.liaisonOfficerName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [armyCamps, districtFilter, origin, query]);

  const hospitalCols = useMemo<ColDef<HospitalRow>[]>(
    () => [
      {
        field: "distanceKm",
        headerName: "Distance (km)",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value == null ? "—" : String(params.value),
      },
      {
        field: "availableIcuBeds",
        headerName: "Available ICU Beds",
        flex: 1,
        minWidth: 140,
        valueGetter: (params) =>
          params.data
            ? `${params.data.availableIcuBeds}/${params.data.totalIcuBeds}`
            : "",
      },
      {
        field: "antiSnakeVenomStock",
        headerName: "Anti-Snake Venom",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "hospitalName",
        headerName: "Facility",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "facilityType",
        headerName: "Type",
        flex: 1,
        minWidth: 130,
        valueFormatter: (params) =>
          params.value
            ? HOSPITAL_TYPE_LABELS[
                params.value as HospitalFacilityRecord["facilityType"]
              ]
            : "",
      },
      {
        field: "emergencyPhone",
        headerName: "Emergency Contact",
        flex: 1.4,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<HospitalRow>) =>
          params.data ? (
            <div className="flex h-full items-center gap-1.5 overflow-hidden">
              <span className="truncate text-[11px] leading-tight">
                {params.data.emergencyContactName}
              </span>
              <CallButton phone={params.data.emergencyPhone} />
            </div>
          ) : null,
      },
      {
        headerName: "Actions",
        flex: 1.1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<HospitalRow>) => {
          if (!params.data) return null;
          const row = params.data;
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSupportDraft({
                  kind: "HOSPITAL",
                  entityId: row.hospitalId,
                  entityName: row.hospitalName,
                  contactPhone: row.emergencyPhone,
                });
                setSupportNote("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[11px] font-semibold text-[#b91c1c]"
            >
              <Ticket className="h-3 w-3" aria-hidden />
              Request Support
            </button>
          );
        },
      },
    ],
    [],
  );

  const policeCols = useMemo<ColDef<PoliceRow>[]>(
    () => [
      {
        field: "distanceKm",
        headerName: "Distance (km)",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value == null ? "—" : String(params.value),
      },
      {
        field: "policeStationName",
        headerName: "Police Station / Outpost",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "officerInChargeName",
        headerName: "In-Charge Officer",
        flex: 1.4,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<PoliceRow>) =>
          params.data ? (
            <div className="flex h-full items-center gap-1.5 overflow-hidden">
              <span className="truncate text-[11px] leading-tight">
                {params.data.officerInChargeName}
              </span>
              <CallButton phone={params.data.primaryPhone} />
            </div>
          ) : null,
      },
      {
        field: "activeForceCount",
        headerName: "Active Personnel",
        flex: 1,
        minWidth: 130,
      },
      {
        field: "hasWaterRescueBoats",
        headerName: "Water Rescue Boats",
        flex: 1,
        minWidth: 140,
        valueFormatter: (params) => (params.value ? "Yes" : "No"),
      },
      {
        headerName: "Actions",
        flex: 1.1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<PoliceRow>) => {
          if (!params.data) return null;
          const row = params.data;
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSupportDraft({
                  kind: "POLICE",
                  entityId: row.stationId,
                  entityName: row.policeStationName,
                  contactPhone: row.primaryPhone,
                });
                setSupportNote("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[11px] font-semibold text-[#b91c1c]"
            >
              <Ticket className="h-3 w-3" aria-hidden />
              Request Support
            </button>
          );
        },
      },
    ],
    [],
  );

  const armyCols = useMemo<ColDef<ArmyRow>[]>(
    () => [
      {
        field: "distanceKm",
        headerName: "Distance (km)",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value == null ? "—" : String(params.value),
      },
      {
        field: "unitName",
        headerName: "Unit Name",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "assignedEquipment",
        headerName: "Heavy Rescue Equipment",
        flex: 1.5,
        minWidth: 200,
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
      },
      {
        field: "readinessStatus",
        headerName: "Readiness",
        flex: 1,
        minWidth: 130,
        cellRenderer: (
          params: ICellRendererParams<ArmyRow, ArmyReadinessStatus>,
        ) => (params.value ? <ReadinessBadge status={params.value} /> : null),
      },
      {
        headerName: "Liaison Officer",
        flex: 1.5,
        minWidth: 190,
        valueGetter: (params) =>
          params.data
            ? `${params.data.liaisonOfficerRank} ${params.data.liaisonOfficerName}`
            : "",
        cellRenderer: (params: ICellRendererParams<ArmyRow>) =>
          params.data ? (
            <div className="flex h-full items-center gap-1.5 overflow-hidden">
              <span className="truncate text-[11px] leading-tight">
                {params.data.liaisonOfficerRank} {params.data.liaisonOfficerName}
              </span>
              <CallButton phone={params.data.contactPhone} />
            </div>
          ) : null,
      },
      {
        headerName: "Actions",
        flex: 1.1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ArmyRow>) => {
          if (!params.data) return null;
          const row = params.data;
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSupportDraft({
                  kind: "ARMY",
                  entityId: row.campId,
                  entityName: row.unitName,
                  contactPhone: row.contactPhone,
                });
                setSupportNote("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[11px] font-semibold text-[#b91c1c]"
            >
              <Ticket className="h-3 w-3" aria-hidden />
              Request Support
            </button>
          );
        },
      },
    ],
    [],
  );

  function handleHospitalRowClick(event: RowClickedEvent<HospitalRow>) {
    if (!event.data) return;
    onLocate({
      id: event.data.hospitalId,
      kind: "HOSPITAL",
      title: event.data.hospitalName,
      lat: event.data.coordinates.lat,
      lng: event.data.coordinates.lng,
    });
  }

  function handlePoliceRowClick(event: RowClickedEvent<PoliceRow>) {
    if (!event.data) return;
    onLocate({
      id: event.data.stationId,
      kind: "POLICE",
      title: event.data.policeStationName,
      lat: event.data.coordinates.lat,
      lng: event.data.coordinates.lng,
    });
  }

  function handleArmyRowClick(event: RowClickedEvent<ArmyRow>) {
    if (!event.data) return;
    onLocate({
      id: event.data.campId,
      kind: "ARMY",
      title: event.data.unitName,
      lat: event.data.coordinates.lat,
      lng: event.data.coordinates.lng,
    });
  }

  function submitSupport(event: FormEvent) {
    event.preventDefault();
    if (!supportDraft) return;
    onRequestSupport?.({
      ...supportDraft,
    });
    setSupportDraft(null);
    setSupportNote("");
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <Building2 className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Emergency directory
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            Hospitals, police & army camps
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Tabbed triad directory with proximity sorting by staging origin.
          </p>
        </div>

        <div
          role="tablist"
          className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hospitals"}
            onClick={() => setTab("hospitals")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "hospitals"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <Hospital className="h-4 w-4" aria-hidden />
            Hospitals & Beds
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "police"}
            onClick={() => setTab("police")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "police"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <Shield className="h-4 w-4" aria-hidden />
            Police
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "army"}
            onClick={() => setTab("army")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "army"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <Building2 className="h-4 w-4" aria-hidden />
            Army Camps
          </button>
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px]">
        <label className="relative block text-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by village, district, unit, or station…"
            className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-3"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Proximity origin</span>
          <select
            value={originLabel}
            onChange={(event) => setOriginLabel(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          >
            {DIRECTORY_PROXIMITY_ORIGINS.map((entry) => (
              <option key={entry.label} value={entry.label}>
                Near: {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        role="tablist"
        aria-label="District filter"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={districtFilter === "ALL"}
          onClick={() => setDistrictFilter("ALL")}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            districtFilter === "ALL"
              ? "bg-[#15202b] text-white"
              : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
          }`}
        >
          All districts
        </button>
        {districts.map((district) => (
          <button
            key={district}
            type="button"
            role="tab"
            aria-selected={districtFilter === district}
            onClick={() => setDistrictFilter(district)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              districtFilter === district
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            {district === "Kamrup Metropolitan" ? "Guwahati" : district}
          </button>
        ))}
      </div>

      <div className="h-[min(38dvh,280px)] sm:h-[min(48vh,460px)] overflow-hidden rounded-xl border border-[var(--line)] bg-white/70 p-2">
        {tab === "hospitals" ? (
          <AgGridReact<HospitalRow>
            theme={gridTheme}
            rowData={hospitalRows}
            columnDefs={hospitalCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.hospitalId}
            onRowClicked={handleHospitalRowClick}
            rowHeight={48}
          />
        ) : null}

        {tab === "police" ? (
          <AgGridReact<PoliceRow>
            theme={gridTheme}
            rowData={policeRows}
            columnDefs={policeCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.stationId}
            onRowClicked={handlePoliceRowClick}
            rowHeight={48}
          />
        ) : null}

        {tab === "army" ? (
          <AgGridReact<ArmyRow>
            theme={gridTheme}
            rowData={armyRows}
            columnDefs={armyCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.campId}
            onRowClicked={handleArmyRowClick}
            rowHeight={48}
          />
        ) : null}
      </div>

      {supportDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
          <form
            onSubmit={submitSupport}
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
          >
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              Request support ticket
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {supportDraft.kind} · {supportDraft.entityName}
            </p>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium">Incident / SOS note</span>
              <textarea
                required
                value={supportNote}
                onChange={(event) => setSupportNote(event.target.value)}
                className="min-h-[100px] w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                placeholder="Link to active SOS, village, and needed support…"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSupportDraft(null)}
                className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
              >
                Submit ticket
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
