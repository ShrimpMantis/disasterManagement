"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  MapPinned,
  Phone,
  Siren,
  Zap,
} from "lucide-react";
import {
  getElapsedMinutes,
  formatElapsedLabel,
  isSlaBreached,
  useSharedElapsedClock,
} from "@/hooks/useElapsedTime";
import type {
  SOSAlertTicket,
  SOSQueueFilter,
  SOSUrgency,
} from "@/types/sos";
import {
  SOS_CATEGORY_LABELS,
  SOS_STATUS_LABELS,
  SOS_URGENCY_BADGE_CLASS,
  SOS_URGENCY_LABELS,
  URGENCY_SORT_RANK,
} from "@/types/sos";

type TimeCriticalSOSTileProps = {
  alerts: SOSAlertTicket[];
  selectedSosId?: string | null;
  onSelectSOS: (sos: SOSAlertTicket) => void;
  onRapidDispatch: (sos: SOSAlertTicket) => void;
};

const FILTERS: Array<{ id: SOSQueueFilter; label: string }> = [
  { id: "ALL", label: "All SOS" },
  { id: "P1", label: "P1 Critical" },
  { id: "P2", label: "P2 High Risk" },
  { id: "SLA_BREACHED", label: "SLA Breached (>30m)" },
];

function urgencyCardClass(urgency: SOSUrgency, selected: boolean): string {
  if (selected) return "border-[var(--accent)] bg-[var(--accent-soft)]";
  if (urgency === "P1_CRITICAL_LIFE") {
    return "border-[#fecaca] bg-[#fff5f5] shadow-[0_0_0_1px_rgba(185,28,28,0.2)]";
  }
  if (urgency === "P2_HIGH_RISK") {
    return "border-[#fed7aa] bg-[#fffaf5]";
  }
  return "border-[var(--line)] bg-white/80";
}

export function TimeCriticalSOSTile({
  alerts,
  selectedSosId,
  onSelectSOS,
  onRapidDispatch,
}: TimeCriticalSOSTileProps) {
  const [filter, setFilter] = useState<SOSQueueFilter>("ALL");
  const now = useSharedElapsedClock(30_000);

  const activeCount = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.status === "UNASSIGNED" || alert.status === "DISPATCHED",
      ).length,
    [alerts],
  );

  const unassignedCritical = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.status === "UNASSIGNED" &&
          alert.urgency === "P1_CRITICAL_LIFE",
      ).length,
    [alerts],
  );

  const sorted = useMemo(() => {
    return [...alerts]
      .filter(
        (alert) =>
          alert.status === "UNASSIGNED" || alert.status === "DISPATCHED",
      )
      .filter((alert) => {
        const elapsed = getElapsedMinutes(alert.createdAtTimestamp, now);
        if (filter === "P1") return alert.urgency === "P1_CRITICAL_LIFE";
        if (filter === "P2") return alert.urgency === "P2_HIGH_RISK";
        if (filter === "SLA_BREACHED") return isSlaBreached(elapsed);
        return true;
      })
      .sort((a, b) => {
        const byUrgency =
          URGENCY_SORT_RANK[a.urgency] - URGENCY_SORT_RANK[b.urgency];
        if (byUrgency !== 0) return byUrgency;
        return (
          Date.parse(a.createdAtTimestamp) - Date.parse(b.createdAtTimestamp)
        );
      });
  }, [alerts, filter, now]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[#fecaca] bg-[var(--surface)] shadow-[var(--shadow)]">
      <header className="border-b border-[#fecaca] px-4 py-3">
        <div className="mb-1 inline-flex items-center gap-2 text-[#b91c1c]">
          <Siren className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-[0.14em]">
            Time-critical triage
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            SOS dispatch queue
          </h2>
          <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c] ring-1 ring-[#fecaca]">
            {activeCount} Active SOS
            {unassignedCritical > 0
              ? ` · ${unassignedCritical} unassigned P1`
              : ""}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] px-3 py-2">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              filter === entry.id
                ? "bg-[#b91c1c] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {sorted.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-8 text-center text-sm text-[var(--ink-muted)]">
            No SOS alerts for this filter.
          </li>
        ) : (
          sorted.map((alert) => {
            const elapsed = getElapsedMinutes(alert.createdAtTimestamp, now);
            const overdue = isSlaBreached(elapsed);
            const selected = selectedSosId === alert.sosId;

            return (
              <li key={alert.sosId}>
                <article
                  className={`rounded-xl border p-3 ${urgencyCardClass(alert.urgency, selected)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        {alert.sosId} · {SOS_STATUS_LABELS[alert.status]}
                      </p>
                      <p className="mt-0.5 font-semibold text-[var(--ink)]">
                        {alert.villageName} · {alert.revenueCircle}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SOS_URGENCY_BADGE_CLASS[alert.urgency]}`}
                      >
                        {SOS_URGENCY_LABELS[alert.urgency]}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          overdue ? "text-[#b91c1c]" : "text-[var(--ink-muted)]"
                        }`}
                      >
                        {overdue ? (
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                        ) : (
                          <Clock3 className="h-3 w-3" aria-hidden />
                        )}
                        {formatElapsedLabel(elapsed)}
                        {overdue ? " · OVERDUE" : ""}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
                    {SOS_CATEGORY_LABELS[alert.category]} ({alert.peopleCount}{" "}
                    {alert.peopleCount === 1 ? "person" : "people"}
                    {alert.specialNotes ? `, ${alert.specialNotes}` : ""})
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                    {alert.citizenName} · {alert.contactPhone}
                  </p>

                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectSOS(alert)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)]"
                    >
                      <MapPinned className="h-3 w-3" aria-hidden />
                      Focus on Map
                    </button>
                    <a
                      href={`tel:${alert.contactPhone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)]"
                    >
                      <Phone className="h-3 w-3" aria-hidden />
                      Call
                    </a>
                  </div>

                  {alert.status === "UNASSIGNED" ? (
                    <button
                      type="button"
                      onClick={() => onRapidDispatch(alert)}
                      className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#b91c1c] px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Zap className="h-3.5 w-3.5" aria-hidden />
                      Rapid Dispatch
                    </button>
                  ) : (
                    <p className="mt-2 text-[11px] font-medium text-[#9a3412]">
                      Dispatched
                      {alert.assignedAssetLabel
                        ? ` · ${alert.assignedAssetLabel}`
                        : ""}
                    </p>
                  )}
                </article>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
