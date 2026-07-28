import "server-only";

import { type Query, type CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { FIRESTORE_COLLECTIONS } from "@/lib/firestore/schema";
import {
  SEED_MODULES,
  type GrantBootstrapAdminRoleResult,
  type SeedAllCallResult,
  type SeedModuleCallResult,
  type SeedModuleName,
  type SeedModuleStatus,
} from "@/lib/seeding/shared";

function isSeedModuleName(value: string): value is SeedModuleName {
  return (SEED_MODULES as readonly string[]).includes(value);
}

function limitOne<T>(
  query: Query<T> | CollectionReference<T>,
): Promise<FirebaseFirestore.QuerySnapshot<T>> {
  return query.limit(1).get();
}

async function hasAnyDocs(
  query: Query<FirebaseFirestore.DocumentData> | CollectionReference<FirebaseFirestore.DocumentData>,
): Promise<boolean> {
  const snap = await limitOne(query);
  return !snap.empty;
}

async function isModuleSeeded(module: SeedModuleName): Promise<boolean> {
  const db = getAdminFirestore();

  switch (module) {
    case "warehouses":
      return hasAnyDocs(db.collectionGroup(FIRESTORE_COLLECTIONS.warehouses));
    case "villages":
      return hasAnyDocs(db.collectionGroup(FIRESTORE_COLLECTIONS.villages));
    case "emergencyAssets":
      return hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.emergencyAssets));
    case "sosAlerts":
      return hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.sosAlerts));
    case "transport":
      return hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.transportRequests));
    case "registrations": {
      const [volunteers, ngos] = await Promise.all([
        hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.volunteerRegistrations)),
        hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.ngoRegistrations)),
      ]);
      return volunteers || ngos;
    }
    case "crossDock": {
      const [shipments, districtMetrics] = await Promise.all([
        hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.inboundConsignments)),
        db
          .collection(FIRESTORE_COLLECTIONS.consolidatedReliefMetrics)
          .doc("district")
          .get()
          .then((snap) => snap.exists),
      ]);
      return shipments || districtMetrics;
    }
    case "tickets":
      return hasAnyDocs(db.collectionGroup(FIRESTORE_COLLECTIONS.tickets));
    case "ngoCoordination": {
      const [ngos, progress] = await Promise.all([
        hasAnyDocs(db.collection(FIRESTORE_COLLECTIONS.ngos)),
        db.collection("districtProgress").doc("summary").get().then((snap) => snap.exists),
      ]);
      return ngos || progress;
    }
  }
}

async function callSeedFunction<T>(
  functionName: "listSeedModules" | "seedModule" | "seedAll" | "grantBootstrapAdminRole",
  data?: Record<string, unknown>,
): Promise<T> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Missing Firebase project ID. Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
    );
  }

  const region = process.env.SEED_FUNCTIONS_REGION?.trim() || "asia-south1";
  const baseUrl =
    process.env.SEED_FUNCTIONS_BASE_URL?.trim() ||
    `https://${region}-${projectId}.cloudfunctions.net`;

  const response = await fetch(`${baseUrl}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      data: {
        ...(data ?? {}),
        ...(process.env.SEED_SECRET ? { seedSecret: process.env.SEED_SECRET } : {}),
      },
    }),
  });

  const payload = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Seed function ${functionName} failed.`);
  }

  return payload.result as T;
}

export async function listSeedModules(): Promise<{
  modules: SeedModuleStatus[];
  validModuleNames: readonly SeedModuleName[];
}> {
  const remote = await callSeedFunction<{ modules?: string[] }>("listSeedModules");
  const remoteModules = Array.isArray(remote.modules)
    ? remote.modules.filter(isSeedModuleName)
    : [...SEED_MODULES];
  const modules = await Promise.all(
    remoteModules.map(async (module) => ({
      module,
      seeded: await isModuleSeeded(module),
    })),
  );

  return {
    modules,
    validModuleNames: [...SEED_MODULES],
  };
}

export async function seedModule(module: SeedModuleName): Promise<SeedModuleCallResult> {
  if (await isModuleSeeded(module)) {
    return {
      ok: true,
      module,
      skipped: true,
      reason: "Module already has seeded data.",
    };
  }

  const result = await callSeedFunction<{
    ok: boolean;
    module: SeedModuleName;
    written: number;
    samplePaths?: string[];
  }>("seedModule", { module });

  return {
    ok: true,
    module: result.module,
    skipped: false,
    written: result.written,
    samplePaths: result.samplePaths ?? [],
  };
}

export async function seedAll(): Promise<SeedAllCallResult> {
  const modules = await Promise.all(SEED_MODULES.map((module) => seedModule(module)));
  return {
    ok: true,
    modules,
    totalWritten: modules.reduce((sum, entry) => sum + (entry.written ?? 0), 0),
  };
}

export async function grantBootstrapAdminRole(): Promise<GrantBootstrapAdminRoleResult> {
  return callSeedFunction<GrantBootstrapAdminRoleResult>("grantBootstrapAdminRole");
}
