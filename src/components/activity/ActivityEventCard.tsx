"use client";

import { MapPin, ThumbsUp } from "lucide-react";
import {
  formatElapsedLabel,
  getElapsedMinutes,
} from "@/hooks/useElapsedTime";
import { HeroAccoladeBanner } from "@/components/activity/HeroAccoladeBanner";
import type { ActivityEvent } from "@/types/activityEvent";
import {
  ACTIVITY_EVENT_CATEGORY_LABELS,
  ACTIVITY_EVENT_STATUS_DETAIL,
  ACTIVITY_EVENT_STATUS_LABELS,
} from "@/types/activityEvent";
import { getHeroAccoladeDefinition } from "@/lib/activity/heroAccolades";

type ActivityEventCardProps = {
  event: ActivityEvent;
  nowMs: number;
  currentUserId?: string;
  canUpvote: boolean;
  busy?: boolean;
  highlighted?: boolean;
  onUpvote: (eventId: string) => void;
};

const STATUS_BADGE_CLASS: Record<ActivityEvent["status"], string> = {
  IN_PROGRESS: "bg-[#fef9c3] text-[#854d0e]",
  COMPLETED: "bg-[#dcfce7] text-[#166534]",
};

const STATUS_DOT: Record<ActivityEvent["status"], string> = {
  IN_PROGRESS: "🟡",
  COMPLETED: "🟢",
};

function isHeroGoalEvent(event: ActivityEvent): boolean {
  if (event.status !== "COMPLETED") return false;
  if (event.heroAccolade) return true;
  if (event.milestoneType === "GOAL_100_PERCENT") return true;
  return event.progressPercent === 100;
}

function milestoneIcon(event: ActivityEvent): string {
  const hero = getHeroAccoladeDefinition(event.heroAccolade);
  if (hero) {
    if (hero.kind === "GOATED_SQUAD") return "👑";
    if (hero.kind === "GIGA_IMPACT") return "💥";
    if (hero.kind === "ABSOLUTE_CLUTCH") return "⚡";
    return "🏁";
  }
  if (event.milestoneType === "GOAL_100_PERCENT") return "🏁";
  if (event.milestoneType === "RAPID_RESPONSE") return "⚡";
  if (event.milestoneType === "ENTITY_THRESHOLD") return "⭐";
  return "🎉";
}

export function ActivityEventCard({
  event,
  nowMs,
  currentUserId,
  canUpvote,
  busy = false,
  highlighted = false,
  onUpvote,
}: ActivityEventCardProps) {
  const hasUpvoted =
    Boolean(currentUserId) && event.upvotedBy.includes(currentUserId!);
  const elapsed = formatElapsedLabel(getElapsedMinutes(event.createdAt, nowMs));
  const showHero = isHeroGoalEvent(event);

  return (
    <article
      id={`activity-event-${event.id}`}
      className={`scroll-mt-28 border-b py-5 transition ${
        showHero
          ? "border-l-4 border-l-emerald-500 border-b-[var(--line)] bg-emerald-50/30 pl-4"
          : event.isMilestone
            ? "border-l-4 border-l-amber-400 border-b-[var(--line)] bg-amber-50/40 pl-4"
            : "border-[var(--line)]"
      } ${highlighted ? "bg-[var(--accent-soft)]/60" : ""}`}
    >
      {showHero ? <HeroAccoladeBanner event={event} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[event.status]}`}
        >
          <span aria-hidden>{STATUS_DOT[event.status]}</span>
          {ACTIVITY_EVENT_STATUS_LABELS[event.status]}
        </span>
        <span className="text-xs text-[var(--ink-muted)]">
          {ACTIVITY_EVENT_STATUS_DETAIL[event.status]}
        </span>
        {event.badgeLabel && !showHero ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100/80 px-2 py-1 text-xs font-semibold text-[#92400e]">
            <span aria-hidden>{milestoneIcon(event)}</span>
            {event.badgeLabel}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-[var(--ink-muted)]">{elapsed}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)]">
          {event.isMilestone && !showHero ? (
            <span aria-hidden className="mr-1.5">
              {milestoneIcon(event)}
            </span>
          ) : null}
          {event.title}
        </h3>
        <span className="mt-1 inline-flex rounded-md border border-[var(--line)] bg-white/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          {ACTIVITY_EVENT_CATEGORY_LABELS[event.category]}
        </span>
      </div>

      {event.impactQuantity != null && event.impactUnit && !showHero ? (
        <p className="mt-2 text-sm font-semibold text-[#b45309]">
          Impact: {event.impactQuantity} {event.impactUnit}
        </p>
      ) : null}

      <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--ink-muted)]">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {event.locationName}
      </p>

      {event.description ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--ink)]">
          {event.description}
        </p>
      ) : null}

      {event.proofImageUrl ? (
        <div className="mt-4 aspect-[16/9] max-w-lg overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- proof URLs may be arbitrary storage hosts */}
          <img
            src={event.proofImageUrl}
            alt={`Proof for ${event.title}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {canUpvote ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => onUpvote(event.id)}
            aria-pressed={hasUpvoted}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              hasUpvoted
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            } disabled:opacity-60`}
          >
            <ThumbsUp
              className={`h-4 w-4 ${hasUpvoted ? "fill-current" : ""}`}
              aria-hidden
            />
            {hasUpvoted ? "Confirmed" : "Confirm / Upvote"} ({event.upvoteCount})
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-[var(--ink-muted)]">
          {event.upvoteCount} community confirmation
          {event.upvoteCount === 1 ? "" : "s"}
        </p>
      )}
    </article>
  );
}
