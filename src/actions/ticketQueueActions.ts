"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS, type TicketDoc } from "@/lib/firestore/schema";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import type { NGOProfile } from "@/types/ngo";
import type { ReliefTicket, VillageLookup } from "@/types/ticket";

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

export async function fetchTicketQueueSnapshot(): Promise<
  ActionResult<{
    tickets: ReliefTicket[];
    villages: VillageLookup[];
    ngos: NGOProfile[];
  }>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ tickets: [], villages: [], ngos: [] });
  }

  try {
    const [ticketSnap, villageSnap, ngoSnap] = await Promise.all([
      db.collectionGroup(FIRESTORE_COLLECTIONS.tickets).get(),
      db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get(),
      db.collection(FIRESTORE_COLLECTIONS.ngos).get(),
    ]);

    const tickets = ticketSnap.docs
      .map((doc) => doc.data() as TicketDoc)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    const villages = villageSnap.docs
      .map((doc) => mapVillageDoc(doc.data() as VillageDoc))
      .filter((entry): entry is VillageLookup => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    const ngos = ngoSnap.docs
      .map((doc) => doc.data() as NGOProfile)
      .filter((ngo) => ngo.status !== "INACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name));

    return actionOk({ tickets, villages, ngos });
  } catch (error) {
    return actionFail(
      error instanceof Error ? error.message : "Could not load ticket queue data.",
    );
  }
}
