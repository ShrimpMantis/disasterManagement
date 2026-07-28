"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Map as MapIcon,
} from "lucide-react";
import { useNGOCoordinationState } from "@/hooks/useNGOCoordinationState";
import { GeographicCoverageView } from "@/components/ngo/GeographicCoverageView";
import { NGODirectoryGrid } from "@/components/ngo/NGODirectoryGrid";
import { PledgeAuditLedger } from "@/components/ngo/PledgeAuditLedger";
import { VillageDemandAnalyticsChart } from "@/components/ngo/VillageDemandAnalyticsChart";

export type ReliefCoordinationTab = "coverage" | "pledges" | "directory";

const DEFAULT_TAB: ReliefCoordinationTab = "coverage";

const TABS: Array<{
  id: ReliefCoordinationTab;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  {
    id: "coverage",
    label: "Interactive Map & Village Allocation",
    icon: MapIcon,
  },
  {
    id: "pledges",
    label: "Pledge Audit Ledger",
    icon: ClipboardCheck,
  },
  {
    id: "directory",
    label: "NGO Sector Capabilities",
    icon: Building2,
  },
];

function parseTab(value: string | null): ReliefCoordinationTab {
  if (value === "pledges" || value === "directory" || value === "coverage") {
    return value;
  }
  return DEFAULT_TAB;
}

function ReliefCoordinationPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const coordination = useNGOCoordinationState();

  const activeTab = useMemo(
    () => parseTab(searchParams.get("tab")),
    [searchParams],
  );

  const setTab = useCallback(
    (tab: ReliefCoordinationTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {(coordination.selectedVillage || coordination.selectedNgo) && (
        <div className="animate-rise rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink-muted)]">
          <span className="font-medium text-[var(--ink)]">Shared selection: </span>
          {coordination.selectedVillage
            ? `Village ${coordination.selectedVillage.name}`
            : "No village"}
          {" · "}
          {coordination.selectedNgo
            ? `NGO ${coordination.selectedNgo.name}`
            : "No NGO"}
        </div>
      )}

      {coordination.dispatchAlerts[0] ? (
        <div className="animate-rise rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
          {coordination.dispatchAlerts[0].message}
        </div>
      ) : null}

      {coordination.error ? (
        <div className="animate-rise rounded-xl border border-[var(--danger)] bg-[#fff5f5] px-4 py-3 text-sm text-[var(--danger)]">
          {coordination.error}
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Relief coordination views"
        className="flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)] backdrop-blur-md"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "coverage" ? (
          <div className="flex flex-col gap-6">
            <VillageDemandAnalyticsChart
              onDispatchVillage={coordination.openAssignDrawer}
            />
            <GeographicCoverageView
              villages={coordination.villages}
              ngos={coordination.ngos}
              metrics={coordination.coverageMetrics}
              selectedVillage={
                coordination.isAssignDrawerOpen
                  ? coordination.selectedVillage
                  : null
              }
              highlightedVillageId={coordination.selectedVillageId}
              highlightedNgoId={coordination.selectedNgoId}
              assignableNgos={coordination.assignableNgos}
              dispatchAlerts={coordination.dispatchAlerts}
              onSelectVillage={coordination.openAssignDrawer}
              onCloseDrawer={coordination.closeAssignDrawer}
              onAssign={coordination.assignNGOToVillage}
            />
          </div>
        ) : null}

        {activeTab === "pledges" ? (
          <PledgeAuditLedger
            rows={coordination.pledgeRows}
            selectedNgoId={coordination.selectedNgoId}
            onSelectNgo={coordination.selectNgo}
          />
        ) : null}

        {activeTab === "directory" ? (
          <NGODirectoryGrid
            ngos={coordination.ngos}
            selectedNgoId={coordination.selectedNgoId}
            onSelectNgo={coordination.selectNgo}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ReliefCoordinationPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--ink-muted)]">Loading coordination workspace…</p>
      }
    >
      <ReliefCoordinationPageInner />
    </Suspense>
  );
}
