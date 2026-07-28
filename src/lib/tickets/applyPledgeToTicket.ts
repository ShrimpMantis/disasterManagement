import { makeTicketItemId } from "@/types/pledgeIntake";
import type { ItemPledgeInput, NGOPledgeSubmission } from "@/types/pledgeIntake";
import type { ConsolidatedItemNeed, ReliefTicket } from "@/types/ticket";

export function getItemDeficit(item: ConsolidatedItemNeed): number {
  return Math.max(
    0,
    item.totalRequestedQuantity - (item.quantityPledged ?? item.fulfilledQuantity),
  );
}

export function getTicketDeficitPercent(ticket: ReliefTicket): number {
  const total = ticket.items.reduce((sum, item) => sum + item.totalRequestedQuantity, 0);
  if (total <= 0) return 0;
  const remaining = ticket.items.reduce((sum, item) => sum + getItemDeficit(item), 0);
  return Math.round((remaining / total) * 100);
}

export function ticketHasOpenDeficit(ticket: ReliefTicket): boolean {
  return ticket.items.some((item) => getItemDeficit(item) > 0);
}

export function isMarketplaceTicket(ticket: ReliefTicket): boolean {
  return (
    (ticket.status === "REQUESTED" || ticket.status === "PARTIALLY_FULFILLED") &&
    ticketHasOpenDeficit(ticket)
  );
}

export function toPledgeItemInputs(ticket: ReliefTicket): ItemPledgeInput[] {
  return ticket.items
    .map((item) => {
      const requiredQuantity = getItemDeficit(item);
      return {
        ticketItemId: makeTicketItemId(ticket.id, item.itemName, item.unit),
        itemName: item.itemName,
        category: item.category,
        requiredQuantity,
        pledgedQuantity: 0,
        unit: item.unit,
      };
    })
    .filter((item) => item.requiredQuantity > 0);
}

export type ApplyPledgeResult =
  | { ok: true; ticket: ReliefTicket; message: string }
  | { ok: false; error: string };

/**
 * Apply a confirmed NGO pledge onto a ticket:
 * - increases item.quantityPledged by pledgedQuantity
 * - ASSIGNED when all demand covered; otherwise PARTIALLY_FULFILLED
 */
export function applyConfirmedPledgeToTicket(
  ticket: ReliefTicket,
  pledge: Pick<
    NGOPledgeSubmission,
    "ngoId" | "ngoName" | "ticketMatchedItems" | "estimatedDeliveryDate"
  >,
  now = Date.now(),
): ApplyPledgeResult {
  if (!isMarketplaceTicket(ticket)) {
    return { ok: false, error: "Ticket is not open for pledges in the marketplace." };
  }

  const activePledges = (pledge.ticketMatchedItems ?? []).filter(
    (item) => item.pledgedQuantity > 0,
  );
  if (activePledges.length === 0) {
    return { ok: false, error: "Enter a pledged quantity for at least one ticket item." };
  }

  for (const pledgeItem of activePledges) {
    if (pledgeItem.pledgedQuantity < 0) {
      return { ok: false, error: `${pledgeItem.itemName}: pledged quantity cannot be negative.` };
    }
    const ticketItem = ticket.items.find(
      (item) =>
        makeTicketItemId(ticket.id, item.itemName, item.unit) === pledgeItem.ticketItemId,
    );
    if (!ticketItem) {
      return { ok: false, error: `Item not found on ticket: ${pledgeItem.itemName}` };
    }
    const deficit = getItemDeficit(ticketItem);
    if (pledgeItem.pledgedQuantity > deficit) {
      return {
        ok: false,
        error: `${pledgeItem.itemName}: pledged ${pledgeItem.pledgedQuantity} exceeds remaining ${deficit}.`,
      };
    }
  }

  const updatedItems = ticket.items.map((item) => {
    const key = makeTicketItemId(ticket.id, item.itemName, item.unit);
    const match = activePledges.find((pledgeItem) => pledgeItem.ticketItemId === key);
    if (!match) return item;
    return {
      ...item,
      quantityPledged: (item.quantityPledged ?? item.fulfilledQuantity) + match.pledgedQuantity,
    };
  });

  const fullyCovered = updatedItems.every(
    (item) => (item.quantityPledged ?? item.fulfilledQuantity) >= item.totalRequestedQuantity,
  );

  const nextStatus = fullyCovered ? "ASSIGNED" : "PARTIALLY_FULFILLED";

  return {
    ok: true,
    ticket: {
      ...ticket,
      items: updatedItems,
      status: nextStatus,
      assignedEntityId: pledge.ngoId,
      assignedEntityName: pledge.ngoName,
      estimatedArrival: pledge.estimatedDeliveryDate,
      totalPledgedCost:
        (ticket.totalPledgedCost ?? 0) +
        activePledges.reduce((sum, item) => {
          const ticketItem = ticket.items.find(
            (entry) =>
              makeTicketItemId(ticket.id, entry.itemName, entry.unit) ===
              item.ticketItemId,
          );
          return (
            sum +
            item.pledgedQuantity * Math.max(0, ticketItem?.estimatedUnitCost ?? 0)
          );
        }, 0),
      updatedAt: new Date(now).toISOString(),
      slaBreached:
        nextStatus === "ASSIGNED"
          ? false
          : Date.now() - Date.parse(ticket.createdAt) > 12 * 60 * 60 * 1000,
    },
    message: fullyCovered
      ? `All demand covered. Ticket ${ticket.id} assigned to ${pledge.ngoName}.`
      : `Partial pledge applied. Ticket ${ticket.id} remains open for remaining deficit.`,
  };
}

export function attachCustomItemsToTicket(
  ticket: ReliefTicket,
  customItems: Array<{ itemName: string; category: string; quantity: number; unit: string }>,
  ngo: { id: string; name: string },
  now = Date.now(),
): ReliefTicket {
  const nextItems = [...ticket.items];

  for (const custom of customItems) {
    const existing = nextItems.find(
      (item) =>
        item.itemName.toLowerCase() === custom.itemName.toLowerCase() &&
        item.unit.toLowerCase() === custom.unit.toLowerCase(),
    );
    if (existing) {
      existing.totalRequestedQuantity += custom.quantity;
      existing.fulfilledQuantity += custom.quantity;
      continue;
    }
    nextItems.push({
      itemName: custom.itemName,
      category: custom.category,
      totalRequestedQuantity: custom.quantity,
      fulfilledQuantity: custom.quantity,
      unit: custom.unit,
      underlyingRequestIds: [`custom-offer-${now}`],
    });
  }

  return {
    ...ticket,
    items: nextItems,
    assignedEntityId: ticket.assignedEntityId ?? ngo.id,
    assignedEntityName: ticket.assignedEntityName ?? ngo.name,
    updatedAt: new Date(now).toISOString(),
  };
}

export function applyDispatchToTicket(
  ticket: ReliefTicket,
  input: {
    ngoId: string;
    vehicleNumber: string;
    driverPhone: string;
    estimatedArrival?: string;
  },
  now = Date.now(),
): ApplyPledgeResult {
  if (ticket.status !== "ASSIGNED" && ticket.status !== "PARTIALLY_FULFILLED") {
    return {
      ok: false,
      error: "Only assigned or partially fulfilled tickets can move to DISPATCHED.",
    };
  }

  return {
    ok: true,
    ticket: {
      ...ticket,
      status: "DISPATCHED",
      assignedEntityId: input.ngoId,
      dispatchVehicleNumber: input.vehicleNumber,
      dispatchDriverPhone: input.driverPhone,
      estimatedArrival: input.estimatedArrival ?? ticket.estimatedArrival,
      updatedAt: new Date(now).toISOString(),
      slaBreached: false,
    },
    message: `Ticket ${ticket.id} marked DISPATCHED.`,
  };
}

export function applyDeliveryProofToTicket(
  ticket: ReliefTicket,
  proofOfDeliveryUrl: string,
  now = Date.now(),
): ApplyPledgeResult {
  const items = ticket.items.map((item) => ({
    ...item,
    quantityPledged: item.quantityPledged ?? item.totalRequestedQuantity,
    fulfilledQuantity: item.totalRequestedQuantity,
  }));

  return {
    ok: true,
    ticket: {
      ...ticket,
      status: "FULFILLED",
      items,
      proofOfDeliveryUrl,
      updatedAt: new Date(now).toISOString(),
      slaBreached: false,
    },
    message: `Ticket ${ticket.id} marked FULFILLED.`,
  };
}
