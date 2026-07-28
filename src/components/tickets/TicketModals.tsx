"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

type AssignableEntity = {
  id: string;
  name: string;
  kind: "NGO" | "WAREHOUSE";
};

type AssignTicketModalProps = {
  open: boolean;
  ticketId: string | null;
  entities: AssignableEntity[];
  onClose: () => void;
  onSubmit: (entityId: string, entityName: string) => void;
};

export function AssignTicketModal({
  open,
  ticketId,
  entities,
  onClose,
  onSubmit,
}: AssignTicketModalProps) {
  const [entityId, setEntityId] = useState("");

  if (!open || !ticketId) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const entity = entities.find((entry) => entry.id === entityId);
    if (!entity) return;
    onSubmit(entity.id, entity.name);
    setEntityId("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Assign ticket
            </p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {ticketId}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">NGO / Warehouse</span>
            <select
              required
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            >
              <option value="">Select entity…</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  [{entity.kind}] {entity.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            Confirm assignment
          </button>
        </form>
      </div>
    </div>
  );
}

type DispatchTicketModalProps = {
  open: boolean;
  ticketId: string | null;
  onClose: () => void;
  onSubmit: (vehicle: string, phone: string, eta: string) => void;
};

export function DispatchTicketModal({
  open,
  ticketId,
  onClose,
  onSubmit,
}: DispatchTicketModalProps) {
  const [vehicle, setVehicle] = useState("");
  const [phone, setPhone] = useState("");
  const [eta, setEta] = useState("");

  if (!open || !ticketId) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(vehicle.trim(), phone.trim(), eta ? new Date(eta).toISOString() : "");
    setVehicle("");
    setPhone("");
    setEta("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Dispatch ticket
            </p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {ticketId}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Vehicle number</span>
            <input
              required
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
              placeholder="AS-01-AB-1234"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Driver phone</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
              placeholder="+9198..."
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">ETA (optional)</span>
            <input
              type="datetime-local"
              value={eta}
              onChange={(event) => setEta(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            Confirm dispatch
          </button>
        </form>
      </div>
    </div>
  );
}
