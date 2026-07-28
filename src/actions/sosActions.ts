"use server";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  isValidLatLng,
  type ActionResult,
} from "@/lib/actions/result";
import { encodeGeohash, slugifyDistrictId } from "@/lib/firestore/geohash";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import type {
  RapidDispatchAssetType,
  SOSAlertTicket,
  SOSCategory,
  SOSStatus,
  SOSUrgency,
} from "@/types/sos";

const SOS_CATEGORIES: SOSCategory[] = [
  "MEDICAL_CRITICAL",
  "TRAPPED_WATER",
  "SNAKE_BITE",
  "FOOD_WATER_OUT",
  "INFANT_ELDERLY",
];

const SOS_URGENCIES: SOSUrgency[] = [
  "P1_CRITICAL_LIFE",
  "P2_HIGH_RISK",
  "P3_MODERATE",
];

const SOS_STATUSES: SOSStatus[] = [
  "UNASSIGNED",
  "DISPATCHED",
  "RESCUED",
  "CANCELLED",
];

export type CreateSOSTicketInput = {
  citizenName: string;
  contactPhone: string;
  district: string;
  revenueCircle: string;
  villageName: string;
  coordinates: { lat: number; lng: number };
  category: SOSCategory;
  urgency: SOSUrgency;
  peopleCount: number;
  specialNotes?: string;
};

function validateCreateInput(
  input: CreateSOSTicketInput,
): string | null {
  if (!isNonEmptyString(input.citizenName)) return "Citizen name is required.";
  if (!isNonEmptyString(input.contactPhone)) return "Contact phone is required.";
  if (!isNonEmptyString(input.district)) return "District is required.";
  if (!isNonEmptyString(input.revenueCircle)) {
    return "Revenue circle is required.";
  }
  if (!isNonEmptyString(input.villageName)) return "Village name is required.";
  if (!isValidLatLng(input.coordinates?.lat, input.coordinates?.lng)) {
    return "Valid coordinates (lat/lng) are required.";
  }
  if (!SOS_CATEGORIES.includes(input.category)) {
    return "Invalid SOS category.";
  }
  if (!SOS_URGENCIES.includes(input.urgency)) {
    return "Invalid SOS urgency.";
  }
  if (!isFiniteNumber(input.peopleCount) || input.peopleCount < 1) {
    return "People count must be at least 1.";
  }
  return null;
}

/**
 * Creates an SOS ticket in `/sosAlerts/{sosId}` with geohash for map queries.
 */
export async function createSOSTicket(
  input: CreateSOSTicketInput,
): Promise<ActionResult<SOSAlertTicket>> {
  const validationError = validateCreateInput(input);
  if (validationError) return actionFail(validationError);

  try {
    const db = getAdminFirestore();
    const sosId = `SOS-${Date.now()}`;
    const createdAtTimestamp = new Date().toISOString();
    const ticket: SOSAlertTicket = {
      sosId,
      citizenName: input.citizenName.trim(),
      contactPhone: input.contactPhone.trim(),
      district: input.district.trim(),
      revenueCircle: input.revenueCircle.trim(),
      villageName: input.villageName.trim(),
      coordinates: {
        lat: input.coordinates.lat,
        lng: input.coordinates.lng,
      },
      category: input.category,
      urgency: input.urgency,
      peopleCount: Math.floor(input.peopleCount),
      specialNotes: input.specialNotes?.trim() || undefined,
      status: "UNASSIGNED",
      createdAtTimestamp,
    };

    await db
      .collection(FIRESTORE_COLLECTIONS.sosAlerts)
      .doc(sosId)
      .set({
        ...ticket,
        id: sosId,
        geohash: encodeGeohash(ticket.coordinates.lat, ticket.coordinates.lng),
        districtId: slugifyDistrictId(ticket.district),
        lat: ticket.coordinates.lat,
        lng: ticket.coordinates.lng,
        phone: ticket.contactPhone,
        reportedAt: createdAtTimestamp,
        mapStatus: "OPEN",
        updatedAt: createdAtTimestamp,
        serverCreatedAt: FieldValue.serverTimestamp(),
      });

    return actionOk(ticket, `SOS ticket ${sosId} created.`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create SOS ticket.";
    return actionFail(message);
  }
}

export type UpdateSOSTicketStatusInput = {
  sosId: string;
  status: SOSStatus;
  assignedAssetId?: string;
  assignedAssetLabel?: string;
  assetType?: RapidDispatchAssetType;
};

/**
 * Updates SOS status (assign / resolve / cancel) with server-side validation.
 */
export async function updateTicketStatus(
  input: UpdateSOSTicketStatusInput,
): Promise<ActionResult<{ sosId: string; status: SOSStatus }>> {
  if (!isNonEmptyString(input.sosId)) {
    return actionFail("SOS ID is required.");
  }
  if (!SOS_STATUSES.includes(input.status)) {
    return actionFail("Invalid SOS status.");
  }
  if (input.status === "DISPATCHED") {
    if (!isNonEmptyString(input.assignedAssetId)) {
      return actionFail("Assigned asset ID is required for dispatch.");
    }
    if (!isNonEmptyString(input.assignedAssetLabel)) {
      return actionFail("Assigned asset label is required for dispatch.");
    }
  }

  try {
    const db = getAdminFirestore();
    const ref = db.collection(FIRESTORE_COLLECTIONS.sosAlerts).doc(input.sosId);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionFail(`SOS ticket ${input.sosId} was not found.`);
    }

    const mapStatus =
      input.status === "UNASSIGNED"
        ? "OPEN"
        : input.status === "DISPATCHED"
          ? "DISPATCHED"
          : "RESOLVED";

    const patch: Record<string, unknown> = {
      status: input.status,
      mapStatus,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    };

    if (input.status === "DISPATCHED") {
      patch.assignedAssetId = input.assignedAssetId!.trim();
      patch.assignedAssetLabel = input.assignedAssetLabel!.trim();
      if (input.assetType) patch.assignedAssetType = input.assetType;
    }

    if (input.status === "RESCUED" || input.status === "CANCELLED") {
      patch.resolvedAtTimestamp = new Date().toISOString();
    }

    await ref.update(patch);
    return actionOk(
      { sosId: input.sosId, status: input.status },
      `SOS ${input.sosId} marked ${input.status}.`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update SOS ticket.";
    return actionFail(message);
  }
}

/** Convenience wrapper for rapid asset assignment. */
export async function assignSOSAsset(input: {
  sosId: string;
  assignedAssetId: string;
  assignedAssetLabel: string;
  assetType?: RapidDispatchAssetType;
}): Promise<ActionResult<{ sosId: string; status: SOSStatus }>> {
  return updateTicketStatus({
    sosId: input.sosId,
    status: "DISPATCHED",
    assignedAssetId: input.assignedAssetId,
    assignedAssetLabel: input.assignedAssetLabel,
    assetType: input.assetType,
  });
}

export async function resolveSOSTicket(
  sosId: string,
): Promise<ActionResult<{ sosId: string; status: SOSStatus }>> {
  return updateTicketStatus({ sosId, status: "RESCUED" });
}
