"use server";

import { actionFail, actionOk, isFiniteNumber, isNonEmptyString, type ActionResult } from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS, type TicketDoc } from "@/lib/firestore/schema";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import { recordActivityEvent } from "@/actions/activityActions";
import type { NGOProfile } from "@/types/ngo";
import type { EntityPledgeCommitment, OrganizationCapabilityProfile } from "@/types/pledgeManagement";
import type { NGOPledgeSubmission } from "@/types/pledgeIntake";
import type { ReliefTicket, VillageLookup } from "@/types/ticket";
import type { ReliefTicketCreationDoc } from "@/lib/firestore/schema";

export type SubmitPledgeInput = {
  ticketId: string;
  entityId: string;
  entityType: "REGISTERED_NGO" | "CITIZEN_GROUP" | "INDIVIDUAL_VOLUNTEER";
  entityName: string;
  pledgedItems: EntityPledgeCommitment["pledgedItems"];
  pledgedFinancialAmount: number;
  providesDistributionManpower: boolean;
  pledgedManpowerCount: number;
};

type SeededPledgeDoc = {
  id: string;
  ngoId: string;
  ngoName: string;
  reliefItemCategory?: string;
  unit?: string;
  quantityPledged?: number;
  quantityInTransit?: number;
  quantityDelivered?: number;
  estimatedArrival?: string;
  lastDeliveryTimestamp?: string;
};

function mapSeededPledgeStatus(raw: SeededPledgeDoc): NGOPledgeSubmission["status"] {
  const pledged = Math.max(0, Number(raw.quantityPledged) || 0);
  const delivered = Math.max(0, Number(raw.quantityDelivered) || 0);
  const inTransit = Math.max(0, Number(raw.quantityInTransit) || 0);

  if (pledged > 0 && delivered >= pledged) return "FULFILLED";
  if (inTransit > 0) return "IN_TRANSIT";
  return "CONFIRMED";
}

function mapSeededPledgeDoc(raw: SeededPledgeDoc): NGOPledgeSubmission {
  const category = raw.reliefItemCategory?.trim() || "Relief item";
  const unit = raw.unit?.trim() || "units";
  const quantity = Math.max(0, Number(raw.quantityPledged) || 0);
  const eta =
    raw.estimatedArrival?.trim() ||
    raw.lastDeliveryTimestamp?.trim() ||
    new Date().toISOString();

  return {
    id: raw.id,
    ngoId: raw.ngoId,
    ngoName: raw.ngoName,
    entityType: "REGISTERED_NGO",
    pledgeType: "SPONTANEOUS_OFFER",
    targetDistrict: "District pool",
    targetVillageName: "District pool",
    ticketMatchedItems: [],
    customItems: [
      {
        id: `${raw.id}-seed-item`,
        itemName: category,
        category,
        quantity,
        unit,
        description: "Loaded from seeded Firestore pledge data.",
      },
    ],
    estimatedDeliveryDate: eta,
    contactPersonName: raw.ngoName,
    contactPersonPhone: "",
    pledgedFinancialAmount: 0,
    providesDistributionManpower: false,
    pledgedManpowerCount: 0,
    status: mapSeededPledgeStatus(raw),
    adminApprovalStatus: "APPROVED",
    createdAt: raw.lastDeliveryTimestamp?.trim() || eta,
  };
}

function isPortalPledgeDoc(raw: unknown): raw is NGOPledgeSubmission {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as Record<string, unknown>;
  return (
    typeof doc.id === "string" &&
    typeof doc.ngoId === "string" &&
    typeof doc.ngoName === "string" &&
    typeof doc.createdAt === "string" &&
    typeof doc.adminApprovalStatus === "string" &&
    typeof doc.status === "string"
  );
}

type VillageDoc = {
  villageId?: string;
  villageName?: string;
  revenueCircle?: string;
  district?: string;
  population?: number | null;
  coordinates?: { lat?: number; lng?: number } | null;
};

function mapVillageDoc(raw: VillageDoc): VillageLookup | null {
  if (
    !raw.villageId ||
    !raw.villageName ||
    !raw.revenueCircle ||
    !raw.district ||
    !raw.coordinates ||
    typeof raw.coordinates.lat !== "number" ||
    typeof raw.coordinates.lng !== "number"
  ) {
    return null;
  }

  return {
    id: raw.villageId,
    name: raw.villageName,
    revenueCircle: raw.revenueCircle,
    district: raw.district,
    population: Math.max(0, Number(raw.population) || 0),
    coordinates: {
      lat: raw.coordinates.lat,
      lng: raw.coordinates.lng,
    },
  };
}

export async function fetchNgoPortalSnapshot(): Promise<
  ActionResult<{
    ngos: NGOProfile[];
    pledges: NGOPledgeSubmission[];
    tickets: ReliefTicket[];
    villages: VillageLookup[];
  }>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ ngos: [], pledges: [], tickets: [], villages: [] });
  }

  try {
    const [ngoSnap, pledgeSnap, ticketSnap, villageSnap] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.ngos).get(),
      db.collection(FIRESTORE_COLLECTIONS.pledges).get(),
      db.collectionGroup(FIRESTORE_COLLECTIONS.tickets).get(),
      db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get(),
    ]);

    const ngos = ngoSnap.docs.map((doc) => doc.data() as NGOProfile);
    const pledges = pledgeSnap.docs.map((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      return isPortalPledgeDoc(raw)
        ? raw
        : mapSeededPledgeDoc(raw as SeededPledgeDoc);
    });
    const tickets = ticketSnap.docs
      .map((doc) => doc.data() as TicketDoc)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const villages = villageSnap.docs
      .map((doc) => mapVillageDoc(doc.data() as VillageDoc))
      .filter((entry): entry is VillageLookup => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return actionOk({ ngos, pledges, tickets, villages });
  } catch (error) {
    return actionFail(
      error instanceof Error ? error.message : "Could not load NGO portal data.",
    );
  }
}

export async function submitPledgeToTicket(
  input: SubmitPledgeInput,
): Promise<
  ActionResult<{
    ticket: ReliefTicketCreationDoc;
    capability: OrganizationCapabilityProfile;
    pledge: EntityPledgeCommitment;
  }>
> {
  if (!isNonEmptyString(input.ticketId) || !isNonEmptyString(input.entityId)) {
    return actionFail("Ticket and entity are required.");
  }
  if (!Array.isArray(input.pledgedItems) || input.pledgedItems.length === 0) {
    return actionFail("Pledge at least one ticket item.");
  }
  if (
    !isFiniteNumber(input.pledgedFinancialAmount) ||
    input.pledgedFinancialAmount < 0
  ) {
    return actionFail("Pledged financial amount must be zero or greater.");
  }
  if (
    !isFiniteNumber(input.pledgedManpowerCount) ||
    input.pledgedManpowerCount < 0
  ) {
    return actionFail("Pledged manpower count must be zero or greater.");
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    return actionFail("Firebase Admin is not configured.");
  }

  try {
    const result = await db.runTransaction(async (tx) => {
      const ticketRef = db.collection(FIRESTORE_COLLECTIONS.reliefTickets).doc(input.ticketId);
      const capabilityRef = db.collection("ngoCapabilities").doc(input.entityId);
      const [ticketSnap, capabilitySnap] = await Promise.all([
        tx.get(ticketRef),
        tx.get(capabilityRef),
      ]);

      if (!ticketSnap.exists) throw new Error("Ticket not found.");
      if (!capabilitySnap.exists) throw new Error("Capability profile not found.");

      const ticket = ticketSnap.data() as ReliefTicketCreationDoc;
      const capability = capabilitySnap.data() as OrganizationCapabilityProfile;

      if (input.pledgedManpowerCount > capability.netAvailableManpower) {
        throw new Error("Pledged manpower exceeds available capacity.");
      }

      for (const pledgedItem of input.pledgedItems) {
        const ticketItem = ticket.items.find((item) => item.itemId === pledgedItem.itemId);
        if (!ticketItem) throw new Error(`Ticket item not found: ${pledgedItem.itemDisplayName}`);
        const remaining =
          ticketItem.quantityRequested - (ticketItem.quantityPledged ?? 0);
        if (pledgedItem.quantityPledged > remaining) {
          throw new Error(
            `${pledgedItem.itemDisplayName}: pledge exceeds remaining unpledged quantity.`,
          );
        }
      }

      const pledge: EntityPledgeCommitment = {
        pledgeId: `PLG-${Date.now()}-${input.entityId}`,
        ticketId: input.ticketId,
        entityId: input.entityId,
        entityType: input.entityType,
        entityName: input.entityName,
        pledgedItems: input.pledgedItems,
        totalPledgedValue: input.pledgedFinancialAmount,
        providesDistributionManpower: input.providesDistributionManpower,
        pledgedManpowerCount: input.pledgedManpowerCount,
        status: "ACTIVE_PLEDGED",
        createdTimestamp: new Date().toISOString(),
      };

      const nextItems = ticket.items.map((item) => {
        const match = input.pledgedItems.find((entry) => entry.itemId === item.itemId);
        if (!match) return item;
        return {
          ...item,
          quantityPledged: (item.quantityPledged ?? 0) + match.quantityPledged,
        };
      });
      const fullyPledged = nextItems.every(
        (item) => (item.quantityPledged ?? 0) >= item.quantityRequested,
      );
      const nextTicket: ReliefTicketCreationDoc = {
        ...ticket,
        items: nextItems,
        assignedPledges: [...(ticket.assignedPledges ?? []), pledge] as never,
        totalPledgedCost: (ticket.totalPledgedCost ?? 0) + input.pledgedFinancialAmount,
        totalAssignedManpower:
          (ticket.totalAssignedManpower ?? 0) + input.pledgedManpowerCount,
        status: fullyPledged ? "FULLY_PLEDGED" : "PARTIALLY_PLEDGED",
        lastUpdatedTimestamp: new Date().toISOString(),
      };

      const nextCapability: OrganizationCapabilityProfile = {
        ...capability,
        currentlyCommittedManpower:
          capability.currentlyCommittedManpower + input.pledgedManpowerCount,
        netAvailableManpower:
          capability.netAvailableManpower - input.pledgedManpowerCount,
        activePledges: [
          ...capability.activePledges,
          {
            pledgeId: pledge.pledgeId,
            ticketCode: ticket.ticketCode,
            districtName: ticket.districtName,
            totalFinancialValue: input.pledgedFinancialAmount,
            committedManpowerCount: input.pledgedManpowerCount,
            itemSummary: input.pledgedItems
              .map((item) => `${item.quantityPledged} ${item.itemDisplayName}`)
              .join(", "),
          },
        ],
      };

      tx.set(ticketRef, nextTicket, { merge: true });
      tx.set(capabilityRef, nextCapability, { merge: true });
      return { ticket: nextTicket, capability: nextCapability, pledge };
    });

    const itemSummary = input.pledgedItems
      .map((item) => `${item.quantityPledged} ${item.itemDisplayName}`)
      .join(", ");
    const impactQuantity = input.pledgedItems.reduce(
      (sum, item) => sum + item.quantityPledged,
      0,
    );
    const impactUnit =
      input.pledgedItems[0]?.itemDisplayName?.trim() || "Units";
    const locationName =
      result.ticket.districtName?.trim() ||
      result.ticket.ticketCode ||
      "Assam";
    void recordActivityEvent({
      title: `${itemSummary || "Relief supplies"} pledged for ${locationName}`,
      category: "WAREHOUSE_PLEDGE",
      status: "IN_PROGRESS",
      locationName,
      description: `Unmet need claimed via pledge ${result.pledge.pledgeId} on ticket ${input.ticketId}.`,
      impactQuantity: impactQuantity > 0 ? impactQuantity : null,
      impactUnit,
    }).catch(() => undefined);

    return actionOk(result);
  } catch (error) {
    return actionFail(error instanceof Error ? error.message : "Could not submit pledge.");
  }
}
