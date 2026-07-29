"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ActivityEvent } from "@/types/activityEvent";
import {
  ACTIVITY_EVENT_FEED_LIMIT,
  ACTIVITY_EVENT_STATUS_LABELS,
} from "@/types/activityEvent";

type ActivityTickerProps = {
  events: ActivityEvent[];
  onSelectEvent: (eventId: string) => void;
};

function tickerPrefix(event: ActivityEvent): string {
  if (event.heroAccolade === "GOATED_SQUAD") return "👑";
  if (event.heroAccolade === "GIGA_IMPACT") return "💥";
  if (event.heroAccolade === "ABSOLUTE_CLUTCH") return "⚡";
  if (
    event.heroAccolade === "MISSION_CLEARED" ||
    event.milestoneType === "GOAL_100_PERCENT"
  ) {
    return "🏁";
  }
  if (event.isMilestone) {
    if (event.milestoneType === "RAPID_RESPONSE") return "⚡";
    return "🎉";
  }
  return event.status === "IN_PROGRESS" ? "🟢" : "🔵";
}

export function ActivityTicker({ events, onSelectEvent }: ActivityTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const recent = useMemo(
    () => events.slice(0, ACTIVITY_EVENT_FEED_LIMIT),
    [events],
  );
  const trackKey = useMemo(
    () => recent.map((event) => event.id).join("|"),
    [recent],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || recent.length === 0) return;

    let frame = 0;
    let offset = 0;
    const speed = 0.4;

    const tick = () => {
      offset += speed;
      const half = track.scrollWidth / 2;
      if (half > 0 && offset >= half) offset = 0;
      track.style.transform = `translateX(-${offset}px)`;
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [recent.length, trackKey]);

  if (recent.length === 0) {
    return (
      <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(255,255,255,0.92)] px-4 py-2.5 backdrop-blur-md">
        <p className="text-sm text-[var(--ink-muted)]">
          Waiting for live operational updates…
        </p>
      </div>
    );
  }

  const items = [...recent, ...recent];

  return (
    <div
      className="sticky top-0 z-30 overflow-hidden border-b border-[var(--line)] bg-[rgba(255,255,255,0.92)] backdrop-blur-md"
      role="region"
      aria-label="Live activity ticker"
    >
      <div className="flex items-center gap-3 px-2 py-2.5 sm:px-3">
        <span className="shrink-0 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Live
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max items-center gap-6 will-change-transform"
          >
            {items.map((event, index) => (
              <button
                key={`${event.id}-${index}`}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm transition ${
                  event.isMilestone
                    ? "rounded-md border border-amber-400/80 bg-amber-50/90 px-2 py-1 text-[#92400e] hover:border-amber-500"
                    : "text-[var(--ink)] hover:text-[var(--accent-strong)]"
                }`}
              >
                <span aria-hidden>{tickerPrefix(event)}</span>
                <span className="font-semibold">
                  [{ACTIVITY_EVENT_STATUS_LABELS[event.status].toUpperCase()}]
                </span>
                {event.badgeLabel ? (
                  <span className="font-medium">{event.badgeLabel}</span>
                ) : null}
                <span>{event.title}</span>
                {event.impactQuantity != null && event.impactUnit ? (
                  <span
                    className={
                      event.isMilestone
                        ? "font-semibold text-[#b45309]"
                        : "font-semibold text-[var(--accent-strong)]"
                    }
                  >
                    ({event.impactQuantity} {event.impactUnit})
                  </span>
                ) : null}
                <span className="text-[var(--ink-muted)]">•</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
