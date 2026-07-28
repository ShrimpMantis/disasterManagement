import {
  collection,
  doc,
  orderBy,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { tryGetFirestoreDb } from "@/lib/firebase/firestore";
import {
  encodeGeohash,
  geohashQueryBounds,
  slugifyDistrictId,
} from "@/lib/firestore/geohash";
import { listenQuery } from "@/lib/firestore/listeners";
import {
  FIRESTORE_COLLECTIONS,
  type EmergencyAssetDoc,
  type EmergencyAssetKind,
  type SosAlertDoc,
} from "@/lib/firestore/schema";
import type { SosAlert } from "@/types/map";

/**
 * Map / field assets at /emergencyAssets/{assetId}.
 * Always index `geohash` for spatial queries.
 */
export function subscribeEmergencyAssets(
  onData: (assets: EmergencyAssetDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.emergencyAssets),
    orderBy("updatedAt", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as EmergencyAssetDoc[]),
    onError,
  });
}

export function subscribeEmergencyAssetsByDistrict(
  district: string,
  onData: (assets: EmergencyAssetDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const districtId = slugifyDistrictId(district);
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.emergencyAssets),
    where("districtId", "==", districtId),
    orderBy("updatedAt", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as EmergencyAssetDoc[]),
    onError,
  });
}

export function subscribeEmergencyAssetsByKind(
  kind: EmergencyAssetKind,
  onData: (assets: EmergencyAssetDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.emergencyAssets),
    where("kind", "==", kind),
    orderBy("updatedAt", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as EmergencyAssetDoc[]),
    onError,
  });
}

/**
 * Spatial geohash query around a point (map viewport / proximity).
 * Fires one onSnapshot per neighbor prefix and merges results.
 */
export function subscribeEmergencyAssetsNear(
  lat: number,
  lng: number,
  precision: number,
  onData: (assets: EmergencyAssetDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const prefixes = geohashQueryBounds(lat, lng, precision);
  const byId = new Map<string, EmergencyAssetDoc>();
  const unsubs: Unsubscribe[] = [];

  const publish = () => onData(Array.from(byId.values()));

  for (const prefix of prefixes) {
    const end = `${prefix}\uf8ff`;
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.emergencyAssets),
      where("geohash", ">=", prefix),
      where("geohash", "<=", end),
    );
    unsubs.push(
      listenQuery(q, {
        onData: (items) => {
          for (const item of items as EmergencyAssetDoc[]) {
            byId.set(item.assetId, item);
          }
          // Drop assets that no longer match any active prefix snapshot
          // by rebuilding from latest prefix batches would need per-prefix maps;
          // keep union for map pin stability, callers can filter by distance.
          publish();
        },
        onError,
      }),
    );
  }

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function upsertEmergencyAsset(
  asset: Omit<EmergencyAssetDoc, "geohash" | "districtId"> & {
    geohash?: string;
    districtId?: string;
  },
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  const districtId =
    asset.districtId ?? slugifyDistrictId(asset.district);
  const geohash = asset.geohash ?? encodeGeohash(asset.lat, asset.lng);
  const payload: EmergencyAssetDoc = {
    ...asset,
    districtId,
    geohash,
  };

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.emergencyAssets, asset.assetId),
    payload,
    { merge: true },
  );
}

/** SOS map pins: /sosAlerts/{sosId} with geohash for spatial queries. */
export function subscribeSosAlerts(
  onData: (alerts: SosAlertDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.sosAlerts),
    where("status", "in", ["OPEN", "DISPATCHED"]),
    orderBy("reportedAt", "desc"),
  );
  return listenQuery(q, {
    onData: (items) => onData(items as SosAlertDoc[]),
    onError,
  });
}

export async function upsertSosAlert(alert: SosAlert): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const payload: SosAlertDoc = {
    ...alert,
    geohash: encodeGeohash(alert.lat, alert.lng),
  };
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.sosAlerts, alert.id), payload, {
    merge: true,
  });
}
