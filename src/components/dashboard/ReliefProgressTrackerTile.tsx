"use client";

import { AlertTriangle, HandHeart, PackageCheck } from "lucide-react";
import type {
  DistrictProgressSummary,
  ReliefCategoryProgress,
} from "@/types/dashboard";

type ReliefProgressTrackerTileProps = {
  summary: DistrictProgressSummary;
  onRequestNgoMobilization?: (category: ReliefCategoryProgress) => void;
};

function ProgressRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex h-36 w-36 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(21, 32, 43, 0.08)"
          strokeWidth="12"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#0f6e56"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)]">
          {clamped}%
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          Fulfilled
        </p>
      </div>
    </div>
  );
}

function StackedCategoryBar({ category }: { category: ReliefCategoryProgress }) {
  const target = Math.max(1, category.totalTargetQuantity);
  const pledgedPct = Math.min(
    100,
    (category.totalPledgedQuantity / target) * 100,
  );
  const dispatchedPct = Math.min(
    100,
    (category.totalDispatchedQuantity / target) * 100,
  );
  const deliveredPct = Math.min(
    100,
    (category.totalDeliveredQuantity / target) * 100,
  );

  // Visual stack: delivered (green) ⊂ dispatched (amber) ⊂ pledged (blue) as overlapping fills
  return (
    <div className="space-y-1.5">
      <div className="relative h-3 overflow-hidden rounded-full bg-[#e8eef2]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#93c5fd]"
          style={{ width: `${pledgedPct}%` }}
          title="Pledged / stocked"
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#fbbf24]"
          style={{ width: `${dispatchedPct}%` }}
          title="In-transit / dispatched"
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#0f6e56]"
          style={{ width: `${deliveredPct}%` }}
          title="Verified delivered"
        />
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#93c5fd]" /> Pledged{" "}
          {category.totalPledgedQuantity.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#fbbf24]" /> In-transit{" "}
          {category.totalDispatchedQuantity.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#0f6e56]" /> Delivered{" "}
          {category.totalDeliveredQuantity.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function ReliefProgressTrackerTile({
  summary,
  onRequestNgoMobilization,
}: ReliefProgressTrackerTileProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <PackageCheck className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Relief distribution
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            District progress tracker
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Targeted vs pledged, in-transit, and verified delivered across supply lines.
          </p>
        </div>

        <div className="flex items-center gap-5">
          <ProgressRing pct={summary.overallFulfillmentPct} />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Villages fully covered
            </p>
            <p className="font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)]">
              {summary.villagesFullyCovered}
              <span className="text-lg text-[var(--ink-muted)]">
                {" "}
                / {summary.totalVillages}
              </span>
            </p>
            <p className="text-sm text-[var(--accent-strong)]">
              {summary.totalVillagesCoveredPct}% served
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-4">
        {summary.categoryBreakdown.map((category) => {
          const isDeficit = category.fulfillmentPercentage < 40;
          return (
            <li
              key={category.categoryName}
              className="rounded-xl border border-[var(--line)] bg-white/70 p-3"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {category.categoryName}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {category.totalDeliveredQuantity.toLocaleString()} /{" "}
                    {category.totalTargetQuantity.toLocaleString()} {category.unit}{" "}
                    ({category.fulfillmentPercentage}% delivered)
                  </p>
                </div>
                {isDeficit ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2 py-0.5 text-[11px] font-semibold text-[#b91c1c]">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Below 40%
                    </span>
                    <button
                      type="button"
                      onClick={() => onRequestNgoMobilization?.(category)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]"
                    >
                      <HandHeart className="h-3 w-3" aria-hidden />
                      Request NGO Mobilization
                    </button>
                  </div>
                ) : null}
              </div>
              <StackedCategoryBar category={category} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
