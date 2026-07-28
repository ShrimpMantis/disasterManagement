export type CoverageStatus = "SERVED" | "PARTIALLY_SERVED" | "UNSERVED_CRITICAL";

export interface VillageGeoNode {
  id: string;
  name: string;
  revenueCircle: string;
  district: string;
  population: number;
  unmetNeedsCount: number;
  assignedNGOIds: string[];
  coverageStatus: CoverageStatus;
  coordinates: { lat: number; lng: number };
}

export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, string> = {
  SERVED: "Fully Covered",
  PARTIALLY_SERVED: "Partially Covered",
  UNSERVED_CRITICAL: "Critical Unserved",
};

export const COVERAGE_STATUS_COLORS: Record<CoverageStatus, string> = {
  SERVED: "#0f6e56",
  PARTIALLY_SERVED: "#ca8a04",
  UNSERVED_CRITICAL: "#dc2626",
};
