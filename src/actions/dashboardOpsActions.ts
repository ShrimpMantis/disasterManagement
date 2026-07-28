"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/actions/result";
import {
  FIRESTORE_COLLECTIONS,
  type EmergencyAssetDoc,
} from "@/lib/firestore/schema";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import type { CoverageStatus, VillageGeoNode } from "@/types/geo";
import type {
  DistrictProgressSummary,
  KeyOfficialContact,
} from "@/types/dashboard";
import type { NGOProfile } from "@/types/ngo";
import type { VolunteerRegistration } from "@/types/registration";
import type { SOSAlertTicket } from "@/types/sos";
import type {
  RentalTruckOperator,
  VolunteerCircleDeployment,
  WorkforceMetrics,
} from "@/types/workforceLogistics";

type VillageDoc = {
  villageId?: string;
  villageName?: string;
  revenueCircle?: string;
  district?: string;
  population?: number | null;
  assignedNGOIds?: unknown;
  serviceStatus?: string;
  demands?: unknown;
  coordinates?: { lat?: number; lng?: number } | null;
};

export type DashboardOpsSnapshot = {
  villages: VillageGeoNode[];
  officials: KeyOfficialContact[];
  districtProgress: DistrictProgressSummary;
  sosAlerts: SOSAlertTicket[];
  workforceMetrics: WorkforceMetrics;
  volunteerDeployments: VolunteerCircleDeployment[];
  trucks: RentalTruckOperator[];
  alertSummary: string;
};

const DEFAULT_ALERT_SUMMARY =
  "District flood alert: rising water levels reported. Mobilize boats and open standby relief camps.";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapCoverageStatus(serviceStatus: unknown): CoverageStatus {
  if (serviceStatus === "FULLY_SERVED") return "SERVED";
  if (serviceStatus === "PARTIALLY_SERVED") return "PARTIALLY_SERVED";
  return "UNSERVED_CRITICAL";
}

function deriveUnmetNeedsCount(demands: unknown): number {
  if (!Array.isArray(demands)) return 0;
  return demands.reduce((sum, entry) => {
    if (!entry || typeof entry !== "object") return sum;
    const record = entry as Record<string, unknown>;
    const assessed =
      typeof record.quantityAssessed === "number" &&
      Number.isFinite(record.quantityAssessed)
        ? Math.max(0, record.quantityAssessed)
        : 0;
    const delivered =
      typeof record.quantityDelivered === "number" &&
      Number.isFinite(record.quantityDelivered)
        ? Math.max(0, record.quantityDelivered)
        : 0;
    const inTransit =
      typeof record.quantityInTransit === "number" &&
      Number.isFinite(record.quantityInTransit)
        ? Math.max(0, record.quantityInTransit)
        : 0;
    return sum + Math.max(0, assessed - delivered - inTransit);
  }, 0);
}

function mapVillageDoc(raw: VillageDoc): VillageGeoNode | null {
  if (
    !raw.villageId ||
    !raw.villageName ||
    !raw.revenueCircle ||
    !raw.district ||
    !raw.coordinates ||
    typeof raw.coordinates.lat !== "number" ||
    typeof raw.coordinates.lng !== "number"
  ) {
    return null;
  }

  return {
    id: raw.villageId,
    name: raw.villageName,
    revenueCircle: raw.revenueCircle,
    district: raw.district,
    population: Math.max(0, Number(raw.population) || 0),
    unmetNeedsCount: deriveUnmetNeedsCount(raw.demands),
    assignedNGOIds: asStringArray(raw.assignedNGOIds),
    coverageStatus: mapCoverageStatus(raw.serviceStatus),
    coordinates: {
      lat: raw.coordinates.lat,
      lng: raw.coordinates.lng,
    },
  };
}

function emptyDistrictProgress(): DistrictProgressSummary {
  return {
    overallFulfillmentPct: 0,
    totalVillages: 0,
    villagesFullyCovered: 0,
    totalVillagesCoveredPct: 0,
    categoryBreakdown: [],
  };
}

function emptyWorkforceMetrics(): WorkforceMetrics {
  return {
    totalRegisteredNGOs: 0,
    activeNGOsOnGround: 0,
    totalRegisteredVolunteers: 0,
    volunteersDeployedToday: 0,
    medicalPersonnelDeployed: 0,
    searchAndRescuePersonnel: 0,
  };
}

function mapSosTicket(raw: Record<string, unknown>): SOSAlertTicket | null {
  const sosId = asString(raw.sosId) ?? asString(raw.id);
  const citizenName = asString(raw.citizenName);
  const contactPhone = asString(raw.contactPhone) ?? asString(raw.phone);
  const district = asString(raw.district);
  const revenueCircle = asString(raw.revenueCircle);
  const villageName = asString(raw.villageName);
  const coordinates = raw.coordinates as
    | { lat?: unknown; lng?: unknown }
    | undefined;
  const lat =
    typeof coordinates?.lat === "number"
      ? coordinates.lat
      : typeof raw.lat === "number"
        ? raw.lat
        : null;
  const lng =
    typeof coordinates?.lng === "number"
      ? coordinates.lng
      : typeof raw.lng === "number"
        ? raw.lng
        : null;
  const category = asString(raw.category);
  const urgency = asString(raw.urgency);
  const status = asString(raw.status);
  const peopleCount =
    typeof raw.peopleCount === "number" && Number.isFinite(raw.peopleCount)
      ? Math.max(1, Math.floor(raw.peopleCount))
      : null;
  const createdAtTimestamp =
    asString(raw.createdAtTimestamp) ?? asString(raw.reportedAt);

  if (
    !sosId ||
    !citizenName ||
    !contactPhone ||
    !district ||
    !revenueCircle ||
    !villageName ||
    lat === null ||
    lng === null ||
    !category ||
    !urgency ||
    !status ||
    peopleCount === null ||
    !createdAtTimestamp
  ) {
    return null;
  }

  return {
    sosId,
    citizenName,
    contactPhone,
    district,
    revenueCircle,
    villageName,
    coordinates: { lat, lng },
    category: category as SOSAlertTicket["category"],
    urgency: urgency as SOSAlertTicket["urgency"],
    peopleCount,
    specialNotes: asString(raw.specialNotes) ?? undefined,
    status: status as SOSAlertTicket["status"],
    createdAtTimestamp,
    assignedAssetId: asString(raw.assignedAssetId) ?? undefined,
    assignedAssetLabel: asString(raw.assignedAssetLabel) ?? undefined,
  };
}

function buildWorkforceMetrics(
  ngos: NGOProfile[],
  volunteers: VolunteerRegistration[],
): WorkforceMetrics {
  const activeNgos = ngos.filter((ngo) => ngo.status !== "INACTIVE");
  const approvedVolunteers = volunteers.filter(
    (entry) => entry.verificationStatus === "APPROVED_ACTIVE",
  );
  const availableVolunteers = approvedVolunteers.filter(
    (entry) => entry.availabilityStatus === "IMMEDIATELY_AVAILABLE",
  );

  return {
    totalRegisteredNGOs: ngos.length,
    activeNGOsOnGround: activeNgos.filter(
      (ngo) => ngo.status === "ACTIVE" || ngo.status === "MAX_CAPACITY",
    ).length,
    totalRegisteredVolunteers: Math.max(
      approvedVolunteers.length,
      volunteers.length,
    ),
    volunteersDeployedToday: Math.max(
      availableVolunteers.length,
      volunteers.filter(
        (entry) => entry.availabilityStatus === "IMMEDIATELY_AVAILABLE",
      ).length,
    ),
    medicalPersonnelDeployed: volunteers.filter(
      (entry) =>
        entry.hasMedicalLicense ||
        entry.skills?.includes("FIRST_AID_MEDICAL"),
    ).length,
    searchAndRescuePersonnel: volunteers.filter((entry) =>
      entry.skills?.includes("SWIMMING_RESCUE"),
    ).length,
  };
}

function buildVolunteerDeployments(
  villages: VillageGeoNode[],
  volunteers: VolunteerRegistration[],
): VolunteerCircleDeployment[] {
  const byCircle = new Map<
    string,
    { district: string; revenueCircle: string; lat: number; lng: number }
  >();

  for (const village of villages) {
    const key = `${village.district}::${village.revenueCircle}`.toLowerCase();
    if (byCircle.has(key)) continue;
    byCircle.set(key, {
      district: village.district,
      revenueCircle: village.revenueCircle,
      lat: village.coordinates.lat,
      lng: village.coordinates.lng,
    });
  }

  return Array.from(byCircle.values())
    .map((circle) => {
      const volunteersDeployed = volunteers.filter((volunteer) => {
        const home = volunteer.homeDistrict?.toLowerCase();
        const preferred = (volunteer.preferredOperatingDistricts ?? []).map(
          (entry) => entry.toLowerCase(),
        );
        const district = circle.district.toLowerCase();
        return home === district || preferred.includes(district);
      }).length;

      return {
        revenueCircle: circle.revenueCircle,
        district: circle.district,
        volunteersDeployed,
        lat: circle.lat,
        lng: circle.lng,
      };
    })
    .filter((entry) => entry.volunteersDeployed > 0)
    .sort((a, b) => b.volunteersDeployed - a.volunteersDeployed);
}

function mapTruckAsset(asset: EmergencyAssetDoc): RentalTruckOperator | null {
  const operatorOrVendorName =
    asString(asset.metadata?.operatorOrVendorName) ?? asString(asset.title);
  const primaryPhone = asString(asset.phone) ?? "—";
  const truckCategory =
    asString(asset.metadata?.truckCategory) ?? "MEDIUM_DUTY";
  const status = asString(asset.status) ?? "AVAILABLE";

  if (!operatorOrVendorName) return null;

  return {
    id: asset.assetId,
    operatorOrVendorName,
    contactPersonName:
      asString(asset.metadata?.contactPersonName) ?? operatorOrVendorName,
    primaryPhone,
    district: asset.district,
    revenueCircle: asString(asset.revenueCircle) ?? "—",
    operatingBaseLocation:
      asString(asset.metadata?.operatingBaseLocation) ?? asset.title,
    truckCategory: truckCategory as RentalTruckOperator["truckCategory"],
    vehicleRegistrationNumber:
      asString(asset.metadata?.vehicleRegistrationNumber) ?? "—",
    payloadCapacityTons:
      typeof asset.metadata?.payloadCapacityTons === "number"
        ? asset.metadata.payloadCapacityTons
        : 0,
    rentalRatePerDayINR:
      typeof asset.metadata?.rentalRatePerDayINR === "number"
        ? asset.metadata.rentalRatePerDayINR
        : 0,
    status: status as RentalTruckOperator["status"],
    hubId: "ALL_ASSAM",
    coordinates: { lat: asset.lat, lng: asset.lng },
  };
}

export async function fetchDashboardOpsSnapshot(): Promise<
  ActionResult<DashboardOpsSnapshot>
> {
  const empty: DashboardOpsSnapshot = {
    villages: [],
    officials: [],
    districtProgress: emptyDistrictProgress(),
    sosAlerts: [],
    workforceMetrics: emptyWorkforceMetrics(),
    volunteerDeployments: [],
    trucks: [],
    alertSummary: DEFAULT_ALERT_SUMMARY,
  };

  const db = tryGetAdminFirestore();
  if (!db) return actionOk(empty);

  try {
    const [
      villageSnap,
      officialsSnap,
      progressSnap,
      sosSnap,
      ngoSnap,
      volunteerSnap,
      assetSnap,
    ] = await Promise.all([
      db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get(),
      db.collection(FIRESTORE_COLLECTIONS.keyOfficials).get(),
      db.collection(FIRESTORE_COLLECTIONS.districtProgress).doc("summary").get(),
      db.collection(FIRESTORE_COLLECTIONS.sosAlerts).get(),
      db.collection(FIRESTORE_COLLECTIONS.ngos).get(),
      db.collection(FIRESTORE_COLLECTIONS.volunteerRegistrations).get(),
      db.collection(FIRESTORE_COLLECTIONS.emergencyAssets).get(),
    ]);

    const villages = villageSnap.docs
      .map((doc) => mapVillageDoc(doc.data() as VillageDoc))
      .filter((entry): entry is VillageGeoNode => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const officials = officialsSnap.docs
      .map((doc) => doc.data() as KeyOfficialContact)
      .sort((a, b) => a.name.localeCompare(b.name));

    const districtProgress = progressSnap.exists
      ? (progressSnap.data() as DistrictProgressSummary)
      : emptyDistrictProgress();

    const sosAlerts = sosSnap.docs
      .map((doc) => mapSosTicket(doc.data() as Record<string, unknown>))
      .filter((entry): entry is SOSAlertTicket => entry !== null)
      .sort(
        (a, b) =>
          Date.parse(b.createdAtTimestamp) - Date.parse(a.createdAtTimestamp),
      );

    const ngos = ngoSnap.docs.map((doc) => doc.data() as NGOProfile);
    const volunteers = volunteerSnap.docs.map(
      (doc) => doc.data() as VolunteerRegistration,
    );
    const assets = assetSnap.docs.map((doc) => doc.data() as EmergencyAssetDoc);

    const alertSummary =
      asString(
        (progressSnap.data() as { alertSummary?: unknown } | undefined)
          ?.alertSummary,
      ) ?? DEFAULT_ALERT_SUMMARY;

    return actionOk({
      villages,
      officials,
      districtProgress,
      sosAlerts,
      workforceMetrics: buildWorkforceMetrics(ngos, volunteers),
      volunteerDeployments: buildVolunteerDeployments(villages, volunteers),
      trucks: assets
        .filter((asset) => asset.kind === "TRUCK_HUB")
        .map(mapTruckAsset)
        .filter((entry): entry is RentalTruckOperator => entry !== null),
      alertSummary,
    });
  } catch (error) {
    return actionFail(
      error instanceof Error ? error.message : "Could not load dashboard data.",
    );
  }
}
