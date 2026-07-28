"use client";

import Link from "next/link";
import { ChevronRight, MapPinned } from "lucide-react";
import type { CoverageMetrics } from "@/lib/ngo/coverage";

type VillagesFullyCoveredTileProps = {
  metrics: CoverageMetrics;
};

export function VillagesFullyCoveredTile({
  metrics,
}: VillagesFullyCoveredTileProps) {
  const coveredPct =
    metrics.totalVillages > 0
      ? Math.round((metrics.fullyCovered / metrics.totalVillages) * 1000) / 10
      : 0;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <MapPinned className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Village coverage
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Villages fully covered
          </h2>
        </div>
        <Link
          href="/relief-coordination?tab=coverage"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
        >
          Coverage map
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <p className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
        {metrics.fullyCovered}
        <span className="ml-1 text-lg text-[var(--ink-muted)]">
          / {metrics.totalVillages}
        </span>
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--accent-strong)]">
        {coveredPct}% fully served
      </p>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e8eef2]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${Math.min(100, coveredPct)}%` }}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="text-xs text-[var(--ink-muted)]">Partially covered</p>
          <p className="mt-0.5 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            {metrics.partiallyCovered}
          </p>
        </article>
        <article className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3">
          <p className="text-xs text-[#9f1239]">Critical unserved</p>
          <p className="mt-0.5 font-[family-name:var(--font-fraunces)] text-2xl text-[#b91c1c]">
            {metrics.criticalUnserved}
          </p>
        </article>
      </div>
    </section>
  );
}
