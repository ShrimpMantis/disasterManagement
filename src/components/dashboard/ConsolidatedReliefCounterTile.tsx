"use client";

import {
  Download,
  Droplets,
  Home,
  IndianRupee,
  Shirt,
  Syringe,
  Utensils,
} from "lucide-react";
import * as XLSX from "xlsx";
import type {
  ConsolidatedReliefMetrics,
  PhysicalDistributionItem,
  PhysicalItemCategory,
} from "@/types/reliefTotals";
import { formatCount, formatINR } from "@/lib/dashboard/formatters";

type ConsolidatedReliefCounterTileProps = {
  metrics: ConsolidatedReliefMetrics;
  onExported?: (filename: string) => void;
};

const CATEGORY_ICONS: Record<
  PhysicalItemCategory,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  FOOD: Utensils,
  CLOTHING: Shirt,
  WATER: Droplets,
  SHELTER: Home,
  MEDICAL: Syringe,
};

function distributionPct(item: PhysicalDistributionItem): number {
  if (item.totalTargetQuantity <= 0) return 0;
  return Math.round(
    (item.totalDistributedQuantity / item.totalTargetQuantity) * 100,
  );
}

function exportAuditWorkbook(metrics: ConsolidatedReliefMetrics): string {
  const stamp = new Date(metrics.lastUpdatedTimestamp)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `relief-funds-item-audit-${stamp}.xlsx`;

  const financialRows = [
    {
      Metric: "Total Funds Raised (INR)",
      Amount: metrics.financials.totalFundsRaisedINR,
    },
    {
      Metric: "Government Relief Fund (INR)",
      Amount: metrics.financials.governmentReliefFundINR,
    },
    {
      Metric: "NGO / Crowdfunded (INR)",
      Amount: metrics.financials.ngoCrowdfundedINR,
    },
    {
      Metric: "Funds Disbursed (INR)",
      Amount: metrics.financials.fundsDisbursedINR,
    },
    {
      Metric: "Remaining Balance (INR)",
      Amount: metrics.financials.remainingBalanceINR,
    },
  ];

  const itemRows = metrics.physicalDistribution.map((item) => ({
    ItemId: item.itemId,
    Category: item.category,
    DisplayName: item.displayName,
    Unit: item.unit,
    Target: item.totalTargetQuantity,
    Distributed: item.totalDistributedQuantity,
    PercentComplete: distributionPct(item),
    DistributedToday: item.distributionRatePerDay,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(financialRows),
    "Financials",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(itemRows),
    "Physical Distribution",
  );
  XLSX.writeFile(workbook, filename);
  return filename;
}

export function ConsolidatedReliefCounterTile({
  metrics,
  onExported,
}: ConsolidatedReliefCounterTileProps) {
  const { financials, physicalDistribution, lastUpdatedTimestamp } = metrics;
  const total = Math.max(1, financials.totalFundsRaisedINR);
  const disbursedPct = Math.round((financials.fundsDisbursedINR / total) * 100);
  const reservePct = Math.max(0, 100 - disbursedPct);
  const govtPct = Math.round((financials.governmentReliefFundINR / total) * 100);
  const ngoPct = Math.round((financials.ngoCrowdfundedINR / total) * 100);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <IndianRupee className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Funds & materials
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            Consolidated relief counter
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Updated {new Date(lastUpdatedTimestamp).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const filename = exportAuditWorkbook(metrics);
            onExported?.(filename);
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--accent-soft)]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download audit Excel
        </button>
      </header>

      <div className="mb-4 rounded-xl border border-[var(--line)] bg-white/80 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          Total funds raised
        </p>
        <p className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)]">
          {formatINR(financials.totalFundsRaisedINR)}
        </p>

        <div
          className="mt-3"
          title={`Govt ${formatINR(financials.governmentReliefFundINR)} (${govtPct}%) · NGO/Public ${formatINR(financials.ngoCrowdfundedINR)} (${ngoPct}%)`}
        >
          <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-xs text-[var(--ink-muted)]">
            <span>
              Disbursed: {formatINR(financials.fundsDisbursedINR)} ({disbursedPct}
              %)
            </span>
            <span>
              Reserve: {formatINR(financials.remainingBalanceINR)} ({reservePct}
              %)
            </span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-[#e8eef2]">
            <div
              className="h-full bg-[#0f6e56]"
              style={{ width: `${disbursedPct}%` }}
            />
            <div
              className="h-full bg-[#93c5fd]"
              style={{ width: `${reservePct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
            Source mix — Govt {govtPct}% · NGO / crowdfund {ngoPct}%
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2">
        {physicalDistribution.map((item) => {
          const Icon = CATEGORY_ICONS[item.category];
          const pct = distributionPct(item);
          return (
            <article
              key={item.itemId}
              className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[var(--accent-strong)]">
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                    {item.category}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                  + {formatCount(item.distributionRatePerDay)} today
                </span>
              </div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {item.displayName}
              </p>
              <p className="mt-1 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                {formatCount(item.totalDistributedQuantity)}
                <span className="ml-1 text-sm text-[var(--ink-muted)]">
                  {item.unit}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                Target {formatCount(item.totalTargetQuantity)} · {pct}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eef2]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
