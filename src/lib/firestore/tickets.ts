import {
  collection,
  doc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { listenQuery } from "@/lib/firestore/listeners";
import {
  FIRESTORE_COLLECTIONS,
  type AuditQueueDoc,
  districtTicketsPath,
  type TicketDoc,
} from "@/lib/firestore/schema";
import { slugifyDistrictId } from "@/lib/firestore/geohash";
import type { ReliefTicket, TicketStatus } from "@/types/ticket";

function ticketsCollection(districtId: string) {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  const [root, id, sub] = districtTicketsPath(districtId);
  return collection(db, root, id, sub);
}

/** Real-time ticket queue for a district: /districts/{districtId}/tickets */
export function subscribeDistrictTickets(
  district: string,
  onData: (tickets: TicketDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const districtId = slugifyDistrictId(district);
  const col = ticketsCollection(districtId);
  if (!col) {
    onData([]);
    return () => undefined;
  }

  const q = query(col, orderBy("updatedAt", "desc"));
  return listenQuery(q, {
    onData: (items) => onData(items as TicketDoc[]),
    onError,
  });
}

/** Real-time tickets filtered by status (e.g. open queue). */
export function subscribeDistrictTicketsByStatus(
  district: string,
  statuses: TicketStatus[],
  onData: (tickets: TicketDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const districtId = slugifyDistrictId(district);
  const col = ticketsCollection(districtId);
  if (!col) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    col,
    where("status", "in", statuses.slice(0, 10)),
    orderBy("updatedAt", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as TicketDoc[]),
    onError,
  });
}

export async function upsertDistrictTicket(
  ticket: ReliefTicket,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  const districtId = slugifyDistrictId(ticket.district);
  const payload: TicketDoc = { ...ticket, districtId };
  const [root, id, sub] = districtTicketsPath(districtId);
  await setDoc(doc(db, root, id, sub, ticket.id), payload, { merge: true });
}

export async function updateDistrictTicketStatus(
  district: string,
  ticketId: string,
  patch: Partial<Pick<
    ReliefTicket,
    | "status"
    | "assignedEntityId"
    | "assignedEntityName"
    | "dispatchVehicleNumber"
    | "dispatchDriverPhone"
    | "estimatedArrival"
    | "proofOfDeliveryUrl"
    | "proofOfFulfillment"
    | "auditSampling"
    | "slaBreached"
    | "items"
  >>,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const districtId = slugifyDistrictId(district);
  const [root, id, sub] = districtTicketsPath(districtId);
  await updateDoc(doc(db, root, id, sub, ticketId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function upsertAuditQueueRecord(
  record: AuditQueueDoc,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.auditQueue, record.auditId),
    record,
    { merge: true },
  );
}

export function transportRequestsCollectionPath(): string {
  return FIRESTORE_COLLECTIONS.transportRequests;
}
