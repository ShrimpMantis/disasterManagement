import type {
  AllocatedLineItem,
  DigitalTransitManifest,
  InboundConsignment,
  SuggestedDirectMatch,
  TicketFulfillmentRecord,
} from "@/types/reliefCrossDock";
import type { ConsolidatedItemNeed, ReliefTicket } from "@/types/ticket";
import { getItemDeficit } from "@/lib/tickets/applyPledgeToTicket";

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function namesLooselyMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return left === right || left.includes(right) || right.includes(left);
}

export function findMatchingTicketItem(
  ticket: ReliefTicket,
  displayName: string,
  category: string,
): ConsolidatedItemNeed | undefined {
  return (
    ticket.items.find(
      (item) =>
        namesLooselyMatch(item.itemName, displayName) &&
        getItemDeficit(item) > 0,
    ) ??
    ticket.items.find(
      (item) =>
        namesLooselyMatch(item.category, category) && getItemDeficit(item) > 0,
    )
  );
}

/**
 * Scan open tickets in the same revenue circle for inbound item matches.
 */
export function findSuggestedDirectMatches(
  consignment: InboundConsignment,
  tickets: ReliefTicket[],
): SuggestedDirectMatch[] {
  const openTickets = tickets.filter(
    (ticket) =>
      (ticket.status === "REQUESTED" ||
        ticket.status === "ASSIGNED" ||
        ticket.status === "PARTIALLY_FULFILLED") &&
      ticket.revenueCircle === consignment.revenueCircle,
  );

  const matches: SuggestedDirectMatch[] = [];

  for (const line of consignment.items) {
    if (line.quantityRemaining <= 0) continue;

    for (const ticket of openTickets) {
      const item = findMatchingTicketItem(
        ticket,
        line.displayName,
        line.category,
      );
      if (!item) continue;
      const deficit = getItemDeficit(item);
      if (deficit <= 0) continue;

      const suggestedAllocateQuantity = Math.min(
        deficit,
        line.quantityRemaining,
      );
      const coverage = suggestedAllocateQuantity / deficit;
      const score =
        coverage * 100 +
        (ticket.priority === "CRITICAL"
          ? 30
          : ticket.priority === "HIGH"
            ? 20
            : 10);

      matches.push({
        shipmentId: consignment.shipmentId,
        ticketId: ticket.id,
        villageName: ticket.villageName,
        revenueCircle: ticket.revenueCircle,
        matchedItemName: item.itemName,
        matchedCategory: item.category,
        unit: item.unit,
        ticketDeficit: deficit,
        availableQuantity: line.quantityRemaining,
        suggestedAllocateQuantity,
        score,
        bannerText: `Match Found: ${ticket.villageName} needs ${deficit.toLocaleString("en-IN")} ${item.itemName}. Route driver directly?`,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export type TicketAllocationPlan = {
  reliefTicketId: string;
  lines: Array<{
    inboundLineId: string;
    displayName: string;
    category: string;
    unit: string;
    quantity: number;
  }>;
};

export type DirectAllocateResult =
  | {
      ok: true;
      consignments: InboundConsignment[];
      tickets: ReliefTicket[];
      fulfillments: TicketFulfillmentRecord[];
      manifests: DigitalTransitManifest[];
      message: string;
    }
  | { ok: false; error: string };

function stampTicket(
  ticket: ReliefTicket,
  patch: Partial<ReliefTicket>,
  now: number,
): ReliefTicket {
  return {
    ...ticket,
    ...patch,
    updatedAt: new Date(now).toISOString(),
  };
}

function remainingDeficitItems(
  items: ConsolidatedItemNeed[],
): ConsolidatedItemNeed[] {
  return items
    .map((item) => {
      const remaining = getItemDeficit(item);
      return {
        ...item,
        totalRequestedQuantity: remaining,
        fulfilledQuantity: 0,
        underlyingRequestIds: [...item.underlyingRequestIds],
      };
    })
    .filter((item) => item.totalRequestedQuantity > 0);
}

/**
 * Direct-allocate inbound lines onto open tickets without warehouse check-in.
 * Warehouse currentStockTons is never mutated.
 */
export function applyDirectAllocations(params: {
  consignment: InboundConsignment;
  tickets: ReliefTicket[];
  plans: TicketAllocationPlan[];
  receivedByUserId?: string;
  now?: number;
}): DirectAllocateResult {
  const now = params.now ?? Date.now();
  const timestamp = new Date(now).toISOString();

  if (params.plans.length === 0) {
    return { ok: false, error: "Select at least one ticket allocation." };
  }

  let consignment: InboundConsignment = {
    ...params.consignment,
    items: params.consignment.items.map((item) => ({ ...item })),
  };
  const ticketMap = new Map(
    params.tickets.map((ticket) => [ticket.id, { ...ticket, items: ticket.items.map((i) => ({ ...i })) }]),
  );
  const fulfillments: TicketFulfillmentRecord[] = [];
  const manifests: DigitalTransitManifest[] = [];
  const createdChildren: ReliefTicket[] = [];

  for (const plan of params.plans) {
    const ticket = ticketMap.get(plan.reliefTicketId);
    if (!ticket) {
      return { ok: false, error: `Ticket ${plan.reliefTicketId} not found.` };
    }
    if (
      ticket.status === "FULFILLED" ||
      ticket.status === "DISPATCHED"
    ) {
      return {
        ok: false,
        error: `Ticket ${ticket.id} is ${ticket.status} and cannot receive a new direct allocation.`,
      };
    }

    const allocatedItems: AllocatedLineItem[] = [];

    for (const line of plan.lines) {
      if (line.quantity <= 0) continue;
      const inbound = consignment.items.find(
        (item) => item.lineId === line.inboundLineId,
      );
      if (!inbound) {
        return { ok: false, error: `Inbound line ${line.inboundLineId} missing.` };
      }
      if (line.quantity > inbound.quantityRemaining) {
        return {
          ok: false,
          error: `Only ${inbound.quantityRemaining} ${inbound.displayName} remaining on ${consignment.shipmentId}.`,
        };
      }

      const ticketItem = findMatchingTicketItem(
        ticket,
        line.displayName,
        line.category,
      );
      if (!ticketItem) {
        return {
          ok: false,
          error: `No open demand for ${line.displayName} on ${ticket.id}.`,
        };
      }

      const deficit = getItemDeficit(ticketItem);
      const applyQty = Math.min(line.quantity, deficit, inbound.quantityRemaining);
      if (applyQty <= 0) continue;

      ticketItem.fulfilledQuantity += applyQty;
      inbound.quantityRemaining -= applyQty;
      allocatedItems.push({
        category: ticketItem.category,
        displayName: ticketItem.itemName,
        unit: ticketItem.unit,
        quantityAllocated: applyQty,
      });
    }

    if (allocatedItems.length === 0) {
      return {
        ok: false,
        error: `No quantities applied for ticket ${ticket.id}.`,
      };
    }

    const fullyCovered = ticket.items.every((item) => getItemDeficit(item) === 0);
    const fulfillmentId = `FUL-${Date.now()}-${ticket.id}`;
    const manifestId = `MAN-${Date.now()}-${ticket.id}`;
    const gatePassCode = `GP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const destinationLabel = `Relief Camp / Village Lead — ${ticket.villageName} (${ticket.revenueCircle})`;
    const originLabel = `Inbound Consignment (${consignment.vehicleNumber})`;

    const fulfillment: TicketFulfillmentRecord = {
      fulfillmentId,
      reliefTicketId: ticket.id,
      sourceType: "DIRECT_INBOUND_CONSIGNMENT",
      sourceShipmentId: consignment.shipmentId,
      allocatedItems,
      dispatchedTimestamp: timestamp,
      receivedByUserId: params.receivedByUserId ?? "ops-pending",
      status: "DISPATCHED_IN_TRANSIT",
      auditTrail: {
        originLabel,
        destinationLabel,
        vehicleNumber: consignment.vehicleNumber,
      },
      digitalManifestId: manifestId,
    };
    fulfillments.push(fulfillment);

    manifests.push({
      manifestId,
      fulfillmentId,
      reliefTicketId: ticket.id,
      vehicleNumber: consignment.vehicleNumber,
      driverPhone: consignment.driverPhone,
      originLabel,
      destinationLabel,
      villageName: ticket.villageName,
      revenueCircle: ticket.revenueCircle,
      district: ticket.district,
      items: allocatedItems,
      issuedAt: timestamp,
      gatePassCode,
    });

    ticketMap.set(
      ticket.id,
      stampTicket(
        ticket,
        {
          status: "DISPATCHED",
          assignedEntityId: `crossdock-${consignment.shipmentId}`,
          assignedEntityName: `Direct inbound ${consignment.vehicleNumber}`,
          dispatchVehicleNumber: consignment.vehicleNumber,
          dispatchDriverPhone: consignment.driverPhone,
          estimatedArrival: new Date(now + 90 * 60_000).toISOString(),
          items: ticket.items,
          slaBreached: false,
        },
        now,
      ),
    );

    if (!fullyCovered) {
      const deficitItems = remainingDeficitItems(ticket.items);
      if (deficitItems.length > 0) {
        createdChildren.push({
          id: `${ticket.id}-R${Date.now().toString().slice(-4)}`,
          villageId: ticket.villageId,
          villageName: ticket.villageName,
          revenueCircle: ticket.revenueCircle,
          district: ticket.district,
          priority: ticket.priority,
          status: "REQUESTED",
          items: deficitItems,
          createdAt: timestamp,
          updatedAt: timestamp,
          slaBreached: false,
          requiresManualVerification: ticket.requiresManualVerification,
          parentTicketId: ticket.id,
        });
      }
    }
  }

  const remainingTotal = consignment.items.reduce(
    (sum, item) => sum + item.quantityRemaining,
    0,
  );
  consignment = {
    ...consignment,
    status:
      remainingTotal <= 0
        ? "FULLY_ALLOCATED"
        : consignment.items.some(
              (item) => item.quantityRemaining < item.quantityArriving,
            )
          ? "PARTIALLY_ALLOCATED"
          : consignment.status,
  };

  const nextTickets = [
    ...Array.from(ticketMap.values()),
    ...createdChildren,
  ];

  return {
    ok: true,
    consignments: [consignment],
    tickets: nextTickets,
    fulfillments,
    manifests,
    message: `Direct-allocated to ${fulfillments.length} ticket(s). Digital gate pass issued. Warehouse stock unchanged.`,
  };
}

export type ConfirmReceiptResult =
  | {
      ok: true;
      tickets: ReliefTicket[];
      fulfillment: TicketFulfillmentRecord;
      message: string;
    }
  | { ok: false; error: string };

export function confirmFulfillmentReceipt(params: {
  fulfillment: TicketFulfillmentRecord;
  ticket: ReliefTicket;
  allTickets: ReliefTicket[];
  receivedByUserId: string;
  receivedByName: string;
  proofOfReceiptUrl?: string;
  receiptGps?: { lat: number; lng: number };
  now?: number;
}): ConfirmReceiptResult {
  const now = params.now ?? Date.now();
  const timestamp = new Date(now).toISOString();

  if (params.fulfillment.status !== "DISPATCHED_IN_TRANSIT") {
    return {
      ok: false,
      error: `Fulfillment is ${params.fulfillment.status} and cannot be confirmed again.`,
    };
  }
  if (params.ticket.id !== params.fulfillment.reliefTicketId) {
    return { ok: false, error: "Ticket / fulfillment mismatch." };
  }

  const fulfillment: TicketFulfillmentRecord = {
    ...params.fulfillment,
    status: "DELIVERED_FULFILLED",
    receivedTimestamp: timestamp,
    proofOfReceiptUrl:
      params.proofOfReceiptUrl ??
      `https://proofs.reliefnet.local/${params.fulfillment.fulfillmentId}.jpg`,
    receivedByUserId: params.receivedByUserId,
    receivedByName: params.receivedByName,
    receiptGps: params.receiptGps,
  };

  const hasRemainingOpenChild = params.allTickets.some(
    (ticket) =>
      ticket.parentTicketId === params.ticket.id &&
      ticket.status !== "FULFILLED",
  );

  const ticketFullyCovered = params.ticket.items.every(
    (item) => getItemDeficit(item) === 0,
  );

  const nextTicket = stampTicket(
    params.ticket,
    {
      status: ticketFullyCovered ? "FULFILLED" : "PARTIALLY_FULFILLED",
      proofOfDeliveryUrl: fulfillment.proofOfReceiptUrl,
      slaBreached: false,
    },
    now,
  );

  return {
    ok: true,
    tickets: [nextTicket],
    fulfillment,
    message: hasRemainingOpenChild
      ? `Receipt confirmed for ${params.ticket.id}. Residual demand remains on child ticket(s).`
      : `Receipt confirmed. ${params.ticket.id} marked ${nextTicket.status}.`,
  };
}

export function receiveConsignmentToWarehouse(
  consignment: InboundConsignment,
): InboundConsignment {
  return {
    ...consignment,
    status: "RECEIVED_TO_WAREHOUSE",
    // Intentionally does not expose/mutate warehouse currentStockTons here.
    // Warehouse inventory is updated by a separate warehouse module.
  };
}
