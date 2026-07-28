"use client";

import { AlertTriangle, MapPinned, X } from "lucide-react";
import type { DispatchAlert } from "@/hooks/useNGOCoordinationState";
import type { VillageGeoNode } from "@/types/geo";
import type { NGOProfile } from "@/types/ngo";

type AssignPartnerDrawerProps = {
  village: VillageGeoNode | null;
  assignableNgos: NGOProfile[];
  dispatchAlerts: DispatchAlert[];
  onClose: () => void;
  onAssign: (villageId: string, ngoId: string) => void;
};

export function AssignPartnerDrawer({
  village,
  assignableNgos,
  dispatchAlerts,
  onClose,
  onAssign,
}: AssignPartnerDrawerProps) {
  if (!village) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(21,32,43,0.4)] backdrop-blur-[1px]">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close assign partner panel"
        onClick={onClose}
      />
      <aside className="animate-rise flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Assign partner
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
              {village.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {village.district} · Unmet needs: {village.unmetNeedsCount.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] p-2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {village.coverageStatus === "UNSERVED_CRITICAL" ? (
            <div className="flex items-start gap-2 rounded-xl bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Critical unserved zone — assign at least one active partner.
            </div>
          ) : null}

          {assignableNgos.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No available NGOs left to assign for this village.
            </p>
          ) : (
            assignableNgos.map((ngo) => (
              <button
                key={ngo.id}
                type="button"
                onClick={() => onAssign(village.id, ngo.id)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <p className="font-semibold text-[var(--ink)]">{ngo.name}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {ngo.primaryContact.name} · {ngo.primaryContact.phone}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {ngo.primaryContact.email}
                </p>
              </button>
            ))
          )}
        </div>

        {dispatchAlerts.length > 0 ? (
          <footer className="border-t border-[var(--line)] px-5 py-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <MapPinned className="h-3.5 w-3.5" aria-hidden />
              Recent dispatch alerts
            </p>
            <ul className="max-h-36 space-y-2 overflow-y-auto">
              {dispatchAlerts.slice(0, 3).map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent-strong)]"
                >
                  {alert.message}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
