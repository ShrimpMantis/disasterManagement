"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityEvent } from "@/types/activityEvent";
import {
  formatHeroImpactLine,
  getHeroAccoladeDefinition,
  type HeroAccoladeDefinition,
} from "@/lib/activity/heroAccolades";

type HeroAccoladeBannerProps = {
  event: ActivityEvent;
};

const BANNER_CLASS: Record<HeroAccoladeDefinition["visual"], string> = {
  emerald:
    "border-emerald-400/60 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.28)]",
  amber:
    "border-amber-400/70 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 text-white shadow-[0_8px_24px_rgba(245,158,11,0.32)]",
  indigo:
    "border-indigo-300/70 bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.3)]",
  gold:
    "border-amber-300 bg-gradient-to-r from-[#8a6a12] via-[#c9a227] to-[#f0d56a] text-[#1f1605] shadow-[0_8px_24px_rgba(201,162,39,0.35)] ring-1 ring-amber-200/80",
};

const BADGE_CHIP_CLASS: Record<HeroAccoladeDefinition["visual"], string> = {
  emerald: "bg-white/18 text-white ring-1 ring-white/35",
  amber: "bg-white/20 text-white ring-1 ring-white/40",
  indigo: "bg-white/18 text-white ring-1 ring-white/35",
  gold: "bg-[#1f1605]/15 text-[#1f1605] ring-1 ring-[#1f1605]/25",
};

/** Inline SVG vector mark — no external images or meme assets. */
function AccoladeMark({ visual }: { visual: HeroAccoladeDefinition["visual"] }) {
  if (visual === "gold") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M5 4h4l1.5 3H5V4zm10 0h4v3h-5.5L15 4zM4 9h16l-1.2 2.4c-.5 1-1.5 1.6-2.6 1.6H7.8c-1.1 0-2.1-.6-2.6-1.6L4 9zm4.2 6h7.6l.7 5H7.5l.7-5z"
        />
      </svg>
    );
  }
  if (visual === "amber") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M13 2s1.5 3.2.4 5.4C12.2 9.4 10 10.2 10 13c0 2.2 1.6 4 3.5 4S17 15.2 17 13c0-2.4-1.4-3.9-2.2-5.2C13.8 6.2 13 4.6 13 2zM8.5 11c-.8 1.4-1.5 2.8-1.5 4.5C7 18.5 9 21 12 21c-3.2-1.2-4.5-3.6-3.5-10z"
        />
      </svg>
    );
  }
  if (visual === "indigo") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2l1.8 5.5L19.5 9l-4.4 3.5L16.5 18 12 15.2 7.5 18l1.4-5.5L4.5 9l5.7-1.5L12 2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3zm-7 14h14v2H5v-2z"
      />
    </svg>
  );
}

/**
 * High-energy celebration banner for 100% completed goals.
 * CSS gradients + inline SVG only — never loads meme images or GIFs.
 */
export function HeroAccoladeBanner({ event }: HeroAccoladeBannerProps) {
  const [burst, setBurst] = useState(false);
  const triggered = useRef(false);

  const definition =
    getHeroAccoladeDefinition(event.heroAccolade) ??
    (event.status === "COMPLETED" &&
    (event.progressPercent === 100 ||
      event.milestoneType === "GOAL_100_PERCENT")
      ? getHeroAccoladeDefinition("MISSION_CLEARED")
      : null);

  useEffect(() => {
    if (!definition || triggered.current) return;
    triggered.current = true;
    const start = window.setTimeout(() => setBurst(true), 40);
    const stop = window.setTimeout(() => setBurst(false), 1100);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [definition]);

  if (!definition) return null;
  if (event.status !== "COMPLETED") return null;
  if (
    event.progressPercent != null &&
    event.progressPercent < 100 &&
    event.milestoneType !== "GOAL_100_PERCENT"
  ) {
    return null;
  }

  const impactLine = formatHeroImpactLine({
    locationName: event.locationName,
    impactQuantity: event.impactQuantity,
    impactUnit: event.impactUnit,
  });

  return (
    <div
      className={`hero-accolade-banner relative mb-4 overflow-hidden rounded-xl border px-3 py-3 sm:px-4 ${BANNER_CLASS[definition.visual]}`}
      role="status"
      aria-label={`${definition.badgeText}. ${definition.subtext}`}
    >
      {burst ? (
        <div className="hero-confetti pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className={`hero-confetti-bit bit-${index + 1}`} />
          ))}
        </div>
      ) : null}

      <div className="relative flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] ${BADGE_CHIP_CLASS[definition.visual]}`}
        >
          <AccoladeMark visual={definition.visual} />
          {definition.badgeText}
        </span>
      </div>

      <p className="relative mt-2 font-[family-name:var(--font-fraunces)] text-lg font-bold leading-snug tracking-tight sm:text-xl">
        {impactLine}
      </p>
      <p className="relative mt-1 text-sm font-medium opacity-90">
        {definition.subtext}
      </p>
    </div>
  );
}
