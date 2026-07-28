export type WarehouseStatus =
  | "EMPTY"
  | "PARTIALLY_FILLED"
  | "NEAR_CAPACITY"
  | "FULL"
  | "OFFLINE_FLOODED";

export type WarehouseFacilityType =
  | "CENTRAL_HUB"
  | "FIELD_STAGING"
  | "TEMPORARY_SHELTER";

export interface WarehouseLocation {
  warehouseId: string;
  warehouseName: string;
  facilityType: WarehouseFacilityType;

  district: string;
  districtId: string;
  revenueCircle: string;
  villageTown: string;
  address: string;
  coordinates: { lat: number; lng: number };

  ownerName: string;
  pointOfContactName: string;
  pointOfContactPhone: string;

  /** Capacity metrics in metric tons */
  totalCapacityTons: number;
  currentStockTons: number;
  outstandingCapacityTons: number;
  fillPercentage: number;
  capacityStatus: WarehouseStatus;

  lastAuditedTimestamp: string;
}

export interface DistrictWarehouseSummary {
  districtName: string;
  totalWarehousesCount: number;
  totalCapacityTons: number;
  totalStockedTons: number;
  totalOutstandingCapacityTons: number;
  averageFillPercentage: number;
  statusBreakdown: {
    /** Warehouses > 85% full */
    criticalFullCount: number;
    /** Warehouses with available space */
    availableCount: number;
    /** Inaccessible or submerged hubs */
    offlineFloodedCount: number;
  };
}

export interface WarehouseMacroSummary {
  totalCapacityTons: number;
  totalStockedTons: number;
  totalOutstandingCapacityTons: number;
  fillPercentage: number;
  totalWarehousesCount: number;
  districtCount: number;
}

export interface WarehouseModuleSnapshot {
  warehouses: WarehouseLocation[];
  districts: DistrictWarehouseSummary[];
  macro: WarehouseMacroSummary;
  source: "firestore";
}

export const WAREHOUSE_STATUS_LABELS: Record<WarehouseStatus, string> = {
  EMPTY: "Empty",
  PARTIALLY_FILLED: "Partially filled",
  NEAR_CAPACITY: "Near capacity",
  FULL: "Full",
  OFFLINE_FLOODED: "Offline / Flooded",
};

export const WAREHOUSE_STATUS_BADGE_CLASS: Record<WarehouseStatus, string> = {
  EMPTY: "bg-[#e0f2fe] text-[#075985]",
  PARTIALLY_FILLED: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  NEAR_CAPACITY: "bg-[#fff7ed] text-[#9a3412]",
  FULL: "bg-[#fef2f2] text-[#b91c1c]",
  OFFLINE_FLOODED: "bg-[#f3f4f6] text-[#374151]",
};

export const FACILITY_TYPE_LABELS: Record<WarehouseFacilityType, string> = {
  CENTRAL_HUB: "Central Hub",
  FIELD_STAGING: "Field Staging",
  TEMPORARY_SHELTER: "Temporary Shelter",
};

/** Free-space headroom band for outstanding capacity column. */
export type HeadroomBand = "HIGH" | "LOW" | "CRITICAL";

export function headroomBand(warehouse: WarehouseLocation): HeadroomBand {
  if (warehouse.capacityStatus === "OFFLINE_FLOODED") return "CRITICAL";
  if (warehouse.totalCapacityTons <= 0) return "CRITICAL";
  const freePct =
    (warehouse.outstandingCapacityTons / warehouse.totalCapacityTons) * 100;
  if (freePct > 40) return "HIGH";
  if (freePct >= 15) return "LOW";
  return "CRITICAL";
}

export const HEADROOM_BAND_CLASS: Record<HeadroomBand, string> = {
  HIGH: "bg-[#dcfce7] text-[#166534]",
  LOW: "bg-[#fef3c7] text-[#92400e]",
  CRITICAL: "bg-[#fef2f2] text-[#b91c1c]",
};
