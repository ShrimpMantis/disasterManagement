"use server";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import {
  applyDirectAllocations,
  confirmFulfillmentReceipt,
  findSuggestedDirectMatches,
  receiveConsignmentToWarehouse,
  type TicketAllocationPlan,
} from "@/lib/crossDock/allocation";
import { slugifyDistrictId } from "@/lib/firestore/geohash";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type {
  DigitalTransitManifest,
  InboundConsignment,
  SuggestedDirectMatch,
  TicketFulfillmentRecord,
} from "@/types/reliefCrossDock";
import type { PhysicalItemCategory } from "@/types/reliefTotals";
import type { ConsolidatedReliefMetrics } from "@/types/reliefTotals";
import type { ReliefTicket } from "@/types/ticket";
import {
  emptyConsolidatedReliefMetrics,
  normalizeReliefMetrics,
} from "@/lib/crossDock/reliefMetrics";

export type CrossDockSnapshot = {
  consignments: InboundConsignment[];
  fulfillments: TicketFulfillmentRecord[];
  manifests: DigitalTransitManifest[];
  reliefMetrics: ConsolidatedReliefMetrics;
};

export async function fetchCrossDockSnapshot(): Promise<
  ActionResult<CrossDockSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({
      consignments: [],
      fulfillments: [],
      manifests: [],
      reliefMetrics: emptyConsolidatedReliefMetrics(),
    });
  }

  try {
    const [consignmentSnap, fulfillmentSnap, manifestSnap, metricsSnap] =
      await Promise.all([
        db.collection(FIRESTORE_COLLECTIONS.inboundConsignments).get(),
        db.collection(FIRESTORE_COLLECTIONS.ticketFulfillments).get(),
        db.collection(FIRESTORE_COLLECTIONS.transitManifests).get(),
        db
          .collection(FIRESTORE_COLLECTIONS.consolidatedReliefMetrics)
          .doc("district")
          .get(),
      ]);

    const consignments = consignmentSnap.docs
      .map((doc) => doc.data() as InboundConsignment)
      .filter((entry) => isNonEmptyString(entry.shipmentId))
      .sort(
        (a, b) =>
          Date.parse(b.etaOrArrivedAt) - Date.parse(a.etaOrArrivedAt),
      );

    const fulfillments = fulfillmentSnap.docs
      .map((doc) => doc.data() as TicketFulfillmentRecord)
      .filter((entry) => isNonEmptyString(entry.fulfillmentId))
      .sort(
        (a, b) =>
          Date.parse(b.dispatchedTimestamp) - Date.parse(a.dispatchedTimestamp),
      );

    const manifests = manifestSnap.docs
      .map((doc) => doc.data() as DigitalTransitManifest)
      .filter((entry) => isNonEmptyString(entry.manifestId));

    return actionOk({
      consignments,
      fulfillments,
      manifests,
      reliefMetrics: normalizeReliefMetrics(
        metricsSnap.exists
          ? (metricsSnap.data() as Record<string, unknown>)
          : undefined,
      ),
    });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load cross-dock snapshot.",
    );
  }
}

export async function receiveConsignmentToWarehouseAction(input: {
  consignment: InboundConsignment;
}): Promise<ActionResult<InboundConsignment>> {
  if (!isNonEmptyString(input.consignment?.shipmentId)) {
    return actionFail("Shipment ID is required.");
  }

  const next = receiveConsignmentToWarehouse(input.consignment);

  try {
    const db = getAdminFirestore();
    await db
      .collection(FIRESTORE_COLLECTIONS.inboundConsignments)
      .doc(next.shipmentId)
      .set(
        {
          ...next,
          warehouseStockTouched: false,
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return actionOk(next, `${next.shipmentId} received to warehouse pathway.`);
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to mark consignment received to warehouse.",
    );
  }
}

function mapCategoryToPhysical(category: string): PhysicalItemCategory {
  const value = category.toLowerCase();
  if (value.includes("water")) return "WATER";
  if (value.includes("food") || value.includes("ration")) return "FOOD";
  if (value.includes("cloth")) return "CLOTHING";
  if (value.includes("shelter") || value.includes("tarp")) return "SHELTER";
  if (value.includes("medical") || value.includes("snake") || value.includes("hygiene")) {
    return "MEDICAL";
  }
  return "FOOD";
}

async function loadOpenTicketsForCircle(
  district: string,
  revenueCircle: string,
): Promise<ReliefTicket[]> {
  const db = getAdminFirestore();
  const districtId = slugifyDistrictId(district);
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.districts)
    .doc(districtId)
    .collection(FIRESTORE_COLLECTIONS.tickets)
    .where("revenueCircle", "==", revenueCircle)
    .get();

  return snap.docs
    .map((doc) => doc.data() as ReliefTicket)
    .filter(
      (ticket) =>
        ticket.status === "REQUESTED" ||
        ticket.status === "ASSIGNED" ||
        ticket.status === "PARTIALLY_FULFILLED",
    );
}

export async function suggestDirectMatchesForShipment(input: {
  consignment: InboundConsignment;
  tickets?: ReliefTicket[];
}): Promise<ActionResult<SuggestedDirectMatch[]>> {
  if (!isNonEmptyString(input.consignment?.shipmentId)) {
    return actionFail("Shipment ID is required.");
  }

  try {
    const tickets =
      input.tickets ??
      (await loadOpenTicketsForCircle(
        input.consignment.district,
        input.consignment.revenueCircle,
      ));
    const matches = findSuggestedDirectMatches(input.consignment, tickets);
    return actionOk(matches);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compute matches.";
    return actionFail(message);
  }
}

export type DirectAllocateServerInput = {
  consignment: InboundConsignment;
  tickets: ReliefTicket[];
  plans: TicketAllocationPlan[];
  operatorUserId?: string;
};

/**
 * Transactional direct allocation:
 * - Writes fulfillment + manifest docs
 * - Updates tickets
 * - Does NOT mutate warehouse currentStockTons
 */
export async function directAllocateToTickets(
  input: DirectAllocateServerInput,
): Promise<
  ActionResult<{
    fulfillments: TicketFulfillmentRecord[];
    manifests: DigitalTransitManifest[];
    tickets: ReliefTicket[];
    consignment: InboundConsignment;
  }>
> {
  if (!isNonEmptyString(input.consignment?.shipmentId)) {
    return actionFail("Inbound consignment is required.");
  }
  if (!Array.isArray(input.plans) || input.plans.length === 0) {
    return actionFail("At least one ticket allocation plan is required.");
  }
  for (const plan of input.plans) {
    if (!isNonEmptyString(plan.reliefTicketId)) {
      return actionFail("Each plan requires a reliefTicketId.");
    }
    for (const line of plan.lines) {
      if (!isFiniteNumber(line.quantity) || line.quantity < 0) {
        return actionFail("Allocated quantities must be non-negative numbers.");
      }
    }
  }

  const local = applyDirectAllocations({
    consignment: input.consignment,
    tickets: input.tickets,
    plans: input.plans,
    receivedByUserId: input.operatorUserId,
  });
  if (!local.ok) return actionFail(local.error);

  try {
    const db = getAdminFirestore();
    const batch = db.batch();
    const districtId = slugifyDistrictId(input.consignment.district);

    for (const fulfillment of local.fulfillments) {
      const ref = db
        .collection(FIRESTORE_COLLECTIONS.ticketFulfillments)
        .doc(fulfillment.fulfillmentId);
      batch.set(ref, {
        ...fulfillment,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    }

    for (const manifest of local.manifests) {
      const ref = db
        .collection(FIRESTORE_COLLECTIONS.transitManifests)
        .doc(manifest.manifestId);
      batch.set(ref, {
        ...manifest,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    }

    for (const ticket of local.tickets) {
      const ref = db
        .collection(FIRESTORE_COLLECTIONS.districts)
        .doc(districtId)
        .collection(FIRESTORE_COLLECTIONS.tickets)
        .doc(ticket.id);
      batch.set(
        ref,
        {
          ...ticket,
          districtId,
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const consignment = local.consignments[0]!;
    batch.set(
      db.collection(FIRESTORE_COLLECTIONS.inboundConsignments).doc(consignment.shipmentId),
      {
        ...consignment,
        // Explicitly omit warehouse stock mutation
        warehouseStockTouched: false,
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    return actionOk(
      {
        fulfillments: local.fulfillments,
        manifests: local.manifests,
        tickets: local.tickets,
        consignment,
      },
      local.message,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to persist direct allocation.";
    return actionFail(message);
  }
}

export async function confirmGoodsReceipt(input: {
  fulfillment: TicketFulfillmentRecord;
  ticket: ReliefTicket;
  allTickets: ReliefTicket[];
  receivedByUserId: string;
  receivedByName: string;
  proofOfReceiptUrl?: string;
  receiptGps?: { lat: number; lng: number };
}): Promise<
  ActionResult<{
    fulfillment: TicketFulfillmentRecord;
    ticket: ReliefTicket;
  }>
> {
  if (!isNonEmptyString(input.fulfillment?.fulfillmentId)) {
    return actionFail("Fulfillment ID is required.");
  }
  if (!isNonEmptyString(input.receivedByUserId)) {
    return actionFail("Receiver user ID is required.");
  }
  if (!isNonEmptyString(input.receivedByName)) {
    return actionFail("Receiver name is required.");
  }

  const local = confirmFulfillmentReceipt(input);
  if (!local.ok) return actionFail(local.error);

  try {
    const db = getAdminFirestore();
    const batch = db.batch();
    const districtId = slugifyDistrictId(input.ticket.district);
    const ticket = local.tickets[0]!;

    batch.set(
      db.collection(FIRESTORE_COLLECTIONS.ticketFulfillments).doc(local.fulfillment.fulfillmentId),
      {
        ...local.fulfillment,
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      db
        .collection(FIRESTORE_COLLECTIONS.districts)
        .doc(districtId)
        .collection(FIRESTORE_COLLECTIONS.tickets)
        .doc(ticket.id),
      {
        ...ticket,
        districtId,
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Bump consolidated relief metrics counters (dashboard KPIs).
    for (const item of local.fulfillment.allocatedItems) {
      const physicalCategory = mapCategoryToPhysical(item.category);
      const metricsRef = db
        .collection(FIRESTORE_COLLECTIONS.consolidatedReliefMetrics)
        .doc("district");
      batch.set(
        metricsRef,
        {
          lastUpdatedTimestamp: new Date().toISOString(),
          physicalTotals: {
            [physicalCategory]: FieldValue.increment(item.quantityAllocated),
          },
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();

    return actionOk(
      { fulfillment: local.fulfillment, ticket },
      local.message,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to confirm goods receipt.";
    return actionFail(message);
  }
}
