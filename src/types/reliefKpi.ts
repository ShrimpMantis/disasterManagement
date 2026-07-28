export type ReliefKpiSegmentName = "Fulfilled" | "In-Transit" | "Pending";

export interface ReliefKpiChartSegment {
  name: ReliefKpiSegmentName;
  value: number;
  color: string;
}

export interface ReliefCategoryVolume {
  category: string;
  displayName: string;
  unitLabel: string;
  quantityAssessed: number;
  quantityPledged: number;
  quantityDelivered: number;
  quantityInTransit: number;
  quantityPending: number;
  fulfillmentPercentage: number;
}

export interface ReliefScopeOption {
  id: string;
  label: string;
  kind: "ALL" | "DISTRICT" | "REVENUE_CIRCLE";
  districtId?: string;
}

export interface ReliefFulfillmentSummary {
  districtId: string;
  districtName: string;
  scopeLabel: string;
  totalAssessedDemandUnits: number;
  totalDeliveredUnits: number;
  totalInTransitUnits: number;
  totalPendingUnits: number;
  overallFulfillmentPercentage: number;
  chartSegments: ReliefKpiChartSegment[];
  categoryBreakdown: ReliefCategoryVolume[];
  scopeOptions: ReliefScopeOption[];
  source: "firestore" | "empty";
}

export const RELIEF_KPI_SEGMENT_COLORS: Record<ReliefKpiSegmentName, string> = {
  Fulfilled: "#22c55e",
  "In-Transit": "#eab808",
  Pending: "#ef4444",
};
