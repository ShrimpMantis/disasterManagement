"use client";

import { IndianRupee } from "lucide-react";
import type { FinancialReliefSummary } from "@/types/reliefTotals";
import { formatINR } from "@/lib/dashboard/formatters";

type TotalFundsRaisedTileProps = {
  financials: FinancialReliefSummary;
};

export function TotalFundsRaisedTile({ financials }: TotalFundsRaisedTileProps) {
  const total = Math.max(1, financials.totalFundsRaisedINR);
  const disbursedPct = Math.round((financials.fundsDisbursedINR / total) * 100);
  const govtPct = Math.round((financials.governmentReliefFundINR / total) * 100);
  const ngoPct = Math.round((financials.ngoCrowdfundedINR / total) * 100);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3">
        <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
          <IndianRupee className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-[0.14em]">
            Total funds raised
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
          Relief financing snapshot
        </h2>
      </div>

      <p className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
        {formatINR(financials.totalFundsRaisedINR)}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="text-xs text-[var(--ink-muted)]">Disbursed</p>
          <p className="mt-0.5 font-semibold tabular-nums text-[var(--ink)]">
            {formatINR(financials.fundsDisbursedINR)}
          </p>
          <p className="text-[11px] text-[var(--ink-muted)]">{disbursedPct}% of raised</p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
          <p className="text-xs text-[var(--ink-muted)]">Remaining</p>
          <p className="mt-0.5 font-semibold tabular-nums text-[var(--ink)]">
            {formatINR(financials.remainingBalanceINR)}
          </p>
          <p className="text-[11px] text-[var(--ink-muted)]">
            Reserve balance
          </p>
        </article>
      </div>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-[var(--ink-muted)]">
          <span>Govt {govtPct}%</span>
          <span>NGO / crowdfund {ngoPct}%</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[#e8eef2]">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${govtPct}%` }}
          />
          <div
            className="h-full bg-[#93c5fd]"
            style={{ width: `${ngoPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
