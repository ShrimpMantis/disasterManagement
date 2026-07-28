"use client";

import { useEffect, useState } from "react";
import { SOS_SLA_BREACH_MINUTES } from "@/types/sos";

export function getElapsedMinutes(isoTimestamp: string, nowMs = Date.now()): number {
  const created = Date.parse(isoTimestamp);
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((nowMs - created) / 60_000));
}

export function formatElapsedLabel(elapsedMinutes: number): string {
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isSlaBreached(elapsedMinutes: number): boolean {
  return elapsedMinutes >= SOS_SLA_BREACH_MINUTES;
}

/**
 * Live SLA ticker — refreshes every 30s so "minutes ago" / overdue badges stay current.
 */
export function useElapsedTime(isoTimestamp: string, tickMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const elapsedMinutes = getElapsedMinutes(isoTimestamp, now);
  return {
    elapsedMinutes,
    label: formatElapsedLabel(elapsedMinutes),
    overdue: isSlaBreached(elapsedMinutes),
  };
}

/** Shared clock for sorting a list without one timer per card. */
export function useSharedElapsedClock(tickMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}
