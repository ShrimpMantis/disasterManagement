"use client";

import Link from "next/link";
import { ChevronRight, Warehouse } from "lucide-react";
import type {
  DistrictWarehouseSummary,
  WarehouseMacroSummary,
} from "@/types/warehouseModule";

type WarehouseSummaryTileProps = {
  macro: WarehouseMacroSummary;
  districts: DistrictWarehouseSummary[];
  selectedDistrict?: string | null;
  onSelectDistrict?: (district: string) => void;
  /** When true, district cards navigate to /warehouses?district=… */
  linkToModule?: boolean;
  /** Tighter district card grid for side-by-side dashboard placement */
  compact?: boolean;
};

function CapacityMeter({
  fillPercentage,
  label,
}: {
  fillPercentage: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, fillPercentage));
  return (
    <div className="mt-2">
      {label ? (
        <div className="mb-1 flex justify-between text-[11px] text-[var(--ink-muted)]">
          <span>{label}</span>
          <span>{pct}% filled</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-[#e8eef2]">
        <div
          className={`h-full rounded-full transition-[width] ${
            pct >= 85
              ? "bg-[#b91c1c]"
              : pct >= 60
                ? "bg-[#ea580c]"
                : "bg-[var(--accent)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const tones = {
    neutral: "bg-white/80 text-[var(--ink)] border-[var(--line)]",
    good: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
    warn: "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]",
    danger: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
  };
  return (
    <span
      className={`inline-flex flex-col rounded-lg border px-2.5 py-1.5 ${tones[tone]}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-80">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function districtHref(district: string): string {
  return `/warehouses?district=${encodeURIComponent(district)}`;
}

export function WarehouseSummaryTile({
  macro,
  districts,
  selectedDistrict,
  onSelectDistrict,
  linkToModule = false,
  compact = false,
}: WarehouseSummaryTileProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <Warehouse className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Warehouse capacity
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)] sm:text-2xl">
            Multi-district storage overview
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {macro.totalWarehousesCount} facilities across {macro.districtCount}{" "}
            districts · click a district to filter the directory
          </p>
        </div>
        {linkToModule ? (
          <Link
            href="/warehouses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
          >
            Open warehouse module
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-white/80 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill
            label="Total capacity (MT)"
            value={macro.totalCapacityTons.toLocaleString()}
          />
          <MetricPill
            label="Stocked weight (MT)"
            value={macro.totalStockedTons.toLocaleString()}
            tone="warn"
          />
          <MetricPill
            label="Outstanding capacity (MT)"
            value={macro.totalOutstandingCapacityTons.toLocaleString()}
            tone="good"
          />
        </div>
        <CapacityMeter
          fillPercentage={macro.fillPercentage}
          label="Statewide fill"
        />
      </div>

      <div
        className={`mt-4 grid gap-3 ${
          compact
            ? "sm:grid-cols-1 xl:grid-cols-2"
            : "sm:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {districts.map((district) => {
          const active =
            selectedDistrict?.toLowerCase() ===
            district.districtName.toLowerCase();
          const cardClass = `rounded-xl border p-3 text-left transition ${
            active
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--line)] bg-white/80 hover:border-[var(--accent)]/50 hover:bg-white"
          }`;

          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {district.districtName === "Kamrup Metropolitan"
                      ? "Guwahati"
                      : district.districtName}{" "}
                    District
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {district.totalWarehousesCount} warehouses
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-[var(--accent-strong)]">
                  {district.averageFillPercentage}%
                </span>
              </div>
              <CapacityMeter fillPercentage={district.averageFillPercentage} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                <MetricPill
                  label="Outstanding (MT)"
                  value={district.totalOutstandingCapacityTons.toLocaleString()}
                  tone="good"
                />
                <MetricPill
                  label="Full hubs"
                  value={district.statusBreakdown.criticalFullCount}
                  tone={
                    district.statusBreakdown.criticalFullCount > 0
                      ? "warn"
                      : "neutral"
                  }
                />
                <MetricPill
                  label="Flooded / offline"
                  value={district.statusBreakdown.offlineFloodedCount}
                  tone={
                    district.statusBreakdown.offlineFloodedCount > 0
                      ? "danger"
                      : "neutral"
                  }
                />
              </div>
            </>
          );

          if (linkToModule) {
            return (
              <Link
                key={district.districtName}
                href={districtHref(district.districtName)}
                className={cardClass}
              >
                {body}
              </Link>
            );
          }

          return (
            <button
              key={district.districtName}
              type="button"
              onClick={() => onSelectDistrict?.(district.districtName)}
              className={cardClass}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}
