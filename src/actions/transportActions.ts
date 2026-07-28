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
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type {
  DispatchChatMessage,
  DispatchSenderRole,
  RequestStatus,
  RequestUrgency,
  TransportCapabilityRequest,
  TransportModalType,
} from "@/types/transportationDispatch";

const MODALITIES: TransportModalType[] = [
  "TRUCK_MINI_4X4",
  "TRUCK_HEAVY",
  "TRACTOR_TRAILER",
  "RESCUE_BOAT",
  "BOAT_AMBULANCE",
  "TERRESTRIAL_AMBULANCE",
  "MOTORCYCLE_AMBULANCE",
  "PASSENGER_CAR_4X4",
  "DRONE_SUPPLY",
  "HELICOPTER_AIRLIFT",
  "VOLUNTEER_FORCE",
];

const URGENCIES: RequestUrgency[] = [
  "CRITICAL_IMMEDIATE",
  "HIGH_24HR",
  "STANDARD_SCHEDULED",
];

const REQUEST_STATUSES: RequestStatus[] = [
  "OPEN",
  "IN_NEGOTIATION",
  "FULFILLED",
  "CANCELLED",
];

const SENDER_ROLES: DispatchSenderRole[] = [
  "REQUESTOR",
  "ASSET_OWNER",
  "VOLUNTEER_LEAD",
];

export type CreateTransportRequestInput = {
  district: string;
  revenueCircle: string;
  pickupLocation: string;
  destinationLocation?: string;
  modalityType: TransportModalType;
  quantityNeeded: number;
  urgency: RequestUrgency;
  cargoOrTaskDescription: string;
  requestorId: string;
  requestorName: string;
  requestorDesignation: string;
  requestorPhone: string;
};

function validateTransportRequest(
  input: CreateTransportRequestInput,
): string | null {
  if (!isNonEmptyString(input.district)) return "District is required.";
  if (!isNonEmptyString(input.revenueCircle)) {
    return "Revenue circle is required.";
  }
  if (!isNonEmptyString(input.pickupLocation)) {
    return "Pickup location is required.";
  }
  if (!MODALITIES.includes(input.modalityType)) {
    return "Invalid transport modality.";
  }
  if (!isFiniteNumber(input.quantityNeeded) || input.quantityNeeded < 1) {
    return "Quantity needed must be at least 1.";
  }
  if (!URGENCIES.includes(input.urgency)) return "Invalid urgency.";
  if (!isNonEmptyString(input.cargoOrTaskDescription)) {
    return "Cargo / task description is required.";
  }
  if (!isNonEmptyString(input.requestorId)) return "Requestor ID is required.";
  if (!isNonEmptyString(input.requestorName)) {
    return "Requestor name is required.";
  }
  if (!isNonEmptyString(input.requestorDesignation)) {
    return "Requestor designation is required.";
  }
  if (!isNonEmptyString(input.requestorPhone)) {
    return "Requestor phone is required.";
  }
  return null;
}

/**
 * Creates a multi-modal transport / volunteer capability request.
 * Path: `/transportRequests/{requestId}`
 */
export async function createTransportRequest(
  input: CreateTransportRequestInput,
): Promise<ActionResult<TransportCapabilityRequest>> {
  const validationError = validateTransportRequest(input);
  if (validationError) return actionFail(validationError);

  try {
    const db = getAdminFirestore();
    const requestId = `CAP-${Date.now()}`;
    const createdAtTimestamp = new Date().toISOString();
    const request: TransportCapabilityRequest = {
      requestId,
      district: input.district.trim(),
      revenueCircle: input.revenueCircle.trim(),
      pickupLocation: input.pickupLocation.trim(),
      destinationLocation: input.destinationLocation?.trim() || undefined,
      modalityType: input.modalityType,
      quantityNeeded: Math.floor(input.quantityNeeded),
      quantityFulfilled: 0,
      urgency: input.urgency,
      cargoOrTaskDescription: input.cargoOrTaskDescription.trim(),
      requestorId: input.requestorId.trim(),
      requestorName: input.requestorName.trim(),
      requestorDesignation: input.requestorDesignation.trim(),
      requestorPhone: input.requestorPhone.trim(),
      status: "OPEN",
      createdAtTimestamp,
    };

    await db
      .collection(FIRESTORE_COLLECTIONS.transportRequests)
      .doc(requestId)
      .set({
        ...request,
        updatedAt: createdAtTimestamp,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });

    return actionOk(request, `Transport request ${requestId} created.`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create transport request.";
    return actionFail(message);
  }
}

export type DispatchTransportAssetInput = {
  requestId: string;
  registrationOrCallsign: string;
  operatorOrTeamLeadName: string;
  operatorOrDriverPhone: string;
  assetCapacity: string;
  proposedRateINR?: number | null;
  isVolunteerService?: boolean;
  senderId: string;
  senderName: string;
  senderRole?: DispatchSenderRole;
};

/**
 * Dispatches a boat/truck/volunteer asset offer against a transport request.
 * Writes an offer message under `/chats/{requestId}/messages/{messageId}`
 * and moves the parent request into negotiation / partial fulfillment.
 */
export async function dispatchTransportAsset(
  input: DispatchTransportAssetInput,
): Promise<
  ActionResult<{ requestId: string; messageId: string; status: RequestStatus }>
> {
  if (!isNonEmptyString(input.requestId)) {
    return actionFail("Request ID is required.");
  }
  if (!isNonEmptyString(input.registrationOrCallsign)) {
    return actionFail("Asset callsign / registration is required.");
  }
  if (!isNonEmptyString(input.operatorOrTeamLeadName)) {
    return actionFail("Operator / team lead name is required.");
  }
  if (!isNonEmptyString(input.operatorOrDriverPhone)) {
    return actionFail("Operator phone is required.");
  }
  if (!isNonEmptyString(input.assetCapacity)) {
    return actionFail("Asset capacity details are required.");
  }
  if (!isNonEmptyString(input.senderId) || !isNonEmptyString(input.senderName)) {
    return actionFail("Sender identity is required.");
  }

  const senderRole: DispatchSenderRole =
    input.senderRole ??
    (input.isVolunteerService ? "VOLUNTEER_LEAD" : "ASSET_OWNER");
  if (!SENDER_ROLES.includes(senderRole)) {
    return actionFail("Invalid sender role.");
  }

  const isVolunteer = Boolean(input.isVolunteerService);
  if (
    !isVolunteer &&
    (input.proposedRateINR == null ||
      !isFiniteNumber(input.proposedRateINR) ||
      input.proposedRateINR <= 0)
  ) {
    return actionFail("A positive rate in INR is required for paid offers.");
  }

  try {
    const db = getAdminFirestore();
    const requestRef = db
      .collection(FIRESTORE_COLLECTIONS.transportRequests)
      .doc(input.requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return actionFail(`Transport request ${input.requestId} was not found.`);
    }

    const current = requestSnap.data() as TransportCapabilityRequest;
    if (current.status === "FULFILLED" || current.status === "CANCELLED") {
      return actionFail(
        `Request ${input.requestId} is ${current.status} and cannot accept dispatch.`,
      );
    }

    const messageId = `dmsg-offer-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const rateText = isVolunteer
      ? "Free Volunteer Service"
      : `₹${Number(input.proposedRateINR).toLocaleString("en-IN")}`;

    const message: DispatchChatMessage = {
      messageId,
      requestId: input.requestId,
      senderId: input.senderId.trim(),
      senderName: input.senderName.trim(),
      senderRole,
      messageText: `Formal asset/force offer: ${input.registrationOrCallsign.trim()} · ${input.assetCapacity.trim()} · ${rateText}`,
      proposedRateINR: isVolunteer ? null : Number(input.proposedRateINR),
      isVolunteerService: isVolunteer,
      offeredAssetDetails: {
        registrationOrCallsign: input.registrationOrCallsign.trim(),
        operatorOrDriverPhone: input.operatorOrDriverPhone.trim(),
        operatorOrTeamLeadName: input.operatorOrTeamLeadName.trim(),
        assetCapacity: input.assetCapacity.trim(),
      },
      timestamp,
      isRead: false,
    };

    await db
      .collection(FIRESTORE_COLLECTIONS.chats)
      .doc(input.requestId)
      .collection(FIRESTORE_COLLECTIONS.messages)
      .doc(messageId)
      .set({
        ...message,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });

    const nextStatus: RequestStatus = "IN_NEGOTIATION";
    await requestRef.update({
      status: nextStatus,
      updatedAt: timestamp,
      lastOfferMessageId: messageId,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(
      {
        requestId: input.requestId,
        messageId,
        status: nextStatus,
      },
      `Dispatch offer submitted on ${input.requestId}.`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to dispatch transport asset.";
    return actionFail(message);
  }
}

export type AuthorizeTransportDispatchInput = {
  requestId: string;
  messageId: string;
  requestorId: string;
  requestorName: string;
};

/**
 * Requestor accepts an offer and increments fulfilled quantity.
 */
export async function authorizeTransportDispatch(
  input: AuthorizeTransportDispatchInput,
): Promise<
  ActionResult<{ requestId: string; status: RequestStatus; quantityFulfilled: number }>
> {
  if (!isNonEmptyString(input.requestId)) {
    return actionFail("Request ID is required.");
  }
  if (!isNonEmptyString(input.messageId)) {
    return actionFail("Offer message ID is required.");
  }
  if (!isNonEmptyString(input.requestorId) || !isNonEmptyString(input.requestorName)) {
    return actionFail("Requestor identity is required.");
  }

  try {
    const db = getAdminFirestore();
    const requestRef = db
      .collection(FIRESTORE_COLLECTIONS.transportRequests)
      .doc(input.requestId);
    const messageRef = db
      .collection(FIRESTORE_COLLECTIONS.chats)
      .doc(input.requestId)
      .collection(FIRESTORE_COLLECTIONS.messages)
      .doc(input.messageId);

    const [requestSnap, messageSnap] = await Promise.all([
      requestRef.get(),
      messageRef.get(),
    ]);

    if (!requestSnap.exists) {
      return actionFail(`Transport request ${input.requestId} was not found.`);
    }
    if (!messageSnap.exists) {
      return actionFail(`Offer message ${input.messageId} was not found.`);
    }

    const request = requestSnap.data() as TransportCapabilityRequest;
    if (!REQUEST_STATUSES.includes(request.status)) {
      return actionFail("Request has an invalid status.");
    }
    if (request.status === "FULFILLED" || request.status === "CANCELLED") {
      return actionFail(`Request is already ${request.status}.`);
    }

    const offer = messageSnap.data() as DispatchChatMessage;
    if (!offer.offeredAssetDetails) {
      return actionFail("Selected message is not a formal asset offer.");
    }

    const quantityFulfilled = Math.min(
      request.quantityNeeded,
      (request.quantityFulfilled ?? 0) + 1,
    );
    const status: RequestStatus =
      quantityFulfilled >= request.quantityNeeded
        ? "FULFILLED"
        : "IN_NEGOTIATION";
    const timestamp = new Date().toISOString();

    await messageRef.update({
      offerAccepted: true,
      isRead: true,
      acceptedAt: timestamp,
    });

    const acceptMessageId = `dmsg-accept-${Date.now()}`;
    await db
      .collection(FIRESTORE_COLLECTIONS.chats)
      .doc(input.requestId)
      .collection(FIRESTORE_COLLECTIONS.messages)
      .doc(acceptMessageId)
      .set({
        messageId: acceptMessageId,
        requestId: input.requestId,
        senderId: input.requestorId.trim(),
        senderName: input.requestorName.trim(),
        senderRole: "REQUESTOR",
        messageText: `Offer accepted & dispatch authorized — ${offer.offeredAssetDetails.registrationOrCallsign}.`,
        timestamp,
        isRead: true,
        offerAccepted: true,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });

    await requestRef.update({
      quantityFulfilled,
      status,
      updatedAt: timestamp,
      lastAcceptedMessageId: input.messageId,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(
      { requestId: input.requestId, status, quantityFulfilled },
      `Dispatch authorized on ${input.requestId}.`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to authorize transport dispatch.";
    return actionFail(message);
  }
}

export type TransportDispatchSnapshot = {
  requests: TransportCapabilityRequest[];
  messages: DispatchChatMessage[];
};

export async function fetchTransportDispatchSnapshot(): Promise<
  ActionResult<TransportDispatchSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ requests: [], messages: [] });
  }

  try {
    const [requestSnap, messageSnap] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.transportRequests).get(),
      db.collectionGroup(FIRESTORE_COLLECTIONS.messages).get(),
    ]);

    const requests = requestSnap.docs
      .map((doc) => doc.data() as TransportCapabilityRequest)
      .filter((entry) => isNonEmptyString(entry.requestId))
      .sort(
        (a, b) =>
          Date.parse(b.createdAtTimestamp) - Date.parse(a.createdAtTimestamp),
      );

    const requestIds = new Set(requests.map((entry) => entry.requestId));
    const messages = messageSnap.docs
      .map((doc) => doc.data() as DispatchChatMessage)
      .filter(
        (entry) =>
          isNonEmptyString(entry.messageId) &&
          isNonEmptyString(entry.requestId) &&
          requestIds.has(entry.requestId),
      )
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    return actionOk({ requests, messages });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load transport dispatch data.",
    );
  }
}

export type SendTransportChatMessageInput = {
  requestId: string;
  messageText: string;
  senderId: string;
  senderName: string;
  senderRole: DispatchSenderRole;
};

export async function sendTransportChatMessage(
  input: SendTransportChatMessageInput,
): Promise<ActionResult<DispatchChatMessage>> {
  if (!isNonEmptyString(input.requestId)) {
    return actionFail("Request ID is required.");
  }
  if (!isNonEmptyString(input.messageText)) {
    return actionFail("Message text is required.");
  }
  if (!isNonEmptyString(input.senderId) || !isNonEmptyString(input.senderName)) {
    return actionFail("Sender identity is required.");
  }
  if (!SENDER_ROLES.includes(input.senderRole)) {
    return actionFail("Invalid sender role.");
  }

  try {
    const db = getAdminFirestore();
    const requestRef = db
      .collection(FIRESTORE_COLLECTIONS.transportRequests)
      .doc(input.requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return actionFail(`Transport request ${input.requestId} was not found.`);
    }

    const current = requestSnap.data() as TransportCapabilityRequest;
    if (current.status === "FULFILLED" || current.status === "CANCELLED") {
      return actionFail(
        `Request ${input.requestId} is ${current.status} and cannot accept messages.`,
      );
    }

    const timestamp = new Date().toISOString();
    const message: DispatchChatMessage = {
      messageId: `dmsg-${Date.now()}`,
      requestId: input.requestId,
      senderId: input.senderId.trim(),
      senderName: input.senderName.trim(),
      senderRole: input.senderRole,
      messageText: input.messageText.trim(),
      timestamp,
      isRead: false,
    };

    await db
      .collection(FIRESTORE_COLLECTIONS.chats)
      .doc(input.requestId)
      .collection(FIRESTORE_COLLECTIONS.messages)
      .doc(message.messageId)
      .set({
        ...message,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });

    if (current.status === "OPEN") {
      await requestRef.update({
        status: "IN_NEGOTIATION",
        updatedAt: timestamp,
        serverUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return actionOk(message, "Chat message sent.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to send transport chat message.",
    );
  }
}

export async function updateTransportRequestStatus(input: {
  requestId: string;
  status: RequestStatus;
}): Promise<ActionResult<{ requestId: string; status: RequestStatus }>> {
  if (!isNonEmptyString(input.requestId)) {
    return actionFail("Request ID is required.");
  }
  if (!REQUEST_STATUSES.includes(input.status)) {
    return actionFail("Invalid request status.");
  }

  try {
    const db = getAdminFirestore();
    const ref = db
      .collection(FIRESTORE_COLLECTIONS.transportRequests)
      .doc(input.requestId);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionFail(`Transport request ${input.requestId} was not found.`);
    }

    await ref.update({
      status: input.status,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(
      { requestId: input.requestId, status: input.status },
      `Transport request ${input.requestId} marked ${input.status}.`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update transport request status.";
    return actionFail(message);
  }
}
