export { getFirestoreDb, tryGetFirestoreDb, ensureMultiTabOfflinePersistence } from "@/lib/firebase/firestore";
export { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
export type {
  EmergencyAssetDoc,
  TicketDoc,
  ChatMessageDoc,
  TransportRequestDoc,
  SosAlertDoc,
} from "@/lib/firestore/schema";
export {
  subscribeDistrictTickets,
  subscribeDistrictTicketsByStatus,
  upsertDistrictTicket,
  updateDistrictTicketStatus,
} from "@/lib/firestore/tickets";
export {
  subscribeChatMessages,
  appendChatMessage,
  markChatOfferAccepted,
  subscribeTransportRequests,
  upsertTransportRequest,
} from "@/lib/firestore/chats";
export {
  subscribeEmergencyAssets,
  subscribeEmergencyAssetsByDistrict,
  subscribeEmergencyAssetsByKind,
  subscribeEmergencyAssetsNear,
  upsertEmergencyAsset,
  subscribeSosAlerts,
  upsertSosAlert,
} from "@/lib/firestore/emergencyAssets";
export {
  encodeGeohash,
  decodeGeohash,
  geohashQueryBounds,
  slugifyDistrictId,
} from "@/lib/firestore/geohash";
export { listenQuery, listenDoc } from "@/lib/firestore/listeners";
