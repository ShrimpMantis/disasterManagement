import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";

export type SnapshotHandler<T> = {
  onData: (items: T[]) => void;
  onError?: (error: Error) => void;
};

export type DocSnapshotHandler<T> = {
  onData: (item: T | null) => void;
  onError?: (error: Error) => void;
};

/**
 * Always prefer this over one-shot getDocs for live ops UIs
 * (map pins, dispatch chat, ticket queues).
 */
export function listenQuery<T extends DocumentData>(
  queryRef: Query<T>,
  handlers: SnapshotHandler<T>,
): Unsubscribe {
  return onSnapshot(
    queryRef,
    (snapshot) => {
      const items = snapshot.docs.map((entry) => entry.data());
      handlers.onData(items);
    },
    (error) => {
      handlers.onError?.(error);
    },
  );
}

export function listenDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  handlers: DocSnapshotHandler<T>,
): Unsubscribe {
  return onSnapshot(
    docRef,
    (snapshot) => {
      handlers.onData(snapshot.exists() ? snapshot.data() : null);
    },
    (error) => {
      handlers.onError?.(error);
    },
  );
}
