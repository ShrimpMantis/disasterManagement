"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  findSuggestedDirectMatches,
  type TicketAllocationPlan,
} from "@/lib/crossDock/allocation";
import {
  confirmGoodsReceipt,
  directAllocateToTickets,
  fetchCrossDockSnapshot,
  receiveConsignmentToWarehouseAction,
} from "@/actions/crossDockActions";
import { emptyConsolidatedReliefMetrics } from "@/lib/crossDock/reliefMetrics";
import { writeCrossDockMetrics } from "@/lib/crossDock/metricsStore";
import type {
  DigitalTransitManifest,
  InboundConsignment,
  TicketFulfillmentRecord,
} from "@/types/reliefCrossDock";
import type { ConsolidatedReliefMetrics } from "@/types/reliefTotals";
import type { ReliefTicket } from "@/types/ticket";

export function useCrossDockState(tickets: ReliefTicket[]) {
  const [consignments, setConsignments] = useState<InboundConsignment[]>([]);
  const [fulfillments, setFulfillments] = useState<TicketFulfillmentRecord[]>(
    [],
  );
  const [manifests, setManifests] = useState<DigitalTransitManifest[]>([]);
  const [reliefMetrics, setReliefMetrics] = useState<ConsolidatedReliefMetrics>(
    emptyConsolidatedReliefMetrics(),
  );
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await fetchCrossDockSnapshot();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConsignments(result.data.consignments);
    setFulfillments(result.data.fulfillments);
    setManifests(result.data.manifests);
    setReliefMetrics(result.data.reliefMetrics);
    writeCrossDockMetrics(result.data.reliefMetrics);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const activeConsignments = useMemo(
    () =>
      consignments.filter(
        (entry) =>
          entry.status === "ANNOUNCED" ||
          entry.status === "AT_TRANSIT_HUB" ||
          entry.status === "PARTIALLY_ALLOCATED",
      ),
    [consignments],
  );

  const getMatchesFor = useCallback(
    (shipmentId: string) => {
      const consignment = consignments.find(
        (entry) => entry.shipmentId === shipmentId,
      );
      if (!consignment) return [];
      return findSuggestedDirectMatches(consignment, tickets);
    },
    [consignments, tickets],
  );

  const receiveToWarehouse = useCallback(
    async (shipmentId: string) => {
      setError("");
      const consignment = consignments.find(
        (entry) => entry.shipmentId === shipmentId,
      );
      if (!consignment) {
        setError("Consignment not found.");
        return;
      }
      const result = await receiveConsignmentToWarehouseAction({ consignment });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFlash(
        result.message ??
          `${shipmentId} received to warehouse inventory pathway. Direct-allocate was not used.`,
      );
      await refresh();
    },
    [consignments, refresh],
  );

  const directAllocate = useCallback(
    async (shipmentId: string, plans: TicketAllocationPlan[]) => {
      setError("");
      setFlash("");
      const consignment = consignments.find(
        (entry) => entry.shipmentId === shipmentId,
      );
      if (!consignment) {
        setError("Consignment not found.");
        return { ok: false as const, tickets };
      }

      const result = await directAllocateToTickets({
        consignment,
        tickets,
        plans,
        operatorUserId: "ops-lead-demo",
      });
      if (!result.ok) {
        setError(result.error);
        return { ok: false as const, tickets };
      }

      setFlash(result.message ?? "Direct allocation saved.");
      await refresh();

      const updatedIds = new Set(result.data.tickets.map((ticket) => ticket.id));
      const merged = [
        ...tickets.filter((ticket) => !updatedIds.has(ticket.id)),
        ...result.data.tickets,
      ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

      return {
        ok: true as const,
        tickets: merged,
        manifests: result.data.manifests,
      };
    },
    [consignments, refresh, tickets],
  );

  const confirmReceipt = useCallback(
    async (
      fulfillmentId: string,
      receiverName: string,
      proofOfReceiptUrl?: string,
    ) => {
      setError("");
      setFlash("");
      const fulfillment = fulfillments.find(
        (entry) => entry.fulfillmentId === fulfillmentId,
      );
      if (!fulfillment) {
        setError("Fulfillment not found.");
        return { ok: false as const, tickets };
      }
      const ticket = tickets.find(
        (entry) => entry.id === fulfillment.reliefTicketId,
      );
      if (!ticket) {
        setError("Linked ticket not found.");
        return { ok: false as const, tickets };
      }

      const gps =
        typeof navigator !== "undefined" && navigator.geolocation
          ? await new Promise<{ lat: number; lng: number } | undefined>(
              (resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (position) =>
                    resolve({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    }),
                  () => resolve(undefined),
                  { timeout: 4000 },
                );
              },
            )
          : undefined;

      const result = await confirmGoodsReceipt({
        fulfillment,
        ticket,
        allTickets: tickets,
        receivedByUserId: "camp-manager-demo",
        receivedByName: receiverName,
        proofOfReceiptUrl,
        receiptGps: gps,
      });
      if (!result.ok) {
        setError(result.error);
        return { ok: false as const, tickets };
      }

      setFlash(result.message ?? "Receipt confirmed.");
      await refresh();

      const nextTicket = result.data.ticket;
      const merged = tickets.map((entry) =>
        entry.id === nextTicket.id ? nextTicket : entry,
      );
      return { ok: true as const, tickets: merged };
    },
    [fulfillments, refresh, tickets],
  );

  return {
    consignments,
    activeConsignments,
    fulfillments,
    manifests,
    reliefMetrics,
    flash,
    error,
    setFlash,
    setError,
    getMatchesFor,
    receiveToWarehouse,
    directAllocate,
    confirmReceipt,
  };
}
