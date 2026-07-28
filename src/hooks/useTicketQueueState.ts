"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTicketQueueSnapshot } from "@/actions/ticketQueueActions";
import { uploadFulfillmentPhoto } from "@/lib/firebase/storage";
import {
  updateDistrictTicketStatus,
  upsertAuditQueueRecord,
} from "@/lib/firestore/tickets";
import { refreshTicketSla } from "@/lib/tickets/clusterVillageRequests";
import {
  createAuditSamplingRecord,
  normalizeScannedItems,
  pickAuditReason,
} from "@/lib/tickets/fulfillmentAudit";
import {
  transitionTicket,
  type TransitionContext,
} from "@/lib/tickets/ticketStateMachine";
import type {
  AuditSamplingRecord,
  AuditStatus,
  ScannedItemQr,
} from "@/types/fulfillmentAudit";
import type { NGOProfile } from "@/types/ngo";
import type {
  ReliefTicket,
  TicketStatus,
  VillageLookup,
} from "@/types/ticket";

export function useTicketQueueState() {
  const [villages, setVillages] = useState<VillageLookup[]>([]);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [tickets, setTickets] = useState<ReliefTicket[]>([]);

  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [flashMessage, setFlashMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTicketQueueSnapshot() {
      const result = await fetchTicketQueueSnapshot();
      if (!result.ok || cancelled) return;

      setVillages(result.data.villages);
      setNgos(result.data.ngos);
      setTickets(result.data.tickets.map((ticket) => refreshTicketSla(ticket)));
    }

    void loadTicketQueueSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  const assignableEntities = useMemo(
    () => [
      ...ngos
        .filter((ngo) => ngo.status !== "INACTIVE")
        .map((ngo) => ({ id: ngo.id, name: ngo.name, kind: "NGO" as const })),
      { id: "wh-1", name: "Central Relief Warehouse Jorhat", kind: "WAREHOUSE" as const },
      { id: "wh-2", name: "District Depot Dhemaji", kind: "WAREHOUSE" as const },
    ],
    [ngos],
  );

  const applyTransition = useCallback(
    (ticketId: string, nextStatus: TicketStatus, context: TransitionContext = {}) => {
      setErrorMessage("");
      setFlashMessage("");

      setTickets((prev) => {
        const ticket = prev.find((entry) => entry.id === ticketId);
        if (!ticket) {
          setErrorMessage("Ticket not found.");
          return prev;
        }

        const result = transitionTicket(ticket, nextStatus, context);
        if (!result.ok) {
          setErrorMessage(result.error);
          return prev;
        }

        const withoutCurrent = prev.filter((entry) => entry.id !== ticketId);
        const nextTickets = [...withoutCurrent, ...result.tickets].map((entry) =>
          refreshTicketSla(entry),
        );
        if (result.message) setFlashMessage(result.message);
        return nextTickets.sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
      });
    },
    [],
  );

  const bulkAssign = useCallback(
    (entityId: string, entityName: string) => {
      const ids = selectedTicketIds;
      if (ids.length === 0) return;

      setTickets((prev) => {
        let next = [...prev];
        const errors: string[] = [];

        for (const id of ids) {
          const ticket = next.find((entry) => entry.id === id);
          if (!ticket) continue;
          if (ticket.status !== "REQUESTED") {
            errors.push(`${id}: only REQUESTED tickets can be bulk-assigned`);
            continue;
          }
          const result = transitionTicket(ticket, "ASSIGNED", {
            assignedEntityId: entityId,
            assignedEntityName: entityName,
          });
          if (!result.ok) {
            errors.push(`${id}: ${result.error}`);
            continue;
          }
          next = [
            ...next.filter((entry) => entry.id !== id),
            ...result.tickets.map((entry) => refreshTicketSla(entry)),
          ];
        }

        if (errors.length > 0) setErrorMessage(errors.join(" · "));
        else {
          setFlashMessage(`Assigned ${ids.length} ticket(s) to ${entityName}.`);
          setSelectedTicketIds([]);
        }

        return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      });
    },
    [selectedTicketIds],
  );

  const replaceTickets = useCallback((nextTickets: ReliefTicket[]) => {
    setTickets(
      nextTickets
        .map((ticket) => refreshTicketSla(ticket))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    );
  }, []);

  const prependTicket = useCallback((ticket: ReliefTicket) => {
    setTickets((prev) =>
      [ticket, ...prev]
        .map((entry) => refreshTicketSla(entry))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    );
  }, []);

  const submitFulfillmentProof = useCallback(
    async (
      ticketId: string,
      input: {
        scannedQrCodes: string[];
        photoFile: File;
        deliveryCoordinates: {
          lat: number;
          lng: number;
          accuracyMeters: number;
        };
        isLocationOverridden: boolean;
        locationOverrideReason?: string;
        deliveredByUserId: string;
      },
    ) => {
      const ticket = tickets.find((entry) => entry.id === ticketId);
      if (!ticket) {
        setErrorMessage("Ticket not found.");
        return;
      }

      const scannedItems: ScannedItemQr[] = normalizeScannedItems(
        input.scannedQrCodes.map((qrCodeId) => ({
          qrCodeId,
          scannedAt: new Date().toISOString(),
        })),
      );

      const now = Date.now();
      let photoUrl = "";
      try {
        photoUrl = await uploadFulfillmentPhoto(ticket.id, input.photoFile, {
          ticketId: ticket.id,
          latitude: String(input.deliveryCoordinates.lat),
          longitude: String(input.deliveryCoordinates.lng),
          accuracyMeters: String(input.deliveryCoordinates.accuracyMeters),
          capturedAt: new Date(now).toISOString(),
        });
      } catch {
        photoUrl = URL.createObjectURL(input.photoFile);
      }

      const proof = {
        proofId: `PRF-${now}-${ticket.id}`,
        ticketId: ticket.id,
        scannedItems,
        totalExpectedItems: ticket.items.reduce(
          (sum, item) => sum + item.totalRequestedQuantity,
          0,
        ),
        totalScannedItems: scannedItems.length,
        dropPhotoUrl: photoUrl,
        deliveryCoordinates: input.deliveryCoordinates,
        deliveryTimestamp: new Date(now).toISOString(),
        isLocationOverridden: input.isLocationOverridden,
        locationOverrideReason: input.locationOverrideReason,
        deliveredByUserId: input.deliveredByUserId,
        timestamp: new Date(now).toISOString(),
      };

      const samplingReason = pickAuditReason(ticket.id, proof);
      const auditSampling = samplingReason
        ? createAuditSamplingRecord({
            ticketId: ticket.id,
            reason: samplingReason,
            now,
          })
        : undefined;
      const targetStatus: TicketStatus = auditSampling
        ? "SELECTED_FOR_AUDIT"
        : "FULFILLED";

      const result = transitionTicket(ticket, targetStatus, {
        now,
        proofOfDeliveryUrl: proof.dropPhotoUrl,
        proofOfFulfillment: proof,
        auditSampling,
      });
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setTickets((prev) => {
        const withoutCurrent = prev.filter((entry) => entry.id !== ticketId);
        return [...withoutCurrent, ...result.tickets]
          .map((entry) => refreshTicketSla(entry))
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      });
      setFlashMessage(
        auditSampling
          ? `${ticket.id} fulfilled and routed to audit queue.`
          : `${ticket.id} fulfilled with QR scan + geo-photo proof.`,
      );
      setErrorMessage("");

      void updateDistrictTicketStatus(ticket.district, ticket.id, {
        status: targetStatus,
        proofOfDeliveryUrl: proof.dropPhotoUrl,
        proofOfFulfillment: proof,
        auditSampling,
        items: result.tickets[0]?.items,
      });
      if (auditSampling) {
        void upsertAuditQueueRecord(auditSampling);
      }
    },
    [tickets],
  );

  const resolveAudit = useCallback(
    (
      ticketId: string,
      resolution: "AUDIT_VERIFIED" | "AUDIT_FAILED",
      notes: string,
      auditedByUserId?: string,
    ) => {
      const ticket = tickets.find((entry) => entry.id === ticketId);
      if (!ticket) {
        setErrorMessage("Ticket not found.");
        return;
      }
      const now = Date.now();
      const result = transitionTicket(ticket, resolution, { now });
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      const nextAuditStatus: AuditStatus =
        resolution === "AUDIT_VERIFIED" ? "PASSED" : "FAILED";
      const nextAuditSampling: AuditSamplingRecord | undefined = ticket.auditSampling
        ? {
            ...ticket.auditSampling,
            auditStatus: nextAuditStatus,
            auditorNotes: notes || undefined,
            auditedByUserId,
            auditedTimestamp: new Date(now).toISOString(),
          }
        : undefined;
      const nextTicket: ReliefTicket = {
        ...result.tickets[0],
        auditSampling: nextAuditSampling,
      };
      setTickets((prev) => {
        const withoutCurrent = prev.filter((entry) => entry.id !== ticketId);
        return [...withoutCurrent, refreshTicketSla(nextTicket)].sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
      });
      setFlashMessage(
        `${ticket.id} marked ${
          resolution === "AUDIT_VERIFIED" ? "audit verified" : "audit failed"
        }.`,
      );
      setErrorMessage("");

      void updateDistrictTicketStatus(ticket.district, ticket.id, {
        status: resolution,
        auditSampling: nextAuditSampling,
      });
      if (nextAuditSampling) {
        void upsertAuditQueueRecord(nextAuditSampling);
      }
    },
    [tickets],
  );

  const exportSelectedManifest = useCallback(() => {
    const selected = tickets.filter((ticket) => selectedTicketIds.includes(ticket.id));
    if (selected.length === 0) {
      setErrorMessage("Select at least one ticket to export.");
      return;
    }

    const rows = [
      [
        "Ticket ID",
        "Village",
        "Revenue Circle",
        "District",
        "Priority",
        "Status",
        "Assigned Entity",
        "Items",
        "Vehicle",
        "Driver Phone",
        "ETA",
      ],
      ...selected.map((ticket) => [
        ticket.id,
        ticket.villageName,
        ticket.revenueCircle,
        ticket.district,
        ticket.priority,
        ticket.status,
        ticket.assignedEntityName ?? "",
        ticket.items
          .map(
            (item) =>
              `${item.itemName}:${item.totalRequestedQuantity}${item.unit}`,
          )
          .join("; "),
        ticket.dispatchVehicleNumber ?? "",
        ticket.dispatchDriverPhone ?? "",
        ticket.estimatedArrival ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dispatch-manifest-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFlashMessage(`Exported manifest for ${selected.length} ticket(s).`);
  }, [selectedTicketIds, tickets]);

  return {
    rawRequests: [],
    tickets,
    villages,
    dataSource: "firestore" as const,
    assignableEntities,
    selectedTicketIds,
    setSelectedTicketIds,
    flashMessage,
    errorMessage,
    setFlashMessage,
    setErrorMessage,
    applyTransition,
    submitFulfillmentProof,
    resolveAudit,
    bulkAssign,
    replaceTickets,
    prependTicket,
    exportSelectedManifest,
  };
}
