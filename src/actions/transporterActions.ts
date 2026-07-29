"use server";

import { FieldValue } from "firebase-admin/firestore";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import {
  actionFail,
  actionOk,
  isFiniteNumber,
  isNonEmptyString,
  type ActionResult,
} from "@/lib/actions/result";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import {
  DEMO_TRANSPORTERS,
  FLEET_VEHICLE_TYPES,
  TRANSPORTER_AVAILABILITY,
  type CreateTransporterInput,
  type FleetVehicleType,
  type TransporterAvailability,
  type TransporterRecord,
} from "@/types/transporterFleet";

function isFleetVehicleType(value: unknown): value is FleetVehicleType {
  return (
    typeof value === "string" &&
    (FLEET_VEHICLE_TYPES as readonly string[]).includes(value)
  );
}

function isAvailability(value: unknown): value is TransporterAvailability {
  return (
    typeof value === "string" &&
    (TRANSPORTER_AVAILABILITY as readonly string[]).includes(value)
  );
}

function coerceTransporter(raw: Record<string, unknown>): TransporterRecord | null {
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return null;
  if (!isFleetVehicleType(raw.vehicleType)) return null;
  if (!isNonEmptyString(raw.phone)) return null;

  const verifiedBy = Array.isArray(raw.verifiedBy)
    ? raw.verifiedBy.filter((uid): uid is string => typeof uid === "string")
    : [];

  const verificationCount = isFiniteNumber(raw.verificationCount)
    ? Math.max(0, Math.floor(raw.verificationCount))
    : verifiedBy.length;

  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    vehicleType: raw.vehicleType,
    capacity: isNonEmptyString(raw.capacity) ? raw.capacity.trim() : "—",
    baseDistrict: isNonEmptyString(raw.baseDistrict)
      ? raw.baseDistrict.trim()
      : isNonEmptyString(raw.address)
        ? raw.address.trim()
        : "Assam",
    phone: raw.phone.trim(),
    availability: isAvailability(raw.availability)
      ? raw.availability
      : "AVAILABLE",
    verificationCount,
    isOfficial: Boolean(raw.isOfficial),
    verifiedBy,
    address: isNonEmptyString(raw.address) ? raw.address.trim() : undefined,
    fleetSize: isFiniteNumber(raw.fleetSize)
      ? Math.floor(raw.fleetSize)
      : undefined,
    createdBy: isNonEmptyString(raw.createdBy) ? raw.createdBy.trim() : "unknown",
    createdAt: isNonEmptyString(raw.createdAt)
      ? raw.createdAt
      : new Date().toISOString(),
    updatedAt: isNonEmptyString(raw.updatedAt)
      ? raw.updatedAt
      : new Date().toISOString(),
  };
}

export async function fetchTransporters(): Promise<
  ActionResult<TransporterRecord[]>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk(DEMO_TRANSPORTERS);
  }

  try {
    const snap = await db.collection(FIRESTORE_COLLECTIONS.transporters).get();
    const rows = snap.docs
      .map((doc) =>
        coerceTransporter({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
      )
      .filter((entry): entry is TransporterRecord => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const hasRealRows = rows.some((row) => !row.id.startsWith("demo-"));
    if (!hasRealRows) {
      const byId = new Map(rows.map((row) => [row.id, row]));
      for (const demo of DEMO_TRANSPORTERS) {
        if (!byId.has(demo.id)) byId.set(demo.id, demo);
      }
      return actionOk(
        [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    return actionOk(rows);
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load transporter directory.",
    );
  }
}

export async function createTransporterRecord(
  input: CreateTransporterInput,
): Promise<ActionResult<TransporterRecord>> {
  if (!isNonEmptyString(input.name)) return actionFail("Name is required.");
  if (!isFleetVehicleType(input.vehicleType)) {
    return actionFail("Invalid vehicle type.");
  }
  if (!isNonEmptyString(input.capacity)) {
    return actionFail("Capacity / payload is required.");
  }
  if (!isNonEmptyString(input.baseDistrict)) {
    return actionFail("Base district is required.");
  }
  if (!isNonEmptyString(input.phone)) return actionFail("Phone is required.");
  if (!isNonEmptyString(input.createdBy)) {
    return actionFail("Sign in to list a transporter or driver.");
  }

  const availability: TransporterAvailability =
    input.availability && isAvailability(input.availability)
      ? input.availability
      : "AVAILABLE";

  const db = tryGetAdminFirestore();
  if (!db) {
    const now = new Date().toISOString();
    const address = input.address?.trim();
    const local: TransporterRecord = {
      id: `local-${Date.now()}`,
      name: input.name.trim(),
      vehicleType: input.vehicleType,
      capacity: input.capacity.trim(),
      baseDistrict: input.baseDistrict.trim(),
      phone: input.phone.trim(),
      availability,
      verificationCount: 1,
      isOfficial: Boolean(input.isOfficial),
      verifiedBy: [input.createdBy.trim()],
      fleetSize:
        input.fleetSize != null && isFiniteNumber(input.fleetSize)
          ? Math.floor(input.fleetSize)
          : 1,
      createdBy: input.createdBy.trim(),
      createdAt: now,
      updatedAt: now,
      ...(address ? { address } : {}),
    };
    return actionOk(local, "Transporter added (local).");
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.transporters).doc();
    const now = new Date().toISOString();
    const address = input.address?.trim();
    const fleetSize =
      input.fleetSize != null && isFiniteNumber(input.fleetSize)
        ? Math.floor(input.fleetSize)
        : 1;
    const record: TransporterRecord = {
      id: docRef.id,
      name: input.name.trim(),
      vehicleType: input.vehicleType,
      capacity: input.capacity.trim(),
      baseDistrict: input.baseDistrict.trim(),
      phone: input.phone.trim(),
      availability,
      verificationCount: 1,
      isOfficial: Boolean(input.isOfficial),
      verifiedBy: [input.createdBy.trim()],
      fleetSize,
      createdBy: input.createdBy.trim(),
      createdAt: now,
      updatedAt: now,
      ...(address ? { address } : {}),
    };

    // Firestore rejects `undefined` values — only write defined fields.
    await docRef.set({
      id: record.id,
      name: record.name,
      vehicleType: record.vehicleType,
      capacity: record.capacity,
      baseDistrict: record.baseDistrict,
      phone: record.phone,
      availability: record.availability,
      verificationCount: record.verificationCount,
      isOfficial: record.isOfficial,
      verifiedBy: record.verifiedBy,
      fleetSize: record.fleetSize,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(address ? { address } : {}),
      serverCreatedAt: FieldValue.serverTimestamp(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(record, "Transporter added successfully.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to create transporter record.",
    );
  }
}

export async function verifyTransporterRecord(input: {
  transporterId: string;
  userId: string;
}): Promise<ActionResult<TransporterRecord>> {
  if (!isNonEmptyString(input.transporterId)) {
    return actionFail("Transporter ID is required.");
  }
  if (!isNonEmptyString(input.userId)) {
    return actionFail("Sign in to verify transporter information.");
  }

  const db = tryGetAdminFirestore();
  if (!db) {
    const demo = DEMO_TRANSPORTERS.find((row) => row.id === input.transporterId);
    if (!demo) return actionFail("Transporter not found.");
    if (demo.verifiedBy.includes(input.userId)) {
      return actionFail("You have already confirmed this transporter.");
    }
    const updated: TransporterRecord = {
      ...demo,
      verifiedBy: [...demo.verifiedBy, input.userId],
      verificationCount: demo.verificationCount + 1,
      updatedAt: new Date().toISOString(),
    };
    return actionOk(updated, "Community confirmation recorded.");
  }

  try {
    const docRef = db
      .collection(FIRESTORE_COLLECTIONS.transporters)
      .doc(input.transporterId);
    const snap = await docRef.get();

    if (!snap.exists) {
      // Allow confirming demo rows that are not persisted yet.
      const demo = DEMO_TRANSPORTERS.find(
        (row) => row.id === input.transporterId,
      );
      if (!demo) return actionFail("Transporter not found.");
      if (demo.verifiedBy.includes(input.userId)) {
        return actionFail("You have already confirmed this transporter.");
      }
      const now = new Date().toISOString();
      const record: TransporterRecord = {
        ...demo,
        verifiedBy: [...demo.verifiedBy, input.userId],
        verificationCount: demo.verificationCount + 1,
        updatedAt: now,
      };
      await docRef.set({
        ...record,
        serverCreatedAt: FieldValue.serverTimestamp(),
        serverUpdatedAt: FieldValue.serverTimestamp(),
      });
      return actionOk(record, "Community confirmation recorded.");
    }

    const current = coerceTransporter({
      id: snap.id,
      ...(snap.data() as Record<string, unknown>),
    });
    if (!current) return actionFail("Invalid transporter record.");

    if (current.verifiedBy.includes(input.userId)) {
      return actionFail("You have already confirmed this transporter.");
    }

    const updated: TransporterRecord = {
      ...current,
      verifiedBy: [...current.verifiedBy, input.userId],
      verificationCount: current.verificationCount + 1,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update({
      verifiedBy: updated.verifiedBy,
      verificationCount: updated.verificationCount,
      updatedAt: updated.updatedAt,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });

    return actionOk(updated, "Community confirmation recorded.");
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Failed to verify transporter record.",
    );
  }
}
