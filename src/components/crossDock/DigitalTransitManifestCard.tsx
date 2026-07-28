"use client";

import { FileText, X } from "lucide-react";
import type { DigitalTransitManifest } from "@/types/reliefCrossDock";

type DigitalTransitManifestCardProps = {
  manifest: DigitalTransitManifest | null;
  onClose: () => void;
};

export function DigitalTransitManifestCard({
  manifest,
  onClose,
}: DigitalTransitManifestCardProps) {
  if (!manifest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Digital transit manifest / gate pass
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {manifest.gatePassCode}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2">
            <dt className="text-[var(--ink-muted)]">Manifest</dt>
            <dd className="font-medium">{manifest.manifestId}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2">
            <dt className="text-[var(--ink-muted)]">Ticket</dt>
            <dd className="font-medium">{manifest.reliefTicketId}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2">
            <dt className="text-[var(--ink-muted)]">Vehicle</dt>
            <dd className="font-medium">
              {manifest.vehicleNumber} · {manifest.driverPhone}
            </dd>
          </div>
          <div className="border-b border-[var(--line)] pb-2">
            <dt className="text-[var(--ink-muted)]">Origin</dt>
            <dd className="mt-0.5 font-medium">{manifest.originLabel}</dd>
          </div>
          <div className="border-b border-[var(--line)] pb-2">
            <dt className="text-[var(--ink-muted)]">Destination</dt>
            <dd className="mt-0.5 font-medium">{manifest.destinationLabel}</dd>
            <dd className="text-xs text-[var(--ink-muted)]">
              {manifest.villageName} · {manifest.revenueCircle}, {manifest.district}
            </dd>
          </div>
        </dl>

        <ul className="mt-3 space-y-1 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs">
          {manifest.items.map((item) => (
            <li key={`${item.displayName}-${item.unit}`}>
              {item.quantityAllocated.toLocaleString("en-IN")} {item.unit} ·{" "}
              {item.displayName}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] text-[var(--ink-muted)]">
          Issued {new Date(manifest.issuedAt).toLocaleString()}. Present at camp /
          village lead checkpoint.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
        >
          Close gate pass
        </button>
      </div>
    </div>
  );
}
