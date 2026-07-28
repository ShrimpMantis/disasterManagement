"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/actions/result";
import {
  FIRESTORE_COLLECTIONS,
  type EmergencyAssetDoc,
} from "@/lib/firestore/schema";
import { tryGetAdminFirestore } from "@/lib/firebaseAdmin";
import type { CoverageStatus, VillageGeoNode } from "@/types/geo";
import type {
  ArmyCampRecord,
  HospitalFacilityRecord,
  PolicePersonnelRecord,
} from "@/types/emergencyDirectory";
import type {
  AccessRouteStatus,
  AssetStatus,
  BoatType,
  CampBuildingType,
  CampStatus,
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";

type VillageDoc = {
  villageId?: string;
  villageName?: string;
  revenueCircle?: string;
  district?: string;
  population?: number | null;
  assignedNGOIds?: unknown;
  serviceStatus?: string;
  coordinates?: { lat?: number; lng?: number } | null;
};

type EmergencyAssetsSnapshot = {
  villages: VillageGeoNode[];
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
  camps: ReliefCampFacility[];
};

export type EmergencyDirectorySnapshot = {
  hospitals: HospitalFacilityRecord[];
  police: PolicePersonnelRecord[];
  armyCamps: ArmyCampRecord[];
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function mapCoverageStatus(serviceStatus: unknown): CoverageStatus {
  if (serviceStatus === "FULLY_SERVED") return "SERVED";
  if (serviceStatus === "PARTIALLY_SERVED") return "PARTIALLY_SERVED";
  return "UNSERVED_CRITICAL";
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
    unmetNeedsCount: 0,
    assignedNGOIds: asStringArray(raw.assignedNGOIds),
    coverageStatus: mapCoverageStatus(raw.serviceStatus),
    coordinates: {
      lat: raw.coordinates.lat,
      lng: raw.coordinates.lng,
    },
  };
}

function mapBoatAsset(asset: EmergencyAssetDoc): CountryBoatOwner | null {
  const ownerName = asString(asset.metadata?.ownerName);
  const boatType = asString(asset.metadata?.boatType) as BoatType | null;
  const passengerCapacity = asNumber(asset.metadata?.passengerCapacity);
  const maxWeightKg = asNumber(asset.metadata?.maxWeightKg);
  const villageId = asString(asset.villageId);
  const villageName = asString(asset.villageName);
  const revenueCircle = asString(asset.revenueCircle);
  const phone = asString(asset.phone);
  const status = asString(asset.status) as AssetStatus | null;

  if (
    !ownerName ||
    !boatType ||
    !passengerCapacity ||
    !maxWeightKg ||
    !villageId ||
    !villageName ||
    !revenueCircle ||
    !phone ||
    !status
  ) {
    return null;
  }

  return {
    id: asset.assetId,
    villageId,
    villageName,
    revenueCircle,
    ownerName,
    primaryPhone: phone,
    alternatePhone: asString(asset.metadata?.alternatePhone) ?? undefined,
    boatType,
    passengerCapacity,
    maxWeightKg,
    status,
    currentAssignmentLocation:
      asString(asset.metadata?.currentAssignmentLocation) ?? undefined,
    coordinates: {
      lat: asset.lat,
      lng: asset.lng,
    },
  };
}

function mapHighLandAsset(asset: EmergencyAssetDoc): HighLandZone | null {
  const zoneName = asString(asset.title);
  const villageId = asString(asset.villageId);
  const villageName = asString(asset.villageName);
  const revenueCircle = asString(asset.revenueCircle);
  const elevationMetersAboveSea = asNumber(asset.metadata?.elevationMetersAboveSea);
  const holdingCapacityPersons = asNumber(asset.metadata?.holdingCapacityPersons);
  const hasHelipadSuitability = asBoolean(asset.metadata?.hasHelipadSuitability);
  const accessRouteStatus = asString(asset.status) as AccessRouteStatus | null;

  if (
    !zoneName ||
    !villageId ||
    !villageName ||
    !revenueCircle ||
    !elevationMetersAboveSea ||
    !holdingCapacityPersons ||
    hasHelipadSuitability === null ||
    !accessRouteStatus
  ) {
    return null;
  }

  return {
    id: asset.assetId,
    villageId,
    villageName,
    revenueCircle,
    zoneName,
    elevationMetersAboveSea,
    holdingCapacityPersons,
    hasHelipadSuitability,
    accessRouteStatus,
    coordinates: {
      lat: asset.lat,
      lng: asset.lng,
    },
  };
}

function mapCampAsset(asset: EmergencyAssetDoc): ReliefCampFacility | null {
  const villageId = asString(asset.villageId);
  const villageName = asString(asset.villageName);
  const revenueCircle = asString(asset.revenueCircle);
  const buildingType = asString(asset.metadata?.buildingType) as CampBuildingType | null;
  const maxCapacityPersons = asNumber(asset.metadata?.maxCapacityPersons);
  const currentOccupancy = asNumber(asset.metadata?.currentOccupancy);
  const toiletCount = asNumber(asset.metadata?.toiletCount);
  const hasRunningWater = asBoolean(asset.metadata?.hasRunningWater);
  const hasPowerGenerator = asBoolean(asset.metadata?.hasPowerGenerator);
  const inChargeName = asString(asset.metadata?.inChargeName);
  const inChargePhone = asString(asset.phone);
  const status = asString(asset.status) as CampStatus | null;

  if (
    !villageId ||
    !villageName ||
    !revenueCircle ||
    !buildingType ||
    !maxCapacityPersons ||
    currentOccupancy === null ||
    toiletCount === null ||
    hasRunningWater === null ||
    hasPowerGenerator === null ||
    !inChargeName ||
    !inChargePhone ||
    !status
  ) {
    return null;
  }

  return {
    id: asset.assetId,
    villageId,
    villageName,
    revenueCircle,
    campName: asset.title,
    buildingType,
    maxCapacityPersons,
    currentOccupancy,
    toiletCount,
    hasRunningWater,
    hasPowerGenerator,
    inChargeName,
    inChargePhone,
    status,
    coordinates: {
      lat: asset.lat,
      lng: asset.lng,
    },
  };
}

function mapHospitalAsset(asset: EmergencyAssetDoc): HospitalFacilityRecord | null {
  const facilityType = asString(asset.metadata?.facilityType) as
    | HospitalFacilityRecord["facilityType"]
    | null;
  const revenueCircle = asString(asset.revenueCircle);
  const availableIcuBeds = asNumber(asset.metadata?.availableIcuBeds);
  const totalIcuBeds = asNumber(asset.metadata?.totalIcuBeds);
  const antiSnakeVenomStock = asNumber(asset.metadata?.antiSnakeVenomStock);
  const emergencyContactName = asString(asset.metadata?.emergencyContactName);
  const emergencyPhone = asString(asset.phone);
  const hasTraumaBay = asBoolean(asset.metadata?.hasTraumaBay);

  if (
    !facilityType ||
    !revenueCircle ||
    availableIcuBeds === null ||
    totalIcuBeds === null ||
    antiSnakeVenomStock === null ||
    !emergencyContactName ||
    !emergencyPhone ||
    hasTraumaBay === null
  ) {
    return null;
  }

  return {
    hospitalId: asset.assetId,
    hospitalName: asset.title,
    facilityType,
    district: asset.district,
    revenueCircle,
    coordinates: { lat: asset.lat, lng: asset.lng },
    availableIcuBeds,
    totalIcuBeds,
    antiSnakeVenomStock,
    emergencyContactName,
    emergencyPhone,
    hasTraumaBay,
  };
}

function mapPoliceAsset(asset: EmergencyAssetDoc): PolicePersonnelRecord | null {
  const revenueCircle = asString(asset.revenueCircle);
  const officerInChargeName = asString(asset.metadata?.officerInChargeName);
  const designation = asString(asset.metadata?.designation);
  const primaryPhone = asString(asset.phone);
  const activeForceCount = asNumber(asset.metadata?.activeForceCount);
  const hasWaterRescueBoats = asBoolean(asset.metadata?.hasWaterRescueBoats);

  if (
    !revenueCircle ||
    !officerInChargeName ||
    !designation ||
    !primaryPhone ||
    activeForceCount === null ||
    hasWaterRescueBoats === null
  ) {
    return null;
  }

  return {
    stationId: asset.assetId,
    policeStationName: asset.title,
    district: asset.district,
    revenueCircle,
    coordinates: { lat: asset.lat, lng: asset.lng },
    officerInChargeName,
    designation,
    primaryPhone,
    altPhone: asString(asset.metadata?.altPhone) ?? undefined,
    activeForceCount,
    hasWaterRescueBoats,
  };
}

function mapArmyAsset(asset: EmergencyAssetDoc): ArmyCampRecord | null {
  const brigadeOrDivision = asString(asset.metadata?.brigadeOrDivision);
  const campLocationName = asString(asset.metadata?.campLocationName);
  const liaisonOfficerName = asString(asset.metadata?.liaisonOfficerName);
  const liaisonOfficerRank = asString(asset.metadata?.liaisonOfficerRank);
  const contactPhone = asString(asset.phone);
  const assignedEquipment = asString(asset.metadata?.assignedEquipment);
  const readinessStatus = asString(asset.status) as ArmyCampRecord["readinessStatus"] | null;

  if (
    !brigadeOrDivision ||
    !campLocationName ||
    !liaisonOfficerName ||
    !liaisonOfficerRank ||
    !contactPhone ||
    !assignedEquipment ||
    !readinessStatus
  ) {
    return null;
  }

  return {
    campId: asset.assetId,
    unitName: asset.title,
    brigadeOrDivision,
    district: asset.district,
    campLocationName,
    coordinates: { lat: asset.lat, lng: asset.lng },
    liaisonOfficerName,
    liaisonOfficerRank,
    contactPhone,
    assignedEquipment: assignedEquipment
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    readinessStatus,
  };
}

export async function fetchEmergencyAssetsSnapshot(): Promise<
  ActionResult<EmergencyAssetsSnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ villages: [], boats: [], highLands: [], camps: [] });
  }

  try {
    const [villageSnap, assetSnap] = await Promise.all([
      db.collectionGroup(FIRESTORE_COLLECTIONS.villages).get(),
      db.collection(FIRESTORE_COLLECTIONS.emergencyAssets).get(),
    ]);

    const villages = villageSnap.docs
      .map((doc) => mapVillageDoc(doc.data() as VillageDoc))
      .filter((entry): entry is VillageGeoNode => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const assets = assetSnap.docs.map((doc) => doc.data() as EmergencyAssetDoc);

    return actionOk({
      villages,
      boats: assets
        .filter((asset) => asset.kind === "BOAT")
        .map(mapBoatAsset)
        .filter((entry): entry is CountryBoatOwner => entry !== null),
      highLands: assets
        .filter((asset) => asset.kind === "HIGH_LAND")
        .map(mapHighLandAsset)
        .filter((entry): entry is HighLandZone => entry !== null),
      camps: assets
        .filter((asset) => asset.kind === "RELIEF_CAMP")
        .map(mapCampAsset)
        .filter((entry): entry is ReliefCampFacility => entry !== null),
    });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load emergency asset data.",
    );
  }
}

export async function fetchEmergencyDirectorySnapshot(): Promise<
  ActionResult<EmergencyDirectorySnapshot>
> {
  const db = tryGetAdminFirestore();
  if (!db) {
    return actionOk({ hospitals: [], police: [], armyCamps: [] });
  }

  try {
    const snap = await db.collection(FIRESTORE_COLLECTIONS.emergencyAssets).get();
    const assets = snap.docs.map((doc) => doc.data() as EmergencyAssetDoc);

    return actionOk({
      hospitals: assets
        .filter((asset) => asset.kind === "HOSPITAL")
        .map(mapHospitalAsset)
        .filter((entry): entry is HospitalFacilityRecord => entry !== null)
        .sort((a, b) => a.hospitalName.localeCompare(b.hospitalName)),
      police: assets
        .filter((asset) => asset.kind === "POLICE")
        .map(mapPoliceAsset)
        .filter((entry): entry is PolicePersonnelRecord => entry !== null)
        .sort((a, b) => a.policeStationName.localeCompare(b.policeStationName)),
      armyCamps: assets
        .filter((asset) => asset.kind === "ARMY")
        .map(mapArmyAsset)
        .filter((entry): entry is ArmyCampRecord => entry !== null)
        .sort((a, b) => a.unitName.localeCompare(b.unitName)),
    });
  } catch (error) {
    return actionFail(
      error instanceof Error
        ? error.message
        : "Could not load emergency directory data.",
    );
  }
}
