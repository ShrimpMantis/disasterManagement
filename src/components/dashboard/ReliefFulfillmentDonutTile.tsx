"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { getDistrictReliefFulfillmentKPI } from "@/actions/reliefKpiActions";
import type {
  ReliefCategoryVolume,
  ReliefFulfillmentSummary,
  ReliefKpiChartSegment,
} from "@/types/reliefKpi";

function emptyReliefSummary(): ReliefFulfillmentSummary {
  return {
    districtId: "all",
    districtName: "All districts",
    scopeLabel: "All districts",
    totalAssessedDemandUnits: 0,
    totalDeliveredUnits: 0,
    totalInTransitUnits: 0,
    totalPendingUnits: 0,
    overallFulfillmentPercentage: 0,
    chartSegments: [
      { name: "Fulfilled", value: 0, color: "#0f6e56" },
      { name: "In-Transit", value: 0, color: "#f59e0b" },
      { name: "Pending", value: 0, color: "#dc2626" },
    ],
    categoryBreakdown: [],
    scopeOptions: [{ id: "ALL", label: "All districts", kind: "ALL" }],
    source: "firestore",
  };
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function SegmentTooltip({
  active,
  payload,
  categories,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ReliefKpiChartSegment }>;
  categories: ReliefCategoryVolume[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const segment = payload[0].payload;

  return (
    <div className="max-w-xs rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--ink)]">
        {segment.name}: {formatCount(segment.value)} units
      </p>
      <ul className="mt-2 space-y-1.5 text-[var(--ink-muted)]">
        {categories.map((category) => {
          const value =
            segment.name === "Fulfilled"
              ? category.quantityDelivered
              : segment.name === "In-Transit"
                ? category.quantityInTransit
                : category.quantityPending;
          return (
            <li key={category.category}>
              <span className="font-medium text-[var(--ink)]">
                {category.displayName}
              </span>
              : {formatCount(value)} / {formatCount(category.quantityAssessed)}{" "}
              {category.unitLabel}
              <span className="mt-0.5 block text-[10px] text-[var(--ink-muted)]">
                Pledged {formatCount(category.quantityPledged)} · Transit{" "}
                {formatCount(category.quantityInTransit)} · Delivered{" "}
                {formatCount(category.quantityDelivered)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReliefFulfillmentDonutTile() {
  const [scopeId, setScopeId] = useState("ALL");
  const [summary, setSummary] = useState<ReliefFulfillmentSummary>(emptyReliefSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void getDistrictReliefFulfillmentKPI(scopeId).then((result) => {
        if (cancelled) return;
        if (result.ok) setSummary(result.data);
        setLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scopeId]);

  const chartData = useMemo(
    () => summary.chartSegments.filter((segment) => segment.value > 0),
    [summary.chartSegments],
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <PieChartIcon className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Relief fulfillment KPI
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)] sm:text-2xl">
            District relief coverage
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Fulfilled vs in-transit vs pending demand · {summary.scopeLabel}
            {loading ? " · updating…" : ""} · {summary.source}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink-muted)]">
          District / circle
          <select
            value={scopeId}
            onChange={(event) => setScopeId(event.target.value)}
            className="min-w-[220px] rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          >
            {summary.scopeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-[240px] w-full max-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.length > 0 ? chartData : summary.chartSegments}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {(chartData.length > 0
                  ? chartData
                  : summary.chartSegments
                ).map((segment) => (
                  <Cell key={segment.name} fill={segment.color} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <SegmentTooltip categories={summary.categoryBreakdown} />
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)]">
              {summary.overallFulfillmentPercentage}%
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Fulfilled
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ul className="space-y-2">
            {summary.chartSegments.map((segment) => {
              const share =
                summary.totalAssessedDemandUnits > 0
                  ? Math.round(
                      (segment.value / summary.totalAssessedDemandUnits) * 1000,
                    ) / 10
                  : 0;
              return (
                <li
                  key={segment.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden
                    />
                    {segment.name}
                  </span>
                  <span className="text-sm tabular-nums text-[var(--ink-muted)]">
                    {formatCount(segment.value)} · {share}%
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summary.categoryBreakdown.map((category) => (
              <article
                key={category.category}
                className="rounded-xl border border-[var(--line)] bg-white/70 px-2.5 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-[var(--ink)]">
                    {category.displayName}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    of {formatCount(category.quantityAssessed)}{" "}
                    {category.unitLabel}
                  </p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-[#eff6ff] px-1 py-1.5">
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#1d4ed8]">
                      Pledged
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#1e3a8a]">
                      {formatCount(category.quantityPledged)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[#fefce8] px-1 py-1.5">
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#a16207]">
                      Transit
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#713f12]">
                      {formatCount(category.quantityInTransit)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[#f0fdf4] px-1 py-1.5">
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#15803d]">
                      Delivered
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#14532d]">
                      {formatCount(category.quantityDelivered)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
