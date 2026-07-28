"use server";

import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  isValidLatLng,
  type ActionResult,
} from "@/lib/actions/result";
import { slugifyDistrictId } from "@/lib/firestore/geohash";
import {
  districtTicketsPath,
  districtVillagesPath,
  FIRESTORE_COLLECTIONS,
  type ReliefTicketCreationDoc,
  type TicketDoc,
  type VillageCoordinationDoc,
} from "@/lib/firestore/schema";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import type {
  CreateReliefTicketInput,
  ReliefItemCategory,
  ReliefTicketDocument,
  TicketItemRequest,
} from "@/types/reliefTicketCreation";
import type { ReliefTicket, TicketPriority, RequestChannel } from "@/types/ticket";

type TicketCounterDoc = {
  current: number;
  year: number;
};

const CATEGORY_TO_VILLAGE_DEMAND: Record<
  ReliefItemCategory,
  VillageCoordinationDoc["demands"][number]["category"]
> = {
  FOOD: "FOOD_RATIONS",
  WATER: "WATER_CANS",
  MEDICAL: "MEDICAL_KITS",
  SHELTER: "TARPAULINS",
  HYGIENE: "MEDICAL_KITS",
  CLOTHING: "TARPAULINS",
  RESCUE_OPERATION: "TARPAULINS",
};

function toQueuePriority(priority: CreateReliefTicketInput["priority"]): TicketPriority {
  if (priority === "CRITICAL_LIFE_SAFETY") return "CRITICAL";
  if (priority === "URGENT") return "HIGH";
  return "MEDIUM";
}

function toQueueChannel(
  sourceChannel: CreateReliefTicketInput["sourceChannel"],
): RequestChannel {
  if (sourceChannel === "FIELD_AGENT") return "RELIEF_CAMP";
  return "CITIZEN_SOS";
}

function validateItem(item: TicketItemRequest): string | null {
  if (!isNonEmptyString(item.itemDisplayName)) return "Item name is required.";
  if (!isNonEmptyString(item.unitType)) return "Item unit is required.";
  if (!isFiniteNumber(item.quantityRequested) || item.quantityRequested <= 0) {
    return "Requested quantity must be greater than zero.";
  }
  if (!isFiniteNumber(item.quantityFulfilled) || item.quantityFulfilled < 0) {
    return "Fulfilled quantity cannot be negative.";
  }
  return null;
}

function buildTopLevelTicket(
  input: CreateReliefTicketInput,
  ticketId: string,
  ticketCode: string,
  timestamp: string,
): ReliefTicketDocument {
  const totalEstimatedCost = input.items.reduce(
    (sum, item) => sum + item.estimatedTotalCost,
    0,
  );
  return {
    ...input,
    ticketId,
    ticketCode,
    status: "OPEN_UNMET",
    totalEstimatedCost,
    totalPledgedCost: 0,
    assignedPledges: [],
    totalAssignedManpower: 0,
    createdTimestamp: timestamp,
    lastUpdatedTimestamp: timestamp,
  };
}

function buildQueueTicket(
  input: CreateReliefTicketInput,
  ticketCode: string,
  timestamp: string,
): ReliefTicket {
  return {
    id: ticketCode,
    villageId: input.villageOrShelterId ?? slugifyDistrictId(input.villageOrShelterName),
    villageName: input.villageOrShelterName,
    revenueCircle: input.revenueCircle,
    district: input.districtName,
    priority: toQueuePriority(input.priority),
    status: "REQUESTED",
    sourceChannel: toQueueChannel(input.sourceChannel),
    items: input.items.map((item) => ({
      itemName: item.itemDisplayName,
      category: item.category,
      totalRequestedQuantity: item.quantityRequested,
      quantityPledged: 0,
      fulfilledQuantity: item.quantityFulfilled,
      unit: item.unitType,
      itemId:
        item.itemId ??
        `${ticketCode}-${item.itemDisplayName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      estimatedUnitCost: item.estimatedUnitCost,
      estimatedTotalCost: item.estimatedTotalCost,
      underlyingRequestIds: [`admin-create-${ticketCode}`],
    })),
    totalEstimatedTicketCost: input.items.reduce(
      (sum, item) => sum + item.estimatedTotalCost,
      0,
    ),
    totalPledgedCost: 0,
    totalAssignedManpower: 0,
    assignedPledges: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    slaBreached: false,
    requesterName: input.contactPersonName,
    requesterPhone: input.contactPersonPhone,
    requesterRole: input.contactPersonRole,
    dropCoordinates: input.dropCoordinates,
    landmarkNotes: input.landmarkNotes,
    specialInstructions: input.specialInstructions,
    createdById: input.createdById,
    createdByName: input.createdByName,
  };
}

function mergeDemandLines(
  existing: VillageCoordinationDoc["demands"],
  inputItems: TicketItemRequest[],
): VillageCoordinationDoc["demands"] {
  const next = [...existing];
  for (const item of inputItems) {
    const category = CATEGORY_TO_VILLAGE_DEMAND[item.category];
    const matched = next.find(
      (entry) =>
        entry.category === category &&
        entry.displayName.toLowerCase() === item.itemDisplayName.toLowerCase(),
    );
    if (matched) {
      matched.quantityAssessed += item.quantityRequested;
      continue;
    }
    next.push({
      category,
      displayName: item.itemDisplayName,
      quantityAssessed: item.quantityRequested,
      quantityPledged: 0,
      quantityDelivered: 0,
      quantityInTransit: 0,
    });
  }
  return next;
}

export async function createReliefTicket(
  input: CreateReliefTicketInput,
): Promise<
  ActionResult<{
    topLevel: ReliefTicketCreationDoc;
    queueTicket: TicketDoc;
  }>
> {
  if (
    !isNonEmptyString(input.districtId) ||
    !isNonEmptyString(input.districtName) ||
    !isNonEmptyString(input.revenueCircle) ||
    !isNonEmptyString(input.villageOrShelterId) ||
    !isNonEmptyString(input.villageOrShelterName) ||
    !isNonEmptyString(input.landmarkNotes) ||
    !isNonEmptyString(input.contactPersonName) ||
    !isNonEmptyString(input.contactPersonPhone) ||
    !isNonEmptyString(input.contactPersonRole) ||
    !isNonEmptyString(input.createdById) ||
    !isNonEmptyString(input.createdByName)
  ) {
    return actionFail("Missing required ticket metadata.");
  }
  if (
    !isValidLatLng(input.dropCoordinates?.lat, input.dropCoordinates?.lng)
  ) {
    return actionFail("Valid drop coordinates are required.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return actionFail("Add at least one requested relief item.");
  }
  for (const item of input.items) {
    const error = validateItem(item);
    if (error) return actionFail(error);
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    return actionFail("Firebase Admin is not configured.");
  }

  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const districtSlug = slugifyDistrictId(input.districtId);
    const [districtsRoot, districtId, ticketsSub] = districtTicketsPath(districtSlug);
    const [villageRoot, villageDocDistrictId, villageSub] = districtVillagesPath(
      districtSlug,
    );
    const ticketCounterRef = db
      .collection("_meta")
      .doc(`relief-ticket-counter-${year}`);
    const villageRef = db
      .collection(villageRoot)
      .doc(villageDocDistrictId)
      .collection(villageSub)
      .doc(
        input.villageOrShelterId ?? slugifyDistrictId(input.villageOrShelterName),
      );

    const result = await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(ticketCounterRef);
      const villageSnap = await tx.get(villageRef);
      const currentCounter = counterSnap.exists
        ? ((counterSnap.data() as TicketCounterDoc).current ?? 0)
        : 0;
      const nextCounter = currentCounter + 1;
      const ticketCode = `TKT-${year}-${String(nextCounter).padStart(4, "0")}`;
      const ticketId = `relief-ticket-${year}-${nextCounter}`;
      const timestamp = now.toISOString();

      const topLevelTicket = buildTopLevelTicket(input, ticketId, ticketCode, timestamp);
      const queueTicket = buildQueueTicket(input, ticketCode, timestamp);
      const queueDoc: TicketDoc = {
        ...queueTicket,
        districtId: districtSlug,
      };

      tx.set(ticketCounterRef, { year, current: nextCounter }, { merge: true });
      tx.set(
        db.collection(FIRESTORE_COLLECTIONS.reliefTickets).doc(ticketId),
        topLevelTicket,
      );
      tx.set(
        db.collection(districtsRoot).doc(districtId).collection(ticketsSub).doc(ticketCode),
        queueDoc,
      );

      if (villageSnap.exists) {
        const villageData = villageSnap.data() as VillageCoordinationDoc;
        tx.set(
          villageRef,
          {
            demands: mergeDemandLines(villageData.demands ?? [], input.items),
            district: villageData.district ?? input.districtName,
            districtId: villageData.districtId ?? districtSlug,
            revenueCircle: villageData.revenueCircle ?? input.revenueCircle,
            villageId:
              villageData.villageId ??
              input.villageOrShelterId ??
              slugifyDistrictId(input.villageOrShelterName),
            villageName: villageData.villageName ?? input.villageOrShelterName,
            lastUpdatedTimestamp: timestamp,
          },
          { merge: true },
        );
      }

      return { topLevelTicket, queueDoc };
    });

    return actionOk(
      { topLevel: result.topLevelTicket, queueTicket: result.queueDoc },
      `${result.topLevelTicket.ticketCode} created.`,
    );
  } catch (error) {
    console.error("createReliefTicket failed", error);
    return actionFail("Could not create relief ticket.");
  }
}
