"use client";

import { useMemo, useState } from "react";
import { useSharedElapsedClock } from "@/hooks/useElapsedTime";
import { ActivityEventCard } from "@/components/activity/ActivityEventCard";
import type {
  ActivityEvent,
  ActivityFeedFilter,
} from "@/types/activityEvent";

type ActivityFeedProps = {
  events: ActivityEvent[];
  highlightedEventId: string | null;
  currentUserId?: string;
  canUpvote: boolean;
  onUpvote: (eventId: string) => void;
  upvoteBusyId?: string | null;
};

const FILTERS: { id: ActivityFeedFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
];

export function ActivityFeed({
  events,
  highlightedEventId,
  currentUserId,
  canUpvote,
  onUpvote,
  upvoteBusyId = null,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFeedFilter>("ALL");
  const nowMs = useSharedElapsedClock(30_000);

  const filtered = useMemo(() => {
    if (filter === "ALL") return events;
    return events.filter((event) => event.status === filter);
  }, [events, filter]);

  return (
    <section aria-label="Task activity feed">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-4">
        {FILTERS.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-[var(--ink-muted)]">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-sm text-[var(--ink-muted)]">
          No system activity in this filter yet. Events appear automatically when
          pledges, dispatches, and deliveries are recorded.
        </p>
      ) : (
        <div>
          {filtered.map((event) => (
            <ActivityEventCard
              key={event.id}
              event={event}
              nowMs={nowMs}
              currentUserId={currentUserId}
              canUpvote={canUpvote}
              busy={upvoteBusyId === event.id}
              highlighted={highlightedEventId === event.id}
              onUpvote={onUpvote}
            />
          ))}
        </div>
      )}
    </section>
  );
}
