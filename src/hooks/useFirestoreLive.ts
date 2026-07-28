"use client";

import { useEffect, useState } from "react";
import { ensureMultiTabOfflinePersistence } from "@/lib/firebase/firestore";
import { subscribeChatMessages } from "@/lib/firestore/chats";
import { subscribeEmergencyAssets } from "@/lib/firestore/emergencyAssets";
import { subscribeDistrictTickets } from "@/lib/firestore/tickets";
import type { ChatMessageDoc, EmergencyAssetDoc, TicketDoc } from "@/lib/firestore/schema";

/**
 * Bootstraps multi-tab IndexedDB persistence once on the client.
 * Mount near the authenticated app shell.
 */
export function useFirestoreOfflinePersistence(): { ready: boolean } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureMultiTabOfflinePersistence().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready };
}

/** Live ticket queue via onSnapshot — /districts/{districtId}/tickets */
export function useDistrictTicketsLive(district: string | null) {
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(district));

  useEffect(() => {
    if (!district) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeDistrictTickets(
      district,
      (next) => {
        setTickets(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [district]);

  return { tickets, loading, error };
}

/** Live dispatch chat via onSnapshot — /chats/{requestId}/messages */
export function useChatMessagesLive(requestId: string | null) {
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(requestId));

  useEffect(() => {
    if (!requestId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeChatMessages(
      requestId,
      (next) => {
        setMessages(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [requestId]);

  return { messages, loading, error };
}

/** Live map asset pins via onSnapshot — /emergencyAssets */
export function useEmergencyAssetsLive() {
  const [assets, setAssets] = useState<EmergencyAssetDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeEmergencyAssets(
      (next) => {
        setAssets(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { assets, loading, error };
}
