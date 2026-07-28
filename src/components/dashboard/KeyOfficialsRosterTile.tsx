"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, Phone, Shield, X } from "lucide-react";
import type { KeyOfficialContact, OfficialRole } from "@/types/dashboard";
import {
  OFFICIAL_ROLE_BADGE_CLASS,
  OFFICIAL_ROLE_LABELS,
} from "@/types/dashboard";

const DEFAULT_ALERT_SUMMARY =
  "District flood alert: rising water levels reported. Mobilize boats and open standby relief camps.";

type KeyOfficialsRosterTileProps = {
  officials: KeyOfficialContact[];
  alertSummary?: string;
  onBroadcastQueued?: (payload: {
    officialId: string;
    message: string;
  }) => void;
};

function RoleBadge({ role }: { role: OfficialRole }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${OFFICIAL_ROLE_BADGE_CLASS[role]}`}
    >
      {OFFICIAL_ROLE_LABELS[role]}
    </span>
  );
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function toSmsHref(phone: string, body: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

export function KeyOfficialsRosterTile({
  officials,
  alertSummary = DEFAULT_ALERT_SUMMARY,
  onBroadcastQueued,
}: KeyOfficialsRosterTileProps) {
  const [broadcastOfficial, setBroadcastOfficial] =
    useState<KeyOfficialContact | null>(null);
  const [message, setMessage] = useState(alertSummary);

  const sorted = useMemo(() => {
    const order: OfficialRole[] = [
      "DISTRICT_COLLECTOR",
      "EOC_IN_CHARGE",
      "SUPERINTENDENT_POLICE",
      "LOCAL_MLA",
      "CIRCLE_OFFICER",
    ];
    return [...officials].sort(
      (a, b) => order.indexOf(a.role) - order.indexOf(b.role),
    );
  }, [officials]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <header className="border-b border-[var(--line)] px-4 py-3">
        <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
          <Shield className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-[0.14em]">
            Governance roster
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
          Key officials
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          District Collector, MLAs, SP, Circle Officers, EOC leads
        </p>
      </header>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {sorted.map((official) => (
          <li
            key={official.id}
            className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--ink)]">
                  {official.name}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {official.designationTitle}
                </p>
              </div>
              <RoleBadge role={official.role} />
            </div>

            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              {official.district}
              {official.revenueCircle ? ` · ${official.revenueCircle}` : ""}
              {official.isAvailable24x7 ? " · 24×7" : ""}
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <a
                href={toTelHref(official.phone)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
              >
                <Phone className="h-3 w-3" aria-hidden />
                Call
              </a>
              <button
                type="button"
                onClick={() => {
                  setBroadcastOfficial(official);
                  setMessage(alertSummary);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)]"
              >
                <MessageSquareText className="h-3 w-3" aria-hidden />
                SMS / Broadcast
              </button>
            </div>
          </li>
        ))}
      </ul>

      {broadcastOfficial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Alert broadcast
                </p>
                <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                  {broadcastOfficial.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastOfficial(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={toSmsHref(broadcastOfficial.phone, message)}
                onClick={() => {
                  onBroadcastQueued?.({
                    officialId: broadcastOfficial.id,
                    message,
                  });
                  setBroadcastOfficial(null);
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
              >
                Open SMS app
              </a>
              <button
                type="button"
                onClick={() => {
                  onBroadcastQueued?.({
                    officialId: broadcastOfficial.id,
                    message,
                  });
                  setBroadcastOfficial(null);
                }}
                className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold"
              >
                Queue only
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
