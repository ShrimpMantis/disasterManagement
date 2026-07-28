import type {
  AuditSamplingRecord,
  FulfillmentProof,
} from "@/types/fulfillmentAudit";
import type { ConsolidatedItemNeed, ReliefTicket, TicketStatus } from "@/types/ticket";

export type TransitionContext = {
  assignedEntityId?: string;
  assignedEntityName?: string;
  dispatchVehicleNumber?: string;
  dispatchDriverPhone?: string;
  estimatedArrival?: string;
  proofOfDeliveryUrl?: string;
  fieldOtpConfirmed?: boolean;
  proofOfFulfillment?: FulfillmentProof;
  auditSampling?: AuditSamplingRecord;
  now?: number;
};

export type TransitionResult =
  | { ok: true; tickets: ReliefTicket[]; message?: string }
  | { ok: false; error: string };

const ALLOWED: Record<TicketStatus, TicketStatus[]> = {
  REQUESTED: ["ASSIGNED", "PARTIALLY_FULFILLED", "DISPATCHED"],
  ASSIGNED: ["DISPATCHED"],
  DISPATCHED: ["FULFILLED", "PARTIALLY_FULFILLED", "SELECTED_FOR_AUDIT"],
  PARTIALLY_FULFILLED: ["FULFILLED", "REQUESTED", "DISPATCHED", "SELECTED_FOR_AUDIT"],
  FULFILLED: ["SELECTED_FOR_AUDIT"],
  SELECTED_FOR_AUDIT: ["AUDIT_VERIFIED", "AUDIT_FAILED"],
  AUDIT_VERIFIED: [],
  AUDIT_FAILED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

function stamp(ticket: ReliefTicket, now: number, patch: Partial<ReliefTicket>): ReliefTicket {
  return {
    ...ticket,
    ...patch,
    updatedAt: new Date(now).toISOString(),
  };
}

function remainingItems(items: ConsolidatedItemNeed[]): ConsolidatedItemNeed[] {
  return items
    .map((item) => {
      const remaining = Math.max(0, item.totalRequestedQuantity - item.fulfilledQuantity);
      return {
        ...item,
        totalRequestedQuantity: remaining,
        fulfilledQuantity: 0,
        underlyingRequestIds: [...item.underlyingRequestIds],
      };
    })
    .filter((item) => item.totalRequestedQuantity > 0);
}

function createChildTicket(
  parent: ReliefTicket,
  deficitItems: ConsolidatedItemNeed[],
  now: number,
): ReliefTicket {
  return {
    id: `${parent.id}-R`,
    villageId: parent.villageId,
    villageName: parent.villageName,
    revenueCircle: parent.revenueCircle,
    district: parent.district,
    priority: parent.priority,
    status: "REQUESTED",
    items: deficitItems,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    slaBreached: false,
    requiresManualVerification: parent.requiresManualVerification,
    parentTicketId: parent.id,
  };
}

/**
 * Enforce ticket lifecycle transitions per Feature 4.3 rules.
 */
export function transitionTicket(
  ticket: ReliefTicket,
  nextStatus: TicketStatus,
  context: TransitionContext = {},
): TransitionResult {
  const now = context.now ?? Date.now();

  if (ticket.status === nextStatus) {
    return { ok: true, tickets: [ticket] };
  }

  if (!canTransition(ticket.status, nextStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${ticket.status} → ${nextStatus}`,
    };
  }

  if (nextStatus === "ASSIGNED") {
    if (!context.assignedEntityId) {
      return { ok: false, error: "ASSIGNED requires assignedEntityId (NGO or Warehouse)." };
    }
    return {
      ok: true,
      tickets: [
        stamp(ticket, now, {
          status: "ASSIGNED",
          assignedEntityId: context.assignedEntityId,
          assignedEntityName: context.assignedEntityName,
          slaBreached: now - Date.parse(ticket.createdAt) > 12 * 60 * 60 * 1000,
        }),
      ],
    };
  }

  if (nextStatus === "DISPATCHED") {
    if (!context.dispatchVehicleNumber || !context.dispatchDriverPhone) {
      return {
        ok: false,
        error: "DISPATCHED requires dispatchVehicleNumber and dispatchDriverPhone.",
      };
    }
    if (ticket.requiresManualVerification) {
      return {
        ok: false,
        error: "Ticket flagged for manual verification before dispatch.",
      };
    }
    return {
      ok: true,
      tickets: [
        stamp(ticket, now, {
          status: "DISPATCHED",
          dispatchVehicleNumber: context.dispatchVehicleNumber,
          dispatchDriverPhone: context.dispatchDriverPhone,
          estimatedArrival: context.estimatedArrival,
          slaBreached: false,
        }),
      ],
    };
  }

  if (nextStatus === "FULFILLED" || nextStatus === "SELECTED_FOR_AUDIT") {
    if (
      !context.proofOfDeliveryUrl &&
      !context.fieldOtpConfirmed &&
      !context.proofOfFulfillment
    ) {
      return {
        ok: false,
        error:
          "Fulfillment requires proof photo, field OTP confirmation, or fulfillment proof.",
      };
    }

    const fulfilledItems = ticket.items.map((item) => ({
      ...item,
      fulfilledQuantity: item.totalRequestedQuantity,
    }));

    return {
      ok: true,
      tickets: [
        stamp(ticket, now, {
          status: nextStatus,
          items: fulfilledItems,
          proofOfDeliveryUrl:
            context.proofOfDeliveryUrl ?? context.proofOfFulfillment?.dropPhotoUrl,
          proofOfFulfillment: context.proofOfFulfillment,
          auditSampling: context.auditSampling,
          slaBreached: false,
        }),
      ],
    };
  }

  if (nextStatus === "PARTIALLY_FULFILLED") {
    const partiallyFulfilledItems = ticket.items.map((item) => {
      const fulfilled = Math.max(
        0,
        Math.min(
          item.totalRequestedQuantity,
          Math.floor(item.totalRequestedQuantity * 0.5),
        ),
      );
      return { ...item, fulfilledQuantity: fulfilled };
    });

    const parent = stamp(ticket, now, {
      status: "PARTIALLY_FULFILLED",
      items: partiallyFulfilledItems,
      proofOfDeliveryUrl: context.proofOfDeliveryUrl,
      slaBreached: false,
    });

    const deficit = remainingItems(partiallyFulfilledItems);
    if (deficit.length === 0) {
      return {
        ok: true,
        tickets: [
          stamp(ticket, now, {
            status: "FULFILLED",
            items: partiallyFulfilledItems.map((item) => ({
              ...item,
              fulfilledQuantity: item.totalRequestedQuantity,
            })),
            proofOfFulfillment: context.proofOfFulfillment,
            auditSampling: context.auditSampling,
            slaBreached: false,
          }),
        ],
        message: "All items fully covered; ticket marked FULFILLED.",
      };
    }

    const child = createChildTicket(parent, deficit, now);
    return {
      ok: true,
      tickets: [parent, child],
      message: `Partial fulfillment recorded. Child ticket ${child.id} created for deficit.`,
    };
  }

  if (nextStatus === "AUDIT_VERIFIED" || nextStatus === "AUDIT_FAILED") {
    if (!ticket.auditSampling) {
      return {
        ok: false,
        error: "Audit resolution requires an audit sampling record.",
      };
    }
    return {
      ok: true,
      tickets: [
        stamp(ticket, now, {
          status: nextStatus,
          auditSampling: {
            ...ticket.auditSampling,
            auditStatus: nextStatus === "AUDIT_VERIFIED" ? "PASSED" : "FAILED",
          },
          slaBreached: false,
        }),
      ],
    };
  }

  return { ok: false, error: `Unhandled transition to ${nextStatus}` };
}

export function getAllowedNextStatuses(status: TicketStatus): TicketStatus[] {
  return ALLOWED[status] ?? [];
}
