"use client";

import { Lightbulb, Route } from "lucide-react";
import type { SuggestedDirectMatch } from "@/types/reliefCrossDock";

type SuggestedDispatchBannerProps = {
  matches: SuggestedDirectMatch[];
  onAccept: (match: SuggestedDirectMatch) => void;
  onDismiss?: () => void;
};

export function SuggestedDispatchBanner({
  matches,
  onAccept,
  onDismiss,
}: SuggestedDispatchBannerProps) {
  const top = matches[0];
  if (!top) return null;

  return (
    <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-sm text-[#92400e]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Suggested direct dispatch
          </p>
          <p className="mt-1 text-[var(--ink)]">{top.bannerText}</p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Suggested allocate {top.suggestedAllocateQuantity.toLocaleString("en-IN")}{" "}
            {top.unit} · Ticket {top.ticketId}
            {matches.length > 1 ? ` · +${matches.length - 1} more matches` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)]"
            >
              Dismiss
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onAccept(top)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Route className="h-3.5 w-3.5" aria-hidden />
            Route driver directly
          </button>
        </div>
      </div>
    </div>
  );
}
