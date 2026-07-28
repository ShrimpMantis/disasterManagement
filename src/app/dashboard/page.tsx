"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDashboardOpsSnapshot } from "@/actions/dashboardOpsActions";
import { fetchEmergencyAssetsSnapshot } from "@/actions/emergencyAssetActions";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardTileGrid } from "@/components/dashboard/DashboardTileGrid";
import { getUserLabel, getUserSecondary } from "@/lib/firebase/auth";
import type { MapBoundsLiteral } from "@/types/map";
import type { VillageGeoNode } from "@/types/geo";
import { COVERAGE_STATUS_LABELS } from "@/types/geo";
import { pointInBounds } from "@/lib/maps/markers";
import type { DistrictProgressSummary, KeyOfficialContact } from "@/types/dashboard";
import type { SOSAlertTicket } from "@/types/sos";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";
import type {
  RentalTruckOperator,
  VolunteerCircleDeployment,
  WorkforceMetrics,
} from "@/types/workforceLogistics";

const EMPTY_WORKFORCE: WorkforceMetrics = {
  totalRegisteredNGOs: 0,
  activeNGOsOnGround: 0,
  totalRegisteredVolunteers: 0,
  volunteersDeployedToday: 0,
  medicalPersonnelDeployed: 0,
  searchAndRescuePersonnel: 0,
};

const EMPTY_PROGRESS: DistrictProgressSummary = {
  overallFulfillmentPct: 0,
  totalVillages: 0,
  villagesFullyCovered: 0,
  totalVillagesCoveredPct: 0,
  categoryBreakdown: [],
};

function DashboardContent() {
  const { user } = useAuth();
  const [bounds, setBounds] = useState<MapBoundsLiteral | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [volunteerFocus, setVolunteerFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [villages, setVillages] = useState<VillageGeoNode[]>([]);
  const [officials, setOfficials] = useState<KeyOfficialContact[]>([]);
  const [districtProgress, setDistrictProgress] =
    useState<DistrictProgressSummary>(EMPTY_PROGRESS);
  const [boats, setBoats] = useState<CountryBoatOwner[]>([]);
  const [highLands, setHighLands] = useState<HighLandZone[]>([]);
  const [camps, setCamps] = useState<ReliefCampFacility[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlertTicket[]>([]);
  const [workforceMetrics, setWorkforceMetrics] =
    useState<WorkforceMetrics>(EMPTY_WORKFORCE);
  const [volunteerDeployments, setVolunteerDeployments] = useState<
    VolunteerCircleDeployment[]
  >([]);
  const [trucks, setTrucks] = useState<RentalTruckOperator[]>([]);
  const [alertSummary, setAlertSummary] = useState(
    "District flood alert: rising water levels reported. Mobilize boats and open standby relief camps.",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const [dashboardResult, assetResult] = await Promise.all([
          fetchDashboardOpsSnapshot(),
          fetchEmergencyAssetsSnapshot(),
        ]);

        if (dashboardResult.ok) {
          setVillages(dashboardResult.data.villages);
          setOfficials(dashboardResult.data.officials);
          setDistrictProgress(dashboardResult.data.districtProgress);
          setSosAlerts(dashboardResult.data.sosAlerts);
          setWorkforceMetrics(dashboardResult.data.workforceMetrics);
          setVolunteerDeployments(dashboardResult.data.volunteerDeployments);
          setTrucks(dashboardResult.data.trucks);
          setAlertSummary(dashboardResult.data.alertSummary);
        } else {
          setFlash(dashboardResult.error);
        }

        if (assetResult.ok) {
          setBoats(assetResult.data.boats);
          setHighLands(assetResult.data.highLands);
          setCamps(assetResult.data.camps);
        } else if (!dashboardResult.ok) {
          setFlash(assetResult.error);
        }

        setLoading(false);
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const volunteerByCircle = useMemo(() => {
    return new Map(
      volunteerDeployments.map((entry) => [
        entry.revenueCircle.toLowerCase(),
        entry.volunteersDeployed,
      ]),
    );
  }, [volunteerDeployments]);

  const visibleVillages = villages.filter((village) =>
    pointInBounds(village.coordinates.lat, village.coordinates.lng, bounds),
  );

  const listVillages = volunteerFocus
    ? visibleVillages
        .map((village) => ({
          ...village,
          volunteersDeployed:
            volunteerByCircle.get(village.revenueCircle.toLowerCase()) ?? 0,
        }))
        .filter((village) => village.volunteersDeployed > 0)
        .sort((a, b) => b.volunteersDeployed - a.volunteersDeployed)
    : visibleVillages.map((village) => ({ ...village, volunteersDeployed: 0 }));

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="animate-rise border-b border-[var(--line)] pb-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          District situational awareness
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          Welcome, {getUserLabel(user)}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
          Workforce, multi-modal transport, funds, and spatial operations in one
          view.{" "}
          {getUserSecondary(user)}
        </p>
      </header>

      {flash ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {flash}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading dashboard data…</p>
      ) : null}

      <DashboardTileGrid
        villages={villages}
        officials={officials}
        districtProgress={districtProgress}
        boats={boats}
        highLands={highLands}
        camps={camps}
        sosAlerts={sosAlerts}
        workforceMetrics={workforceMetrics}
        volunteerDeployments={volunteerDeployments}
        trucks={trucks}
        alertSummary={alertSummary}
        selectedVillageId={selectedVillageId}
        onBoundsChange={setBounds}
        onVillageSelect={setSelectedVillageId}
        onDispatchSos={(sosId) =>
          setFlash(`Help dispatched for ${sosId}. Field team notified.`)
        }
        onFlash={setFlash}
        volunteerFocus={volunteerFocus}
        onToggleVolunteerFocus={() => setVolunteerFocus((prev) => !prev)}
      />

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
              {volunteerFocus
                ? "Volunteer distribution by revenue circle"
                : "Villages in map view"}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {volunteerFocus
                ? "Filtered from Active Volunteers. Click a row to sync the map."
                : "Updates as you pan/zoom. Click a row to sync the map selection."}
            </p>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            {listVillages.length} / {villages.length} listed
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {listVillages.map((village) => (
            <li key={village.id}>
              <button
                type="button"
                onClick={() => setSelectedVillageId(village.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  selectedVillageId === village.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-white/70 hover:bg-white"
                }`}
              >
                <p className="font-medium text-[var(--ink)]">{village.name}</p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {volunteerFocus
                    ? `${village.revenueCircle} · ${village.volunteersDeployed} volunteers`
                    : `${COVERAGE_STATUS_LABELS[village.coverageStatus]} · unmet ${village.unmetNeedsCount}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
