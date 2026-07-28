"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Columns3,
  Inbox,
  List,
  Plus,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppRole } from "@/hooks/useAppRole";
import { useCrossDockState } from "@/hooks/useCrossDockState";
import { useTicketQueueState } from "@/hooks/useTicketQueueState";
import { AdminTicketCreationModal } from "@/components/tickets/AdminTicketCreationModal";
import { InboundConsignmentPanel } from "@/components/crossDock/InboundConsignmentPanel";
import { AuditInspectionPanel } from "@/components/tickets/AuditInspectionPanel";
import { BulkActionsBar } from "@/components/tickets/BulkActionsBar";
import { FulfillmentCaptureModal } from "@/components/tickets/FulfillmentCaptureModal";
import { TicketKanbanBoard } from "@/components/tickets/TicketKanbanBoard";
import { AssignTicketModal, DispatchTicketModal } from "@/components/tickets/TicketModals";
import { TicketQueueGrid } from "@/components/tickets/TicketQueueGrid";

type ConsoleView = "table" | "kanban";

export function TicketOperationsConsole() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useAppRole();
  const queue = useTicketQueueState();
  const crossDock = useCrossDockState(queue.tickets);
  const [view, setView] = useState<ConsoleView>("table");
  const [assignTicketId, setAssignTicketId] = useState<string | null>(null);
  const [dispatchTicketId, setDispatchTicketId] = useState<string | null>(null);
  const [fulfillTicketId, setFulfillTicketId] = useState<string | null>(null);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const metrics = useMemo(() => {
    const requested = queue.tickets.filter((t) => t.status === "REQUESTED").length;
    const assigned = queue.tickets.filter((t) => t.status === "ASSIGNED").length;
    const dispatched = queue.tickets.filter((t) => t.status === "DISPATCHED").length;
    const fulfilled = queue.tickets.filter(
      (t) =>
        t.status === "FULFILLED" ||
        t.status === "PARTIALLY_FULFILLED" ||
        t.status === "AUDIT_VERIFIED",
    ).length;
    const audit = queue.tickets.filter((t) => t.status === "SELECTED_FOR_AUDIT").length;
    const sla = queue.tickets.filter((t) => t.slaBreached).length;
    const verify = queue.tickets.filter((t) => t.requiresManualVerification).length;
    return {
      requested,
      assigned,
      dispatched,
      fulfilled,
      audit,
      sla,
      verify,
      total: queue.tickets.length,
    };
  }, [queue.tickets]);

  const activeFulfillmentTicket = useMemo(
    () => queue.tickets.find((ticket) => ticket.id === fulfillTicketId) ?? null,
    [fulfillTicketId, queue.tickets],
  );
  const activeFulfillmentVillage = useMemo(
    () =>
      activeFulfillmentTicket
        ? queue.villages.find(
            (village) => village.id === activeFulfillmentTicket.villageId,
          ) ?? null
        : null,
    [activeFulfillmentTicket, queue.villages],
  );

  return (
    <section className="animate-rise flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <Ticket className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Ticket queue
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
            Relief demand & ticket operations
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {`Showing ${queue.tickets.length} tickets across districts.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateTicketOpen(true)}
            disabled={roleLoading || !isAdmin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create Ticket
          </button>
          <div className="inline-flex rounded-xl border border-[var(--line)] bg-white/70 p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                view === "table"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <List className="h-4 w-4" aria-hidden />
              Table Queue
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                view === "kanban"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              <Columns3 className="h-4 w-4" aria-hidden />
              Kanban Board
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="Tickets" value={metrics.total} />
        <Metric label="Requested" value={metrics.requested} />
        <Metric label="Assigned" value={metrics.assigned} />
        <Metric label="Dispatched" value={metrics.dispatched} />
        <Metric label="Audit Queue" value={metrics.audit} tone="yellow" />
        <Metric label="SLA Breach" value={metrics.sla} tone="red" />
        <Metric label="Needs Verify" value={metrics.verify} tone="yellow" />
      </div>

      {queue.errorMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {queue.errorMessage}
        </div>
      ) : null}

      {queue.flashMessage ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {queue.flashMessage}
        </div>
      ) : null}

      <InboundConsignmentPanel
        tickets={queue.tickets}
        crossDock={crossDock}
        onTicketsUpdated={(next) => {
          queue.replaceTickets(next);
          queue.setFlashMessage(
            "Ticket queue synced after cross-dock allocation / receipt.",
          );
          queue.setErrorMessage("");
        }}
      />

      <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1 font-medium text-[var(--ink)]">
          <Inbox className="h-3.5 w-3.5" aria-hidden />
          Channels normalized:
        </span>{" "}
        Village Lead, Relief Camp, Citizen SOS payloads are clustered by village within a 12h
        window. Outlier quantities (&gt;3× population) force HIGH priority + manual verification.
      </div>

      {view === "table" ? (
        <TicketQueueGrid
          tickets={queue.tickets}
          selectedTicketIds={queue.selectedTicketIds}
          onSelectionChange={queue.setSelectedTicketIds}
          onOpenAssign={setAssignTicketId}
          onOpenDispatch={setDispatchTicketId}
          onOpenFulfill={setFulfillTicketId}
          onPartialFulfill={(ticketId) =>
            queue.applyTransition(ticketId, "PARTIALLY_FULFILLED", {
              proofOfDeliveryUrl: `https://proofs.reliefnet.local/${ticketId}-partial.jpg`,
            })
          }
        />
      ) : (
        <TicketKanbanBoard
          tickets={queue.tickets}
          onRequestAssign={setAssignTicketId}
          onRequestDispatch={setDispatchTicketId}
          onFulfill={setFulfillTicketId}
          onPartialFulfill={(ticketId) =>
            queue.applyTransition(ticketId, "PARTIALLY_FULFILLED", {
              proofOfDeliveryUrl: `https://proofs.reliefnet.local/${ticketId}-partial.jpg`,
            })
          }
          onInvalidMove={(message) => {
            queue.setErrorMessage(message);
            queue.setFlashMessage("");
          }}
        />
      )}

      <BulkActionsBar
        selectedCount={queue.selectedTicketIds.length}
        entities={queue.assignableEntities}
        onBulkAssign={queue.bulkAssign}
        onExport={queue.exportSelectedManifest}
      />

      <AuditInspectionPanel
        tickets={queue.tickets}
        onResolveAudit={(ticketId, resolution, notes) =>
          queue.resolveAudit(ticketId, resolution, notes, user?.uid)
        }
      />

      <AssignTicketModal
        open={Boolean(assignTicketId)}
        ticketId={assignTicketId}
        entities={queue.assignableEntities}
        onClose={() => setAssignTicketId(null)}
        onSubmit={(entityId, entityName) => {
          if (!assignTicketId) return;
          queue.applyTransition(assignTicketId, "ASSIGNED", {
            assignedEntityId: entityId,
            assignedEntityName: entityName,
          });
          setAssignTicketId(null);
        }}
      />

      <DispatchTicketModal
        open={Boolean(dispatchTicketId)}
        ticketId={dispatchTicketId}
        onClose={() => setDispatchTicketId(null)}
        onSubmit={(vehicle, phone, eta) => {
          if (!dispatchTicketId) return;
          queue.applyTransition(dispatchTicketId, "DISPATCHED", {
            dispatchVehicleNumber: vehicle,
            dispatchDriverPhone: phone,
            estimatedArrival: eta || undefined,
          });
          setDispatchTicketId(null);
        }}
      />

      <FulfillmentCaptureModal
        open={Boolean(fulfillTicketId)}
        ticket={activeFulfillmentTicket}
        targetCoordinates={activeFulfillmentVillage?.coordinates}
        onClose={() => setFulfillTicketId(null)}
        onSubmit={async (payload) => {
          if (!activeFulfillmentTicket || !user?.uid) return;
          await queue.submitFulfillmentProof(activeFulfillmentTicket.id, {
            ...payload,
            deliveredByUserId: user.uid,
          });
          setFulfillTicketId(null);
        }}
      />

      <AdminTicketCreationModal
        open={createTicketOpen}
        isAdmin={isAdmin}
        villages={queue.villages}
        onClose={() => setCreateTicketOpen(false)}
        onCreated={(ticket) => {
          queue.prependTicket(ticket);
          queue.setFlashMessage(`${ticket.id} created and added to the queue.`);
          queue.setErrorMessage("");
        }}
      />
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "yellow";
}) {
  const toneClass =
    tone === "red"
      ? "border-[#fecaca] bg-[#fef2f2]"
      : tone === "yellow"
        ? "border-[#fde68a] bg-[#fffbeb]"
        : "border-[var(--line)] bg-white/70";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{label}</p>
      <p className="text-xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}
