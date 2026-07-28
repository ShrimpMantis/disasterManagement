"use client";

import { FormEvent, useState } from "react";
import { MapPin, Package, X } from "lucide-react";
import type { TicketFulfillmentRecord } from "@/types/reliefCrossDock";
import { FULFILLMENT_STATUS_LABELS } from "@/types/reliefCrossDock";

type ConfirmReceiptModalProps = {
  open: boolean;
  fulfillment: TicketFulfillmentRecord | null;
  onClose: () => void;
  onConfirm: (receiverName: string, proofUrl?: string) => void;
};

export function ConfirmReceiptModal({
  open,
  fulfillment,
  onClose,
  onConfirm,
}: ConfirmReceiptModalProps) {
  const [receiverName, setReceiverName] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  if (!open || !fulfillment) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!receiverName.trim()) return;
    onConfirm(receiverName.trim(), proofUrl.trim() || undefined);
    setReceiverName("");
    setProofUrl("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              <Package className="h-3.5 w-3.5" aria-hidden />
              Confirm receipt of goods
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {fulfillment.reliefTicketId}
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {FULFILLMENT_STATUS_LABELS[fulfillment.status]} ·{" "}
              {fulfillment.auditTrail.destinationLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-3 space-y-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-muted)]">
          {fulfillment.allocatedItems.map((item) => (
            <li key={`${item.displayName}-${item.unit}`}>
              {item.quantityAllocated.toLocaleString("en-IN")} {item.unit} ·{" "}
              {item.displayName}
            </li>
          ))}
        </ul>

        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">Received by (Camp / Village Lead)</span>
          <input
            required
            value={receiverName}
            onChange={(event) => setReceiverName(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            placeholder="Name of receiving officer"
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block font-medium">
            Proof photo / signature URL (optional)
          </span>
          <input
            value={proofUrl}
            onChange={(event) => setProofUrl(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            placeholder="https://..."
          />
        </label>

        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
          <MapPin className="h-3 w-3" aria-hidden />
          GPS capture attempted on confirm (when browser permission allows).
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
          >
            Confirm receipt
          </button>
        </div>
      </form>
    </div>
  );
}
