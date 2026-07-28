"use client";

import {
  HandHeart,
  HeartPulse,
  LifeBuoy,
  Users,
  UsersRound,
} from "lucide-react";
import type { WorkforceMetrics } from "@/types/workforceLogistics";

type WorkforceSummaryTileProps = {
  metrics: WorkforceMetrics;
  volunteerFocusActive?: boolean;
  onToggleVolunteerFocus?: () => void;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function WorkforceSummaryTile({
  metrics,
  volunteerFocusActive = false,
  onToggleVolunteerFocus,
}: WorkforceSummaryTileProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <UsersRound className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Engaged workforce
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            NGOs, volunteers & specialized personnel
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            <HandHeart className="h-3.5 w-3.5" aria-hidden />
            Engaged NGOs
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            {formatCount(metrics.activeNGOsOnGround)}
            <span className="ml-1 text-sm text-[var(--ink-muted)]">
              / {formatCount(metrics.totalRegisteredNGOs)}
            </span>
          </p>
          <p className="text-xs text-[var(--ink-muted)]">Active agencies on ground</p>
        </article>

        <button
          type="button"
          onClick={onToggleVolunteerFocus}
          className={`rounded-xl border p-3 text-left transition ${
            volunteerFocusActive
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--line)] bg-white/80 hover:bg-white"
          }`}
        >
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Field volunteers
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            {formatCount(metrics.volunteersDeployedToday)}
            <span className="ml-1 text-sm text-[var(--ink-muted)]">
              / {formatCount(metrics.totalRegisteredVolunteers)}
            </span>
          </p>
          <p className="text-xs font-medium text-[var(--accent-strong)]">
            {volunteerFocusActive
              ? "Showing volunteer circles on map/list — click to clear"
              : "Active volunteers — click to filter map/grid"}
          </p>
        </button>

        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            <HeartPulse className="h-3.5 w-3.5" aria-hidden />
            Medical staff
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            {formatCount(metrics.medicalPersonnelDeployed)}
          </p>
          <p className="text-xs text-[var(--ink-muted)]">Deployed medical personnel</p>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
            Search & rescue
          </p>
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            {formatCount(metrics.searchAndRescuePersonnel)}
          </p>
          <p className="text-xs text-[var(--ink-muted)]">NDRF / SDRF on duty</p>
        </article>
      </div>
    </section>
  );
}
