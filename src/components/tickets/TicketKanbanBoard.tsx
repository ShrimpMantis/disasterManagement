"use client";

import { useState } from "react";
import { AlertTriangle, GripVertical } from "lucide-react";
import { canTransition } from "@/lib/tickets/ticketStateMachine";
import type { ReliefTicket, TicketStatus } from "@/types/ticket";
import {
  KANBAN_COLUMNS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/types/ticket";

type TicketKanbanBoardProps = {
  tickets: ReliefTicket[];
  onRequestAssign: (ticketId: string) => void;
  onRequestDispatch: (ticketId: string) => void;
  onFulfill: (ticketId: string) => void;
  onPartialFulfill: (ticketId: string) => void;
  onInvalidMove: (message: string) => void;
};

export function TicketKanbanBoard({
  tickets,
  onRequestAssign,
  onRequestDispatch,
  onFulfill,
  onPartialFulfill,
  onInvalidMove,
}: TicketKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function ticketsFor(status: TicketStatus) {
    return tickets.filter((ticket) => {
      if (status === "FULFILLED") {
        return ticket.status === "FULFILLED" || ticket.status === "PARTIALLY_FULFILLED";
      }
      return ticket.status === status;
    });
  }

  function handleDrop(targetStatus: TicketStatus) {
    if (!draggingId) return;
    const ticket = tickets.find((entry) => entry.id === draggingId);
    setDraggingId(null);
    if (!ticket) return;

    if (ticket.status === targetStatus) return;
    if (targetStatus === "FULFILLED" && ticket.status === "PARTIALLY_FULFILLED") {
      onFulfill(ticket.id);
      return;
    }

    if (!canTransition(ticket.status, targetStatus)) {
      onInvalidMove(`Cannot move ${ticket.id} from ${ticket.status} to ${targetStatus}.`);
      return;
    }

    if (targetStatus === "ASSIGNED") {
      onRequestAssign(ticket.id);
      return;
    }
    if (targetStatus === "DISPATCHED") {
      onRequestDispatch(ticket.id);
      return;
    }
    if (targetStatus === "FULFILLED") {
      onFulfill(ticket.id);
      return;
    }
    if (targetStatus === "SELECTED_FOR_AUDIT") {
      onFulfill(ticket.id);
      return;
    }
    if (targetStatus === "PARTIALLY_FULFILLED") {
      onPartialFulfill(ticket.id);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((status) => (
        <section
          key={status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(status)}
          className="min-h-[420px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] backdrop-blur-md"
        >
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {TICKET_STATUS_LABELS[status]}
            </h3>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-[var(--ink-muted)] ring-1 ring-[var(--line)]">
              {ticketsFor(status).length}
            </span>
          </header>

          <div className="space-y-2">
            {ticketsFor(status).map((ticket) => (
              <article
                key={ticket.id}
                draggable
                onDragStart={() => setDraggingId(ticket.id)}
                onDragEnd={() => setDraggingId(null)}
                className={`cursor-grab rounded-xl border bg-white/90 p-3 active:cursor-grabbing ${
                  ticket.slaBreached
                    ? "border-[#fecaca] bg-[#fef2f2]"
                    : "border-[var(--line)]"
                } ${draggingId === ticket.id ? "opacity-60" : ""}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {ticket.id}
                    </p>
                    <p className="truncate text-xs text-[var(--ink-muted)]">
                      {ticket.villageName}
                    </p>
                  </div>
                  <GripVertical className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                </div>

                <p className="text-xs font-medium text-[var(--ink)]">
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-muted)]">
                  {ticket.items
                    .map((item) => `${item.itemName} × ${item.totalRequestedQuantity}`)
                    .join(", ")}
                </p>

                {ticket.assignedEntityName ? (
                  <p className="mt-2 text-[11px] text-[var(--accent-strong)]">
                    {ticket.assignedEntityName}
                  </p>
                ) : null}

                {ticket.slaBreached ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#b91c1c]">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    SLA breached
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
