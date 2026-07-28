import type {
  ConsolidatedItemNeed,
  RawReliefRequest,
  ReliefTicket,
  TicketPriority,
  VillageLookup,
} from "@/types/ticket";

const CLUSTER_WINDOW_MS = 12 * 60 * 60 * 1000;
const POPULATION_OUTLIER_MULTIPLIER = 3;
const DEFAULT_UNIT_COST_BY_CATEGORY: Record<string, number> = {
  "Water & Sanitation": 3,
  Shelter: 14,
  Medical: 18,
  Food: 6,
};

function toTicketCode(villageId: string, createdAt: string): string {
  const date = new Date(createdAt);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const villageToken = villageId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "UNK";
  return `TKT-${villageToken}-${mm}${dd}`;
}

function computePriority(
  totalRequested: number,
  population: number,
  channelHasSos: boolean,
): { priority: TicketPriority; requiresManualVerification: boolean } {
  const outlier =
    population > 0 && totalRequested > population * POPULATION_OUTLIER_MULTIPLIER;

  if (outlier) {
    return { priority: "HIGH", requiresManualVerification: true };
  }
  if (channelHasSos || totalRequested >= Math.max(500, population * 0.4)) {
    return { priority: "CRITICAL", requiresManualVerification: false };
  }
  if (totalRequested >= Math.max(200, population * 0.2)) {
    return { priority: "HIGH", requiresManualVerification: false };
  }
  if (totalRequested >= 50) {
    return { priority: "MEDIUM", requiresManualVerification: false };
  }
  return { priority: "LOW", requiresManualVerification: false };
}

function aggregateItems(requests: RawReliefRequest[]): ConsolidatedItemNeed[] {
  const map = new Map<string, ConsolidatedItemNeed>();

  for (const request of requests) {
    const key = `${request.itemName.toLowerCase()}::${request.unit.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalRequestedQuantity += request.requestedQuantity;
      existing.underlyingRequestIds.push(request.id);
      continue;
    }
    map.set(key, {
      itemId: request.id,
      itemName: request.itemName,
      category: request.itemCategory,
      totalRequestedQuantity: request.requestedQuantity,
      quantityPledged: 0,
      fulfilledQuantity: 0,
      unit: request.unit,
      estimatedUnitCost: DEFAULT_UNIT_COST_BY_CATEGORY[request.itemCategory] ?? 5,
      estimatedTotalCost:
        request.requestedQuantity *
        (DEFAULT_UNIT_COST_BY_CATEGORY[request.itemCategory] ?? 5),
      underlyingRequestIds: [request.id],
    });
  }

  return Array.from(map.values());
}

function isSlaBreached(status: ReliefTicket["status"], createdAt: string, now: number): boolean {
  if (status !== "REQUESTED" && status !== "ASSIGNED") return false;
  return now - Date.parse(createdAt) > CLUSTER_WINDOW_MS;
}

/**
 * Cluster raw requests by village within a 12-hour window and aggregate item needs.
 */
export function clusterVillageRequests(
  requests: RawReliefRequest[],
  villages: VillageLookup[],
  now = Date.now(),
): ReliefTicket[] {
  const villageById = new Map(villages.map((village) => [village.id, village]));
  const sorted = [...requests].sort(
    (a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt),
  );

  type Cluster = {
    villageId: string;
    windowStart: number;
    requests: RawReliefRequest[];
  };

  const clusters: Cluster[] = [];

  for (const request of sorted) {
    const ts = Date.parse(request.requestedAt);
    const openCluster = [...clusters]
      .reverse()
      .find(
        (cluster) =>
          cluster.villageId === request.villageId &&
          ts - cluster.windowStart <= CLUSTER_WINDOW_MS,
      );

    if (openCluster) {
      openCluster.requests.push(request);
      continue;
    }

    clusters.push({
      villageId: request.villageId,
      windowStart: ts,
      requests: [request],
    });
  }

  return clusters.map((cluster, index) => {
    const sample = cluster.requests[0];
    const village = villageById.get(cluster.villageId);
    const items = aggregateItems(cluster.requests);
    const totalRequested = items.reduce(
      (sum, item) => sum + item.totalRequestedQuantity,
      0,
    );
    const hasSos = cluster.requests.some(
      (request) => request.sourceChannel === "CITIZEN_SOS",
    );
    const { priority, requiresManualVerification } = computePriority(
      totalRequested,
      village?.population ?? 0,
      hasSos,
    );
    const createdAt = new Date(cluster.windowStart).toISOString();
    const updatedAt = new Date(
      Math.max(...cluster.requests.map((request) => Date.parse(request.requestedAt))),
    ).toISOString();

    const ticket: ReliefTicket = {
      id: `${toTicketCode(cluster.villageId, createdAt)}-${String(index + 1).padStart(2, "0")}`,
      villageId: cluster.villageId,
      villageName: village?.name ?? sample.villageName,
      revenueCircle: village?.revenueCircle ?? sample.revenueCircle,
      district: village?.district ?? "Unknown District",
      priority,
      status: "REQUESTED",
      items,
      createdAt,
      updatedAt,
      slaBreached: isSlaBreached("REQUESTED", createdAt, now),
      requiresManualVerification,
    };

    return ticket;
  });
}

export function refreshTicketSla(ticket: ReliefTicket, now = Date.now()): ReliefTicket {
  return {
    ...ticket,
    slaBreached: isSlaBreached(ticket.status, ticket.createdAt, now),
  };
}
