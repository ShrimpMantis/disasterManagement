"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Warehouse, XCircle } from "lucide-react";
import type { NGOPledgeSubmission } from "@/types/pledgeIntake";
import { ADMIN_APPROVAL_LABELS, getCustomItems } from "@/types/pledgeIntake";
import type { VillageLookup } from "@/types/ticket";

type CustomOffersApprovalQueueProps = {
  offers: NGOPledgeSubmission[];
  villages: VillageLookup[];
  districtPoolCount: number;
  onAcceptToVillage: (pledgeId: string, villageId?: string) => Promise<boolean>;
  onAcceptToWarehouse: (pledgeId: string) => Promise<boolean>;
  onDecline: (pledgeId: string, reason: string) => Promise<boolean>;
};

export function CustomOffersApprovalQueue({
  offers,
  villages,
  districtPoolCount,
  onAcceptToVillage,
  onAcceptToWarehouse,
  onDecline,
}: CustomOffersApprovalQueueProps) {
  const [villageByOffer, setVillageByOffer] = useState<Record<string, string>>({});
  const [declineReasonByOffer, setDeclineReasonByOffer] = useState<Record<string, string>>(
    {},
  );

  const sortedOffers = useMemo(
    () =>
      [...offers].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [offers],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Unlisted offers queue
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
            District officer review
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Accept spontaneous NGO offers to a village ticket or central warehouse, or decline
            with feedback.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm">
          <span className="text-[var(--ink-muted)]">Central pool SKUs: </span>
          <span className="font-semibold text-[var(--ink)]">{districtPoolCount}</span>
        </div>
      </div>

      {sortedOffers.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          No unlisted offers pending review.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedOffers.map((offer) => {
            const customs = getCustomItems(offer);
            const preferredVillage =
              villageByOffer[offer.id] ||
              offer.targetVillageId ||
              villages.find((village) => village.name === offer.targetVillageName)?.id ||
              "";

            return (
              <article
                key={offer.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {offer.id} · {ADMIN_APPROVAL_LABELS[offer.adminApprovalStatus]}
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                      {offer.ngoName}
                    </h3>
                    <p className="text-sm text-[var(--ink-muted)]">
                      Target:{" "}
                      {offer.targetVillageName
                        ? `${offer.targetVillageName} (village)`
                        : `${offer.targetDistrict ?? "District"} central pool`}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      ETA {new Date(offer.estimatedDeliveryDate).toLocaleString()} · Hub{" "}
                      {offer.dispatchHubOrLocation || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs font-semibold text-[#9a3412]">
                    {customs.length} custom item{customs.length === 1 ? "" : "s"}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {customs.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-[var(--line)]"
                    >
                      <p className="font-medium text-[var(--ink)]">
                        {item.itemName} · {item.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {item.category}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
                  <select
                    value={preferredVillage}
                    onChange={(event) =>
                      setVillageByOffer((prev) => ({
                        ...prev,
                        [offer.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select village for assignment…</option>
                    {villages.map((village) => (
                      <option key={village.id} value={village.id}>
                        {village.name} ({village.district})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      void onAcceptToVillage(offer.id, preferredVillage || undefined);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Accept & Assign to Village
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void onAcceptToWarehouse(offer.id);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
                  >
                    <Warehouse className="h-4 w-4" aria-hidden />
                    Accept to Central Warehouse
                  </button>
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={declineReasonByOffer[offer.id] ?? ""}
                    onChange={(event) =>
                      setDeclineReasonByOffer((prev) => ({
                        ...prev,
                        [offer.id]: event.target.value,
                      }))
                    }
                    placeholder='Decline reason (e.g., "Food items past expiration")'
                    className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void onDecline(offer.id, declineReasonByOffer[offer.id] ?? "");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-semibold text-[#b91c1c]"
                  >
                    <XCircle className="h-4 w-4" aria-hidden />
                    Decline
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
