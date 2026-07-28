"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, BarChart3, Droplets, Home, Syringe, Utensils } from "lucide-react";
import { useVillageCoordinationAnalytics } from "@/hooks/useVillageCoordinationAnalytics";
import type {
  VillageDemandCategory,
  VillageDemandMetric,
} from "@/types/villageCoordination";
import {
  VILLAGE_SERVICE_STATUS_BADGE_CLASS,
  VILLAGE_SERVICE_STATUS_LABELS,
} from "@/types/villageCoordination";

type VillageDemandAnalyticsChartProps = {
  onDispatchVillage: (villageId: string) => void;
};

const CATEGORY_ICONS: Record<
  VillageDemandCategory,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  FOOD_RATIONS: Utensils,
  WATER_CANS: Droplets,
  MEDICAL_KITS: Syringe,
  TARPAULINS: Home,
};

type DistrictChartRow = {
  districtName: string;
  totalVillagesAffected: number;
  villagesServedCount: number;
  villagesUnservedPending: number;
};

type VillageStackRow = {
  villageId: string;
  villageName: string;
  foodPending: number;
  waterPending: number;
  medicalPending: number;
  tarpPending: number;
};

function districtNameFromClick(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.districtName === "string") return record.districtName;
  const payload = record.payload as Record<string, unknown> | undefined;
  if (payload && typeof payload.districtName === "string") {
    return payload.districtName;
  }
  return null;
}

function villageIdFromClick(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.villageId === "string") return record.villageId;
  const payload = record.payload as Record<string, unknown> | undefined;
  if (payload && typeof payload.villageId === "string") {
    return payload.villageId;
  }
  return null;
}

function StatusBadge({
  status,
}: {
  status: VillageDemandMetric["serviceStatus"];
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${VILLAGE_SERVICE_STATUS_BADGE_CLASS[status]}`}
    >
      {VILLAGE_SERVICE_STATUS_LABELS[status]}
    </span>
  );
}

export function VillageDemandAnalyticsChart({
  onDispatchVillage,
}: VillageDemandAnalyticsChartProps) {
  const analytics = useVillageCoordinationAnalytics();

  const districtChartData = useMemo<DistrictChartRow[]>(
    () =>
      analytics.districtSummaries.map((entry) => ({
        districtName: entry.districtName,
        totalVillagesAffected: entry.totalVillagesAffected,
        villagesServedCount: entry.villagesServedCount,
        villagesUnservedPending:
          entry.villagesPartiallyServedCount + entry.villagesUnservedCount,
      })),
    [analytics.districtSummaries],
  );

  const villageRows = useMemo(
    () =>
      [...analytics.villageDemands].sort(
        (a, b) => a.fulfillmentPercentage - b.fulfillmentPercentage,
      ),
    [analytics.villageDemands],
  );

  const villageStackData = useMemo<VillageStackRow[]>(
    () =>
      villageRows.map((entry) => {
        const byCat = Object.fromEntries(
          entry.demands.map((demand) => [demand.category, demand]),
        ) as Record<
          VillageDemandCategory,
          VillageDemandMetric["demands"][number]
        >;
        return {
          villageId: entry.villageId,
          villageName: entry.villageName,
          foodPending: byCat.FOOD_RATIONS?.quantityPending ?? 0,
          waterPending: byCat.WATER_CANS?.quantityPending ?? 0,
          medicalPending: byCat.MEDICAL_KITS?.quantityPending ?? 0,
          tarpPending: byCat.TARPAULINS?.quantityPending ?? 0,
        };
      }),
    [villageRows],
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <BarChart3 className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Village-wise coverage & demands
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)] sm:text-2xl">
            {analytics.selectedDistrict
              ? `${analytics.selectedDistrict} village demand matrix`
              : "District coverage overview"}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {analytics.selectedDistrict
              ? "Pending vs delivered item needs by village. Click a village bar to open dispatch."
              : "Click a district to drill into village-level item demands linked to relief assessment."}
            {" · "}
            Data source: {analytics.source}
          </p>
        </div>
        {analytics.selectedDistrict ? (
          <button
            type="button"
            onClick={() => void analytics.selectDistrict(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            All districts
          </button>
        ) : null}
      </div>

      {analytics.loadingDistricts ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading district coverage…</p>
      ) : null}

      {!analytics.selectedDistrict ? (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={districtChartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,32,43,0.08)" />
              <XAxis
                dataKey="districtName"
                tick={{ fontSize: 11, fill: "#5b6b7c" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#5b6b7c" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(21,32,43,0.12)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="totalVillagesAffected"
                name="Total villages affected"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const district = districtNameFromClick(data);
                  if (district) void analytics.selectDistrict(district);
                }}
              />
              <Bar
                dataKey="villagesServedCount"
                name="Villages fully served"
                fill="#0f6e56"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const district = districtNameFromClick(data);
                  if (district) void analytics.selectDistrict(district);
                }}
              />
              <Bar
                dataKey="villagesUnservedPending"
                name="Unserved / pending"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const district = districtNameFromClick(data);
                  if (district) void analytics.selectDistrict(district);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-4">
          {analytics.loadingVillages ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Loading village demands…
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_ICONS) as VillageDemandCategory[]).map(
              (category) => {
                const Icon = CATEGORY_ICONS[category];
                const labels: Record<VillageDemandCategory, string> = {
                  FOOD_RATIONS: "Food rations needed vs delivered",
                  WATER_CANS: "Water cans needed vs delivered",
                  MEDICAL_KITS: "Medical kits needed vs delivered",
                  TARPAULINS: "Tarpaulins needed vs delivered",
                };
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[var(--ink-muted)]"
                  >
                    <Icon
                      className="h-3.5 w-3.5 text-[var(--accent)]"
                      aria-hidden
                    />
                    {labels[category]}
                  </span>
                );
              },
            )}
          </div>

          <div className="h-[min(52vh,480px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={villageStackData}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(21,32,43,0.08)"
                />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#5b6b7c" }} />
                <YAxis
                  type="category"
                  dataKey="villageName"
                  width={110}
                  tick={{ fontSize: 11, fill: "#5b6b7c" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(21,32,43,0.12)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="foodPending"
                  stackId="pending"
                  name="Food pending"
                  fill="#f59e0b"
                  cursor="pointer"
                  onClick={(data) => {
                    const villageId = villageIdFromClick(data);
                    if (villageId) onDispatchVillage(villageId);
                  }}
                />
                <Bar
                  dataKey="waterPending"
                  stackId="pending"
                  name="Water pending"
                  fill="#38bdf8"
                  cursor="pointer"
                  onClick={(data) => {
                    const villageId = villageIdFromClick(data);
                    if (villageId) onDispatchVillage(villageId);
                  }}
                />
                <Bar
                  dataKey="medicalPending"
                  stackId="pending"
                  name="Medical pending"
                  fill="#f87171"
                  cursor="pointer"
                  onClick={(data) => {
                    const villageId = villageIdFromClick(data);
                    if (villageId) onDispatchVillage(villageId);
                  }}
                />
                <Bar
                  dataKey="tarpPending"
                  stackId="pending"
                  name="Tarps pending"
                  fill="#34d399"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const villageId = villageIdFromClick(data);
                    if (villageId) onDispatchVillage(villageId);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {villageRows.map((village) => (
              <li key={village.villageId}>
                <button
                  type="button"
                  onClick={() => onDispatchVillage(village.villageId)}
                  className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">
                        {village.villageName}
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)]">
                        {village.revenueCircle} · {village.fulfillmentPercentage}
                        % fulfilled
                      </p>
                    </div>
                    <StatusBadge status={village.serviceStatus} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-[var(--ink-muted)]">
                    {village.demands.map((demand) => (
                      <span key={demand.category}>
                        {demand.displayName}: {demand.quantityDelivered}/
                        {demand.quantityAssessed}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
