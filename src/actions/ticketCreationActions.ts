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
import {
  CROWD_NEED_DEFAULT_UNIT,
  CROWD_NEED_TO_RELIEF_CATEGORY,
  resolveVerificationStatusFromUpvotes,
  urgencyToPriority,
} from "@/lib/tickets/crowdNeed";
import type {
  CrowdNeedCategory,
  TicketCreatorType,
} from "@/types/ticket";
import { DEFAULT_MAP_CENTER } from "@/types/map";
import { toPlainData } from "@/lib/firestore/serialize";
import { FieldValue } from "firebase-admin/firestore";
import {
  allowsOperationalWrite,
  isAdminSourcedMode,
  isCrowdMode,
} from "@/lib/features/operationalMode";

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
    title: input.items[0]
      ? `${input.items[0].quantityRequested} ${input.items[0].itemDisplayName} Needed`
      : `Relief need in ${input.villageOrShelterName}`,
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
    createdByPhone: input.contactPersonPhone,
    createdByType: "ADMIN",
    verificationStatus: "OFFICIALLY_VERIFIED",
    upvoteCount: 1,
    upvotedBy: [input.createdById],
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

export type CreateCrowdNeedInput = {
  title: string;
  category: CrowdNeedCategory;
  locationName: string;
  quantityRequired: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  createdByPhone: string;
  createdByType: TicketCreatorType;
  createdById: string;
  createdByName: string;
  /** True when caller holds admin role (gates ADMIN_SOURCED mode). */
  isAdminUser: boolean;
  districtName?: string;
  revenueCircle?: string;
  villageId?: string;
};

/**
 * Crowdsourced self-service need report.
 * Crowd mode: any authenticated user. Admin-sourced: admins only.
 */
export async function createCrowdReportedNeed(
  input: CreateCrowdNeedInput,
): Promise<ActionResult<{ queueTicket: TicketDoc }>> {
  if (!allowsOperationalWrite(input.isAdminUser)) {
    return actionFail(
      "Ticket creation is restricted to admin accounts in this deployment.",
    );
  }
  if (isAdminSourcedMode() && !input.isAdminUser) {
    return actionFail("Only admin or agency accounts can create tickets here.");
  }
  if (!isNonEmptyString(input.title)) {
    return actionFail("Need title is required.");
  }
  if (!isNonEmptyString(input.locationName)) {
    return actionFail("Location / village name is required.");
  }
  if (!isNonEmptyString(input.createdByPhone) || input.createdByPhone.trim().length < 7) {
    return actionFail("A valid ground contact phone number is required.");
  }
  if (!isNonEmptyString(input.createdById)) {
    return actionFail("Sign in to report a need.");
  }
  if (
    !isFiniteNumber(input.quantityRequired) ||
    input.quantityRequired <= 0
  ) {
    return actionFail("Quantity required must be greater than zero.");
  }
  if (
    input.category !== "FOOD_WATER" &&
    input.category !== "MEDICAL" &&
    input.category !== "RESCUE_EQUIPMENT" &&
    input.category !== "SHELTER_KIT"
  ) {
    return actionFail("Invalid need category.");
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    // Local / credential-less preview: synthesize a queue ticket.
    const timestamp = new Date().toISOString();
    const ticketCode = `TKT-CROWD-${Date.now().toString().slice(-6)}`;
    const reliefCategory = CROWD_NEED_TO_RELIEF_CATEGORY[input.category];
    const unit = CROWD_NEED_DEFAULT_UNIT[input.category];
    const districtName = input.districtName?.trim() || "Assam";
    const queueTicket: TicketDoc = {
      id: ticketCode,
      title: input.title.trim(),
      villageId:
        input.villageId?.trim() || slugifyDistrictId(input.locationName),
      villageName: input.locationName.trim(),
      revenueCircle: input.revenueCircle?.trim() || "Field Report",
      district: districtName,
      districtId: slugifyDistrictId(districtName),
      priority: urgencyToPriority(input.urgency),
      status: "REQUESTED",
      sourceChannel: "CITIZEN_SOS",
      needCategory: input.category,
      items: [
        {
          itemName: input.title.trim(),
          category: reliefCategory,
          totalRequestedQuantity: Math.floor(input.quantityRequired),
          quantityPledged: 0,
          fulfilledQuantity: 0,
          unit,
          underlyingRequestIds: [`crowd-${ticketCode}`],
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
      slaBreached: false,
      requesterPhone: input.createdByPhone.trim(),
      createdByPhone: input.createdByPhone.trim(),
      createdById: input.createdById,
      createdByName: input.createdByName.trim() || "Field reporter",
      createdByType: input.createdByType,
      verificationStatus: isCrowdMode()
        ? "CROWD_REPORTED"
        : "OFFICIALLY_VERIFIED",
      upvoteCount: 1,
      upvotedBy: [input.createdById],
      dropCoordinates: { ...DEFAULT_MAP_CENTER },
      landmarkNotes: input.locationName.trim(),
    };
    return actionOk({ queueTicket }, `${ticketCode} reported.`);
  }

  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const districtName = input.districtName?.trim() || "Assam";
    const districtSlug = slugifyDistrictId(districtName);
    const [districtsRoot, districtId, ticketsSub] = districtTicketsPath(districtSlug);
    const ticketCounterRef = db
      .collection("_meta")
      .doc(`relief-ticket-counter-${year}`);
    const reliefCategory = CROWD_NEED_TO_RELIEF_CATEGORY[input.category];
    const unit = CROWD_NEED_DEFAULT_UNIT[input.category];
    const verificationStatus = isCrowdMode()
      ? ("CROWD_REPORTED" as const)
      : ("OFFICIALLY_VERIFIED" as const);

    const result = await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(ticketCounterRef);
      const currentCounter = counterSnap.exists
        ? ((counterSnap.data() as TicketCounterDoc).current ?? 0)
        : 0;
      const nextCounter = currentCounter + 1;
      const ticketCode = `TKT-${year}-${String(nextCounter).padStart(4, "0")}`;
      const ticketId = `relief-ticket-${year}-${nextCounter}`;
      const timestamp = now.toISOString();
      const quantity = Math.floor(input.quantityRequired);

      const createInput: CreateReliefTicketInput = {
        districtId: districtSlug,
        districtName,
        revenueCircle: input.revenueCircle?.trim() || "Field Report",
        villageOrShelterId:
          input.villageId?.trim() || slugifyDistrictId(input.locationName),
        villageOrShelterName: input.locationName.trim(),
        dropCoordinates: { ...DEFAULT_MAP_CENTER },
        landmarkNotes: input.locationName.trim(),
        sourceChannel: "WHATSAPP_SOS",
        contactPersonName: input.createdByName.trim() || "Field reporter",
        contactPersonPhone: input.createdByPhone.trim(),
        contactPersonRole: input.createdByType,
        priority:
          input.urgency === "CRITICAL"
            ? "CRITICAL_LIFE_SAFETY"
            : input.urgency === "HIGH"
              ? "URGENT"
              : "STANDARD_RELIEF",
        items: [
          {
            category: reliefCategory,
            itemDisplayName: input.title.trim(),
            unitType: unit,
            quantityRequested: quantity,
            quantityFulfilled: 0,
            estimatedUnitCost: 0,
            estimatedTotalCost: 0,
          },
        ],
        createdById: input.createdById,
        createdByName: input.createdByName.trim() || "Field reporter",
      };

      const topLevelTicket = buildTopLevelTicket(
        createInput,
        ticketId,
        ticketCode,
        timestamp,
      );
      const queueTicket = buildQueueTicket(createInput, ticketCode, timestamp);
      const queueDoc: TicketDoc = {
        ...queueTicket,
        title: input.title.trim(),
        needCategory: input.category,
        districtId: districtSlug,
        createdByPhone: input.createdByPhone.trim(),
        createdByType: input.createdByType,
        verificationStatus,
        upvoteCount: 1,
        upvotedBy: [input.createdById],
        sourceChannel: "CITIZEN_SOS",
      };

      tx.set(ticketCounterRef, { year, current: nextCounter }, { merge: true });
      tx.set(
        db.collection(FIRESTORE_COLLECTIONS.reliefTickets).doc(ticketId),
        {
          ...topLevelTicket,
          verificationStatus,
          createdByType: input.createdByType,
          createdByPhone: input.createdByPhone.trim(),
          needCategory: input.category,
          title: input.title.trim(),
        },
      );
      tx.set(
        db
          .collection(districtsRoot)
          .doc(districtId)
          .collection(ticketsSub)
          .doc(ticketCode),
        queueDoc,
      );

      return queueDoc;
    });

    return actionOk(
      { queueTicket: toPlainData(result) },
      `${result.id} reported and added to the demand queue.`,
    );
  } catch (error) {
    console.error("createCrowdReportedNeed failed", error);
    return actionFail("Could not submit need report.");
  }
}

/**
 * Community confirmation upvote on a crowd-reported ticket.
 * At 5+ upvotes, verificationStatus upgrades to COMMUNITY_CONFIRMED.
 */
export async function toggleTicketCommunityUpvote(input: {
  ticketId: string;
  districtId: string;
  userId: string;
}): Promise<ActionResult<TicketDoc>> {
  if (!isCrowdMode()) {
    return actionFail("Community verification is only available in crowdsourced mode.");
  }
  if (!isNonEmptyString(input.ticketId) || !isNonEmptyString(input.userId)) {
    return actionFail("Ticket and signed-in user are required.");
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    return actionFail("Firebase Admin is not configured.");
  }

  const districtSlug = slugifyDistrictId(
    input.districtId || "Assam",
  );
  const [districtsRoot, districtId, ticketsSub] = districtTicketsPath(districtSlug);
  const docRef = db
    .collection(districtsRoot)
    .doc(districtId)
    .collection(ticketsSub)
    .doc(input.ticketId);

  try {
    const snap = await docRef.get();
    if (!snap.exists) {
      return actionFail("Ticket not found.");
    }

    const current = snap.data() as TicketDoc;
    if (current.verificationStatus === "OFFICIALLY_VERIFIED") {
      return actionFail("Officially verified tickets do not accept community upvotes.");
    }

    const upvotedBy = Array.isArray(current.upvotedBy)
      ? current.upvotedBy.filter((uid): uid is string => typeof uid === "string")
      : [];
    const already = upvotedBy.includes(input.userId);
    const nextUpvotedBy = already
      ? upvotedBy.filter((uid) => uid !== input.userId)
      : [...upvotedBy, input.userId];
    const upvoteCount = nextUpvotedBy.length;
    const verificationStatus = resolveVerificationStatusFromUpvotes(
      upvoteCount,
      current.verificationStatus,
    );
    const updatedAt = new Date().toISOString();

    await docRef.update({
      upvotedBy: nextUpvotedBy,
      upvoteCount,
      verificationStatus,
      updatedAt,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    const updated: TicketDoc = {
      ...current,
      upvotedBy: nextUpvotedBy,
      upvoteCount,
      verificationStatus,
      updatedAt,
    };

    return actionOk(
      toPlainData(updated),
      already
        ? "Confirmation removed."
        : verificationStatus === "COMMUNITY_CONFIRMED"
          ? "Community confirmed — need upgraded."
          : "Ground need confirmed.",
    );
  } catch (error) {
    console.error("toggleTicketCommunityUpvote failed", error);
    return actionFail("Could not update community confirmation.");
  }
}
