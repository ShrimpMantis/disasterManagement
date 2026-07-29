"use client";

import type { TicketVerificationStatus } from "@/types/ticket";
import {
  COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD,
  TICKET_VERIFICATION_STATUS_LABELS,
} from "@/types/ticket";

type TicketVerificationBadgeProps = {
  status?: TicketVerificationStatus | null;
  upvoteCount?: number | null;
  className?: string;
};

function resolveDisplayStatus(
  status: TicketVerificationStatus | null | undefined,
  upvoteCount: number,
): TicketVerificationStatus {
  // Legacy tickets without verification fields were agency-created.
  if (!status) {
    return upvoteCount > 0 && upvoteCount < COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD
      ? "CROWD_REPORTED"
      : upvoteCount >= COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD
        ? "COMMUNITY_CONFIRMED"
        : "OFFICIALLY_VERIFIED";
  }
  if (status === "OFFICIALLY_VERIFIED") return "OFFICIALLY_VERIFIED";
  if (
    status === "COMMUNITY_CONFIRMED" ||
    upvoteCount >= COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD
  ) {
    return "COMMUNITY_CONFIRMED";
  }
  return status;
}

const BADGE_STYLE: Record<TicketVerificationStatus, string> = {
  CROWD_REPORTED: "border-[#fde68a] bg-[#fffbeb] text-[#854d0e]",
  COMMUNITY_CONFIRMED: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]",
  OFFICIALLY_VERIFIED: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
};

const BADGE_ICON: Record<TicketVerificationStatus, string> = {
  CROWD_REPORTED: "🟡",
  COMMUNITY_CONFIRMED: "🔵",
  OFFICIALLY_VERIFIED: "🟢",
};

export function TicketVerificationBadge({
  status,
  upvoteCount = 0,
  className = "",
}: TicketVerificationBadgeProps) {
  const count = Math.max(0, upvoteCount ?? 0);
  const resolved = resolveDisplayStatus(status, count);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${BADGE_STYLE[resolved]} ${className}`}
      title={
        resolved === "OFFICIALLY_VERIFIED"
          ? "Admin / agency verified"
          : `${count} community confirmation${count === 1 ? "" : "s"}`
      }
    >
      <span aria-hidden>{BADGE_ICON[resolved]}</span>
      {TICKET_VERIFICATION_STATUS_LABELS[resolved]}
      {resolved !== "OFFICIALLY_VERIFIED" ? (
        <span className="font-medium opacity-80">({count})</span>
      ) : null}
    </span>
  );
}
