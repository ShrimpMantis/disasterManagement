"use client";

import { FormEvent, useMemo, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import {
  AUDIT_REASON_LABELS,
  AUDIT_STATUS_LABELS,
} from "@/types/fulfillmentAudit";
import type { ReliefTicket } from "@/types/ticket";

type AuditInspectionPanelProps = {
  tickets: ReliefTicket[];
  onResolveAudit: (
    ticketId: string,
    resolution: "AUDIT_VERIFIED" | "AUDIT_FAILED",
    notes: string,
  ) => void;
};

export function AuditInspectionPanel({
  tickets,
  onResolveAudit,
}: AuditInspectionPanelProps) {
  const auditTickets = useMemo(
    () => tickets.filter((ticket) => ticket.auditSampling),
    [tickets],
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    auditTickets[0]?.id ?? "",
  );
  const [notes, setNotes] = useState("");

  const selectedTicket =
    auditTickets.find((ticket) => ticket.id === selectedTicketId) ??
    auditTickets[0] ??
    null;

  function handleSubmit(
    event: FormEvent,
    resolution: "AUDIT_VERIFIED" | "AUDIT_FAILED",
  ) {
    event.preventDefault();
    if (!selectedTicket) return;
    onResolveAudit(selectedTicket.id, resolution, notes.trim());
    setNotes("");
  }

  if (auditTickets.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow)]">
        <p className="text-sm text-[var(--ink-muted)]">
          No audit-sampled tickets yet. Randomly selected or GPS-overridden
          fulfillments will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Audit inspection
            </span>
          </div>
          <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            Post-distribution audit queue
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Review QR manifest, photo proof, and GPS before 24–48h follow-up.
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">
            Ticket
          </span>
          <select
            value={selectedTicket?.id ?? ""}
            onChange={(event) => setSelectedTicketId(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          >
            {auditTickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedTicket?.proofOfFulfillment ? (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Audit flags
              </p>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                Reason:{" "}
                {selectedTicket.auditSampling
                  ? AUDIT_REASON_LABELS[selectedTicket.auditSampling.samplingReason]
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Status:{" "}
                {selectedTicket.auditSampling
                  ? AUDIT_STATUS_LABELS[selectedTicket.auditSampling.auditStatus]
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Submitted:{" "}
                {new Date(selectedTicket.proofOfFulfillment.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Scanned manifest
              </p>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto rounded-lg bg-white p-2 text-xs text-[var(--ink-muted)]">
                {selectedTicket.proofOfFulfillment.scannedItems.map((item) => (
                  <li key={item.qrCodeId}>{item.qrCodeId}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              {/* Remote Firebase Storage proof URLs — next/image needs explicit domains per URL shape */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedTicket.proofOfFulfillment.dropPhotoUrl}
                alt="Drop proof"
                className="h-64 w-full rounded-xl object-cover"
              />
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--ink-muted)]">
              <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <MapPin className="h-4 w-4" aria-hidden />
                Delivery coordinates
              </p>
              <p className="mt-2">
                {selectedTicket.proofOfFulfillment.deliveryCoordinates.lat.toFixed(5)}
                ,{" "}
                {selectedTicket.proofOfFulfillment.deliveryCoordinates.lng.toFixed(5)}
              </p>
              <p className="mt-1">
                Accuracy:{" "}
                {Math.round(
                  selectedTicket.proofOfFulfillment.deliveryCoordinates
                    .accuracyMeters,
                )}{" "}
                meters
              </p>
              {selectedTicket.proofOfFulfillment.isLocationOverridden ? (
                <p className="mt-1 text-[#9a3412]">
                  Override reason:{" "}
                  {selectedTicket.proofOfFulfillment.locationOverrideReason}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedTicket ? (
        <form className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">
              Auditor notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[88px] w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
              placeholder="Spot-check outcome, village feedback, discrepancies observed…"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              onClick={(event) => handleSubmit(event, "AUDIT_VERIFIED")}
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Mark audit passed
            </button>
            <button
              type="submit"
              onClick={(event) => handleSubmit(event, "AUDIT_FAILED")}
              className="flex-1 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 text-sm font-semibold text-[#b91c1c]"
            >
              Mark audit failed
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
