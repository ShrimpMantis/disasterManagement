export const SEED_MODULES = [
  "warehouses",
  "villages",
  "emergencyAssets",
  "sosAlerts",
  "transport",
  "registrations",
  "crossDock",
  "tickets",
  "ngoCoordination",
] as const;

export type SeedModuleName = (typeof SEED_MODULES)[number];

export const SEED_MODULE_TARGETS: Record<SeedModuleName, string> = {
  warehouses: "districts/{districtId}/warehouses/{warehouseId}",
  villages: "districts/{districtId}/villages/{villageId}",
  emergencyAssets: "emergencyAssets/{assetId}",
  sosAlerts: "sosAlerts/{sosId}",
  transport: "transportRequests/{requestId} + chats/{requestId}/messages/{messageId}",
  registrations: "volunteerRegistrations/{volunteerId} + ngoRegistrations/{ngoId}",
  crossDock: "inboundConsignments/{shipmentId} + consolidatedReliefMetrics/district",
  tickets: "districts/{districtId}/tickets/{ticketId}",
  ngoCoordination:
    "ngos/{ngoId} + pledges/{pledgeId} + keyOfficials/{officialId} + districtProgress/summary",
};

export type SeedModuleStatus = {
  module: SeedModuleName;
  seeded: boolean;
};

export type SeedModuleCallResult = {
  ok: true;
  module: SeedModuleName;
  skipped: boolean;
  reason?: string;
  written?: number;
  samplePaths?: string[];
};

export type SeedAllCallResult = {
  ok: true;
  modules: SeedModuleCallResult[];
  totalWritten: number;
};

export type GrantBootstrapAdminRoleResult = {
  ok: true;
  uid: string;
  email: string | null;
  customClaims: Record<string, unknown>;
};
