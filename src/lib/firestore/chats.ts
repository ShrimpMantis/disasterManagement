import {
  collection,
  doc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import { listenDoc, listenQuery } from "@/lib/firestore/listeners";
import {
  chatMessagesPath,
  FIRESTORE_COLLECTIONS,
  type ChatMessageDoc,
  type TransportRequestDoc,
} from "@/lib/firestore/schema";
import type {
  DispatchChatMessage,
  TransportCapabilityRequest,
} from "@/types/transportationDispatch";

/**
 * Real-time dispatch negotiation chat:
 * /chats/{requestId}/messages/{messageId}
 */
export function subscribeChatMessages(
  requestId: string,
  onData: (messages: ChatMessageDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db || !requestId) {
    onData([]);
    return () => undefined;
  }

  const [root, id, sub] = chatMessagesPath(requestId);
  const q = query(collection(db, root, id, sub), orderBy("timestamp", "asc"));
  return listenQuery(q, {
    onData: (items) => onData(items as ChatMessageDoc[]),
    onError,
  });
}

export async function appendChatMessage(
  message: DispatchChatMessage,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const [root, id, sub] = chatMessagesPath(message.requestId);
  await setDoc(doc(db, root, id, sub, message.messageId), message);
}

export async function markChatOfferAccepted(
  requestId: string,
  messageId: string,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const [root, id, sub] = chatMessagesPath(requestId);
  await updateDoc(doc(db, root, id, sub, messageId), {
    offerAccepted: true,
    isRead: true,
  });
}

/** Parent transport demand board: /transportRequests/{requestId} */
export function subscribeTransportRequests(
  onData: (requests: TransportRequestDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.transportRequests),
    orderBy("createdAtTimestamp", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as TransportRequestDoc[]),
    onError,
  });
}

export function subscribeTransportRequest(
  requestId: string,
  onData: (request: TransportRequestDoc | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db || !requestId) {
    onData(null);
    return () => undefined;
  }

  return listenDoc(
    doc(db, FIRESTORE_COLLECTIONS.transportRequests, requestId),
    {
      onData: (item) => onData(item as TransportRequestDoc | null),
      onError,
    },
  );
}

export async function upsertTransportRequest(
  request: TransportCapabilityRequest,
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.transportRequests, request.requestId),
    request,
    { merge: true },
  );
}
