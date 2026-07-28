"use client";

import { FormEvent, useEffect, useState } from "react";
import { MapPin, MessageSquareText, X } from "lucide-react";
import type { CountryBoatOwner } from "@/types/villageAssets";
import { BOAT_TYPE_LABELS } from "@/types/villageAssets";

type DispatchSmsDrawerProps = {
  open: boolean;
  boats: CountryBoatOwner[];
  onClose: () => void;
  onSend: (payload: {
    boatIds: string[];
    destinationLabel: string;
    coordinates: string;
    message: string;
  }) => void;
};

export function DispatchSmsDrawer({
  open,
  boats,
  onClose,
  onSend,
}: DispatchSmsDrawerProps) {
  const [destinationLabel, setDestinationLabel] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setDestinationLabel("");
    setCoordinates("");
    setMessage(
      "EMERGENCY MOBILIZATION: Report with your boat to the destination below. Reply YES to confirm.",
    );
  }, [open]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSend({
      boatIds: boats.map((boat) => boat.id),
      destinationLabel: destinationLabel.trim(),
      coordinates: coordinates.trim(),
      message: message.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(21,32,43,0.4)]">
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
              Dispatch alert SMS
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              Mobilize {boats.length} boat operator
              {boats.length === 1 ? "" : "s"}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <ul className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              {boats.map((boat) => (
                <li key={boat.id} className="text-sm">
                  <p className="font-medium text-[var(--ink)]">{boat.ownerName}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {boat.primaryPhone} · {BOAT_TYPE_LABELS[boat.boatType]} ·{" "}
                    {boat.villageName}
                  </p>
                </li>
              ))}
            </ul>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Destination / rendezvous</span>
              <input
                required
                value={destinationLabel}
                onChange={(event) => setDestinationLabel(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                placeholder="e.g., Majuli Gaon embankment gate"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 inline-flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Destination coordinates
              </span>
              <input
                required
                value={coordinates}
                onChange={(event) => setCoordinates(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                placeholder="26.95, 94.17"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">SMS body</span>
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
              />
            </label>
          </div>

          <footer className="border-t border-[var(--line)] px-5 py-4">
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              Send mobilization SMS
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
