"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { updateTicketStatus } from "@/actions/sosActions";
import type { SOSAlertTicket, SOSStatus } from "@/types/sos";
import type { SosAlert } from "@/types/map";

function toMapSosAlert(ticket: SOSAlertTicket): SosAlert {
  return {
    id: ticket.sosId,
    citizenName: ticket.citizenName,
    phone: ticket.contactPhone,
    villageName: ticket.villageName,
    message:
      ticket.specialNotes ??
      `${ticket.category.replaceAll("_", " ")} · ${ticket.peopleCount} people`,
    reportedAt: ticket.createdAtTimestamp,
    lat: ticket.coordinates.lat,
    lng: ticket.coordinates.lng,
    status:
      ticket.status === "UNASSIGNED"
        ? "OPEN"
        : ticket.status === "RESCUED" || ticket.status === "CANCELLED"
          ? "RESOLVED"
          : "DISPATCHED",
  };
}

export function useSosTriageState(initial: SOSAlertTicket[] = []) {
  const [alerts, setAlerts] = useState<SOSAlertTicket[]>(initial);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAlerts(initial);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [initial]);

  const activeAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.status === "UNASSIGNED" || alert.status === "DISPATCHED",
      ),
    [alerts],
  );

  const unassignedCriticalCount = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.status === "UNASSIGNED" &&
          alert.urgency === "P1_CRITICAL_LIFE",
      ).length,
    [alerts],
  );

  const mapSosAlerts = useMemo(() => alerts.map(toMapSosAlert), [alerts]);

  const setStatus = useCallback(
    async (
      sosId: string,
      status: SOSStatus,
      assignment?: { assetId: string; assetLabel: string },
    ) => {
      const result = await updateTicketStatus({
        sosId,
        status,
        assignedAssetId: assignment?.assetId,
        assignedAssetLabel: assignment?.assetLabel,
      });

      if (!result.ok) return false;

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.sosId === sosId
            ? {
                ...alert,
                status,
                assignedAssetId: assignment?.assetId ?? alert.assignedAssetId,
                assignedAssetLabel:
                  assignment?.assetLabel ?? alert.assignedAssetLabel,
              }
            : alert,
        ),
      );
      return true;
    },
    [],
  );

  const rapidDispatch = useCallback(
    async (sosId: string, assetId: string, assetLabel: string) => {
      return setStatus(sosId, "DISPATCHED", { assetId, assetLabel });
    },
    [setStatus],
  );

  return {
    alerts,
    activeAlerts,
    unassignedCriticalCount,
    mapSosAlerts,
    setStatus,
    rapidDispatch,
  };
}
