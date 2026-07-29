"use client";

import { useCallback, useMemo, useState } from "react";
import { ClipboardCheck, HandHeart, PackageCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { useNGOPledgePortalState } from "@/hooks/useNGOPledgePortalState";
import { useOperationalMode } from "@/hooks/useOperationalMode";
import { CustomOffersApprovalQueue } from "@/components/ngoPortal/CustomOffersApprovalQueue";
import { NGODashboard } from "@/components/ngoPortal/NGODashboard";
import { PledgeSubmissionModal } from "@/components/ngoPortal/PledgeSubmissionModal";
import { UnmetNeedsMarketplace } from "@/components/ngoPortal/UnmetNeedsMarketplace";
import { ReportNeedModal } from "@/components/tickets/ReportNeedModal";

type PortalTab = "marketplace" | "my-pledges" | "unlisted-offers";

export function NGOSelfServicePortal() {
  const { user } = useAuth();
  const portal = useNGOPledgePortalState();
  const {
    isAdminSourcedMode,
    canIndividualPledge,
    canOperationalWrite,
    isAdmin,
  } = useOperationalMode();
  const [tab, setTab] = useState<PortalTab>("marketplace");
  const [pledgeTicketId, setPledgeTicketId] = useState<string | null>(null);
  const [reportNeedOpen, setReportNeedOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const requireAuth = useCallback((message: string) => {
    setAuthPrompt({ open: true, message });
  }, []);

  const selectedTicket = useMemo(
    () =>
      portal.marketplaceTickets.find((ticket) => ticket.id === pledgeTicketId) ??
      null,
    [pledgeTicketId, portal.marketplaceTickets],
  );

  const pendingCount = portal.pendingCustomOffers.length;
  const identity = portal.portalIdentity;
  const isVerifiedNonprofit = identity?.kind === "NON_PROFIT";
  const canPledge = canIndividualPledge || isVerifiedNonprofit;
  const actorLabel =
    identity?.displayName ||
    portal.individualActorName ||
    portal.activeNgo?.name ||
    "Pledger";

  function handleReportNeed() {
    if (!canOperationalWrite) return;
    if (!user) {
      requireAuth(
        "Sign in with phone/OTP to report an urgent need to the demand queue.",
      );
      return;
    }
    setReportNeedOpen(true);
  }

  if (!portal.profileReady) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--ink-muted)] shadow-[var(--shadow)]">
        Loading your pledge identity…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {identity?.roleLabel ?? "Pledging as volunteer"}
          </p>
          <p className="mt-1 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)]">
            {actorLabel}
          </p>
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
          onPledge={canPledge ? setPledgeTicketId : () => undefined}
          canPledge={canPledge}
          pledgeRestrictedMessage={
            isAdminSourcedMode
              ? "Admin-sourced mode: pledging is locked to verified non-profit partners."
              : undefined
          }
          canReportNeed={canOperationalWrite}
          onReportNeed={handleReportNeed}
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
        open={Boolean(selectedTicket) && canPledge}
        ticket={selectedTicket}
        ngoName={actorLabel}
        availableManpowerCapacity={
          portal.activeCapabilityProfile?.netAvailableManpower ?? 0
        }
        onClose={() => setPledgeTicketId(null)}
        onSubmit={(payload) => portal.submitPledge(payload)}
      />

      {user ? (
        <ReportNeedModal
          open={reportNeedOpen}
          villages={portal.villages}
          isAdmin={isAdmin}
          userId={user.uid}
          userDisplayName={
            portal.individualActorName ||
            user.displayName ||
            user.phoneNumber ||
            "Field reporter"
          }
          userType={portal.userProfile?.userType}
          onClose={() => setReportNeedOpen(false)}
          onCreated={(ticket) => {
            portal.setFlashMessage(
              `${ticket.id} reported — marked ${ticket.verificationStatus ?? "CROWD_REPORTED"}.`,
            );
            portal.setErrorMessage("");
            void portal.refreshPortal();
          }}
        />
      ) : null}

      <AuthPromptModal
        open={authPrompt.open}
        message={authPrompt.message}
        returnTo="/ngo-portal"
        onClose={() => setAuthPrompt({ open: false, message: "" })}
      />
    </div>
  );
}
