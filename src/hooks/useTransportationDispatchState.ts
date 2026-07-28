"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authorizeTransportDispatch,
  dispatchTransportAsset,
  fetchTransportDispatchSnapshot,
  sendTransportChatMessage,
} from "@/actions/transportActions";
import type {
  AssetOfferDetails,
  DispatchChatMessage,
  DispatchSenderRole,
  TransportCapabilityRequest,
} from "@/types/transportationDispatch";

const ASSET_OWNER_IDENTITY = {
  id: "asset-owner-ops",
  name: "Assam Asset Operator",
};

const VOLUNTEER_LEAD_IDENTITY = {
  id: "volunteer-lead-ops",
  name: "Volunteer Team Lead",
};

export function useTransportationDispatchState() {
  const [requests, setRequests] = useState<TransportCapabilityRequest[]>([]);
  const [messages, setMessages] = useState<DispatchChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [actingAs, setActingAs] = useState<DispatchSenderRole>("ASSET_OWNER");

  const refresh = useCallback(async () => {
    const result = await fetchTransportDispatchSnapshot();
    if (result.ok) {
      setRequests(result.data.requests);
      setMessages(result.data.messages);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const activeRequest = useMemo(
    () => requests.find((request) => request.requestId === activeRequestId) ?? null,
    [activeRequestId, requests],
  );

  const activeThread = useMemo(
    () =>
      messages
        .filter((message) => message.requestId === activeRequestId)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [activeRequestId, messages],
  );

  const openRequestCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "OPEN" || request.status === "IN_NEGOTIATION",
      ).length,
    [requests],
  );

  const openChat = useCallback((requestId: string) => {
    setActiveRequestId(requestId);
  }, []);

  const closeChat = useCallback(() => {
    setActiveRequestId(null);
  }, []);

  const senderIdentity = useCallback(
    (role: DispatchSenderRole, request: TransportCapabilityRequest) => {
      if (role === "REQUESTOR") {
        return { id: request.requestorId, name: request.requestorName };
      }
      if (role === "VOLUNTEER_LEAD") return VOLUNTEER_LEAD_IDENTITY;
      return ASSET_OWNER_IDENTITY;
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeRequestId || !text.trim() || !activeRequest) return false;
      const sender = senderIdentity(actingAs, activeRequest);
      const result = await sendTransportChatMessage({
        requestId: activeRequestId,
        messageText: text.trim(),
        senderId: sender.id,
        senderName: sender.name,
        senderRole: actingAs,
      });
      if (!result.ok) return false;
      await refresh();
      return true;
    },
    [actingAs, activeRequest, activeRequestId, refresh, senderIdentity],
  );

  const submitAssetOffer = useCallback(
    async (offer: AssetOfferDetails) => {
      if (!activeRequestId || !activeRequest) return false;
      const role: DispatchSenderRole =
        activeRequest.modalityType === "VOLUNTEER_FORCE" ||
        offer.isVolunteerService
          ? "VOLUNTEER_LEAD"
          : "ASSET_OWNER";
      const sender = senderIdentity(role, activeRequest);

      const result = await dispatchTransportAsset({
        requestId: activeRequestId,
        registrationOrCallsign: offer.registrationOrCallsign,
        operatorOrTeamLeadName: offer.operatorOrTeamLeadName,
        operatorOrDriverPhone: offer.operatorOrDriverPhone,
        assetCapacity: offer.assetCapacity,
        proposedRateINR: offer.proposedRateINR,
        isVolunteerService: offer.isVolunteerService,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: role,
      });

      if (!result.ok) return false;
      setActingAs(role);
      await refresh();
      return true;
    },
    [activeRequest, activeRequestId, refresh, senderIdentity],
  );

  const acceptOffer = useCallback(
    async (messageId: string) => {
      if (!activeRequestId || !activeRequest) return false;

      const result = await authorizeTransportDispatch({
        requestId: activeRequestId,
        messageId,
        requestorId: activeRequest.requestorId,
        requestorName: activeRequest.requestorName,
      });

      if (!result.ok) return false;
      await refresh();
      return true;
    },
    [activeRequest, activeRequestId, refresh],
  );

  return {
    loading,
    requests,
    openRequestCount,
    activeRequestId,
    activeRequest,
    activeThread,
    actingAs,
    setActingAs,
    openChat,
    closeChat,
    sendMessage,
    submitAssetOffer,
    acceptOffer,
    refresh,
  };
}
