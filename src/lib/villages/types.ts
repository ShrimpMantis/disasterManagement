export const VULNERABILITY_LEVELS = ["Low", "Medium", "High", "Critical"] as const;
export type VulnerabilityLevel = (typeof VULNERABILITY_LEVELS)[number];

export const FULFILLMENT_STATUSES = [
  "Not Started",
  "Pending",
  "Partial",
  "Fulfilled",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type VillageReliefRow = {
  id: string;
  villageName: string;
  area: string;
  peopleLikelyAffected: number | null;
  vulnerability: string;
  revenueCircle: string;
  district: string;
  fulfillmentStatus: string;
  unmetNeeds: string;
  lastReliefDelivered: string;
};

export type ValidationError = {
  /** 1-based Excel row number (header is row 1) */
  row: number;
  /** Excel-style column letter when available */
  column: string;
  field: string;
  value: string;
  message: string;
};

export const EXCEL_HEADERS = {
  villageName: "Village Name",
  area: "Area",
  peopleLikelyAffected: "People Likely Affected",
  vulnerability: "Vulnerability",
  revenueCircle: "Revenue Circle",
  district: "District",
  fulfillmentStatus: "Fulfillment Status",
  unmetNeeds: "Unmet Needs",
  lastReliefDelivered: "Last Relief Delivered",
} as const;

export type ExcelField = keyof typeof EXCEL_HEADERS;
