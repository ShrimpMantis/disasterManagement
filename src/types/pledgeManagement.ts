export interface TicketItemNeed {
  itemId: string;
  category: string;
  itemDisplayName: string;
  quantityRequested: number;
  quantityPledged: number;
  quantityFulfilled: number;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
}

export interface EntityPledgeCommitment {
  pledgeId: string;
  ticketId: string;
  entityId: string;
  entityType: "REGISTERED_NGO" | "CITIZEN_GROUP" | "INDIVIDUAL_VOLUNTEER";
  entityName: string;
  pledgedItems: Array<{
    itemId: string;
    itemDisplayName: string;
    quantityPledged: number;
    estimatedFinancialValue: number;
  }>;
  totalPledgedValue: number;
  providesDistributionManpower: boolean;
  pledgedManpowerCount: number;
  status: "ACTIVE_PLEDGED" | "IN_TRANSIT" | "FULFILLED" | "CANCELLED";
  createdTimestamp: string;
}

export interface OrganizationCapabilityProfile {
  entityId: string;
  entityName: string;
  entityType: "REGISTERED_NGO" | "CITIZEN_GROUP" | "INDIVIDUAL_VOLUNTEER";
  maxManpowerCapacity: number;
  currentlyCommittedManpower: number;
  netAvailableManpower: number;
  activePledges: Array<{
    pledgeId: string;
    ticketCode: string;
    districtName: string;
    totalFinancialValue: number;
    committedManpowerCount: number;
    itemSummary: string;
  }>;
}
