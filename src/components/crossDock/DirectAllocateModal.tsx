"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PackageCheck, Plus, Trash2, X, Zap } from "lucide-react";
import {
  findMatchingTicketItem,
  type TicketAllocationPlan,
} from "@/lib/crossDock/allocation";
import {
  getItemDeficit,
  isMarketplaceTicket,
} from "@/lib/tickets/applyPledgeToTicket";
import type { InboundConsignment } from "@/types/reliefCrossDock";
import type { ReliefTicket } from "@/types/ticket";

type DirectAllocateModalProps = {
  open: boolean;
  consignment: InboundConsignment | null;
  tickets: ReliefTicket[];
  preselectTicketId?: string | null;
  preselectQuantity?: number | null;
  onClose: () => void;
  onSubmit: (plans: TicketAllocationPlan[]) => void;
};

export function DirectAllocateModal({
  open,
  consignment,
  tickets,
  preselectTicketId,
  preselectQuantity,
  onClose,
  onSubmit,
}: DirectAllocateModalProps) {
  const eligibleTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          isMarketplaceTicket(ticket) ||
          ticket.status === "ASSIGNED" ||
          ticket.status === "REQUESTED",
      ),
    [tickets],
  );

  const [ticketId, setTicketId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<TicketAllocationPlan[]>([]);

  useEffect(() => {
    if (!open || !consignment) return;
    const initialTicket =
      preselectTicketId &&
      eligibleTickets.some((ticket) => ticket.id === preselectTicketId)
        ? preselectTicketId
        : eligibleTickets[0]?.id ?? "";
    setTicketId(initialTicket);
    setPlans([]);

    const next: Record<string, string> = {};
    for (const line of consignment.items) {
      next[line.lineId] = "";
    }
    if (initialTicket && preselectQuantity != null) {
      const ticket = eligibleTickets.find((entry) => entry.id === initialTicket);
      const primary = consignment.items.find((item) => item.quantityRemaining > 0);
      if (ticket && primary) {
        const match = findMatchingTicketItem(
          ticket,
          primary.displayName,
          primary.category,
        );
        if (match) {
          next[primary.lineId] = String(
            Math.min(
              preselectQuantity,
              primary.quantityRemaining,
              getItemDeficit(match),
            ),
          );
        }
      }
    }
    setQuantities(next);
  }, [open, consignment, eligibleTickets, preselectQuantity, preselectTicketId]);

  const remainingByLine = useMemo(() => {
    if (!consignment) return {} as Record<string, number>;
    const remaining: Record<string, number> = {};
    for (const line of consignment.items) {
      remaining[line.lineId] = line.quantityRemaining;
    }
    for (const plan of plans) {
      for (const line of plan.lines) {
        remaining[line.inboundLineId] = Math.max(
          0,
          (remaining[line.inboundLineId] ?? 0) - line.quantity,
        );
      }
    }
    return remaining;
  }, [consignment, plans]);

  if (!open || !consignment) return null;

  const selectedTicket =
    eligibleTickets.find((ticket) => ticket.id === ticketId) ?? null;

  function buildCurrentPlan(): TicketAllocationPlan | null {
    if (!selectedTicket || !consignment) return null;
    const lines = consignment.items
      .map((line) => {
        const quantity = Number(quantities[line.lineId] ?? 0);
        return {
          inboundLineId: line.lineId,
          displayName: line.displayName,
          category: line.category,
          unit: line.unit,
          quantity: Number.isFinite(quantity) ? quantity : 0,
        };
      })
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) return null;
    return { reliefTicketId: selectedTicket.id, lines };
  }

  function handleAddPlan() {
    const plan = buildCurrentPlan();
    if (!plan) return;
    setPlans((prev) => [
      ...prev.filter((entry) => entry.reliefTicketId !== plan.reliefTicketId),
      plan,
    ]);
    const cleared: Record<string, string> = {};
    for (const line of consignment!.items) cleared[line.lineId] = "";
    setQuantities(cleared);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const current = buildCurrentPlan();
    const nextPlans = current
      ? [
          ...plans.filter(
            (entry) => entry.reliefTicketId !== current.reliefTicketId,
          ),
          current,
        ]
      : plans;
    if (nextPlans.length === 0) return;
    onSubmit(nextPlans);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Direct allocate to ticket
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {consignment.shipmentId} · {consignment.vehicleNumber}
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Bypass warehouse check-in. Allocate to one or more tickets; remainder
              stays available for another ticket or warehouse receive.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">Open relief ticket</span>
          <select
            required={plans.length === 0}
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
          >
            {eligibleTickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.id} · {ticket.villageName} ({ticket.status})
              </option>
            ))}
          </select>
        </label>

        {selectedTicket ? (
          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-muted)]">
            Demand:{" "}
            {selectedTicket.items
              .map(
                (item) =>
                  `${item.itemName} ${getItemDeficit(item)}/${item.totalRequestedQuantity} ${item.unit}`,
              )
              .join(" · ")}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
            Allocate inbound quantities
          </p>
          {consignment.items.map((line) => (
            <label
              key={line.lineId}
              className="grid grid-cols-[1fr_110px] items-center gap-2 text-sm"
            >
              <span>
                {line.displayName}
                <span className="mt-0.5 block text-[11px] text-[var(--ink-muted)]">
                  Available {remainingByLine[line.lineId]?.toLocaleString("en-IN") ?? 0}{" "}
                  {line.unit}
                </span>
              </span>
              <input
                type="number"
                min={0}
                max={remainingByLine[line.lineId] ?? 0}
                value={quantities[line.lineId] ?? ""}
                onChange={(event) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [line.lineId]: event.target.value,
                  }))
                }
                className="rounded-lg border border-[var(--line)] px-2 py-1.5"
                placeholder="0"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddPlan}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add ticket to allocation batch
        </button>

        {plans.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
            {plans.map((plan) => (
              <li
                key={plan.reliefTicketId}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {plan.reliefTicketId}:{" "}
                  {plan.lines
                    .map((line) => `${line.quantity} ${line.displayName}`)
                    .join(", ")}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${plan.reliefTicketId}`}
                  onClick={() =>
                    setPlans((prev) =>
                      prev.filter(
                        (entry) => entry.reliefTicketId !== plan.reliefTicketId,
                      ),
                    )
                  }
                  className="p-1 text-[var(--ink-muted)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

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
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
          >
            <PackageCheck className="h-4 w-4" aria-hidden />
            Allocate & issue gate pass
          </button>
        </div>
      </form>
    </div>
  );
}
