export type PhysicalItemCategory =
  | "FOOD"
  | "CLOTHING"
  | "WATER"
  | "SHELTER"
  | "MEDICAL";

export interface FinancialReliefSummary {
  totalFundsRaisedINR: number;
  governmentReliefFundINR: number;
  ngoCrowdfundedINR: number;
  fundsDisbursedINR: number;
  remainingBalanceINR: number;
}

export interface PhysicalDistributionItem {
  itemId: string;
  category: PhysicalItemCategory;
  displayName: string;
  unit: string;
  totalTargetQuantity: number;
  totalDistributedQuantity: number;
  distributionRatePerDay: number;
}

export interface ConsolidatedReliefMetrics {
  financials: FinancialReliefSummary;
  physicalDistribution: PhysicalDistributionItem[];
  lastUpdatedTimestamp: string;
}

export const PHYSICAL_CATEGORY_LABELS: Record<PhysicalItemCategory, string> = {
  FOOD: "Food",
  CLOTHING: "Clothing",
  WATER: "Water",
  SHELTER: "Shelter",
  MEDICAL: "Medical",
};
