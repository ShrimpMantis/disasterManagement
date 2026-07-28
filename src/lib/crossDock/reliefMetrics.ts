import type {
  ConsolidatedReliefMetrics,
  PhysicalDistributionItem,
} from "@/types/reliefTotals";

const EMPTY_PHYSICAL: PhysicalDistributionItem[] = [
  {
    itemId: "phys-food",
    category: "FOOD",
    displayName: "Dry Food Packets",
    unit: "Packets",
    totalTargetQuantity: 0,
    totalDistributedQuantity: 0,
    distributionRatePerDay: 0,
  },
  {
    itemId: "phys-clothing",
    category: "CLOTHING",
    displayName: "Clothing Sets (Adult/Child)",
    unit: "Sets",
    totalTargetQuantity: 0,
    totalDistributedQuantity: 0,
    distributionRatePerDay: 0,
  },
  {
    itemId: "phys-water",
    category: "WATER",
    displayName: "Drinking Water",
    unit: "Liters",
    totalTargetQuantity: 0,
    totalDistributedQuantity: 0,
    distributionRatePerDay: 0,
  },
  {
    itemId: "phys-shelter",
    category: "SHELTER",
    displayName: "Shelter & Tarpaulins",
    unit: "Units",
    totalTargetQuantity: 0,
    totalDistributedQuantity: 0,
    distributionRatePerDay: 0,
  },
  {
    itemId: "phys-medical",
    category: "MEDICAL",
    displayName: "Medical & Hygiene Kits",
    unit: "Kits",
    totalTargetQuantity: 0,
    totalDistributedQuantity: 0,
    distributionRatePerDay: 0,
  },
];

export function emptyConsolidatedReliefMetrics(): ConsolidatedReliefMetrics {
  return {
    financials: {
      totalFundsRaisedINR: 0,
      governmentReliefFundINR: 0,
      ngoCrowdfundedINR: 0,
      fundsDisbursedINR: 0,
      remainingBalanceINR: 0,
    },
    physicalDistribution: EMPTY_PHYSICAL.map((item) => ({ ...item })),
    lastUpdatedTimestamp: new Date(0).toISOString(),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Merge seed `physicalDistribution` with live `physicalTotals` counters. */
export function normalizeReliefMetrics(
  raw: Record<string, unknown> | undefined,
): ConsolidatedReliefMetrics {
  const empty = emptyConsolidatedReliefMetrics();
  if (!raw) return empty;

  const financialsRaw =
    raw.financials && typeof raw.financials === "object"
      ? (raw.financials as Record<string, unknown>)
      : {};
  const financials = {
    totalFundsRaisedINR: isFiniteNumber(financialsRaw.totalFundsRaisedINR)
      ? financialsRaw.totalFundsRaisedINR
      : 0,
    governmentReliefFundINR: isFiniteNumber(
      financialsRaw.governmentReliefFundINR,
    )
      ? financialsRaw.governmentReliefFundINR
      : 0,
    ngoCrowdfundedINR: isFiniteNumber(financialsRaw.ngoCrowdfundedINR)
      ? financialsRaw.ngoCrowdfundedINR
      : 0,
    fundsDisbursedINR: isFiniteNumber(financialsRaw.fundsDisbursedINR)
      ? financialsRaw.fundsDisbursedINR
      : 0,
    remainingBalanceINR: isFiniteNumber(financialsRaw.remainingBalanceINR)
      ? financialsRaw.remainingBalanceINR
      : 0,
  };

  const physicalTotals =
    raw.physicalTotals && typeof raw.physicalTotals === "object"
      ? (raw.physicalTotals as Record<string, unknown>)
      : {};

  const seededDistribution = Array.isArray(raw.physicalDistribution)
    ? (raw.physicalDistribution as PhysicalDistributionItem[])
    : EMPTY_PHYSICAL;

  const physicalDistribution = EMPTY_PHYSICAL.map((template) => {
    const seeded = seededDistribution.find(
      (entry) => entry.category === template.category,
    );
    const fromTotals = physicalTotals[template.category];
    const distributed = isFiniteNumber(fromTotals)
      ? fromTotals
      : isFiniteNumber(seeded?.totalDistributedQuantity)
        ? seeded.totalDistributedQuantity
        : 0;
    return {
      ...template,
      ...(seeded ?? {}),
      category: template.category,
      totalDistributedQuantity: distributed,
      totalTargetQuantity: isFiniteNumber(seeded?.totalTargetQuantity)
        ? seeded.totalTargetQuantity
        : template.totalTargetQuantity,
      distributionRatePerDay: isFiniteNumber(seeded?.distributionRatePerDay)
        ? seeded.distributionRatePerDay
        : template.distributionRatePerDay,
      displayName: seeded?.displayName ?? template.displayName,
      unit: seeded?.unit ?? template.unit,
      itemId: seeded?.itemId ?? template.itemId,
    };
  });

  return {
    financials,
    physicalDistribution,
    lastUpdatedTimestamp: isNonEmptyString(raw.lastUpdatedTimestamp)
      ? raw.lastUpdatedTimestamp
      : new Date().toISOString(),
  };
}
