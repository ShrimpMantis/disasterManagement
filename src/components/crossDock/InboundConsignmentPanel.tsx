"use client";

import { useMemo, useState } from "react";
import {
  Package,
  PackageCheck,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";
import { ConfirmReceiptModal } from "@/components/crossDock/ConfirmReceiptModal";
import { DigitalTransitManifestCard } from "@/components/crossDock/DigitalTransitManifestCard";
import { DirectAllocateModal } from "@/components/crossDock/DirectAllocateModal";
import { SuggestedDispatchBanner } from "@/components/crossDock/SuggestedDispatchBanner";
import type { useCrossDockState } from "@/hooks/useCrossDockState";
import type { TicketAllocationPlan } from "@/lib/crossDock/allocation";
import {
  CONSIGNMENT_STATUS_LABELS,
  type DigitalTransitManifest,
  type InboundConsignment,
  type SuggestedDirectMatch,
  type TicketFulfillmentRecord,
} from "@/types/reliefCrossDock";
import type { ReliefTicket } from "@/types/ticket";

type CrossDockApi = ReturnType<typeof useCrossDockState>;

type InboundConsignmentPanelProps = {
  tickets: ReliefTicket[];
  crossDock: CrossDockApi;
  onTicketsUpdated: (tickets: ReliefTicket[]) => void;
};

export function InboundConsignmentPanel({
  tickets,
  crossDock,
  onTicketsUpdated,
}: InboundConsignmentPanelProps) {
  const [allocateShipmentId, setAllocateShipmentId] = useState<string | null>(
    null,
  );
  const [preselectTicketId, setPreselectTicketId] = useState<string | null>(
    null,
  );
  const [preselectQuantity, setPreselectQuantity] = useState<number | null>(
    null,
  );
  const [confirmFulfillmentId, setConfirmFulfillmentId] = useState<
    string | null
  >(null);
  const [activeManifest, setActiveManifest] =
    useState<DigitalTransitManifest | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(
    () => new Set(),
  );

  const allocateConsignment =
    crossDock.consignments.find(
      (entry) => entry.shipmentId === allocateShipmentId,
    ) ?? null;

  const confirmFulfillment =
    crossDock.fulfillments.find(
      (entry) => entry.fulfillmentId === confirmFulfillmentId,
    ) ?? null;

  const inTransit = useMemo(
    () =>
      crossDock.fulfillments.filter(
        (entry) => entry.status === "DISPATCHED_IN_TRANSIT",
      ),
    [crossDock.fulfillments],
  );

  async function handleAllocate(plans: TicketAllocationPlan[]) {
    if (!allocateShipmentId) return;
    const result = await crossDock.directAllocate(allocateShipmentId, plans);
    if (result.ok) {
      onTicketsUpdated(result.tickets);
      const firstManifest = result.manifests?.[0] ?? null;
      setActiveManifest(firstManifest);
      setAllocateShipmentId(null);
      setPreselectTicketId(null);
      setPreselectQuantity(null);
    }
  }

  function handleAcceptMatch(
    consignment: InboundConsignment,
    match: SuggestedDirectMatch,
  ) {
    setAllocateShipmentId(consignment.shipmentId);
    setPreselectTicketId(match.ticketId);
    setPreselectQuantity(match.suggestedAllocateQuantity);
  }

  async function handleConfirmReceipt(receiverName: string, proofUrl?: string) {
    if (!confirmFulfillmentId) return;
    const result = await crossDock.confirmReceipt(
      confirmFulfillmentId,
      receiverName,
      proofUrl,
    );
    if (result.ok) {
      onTicketsUpdated(result.tickets);
      setConfirmFulfillmentId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 shadow-[var(--shadow)]">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            Cross-dock & direct allocation
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Inbound consignments at transit hubs
          </h3>
          <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
            Allocate directly to open relief tickets without warehouse check-in.
            Warehouse stock is never inflated.
          </p>
        </div>
      </header>

      {crossDock.error ? (
        <div className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {crossDock.error}
        </div>
      ) : null}
      {crossDock.flash ? (
        <div className="mb-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {crossDock.flash}
        </div>
      ) : null}

      <div className="space-y-3">
        {crossDock.activeConsignments.map((consignment) => {
          const matches = dismissedBanners.has(consignment.shipmentId)
            ? []
            : crossDock.getMatchesFor(consignment.shipmentId);

          return (
            <article
              key={consignment.shipmentId}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {consignment.shipmentId} · {consignment.vehicleNumber}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {consignment.donorOrCarrierName} · {consignment.transitHubName}{" "}
                    · {consignment.revenueCircle}, {consignment.district}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                    {CONSIGNMENT_STATUS_LABELS[consignment.status]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      crossDock.receiveToWarehouse(consignment.shipmentId)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
                  >
                    <Warehouse className="h-3.5 w-3.5" aria-hidden />
                    Receive to Warehouse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllocateShipmentId(consignment.shipmentId);
                      setPreselectTicketId(null);
                      setPreselectQuantity(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden />
                    Direct Allocate to Ticket
                  </button>
                </div>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-[var(--ink-muted)]">
                {consignment.items.map((item) => (
                  <li key={item.lineId}>
                    {item.displayName}:{" "}
                    {item.quantityRemaining.toLocaleString("en-IN")} /{" "}
                    {item.quantityArriving.toLocaleString("en-IN")} {item.unit}{" "}
                    remaining
                  </li>
                ))}
              </ul>

              {matches.length > 0 ? (
                <div className="mt-3">
                  <SuggestedDispatchBanner
                    matches={matches}
                    onAccept={(match) => handleAcceptMatch(consignment, match)}
                    onDismiss={() =>
                      setDismissedBanners((prev) => {
                        const next = new Set(prev);
                        next.add(consignment.shipmentId);
                        return next;
                      })
                    }
                  />
                </div>
              ) : null}
            </article>
          );
        })}

        {crossDock.activeConsignments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No active inbound consignments at transit hubs.
          </p>
        ) : null}
      </div>

      {inTransit.length > 0 ? (
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
            <Package className="h-3.5 w-3.5" aria-hidden />
            Direct dispatches awaiting receipt
          </p>
          <ul className="space-y-2">
            {inTransit.map((fulfillment) => (
              <InTransitRow
                key={fulfillment.fulfillmentId}
                fulfillment={fulfillment}
                manifest={crossDock.manifests.find(
                  (entry) => entry.fulfillmentId === fulfillment.fulfillmentId,
                )}
                onConfirm={() =>
                  setConfirmFulfillmentId(fulfillment.fulfillmentId)
                }
                onViewManifest={(manifest) => setActiveManifest(manifest)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <DirectAllocateModal
        open={Boolean(allocateShipmentId)}
        consignment={allocateConsignment}
        tickets={tickets}
        preselectTicketId={preselectTicketId}
        preselectQuantity={preselectQuantity}
        onClose={() => {
          setAllocateShipmentId(null);
          setPreselectTicketId(null);
          setPreselectQuantity(null);
        }}
        onSubmit={handleAllocate}
      />

      <ConfirmReceiptModal
        open={Boolean(confirmFulfillmentId)}
        fulfillment={confirmFulfillment}
        onClose={() => setConfirmFulfillmentId(null)}
        onConfirm={handleConfirmReceipt}
      />

      <DigitalTransitManifestCard
        manifest={activeManifest}
        onClose={() => setActiveManifest(null)}
      />
    </section>
  );
}

function InTransitRow({
  fulfillment,
  manifest,
  onConfirm,
  onViewManifest,
}: {
  fulfillment: TicketFulfillmentRecord;
  manifest?: DigitalTransitManifest;
  onConfirm: () => void;
  onViewManifest: (manifest: DigitalTransitManifest) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-[var(--ink)]">
          {fulfillment.reliefTicketId} ·{" "}
          {fulfillment.auditTrail.destinationLabel}
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          {fulfillment.auditTrail.originLabel}
          {fulfillment.auditTrail.vehicleNumber
            ? ` · ${fulfillment.auditTrail.vehicleNumber}`
            : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {manifest ? (
          <button
            type="button"
            onClick={() => onViewManifest(manifest)}
            className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-semibold"
          >
            Gate pass
          </button>
        ) : null}
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          <PackageCheck className="h-3.5 w-3.5" aria-hidden />
          Confirm Receipt of Goods
        </button>
      </div>
    </li>
  );
}
