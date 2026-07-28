export type OfficialRole =
  | "DISTRICT_COLLECTOR"
  | "LOCAL_MLA"
  | "SUPERINTENDENT_POLICE"
  | "CIRCLE_OFFICER"
  | "EOC_IN_CHARGE";

export interface KeyOfficialContact {
  id: string;
  district: string;
  revenueCircle?: string;
  name: string;
  role: OfficialRole;
  designationTitle: string;
  phone: string;
  altPhone?: string;
  email: string;
  isAvailable24x7: boolean;
}

export interface ReliefCategoryProgress {
  categoryName: string;
  unit: string;
  totalTargetQuantity: number;
  totalPledgedQuantity: number;
  totalDispatchedQuantity: number;
  totalDeliveredQuantity: number;
  fulfillmentPercentage: number;
}

export interface DistrictProgressSummary {
  overallFulfillmentPct: number;
  totalVillages: number;
  villagesFullyCovered: number;
  totalVillagesCoveredPct: number;
  categoryBreakdown: ReliefCategoryProgress[];
}

export const OFFICIAL_ROLE_LABELS: Record<OfficialRole, string> = {
  DISTRICT_COLLECTOR: "District Collector",
  LOCAL_MLA: "Local MLA",
  SUPERINTENDENT_POLICE: "Superintendent of Police",
  CIRCLE_OFFICER: "Circle Officer",
  EOC_IN_CHARGE: "EOC In-Charge",
};

export const OFFICIAL_ROLE_BADGE_CLASS: Record<OfficialRole, string> = {
  DISTRICT_COLLECTOR: "bg-[#f3e8ff] text-[#6b21a8]",
  LOCAL_MLA: "bg-[#fff7ed] text-[#9a3412]",
  SUPERINTENDENT_POLICE: "bg-[#ecfdf5] text-[#047857]",
  CIRCLE_OFFICER: "bg-[#f3f4f6] text-[#374151]",
  EOC_IN_CHARGE: "bg-[#e0f2fe] text-[#075985]",
};
