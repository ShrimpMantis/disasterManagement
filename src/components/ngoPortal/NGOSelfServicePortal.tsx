"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, HandHeart, PackageCheck } from "lucide-react";
import { useNGOPledgePortalState } from "@/hooks/useNGOPledgePortalState";
import { CustomOffersApprovalQueue } from "@/components/ngoPortal/CustomOffersApprovalQueue";
import { NGODashboard } from "@/components/ngoPortal/NGODashboard";
import { PledgeSubmissionModal } from "@/components/ngoPortal/PledgeSubmissionModal";
import { UnmetNeedsMarketplace } from "@/components/ngoPortal/UnmetNeedsMarketplace";

type PortalTab = "marketplace" | "my-pledges" | "unlisted-offers";

export function NGOSelfServicePortal() {
  const portal = useNGOPledgePortalState();
  const [tab, setTab] = useState<PortalTab>("marketplace");
  const [pledgeTicketId, setPledgeTicketId] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () =>
      portal.marketplaceTickets.find((ticket) => ticket.id === pledgeTicketId) ?? null,
    [pledgeTicketId, portal.marketplaceTickets],
  );

  const pendingCount = portal.pendingCustomOffers.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Acting as verified NGO
          </p>
          <select
            value={portal.activeNgoId}
            onChange={(event) => portal.setActiveNgoId(event.target.value)}
            className="mt-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            {portal.ngos.map((ngo) => (
              <option key={ngo.id} value={ngo.id}>
                {ngo.name}
              </option>
            ))}
          </select>
        </div>

        <div
          role="tablist"
          className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-white/70 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "marketplace"}
            onClick={() => setTab("marketplace")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "marketplace"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <HandHeart className="h-4 w-4" aria-hidden />
            Unmet Needs Marketplace
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "my-pledges"}
            onClick={() => setTab("my-pledges")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "my-pledges"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <PackageCheck className="h-4 w-4" aria-hidden />
            My Pledges & Shipments
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "unlisted-offers"}
            onClick={() => setTab("unlisted-offers")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "unlisted-offers"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-muted)]"
            }`}
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Unlisted Offers Queue
            {pendingCount > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === "unlisted-offers"
                    ? "bg-white/20 text-white"
                    : "bg-[#fff7ed] text-[#9a3412]"
                }`}
              >
                {pendingCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {portal.errorMessage ? (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {portal.errorMessage}
        </div>
      ) : null}
      {portal.flashMessage ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {portal.flashMessage}
        </div>
      ) : null}

      {portal.activeCapabilityProfile ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Capability ledger
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Max Manpower
              </p>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {portal.activeCapabilityProfile.maxManpowerCapacity}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Committed
              </p>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {portal.activeCapabilityProfile.currentlyCommittedManpower}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Net Available
              </p>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {portal.activeCapabilityProfile.netAvailableManpower}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "marketplace" ? (
        <UnmetNeedsMarketplace
          tickets={portal.marketplaceTickets}
          onPledge={setPledgeTicketId}
        />
      ) : null}

      {tab === "my-pledges" ? (
        <NGODashboard
          pledges={portal.myPledges}
          onMarkInTransit={portal.markPledgeInTransit}
          onCompleteDelivery={portal.completePledgeDelivery}
        />
      ) : null}

      {tab === "unlisted-offers" ? (
        <CustomOffersApprovalQueue
          offers={portal.pendingCustomOffers}
          villages={portal.villages}
          districtPoolCount={portal.districtPool.length}
          onAcceptToVillage={portal.acceptCustomOfferToVillage}
          onAcceptToWarehouse={portal.acceptCustomOfferToWarehouse}
          onDecline={portal.declineCustomOffer}
        />
      ) : null}

      <PledgeSubmissionModal
        open={Boolean(selectedTicket)}
        ticket={selectedTicket}
        ngoName={portal.activeNgo?.name ?? "NGO"}
        availableManpowerCapacity={
          portal.activeCapabilityProfile?.netAvailableManpower ?? 0
        }
        onClose={() => setPledgeTicketId(null)}
        onSubmit={(payload) => portal.submitPledge(payload)}
      />
    </div>
  );
}
