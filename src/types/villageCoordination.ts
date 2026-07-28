export type VillageServiceStatus =
  | "UNSERVED"
  | "PARTIALLY_SERVED"
  | "FULLY_SERVED";

export type VillageDemandCategory =
  | "FOOD_RATIONS"
  | "WATER_CANS"
  | "MEDICAL_KITS"
  | "TARPAULINS";

export interface VillageItemDemand {
  category: VillageDemandCategory;
  displayName: string;
  quantityAssessed: number;
  quantityPledged: number;
  quantityDelivered: number;
  quantityInTransit: number;
  quantityPending: number;
}

export interface VillageDemandMetric {
  villageId: string;
  villageName: string;
  revenueCircle: string;
  district: string;
  serviceStatus: VillageServiceStatus;
  demands: VillageItemDemand[];
  fulfillmentPercentage: number;
  lastDispatchedTimestamp?: string;
}

export interface DistrictVillageCoverageSummary {
  districtName: string;
  totalVillagesAffected: number;
  villagesServedCount: number;
  villagesPartiallyServedCount: number;
  villagesUnservedCount: number;
  coveragePercentage: number;
}

export const VILLAGE_SERVICE_STATUS_LABELS: Record<
  VillageServiceStatus,
  string
> = {
  UNSERVED: "Unserved",
  PARTIALLY_SERVED: "Partially served",
  FULLY_SERVED: "Fully served",
};

export const VILLAGE_SERVICE_STATUS_BADGE_CLASS: Record<
  VillageServiceStatus,
  string
> = {
  UNSERVED: "bg-[#fef2f2] text-[#b91c1c]",
  PARTIALLY_SERVED: "bg-[#fff7ed] text-[#9a3412]",
  FULLY_SERVED: "bg-[#dcfce7] text-[#166534]",
};

export const DEMAND_CATEGORY_LABELS: Record<VillageDemandCategory, string> = {
  FOOD_RATIONS: "Food rations",
  WATER_CANS: "Water cans",
  MEDICAL_KITS: "Medical kits",
  TARPAULINS: "Tarpaulins",
};

export const DEMAND_CATEGORY_COLORS: Record<
  VillageDemandCategory,
  { assessed: string; delivered: string }
> = {
  FOOD_RATIONS: { assessed: "#f59e0b", delivered: "#d97706" },
  WATER_CANS: { assessed: "#38bdf8", delivered: "#0284c7" },
  MEDICAL_KITS: { assessed: "#f87171", delivered: "#dc2626" },
  TARPAULINS: { assessed: "#34d399", delivered: "#059669" },
};
