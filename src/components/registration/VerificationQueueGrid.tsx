"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import {
  CheckCircle2,
  HandHeart,
  ShieldCheck,
  UsersRound,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRegistrationState } from "@/hooks/useRegistrationState";
import type {
  NGORegistration,
  VolunteerRegistration,
} from "@/types/registration";
import {
  NGO_CAPABILITY_LABELS,
  VERIFICATION_STATUS_BADGE_CLASS,
  VERIFICATION_STATUS_LABELS,
  VOLUNTEER_SKILL_LABELS,
} from "@/types/registration";
import type { CitizenGroup } from "@/types/volunteerOnboarding";
import {
  CITIZEN_GROUP_CAPABILITY_LABELS,
  GROUP_VERIFICATION_STATUS_BADGE_CLASS,
  GROUP_VERIFICATION_STATUS_LABELS,
} from "@/types/volunteerOnboarding";

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

type QueueTab = "volunteers" | "ngos" | "citizenGroups";

function StatusBadge({
  status,
}: {
  status: VolunteerRegistration["verificationStatus"];
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${VERIFICATION_STATUS_BADGE_CLASS[status]}`}
    >
      {VERIFICATION_STATUS_LABELS[status]}
    </span>
  );
}

function GroupStatusBadge({
  status,
}: {
  status: CitizenGroup["verificationStatus"];
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GROUP_VERIFICATION_STATUS_BADGE_CLASS[status]}`}
    >
      {GROUP_VERIFICATION_STATUS_LABELS[status]}
    </span>
  );
}

type VerificationQueueGridProps = {
  onFlash?: (message: string) => void;
};

export function VerificationQueueGrid({ onFlash }: VerificationQueueGridProps) {
  const { user } = useAuth();
  const {
    volunteers,
    ngos,
    citizenGroups,
    pendingVolunteers,
    pendingNgos,
    pendingCitizenGroups,
    setVolunteerStatus,
    setNgoStatus,
    setCitizenGroupStatus,
    rosterDelta,
  } = useRegistrationState();
  const [tab, setTab] = useState<QueueTab>("volunteers");
  const [showAll, setShowAll] = useState(false);

  const volunteerRows = showAll ? volunteers : pendingVolunteers;
  const ngoRows = showAll ? ngos : pendingNgos;
  const citizenGroupRows = showAll ? citizenGroups : pendingCitizenGroups;

  const volunteerCols = useMemo<ColDef<VolunteerRegistration>[]>(
    () => [
      {
        field: "fullName",
        headerName: "Name",
        flex: 1.2,
        minWidth: 150,
      },
      {
        field: "homeDistrict",
        headerName: "District",
        flex: 1,
        minWidth: 130,
      },
      {
        headerName: "Affiliation",
        flex: 1.2,
        minWidth: 150,
        valueGetter: (params) =>
          params.data?.isAffiliatedWithNgo
            ? params.data.affiliatedNgoName || "Affiliated NGO"
            : "Independent",
      },
      {
        headerName: "Skills",
        flex: 1.4,
        minWidth: 180,
        valueGetter: (params) =>
          (params.data?.skills ?? [])
            .map((skill) => VOLUNTEER_SKILL_LABELS[skill])
            .join(", "),
      },
      {
        field: "phone",
        headerName: "Phone",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "createdAtTimestamp",
        headerName: "Submitted",
        flex: 1,
        minWidth: 140,
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "",
      },
      {
        field: "verificationStatus",
        headerName: "Status",
        flex: 1.1,
        minWidth: 150,
        cellRenderer: (
          params: ICellRendererParams<VolunteerRegistration>,
        ) =>
          params.data ? (
            <StatusBadge status={params.data.verificationStatus} />
          ) : null,
      },
      {
        headerName: "Actions",
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        filter: false,
        cellRenderer: (
          params: ICellRendererParams<VolunteerRegistration>,
        ) => {
          if (!params.data) return null;
          const row = params.data;
          if (row.verificationStatus !== "PENDING_VERIFICATION") {
            return (
              <span className="text-[11px] text-[var(--ink-muted)]">—</span>
            );
          }
          return (
            <div className="flex h-full items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setVolunteerStatus(row.volunteerId, "APPROVED_ACTIVE");
                  onFlash?.(
                    `${row.fullName} approved and added to active volunteer roster.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setVolunteerStatus(
                    row.volunteerId,
                    "REJECTED",
                    "Rejected by district officer",
                  );
                  onFlash?.(`${row.fullName} registration rejected.`);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[10px] font-semibold text-[#b91c1c]"
              >
                <XCircle className="h-3 w-3" aria-hidden />
                Reject
              </button>
            </div>
          );
        },
      },
    ],
    [onFlash, setVolunteerStatus],
  );

  const ngoCols = useMemo<ColDef<NGORegistration>[]>(
    () => [
      {
        field: "organizationLegalName",
        headerName: "Organization",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "primaryDistrictOfOperation",
        headerName: "District",
        flex: 1,
        minWidth: 130,
      },
      {
        headerName: "Capabilities",
        flex: 1.5,
        minWidth: 190,
        valueGetter: (params) =>
          (params.data?.coreCapabilities ?? [])
            .map((cap) => NGO_CAPABILITY_LABELS[cap])
            .join(", "),
      },
      {
        field: "fieldPocPhone",
        headerName: "Field POC Phone",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "activeVolunteerCount",
        headerName: "Volunteers",
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: "createdAtTimestamp",
        headerName: "Submitted",
        flex: 1,
        minWidth: 140,
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "",
      },
      {
        field: "verificationStatus",
        headerName: "Status",
        flex: 1.1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams<NGORegistration>) =>
          params.data ? (
            <StatusBadge status={params.data.verificationStatus} />
          ) : null,
      },
      {
        headerName: "Actions",
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<NGORegistration>) => {
          if (!params.data) return null;
          const row = params.data;
          if (row.verificationStatus !== "PENDING_VERIFICATION") {
            return (
              <span className="text-[11px] text-[var(--ink-muted)]">—</span>
            );
          }
          return (
            <div className="flex h-full items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNgoStatus(row.ngoId, "APPROVED_ACTIVE");
                  onFlash?.(
                    `${row.organizationLegalName} approved and activated on NGO roster.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setNgoStatus(
                    row.ngoId,
                    "REJECTED",
                    "Rejected by district officer",
                  );
                  onFlash?.(
                    `${row.organizationLegalName} registration rejected.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[10px] font-semibold text-[#b91c1c]"
              >
                <XCircle className="h-3 w-3" aria-hidden />
                Reject
              </button>
            </div>
          );
        },
      },
    ],
    [onFlash, setNgoStatus],
  );

  const citizenGroupCols = useMemo<ColDef<CitizenGroup>[]>(
    () => [
      {
        field: "groupName",
        headerName: "Group",
        flex: 1.4,
        minWidth: 180,
      },
      {
        field: "district",
        headerName: "District",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "leadName",
        headerName: "Lead",
        flex: 1.1,
        minWidth: 140,
      },
      {
        field: "leadPhone",
        headerName: "Lead phone",
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<CitizenGroup>) => {
          const phone = params.data?.leadPhone;
          if (!phone) return null;
          return (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="text-[var(--accent)] underline"
            >
              {phone}
            </a>
          );
        },
      },
      {
        field: "estimatedMemberCount",
        headerName: "Members",
        flex: 0.7,
        minWidth: 100,
      },
      {
        headerName: "Capabilities",
        flex: 1.4,
        minWidth: 180,
        valueGetter: (params) =>
          (params.data?.capabilities ?? [])
            .map((cap) => CITIZEN_GROUP_CAPABILITY_LABELS[cap])
            .join(", "),
      },
      {
        field: "createdTimestamp",
        headerName: "Submitted",
        flex: 1,
        minWidth: 140,
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "",
      },
      {
        field: "verificationStatus",
        headerName: "Status",
        flex: 1.1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams<CitizenGroup>) =>
          params.data ? (
            <GroupStatusBadge status={params.data.verificationStatus} />
          ) : null,
      },
      {
        headerName: "Actions",
        flex: 1.5,
        minWidth: 240,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<CitizenGroup>) => {
          if (!params.data) return null;
          const row = params.data;
          if (row.verificationStatus !== "PENDING_VERIFICATION") {
            return (
              <span className="text-[11px] text-[var(--ink-muted)]">—</span>
            );
          }
          return (
            <div className="flex h-full items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCitizenGroupStatus(
                    row.groupId,
                    "VERIFIED_ACTIVE",
                    "Lead verified by phone call",
                    user?.uid,
                  );
                  onFlash?.(
                    `${row.groupName} verified active after lead phone check.`,
                  );
                }}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Verify active
              </button>
              <button
                type="button"
                onClick={() => {
                  setCitizenGroupStatus(
                    row.groupId,
                    "REJECTED",
                    "Rejected by district coordinator",
                  );
                  onFlash?.(`${row.groupName} registration rejected.`);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-[10px] font-semibold text-[#b91c1c]"
              >
                <XCircle className="h-3 w-3" aria-hidden />
                Reject
              </button>
            </div>
          );
        },
      },
    ],
    [onFlash, setCitizenGroupStatus, user?.uid],
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              District ops verification
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            Registration approval queue
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {rosterDelta.pendingVolunteerCount} volunteers ·{" "}
            {rosterDelta.pendingNgoCount} NGOs ·{" "}
            {rosterDelta.pendingCitizenGroupCount} citizen groups pending ·{" "}
            {rosterDelta.approvedVolunteerCount} volunteers /{" "}
            {rosterDelta.approvedNgoCount} NGOs /{" "}
            {rosterDelta.verifiedCitizenGroupCount} groups active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />
            Show all statuses
          </label>
          <div
            role="tablist"
            className="inline-flex flex-wrap rounded-xl border border-[var(--line)] bg-white/70 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "volunteers"}
              onClick={() => setTab("volunteers")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                tab === "volunteers"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <UserRoundPlus className="h-4 w-4" aria-hidden />
              Volunteers ({volunteerRows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ngos"}
              onClick={() => setTab("ngos")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                tab === "ngos"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <HandHeart className="h-4 w-4" aria-hidden />
              NGOs ({ngoRows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "citizenGroups"}
              onClick={() => setTab("citizenGroups")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                tab === "citizenGroups"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <UsersRound className="h-4 w-4" aria-hidden />
              Groups ({citizenGroupRows.length})
            </button>
          </div>
        </div>
      </div>

      <div className="h-[min(42dvh,320px)] sm:h-[min(60vh,560px)] overflow-hidden rounded-xl border border-[var(--line)] bg-white/70 p-2">
        {tab === "volunteers" ? (
          <AgGridReact<VolunteerRegistration>
            theme={gridTheme}
            rowData={volunteerRows}
            columnDefs={volunteerCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.volunteerId}
            rowHeight={48}
          />
        ) : null}
        {tab === "ngos" ? (
          <AgGridReact<NGORegistration>
            theme={gridTheme}
            rowData={ngoRows}
            columnDefs={ngoCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.ngoId}
            rowHeight={48}
          />
        ) : null}
        {tab === "citizenGroups" ? (
          <AgGridReact<CitizenGroup>
            theme={gridTheme}
            rowData={citizenGroupRows}
            columnDefs={citizenGroupCols}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              floatingFilter: true,
            }}
            getRowId={(params) => params.data.groupId}
            rowHeight={48}
          />
        ) : null}
      </div>
    </section>
  );
}
