import type { NGOCapability, NGOProfile, NGOStatus, SectorCategory } from "@/types/ngo";
import { SECTOR_LABELS } from "@/types/ngo";

export type CapabilityLoad = {
  sector: SectorCategory;
  dailyCapacityUnits: number;
  currentAssignedUnits: number;
  remainingUnits: number;
  utilizationPercent: number;
  isAtMaxCapacity: boolean;
  matchScore: number;
};

export type NGODirectoryRow = {
  id: string;
  name: string;
  status: NGOStatus;
  computedStatus: NGOStatus;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  sectors: string;
  sectorKeys: SectorCategory[];
  sectorLabels: string[];
  totalDailyCapacity: number;
  totalAssignedUnits: number;
  remainingCapacity: number;
  utilizationPercent: number;
  /** 0–100: higher means more spare capacity available for new assignments */
  capabilityMatchScore: number;
  hasMaxedCapability: boolean;
  maxedSectors: SectorCategory[];
  villageCount: number;
  assignedVillageIds: string[];
  capabilitiesSummary: string;
  searchBlob: string;
};

export function getCapabilityLoad(capability: NGOCapability): CapabilityLoad {
  const remainingUnits = Math.max(
    0,
    capability.dailyCapacityUnits - capability.currentAssignedUnits,
  );
  const utilizationPercent =
    capability.dailyCapacityUnits <= 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (capability.currentAssignedUnits / capability.dailyCapacityUnits) * 100,
          ),
        );
  const isAtMaxCapacity =
    capability.dailyCapacityUnits > 0 &&
    capability.currentAssignedUnits >= capability.dailyCapacityUnits;
  const matchScore =
    capability.dailyCapacityUnits <= 0
      ? 0
      : Math.max(
          0,
          Math.round(
            (1 - capability.currentAssignedUnits / capability.dailyCapacityUnits) * 100,
          ),
        );

  return {
    sector: capability.sector,
    dailyCapacityUnits: capability.dailyCapacityUnits,
    currentAssignedUnits: capability.currentAssignedUnits,
    remainingUnits,
    utilizationPercent,
    isAtMaxCapacity,
    matchScore,
  };
}

/**
 * Auto-marks MAX_CAPACITY when any capability has
 * currentAssignedUnits >= dailyCapacityUnits.
 */
export function computeNGOOperationalStatus(ngo: NGOProfile): NGOStatus {
  if (ngo.status === "INACTIVE") return "INACTIVE";

  const loads = ngo.capabilities.map(getCapabilityLoad);
  if (loads.some((load) => load.isAtMaxCapacity)) {
    return "MAX_CAPACITY";
  }

  if (ngo.status === "STANDBY") return "STANDBY";
  if (ngo.status === "MAX_CAPACITY") return "ACTIVE";
  return ngo.status;
}

/** Average spare-capacity score across sectors (0–100). */
export function computeCapabilityMatchScore(ngo: NGOProfile): number {
  if (ngo.capabilities.length === 0) return 0;
  const loads = ngo.capabilities.map(getCapabilityLoad);
  const total = loads.reduce((sum, load) => sum + load.matchScore, 0);
  return Math.round(total / loads.length);
}

export function toNGODirectoryRow(ngo: NGOProfile): NGODirectoryRow {
  const loads = ngo.capabilities.map(getCapabilityLoad);
  const totalDailyCapacity = loads.reduce((sum, load) => sum + load.dailyCapacityUnits, 0);
  const totalAssignedUnits = loads.reduce((sum, load) => sum + load.currentAssignedUnits, 0);
  const remainingCapacity = Math.max(0, totalDailyCapacity - totalAssignedUnits);
  const utilizationPercent =
    totalDailyCapacity <= 0
      ? 0
      : Math.min(100, Math.round((totalAssignedUnits / totalDailyCapacity) * 100));
  const maxedSectors = loads
    .filter((load) => load.isAtMaxCapacity)
    .map((load) => load.sector);
  const sectorKeys = ngo.capabilities.map((capability) => capability.sector);
  const sectorLabels = sectorKeys.map((key) => SECTOR_LABELS[key]);
  const computedStatus = computeNGOOperationalStatus(ngo);
  const capabilityMatchScore = computeCapabilityMatchScore(ngo);

  const searchBlob = [
    ngo.name,
    ngo.primaryContact.name,
    ...sectorKeys,
    ...sectorLabels,
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: ngo.id,
    name: ngo.name,
    status: ngo.status,
    computedStatus,
    contactName: ngo.primaryContact.name,
    contactPhone: ngo.primaryContact.phone,
    contactEmail: ngo.primaryContact.email,
    sectors: sectorKeys.join(", "),
    sectorKeys,
    sectorLabels,
    totalDailyCapacity,
    totalAssignedUnits,
    remainingCapacity,
    utilizationPercent,
    capabilityMatchScore,
    hasMaxedCapability: maxedSectors.length > 0,
    maxedSectors,
    villageCount: ngo.assignedVillageIds.length,
    assignedVillageIds: ngo.assignedVillageIds,
    capabilitiesSummary: ngo.capabilities
      .map(
        (capability) =>
          `${SECTOR_LABELS[capability.sector]}: ${capability.currentAssignedUnits}/${capability.dailyCapacityUnits} ${capability.unitLabel}`,
      )
      .join(" · "),
    searchBlob,
  };
}

export function matchesNGOSearch(row: NGODirectoryRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return row.searchBlob.includes(normalized);
}

export function matchesSectorFilters(
  row: NGODirectoryRow,
  selectedSectors: SectorCategory[],
): boolean {
  if (selectedSectors.length === 0) return true;
  return selectedSectors.some((sector) => row.sectorKeys.includes(sector));
}
