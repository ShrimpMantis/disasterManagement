"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNgoPortalSnapshot } from "@/actions/pledgeActions";
import { recordActivityEvent, creditEntityContribution } from "@/actions/activityActions";
import {
  communityGoalBadgeLabel,
  communityGoalTitle,
  formatImpactDeliveryTitle,
  isRapidResponse,
  newlyFullyCoveredItems,
  primaryImpactUnit,
  resolveDeliveryMilestoneDecorations,
  sumPledgeImpactQuantity,
} from "@/lib/activity/milestones";
import {
  countTicketDonors,
  resolveHeroAccolade,
} from "@/lib/activity/heroAccolades";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  findRegistrationForUser,
  useRegistrationState,
} from "@/hooks/useRegistrationState";
import {
  subscribePledgesByOrganizationId,
  subscribePledgesByUserId,
  updatePledgeSubmission,
  upsertPledgeSubmission,
} from "@/lib/firestore/pledges";
import { ensureUserProfile } from "@/lib/firestore/users";
import { upsertDistrictTicket } from "@/lib/firestore/tickets";
import { isAdminSourcedMode } from "@/lib/features/operationalMode";
import {
  applyConfirmedPledgeToTicket,
  applyDeliveryProofToTicket,
  applyDispatchToTicket,
  attachCustomItemsToTicket,
  isMarketplaceTicket,
} from "@/lib/tickets/applyPledgeToTicket";
import { refreshTicketSla } from "@/lib/tickets/clusterVillageRequests";
import type { NGOProfile } from "@/types/ngo";
import type { OrganizationCapabilityProfile } from "@/types/pledgeManagement";
import type {
  DistrictPoolItem,
  NGOPledgeSubmission,
} from "@/types/pledgeIntake";
import { buildItemsPledged } from "@/types/pledgeIntake";
import type { ReliefTicket, VillageLookup } from "@/types/ticket";
import type { UserProfile } from "@/types/userProfile";
import type { PledgeSubmitPayload } from "@/components/ngoPortal/PledgeSubmissionModal";

const ACTIVE_NGO_STORAGE_KEY = "reliefnet-active-ngo-id";

export type PortalActorKind = "NON_PROFIT" | "VOLUNTEER" | "CITIZEN_GROUP";

export type PortalIdentity = {
  kind: PortalActorKind;
  roleLabel: string;
  displayName: string;
};

function deriveMaxManpowerCapacity(ngo: NGOProfile): number {
  const totalCapacity = ngo.capabilities.reduce(
    (sum, capability) => sum + capability.dailyCapacityUnits,
    0,
  );
  return Math.max(8, Math.round(totalCapacity / 200));
}

function buildNeedTitle(ticket: ReliefTicket): string {
  return `${ticket.villageName} unmet need (${ticket.id})`;
}

export function useNGOPledgePortalState() {
  const { user, loading: authLoading } = useAuth();
  const {
    volunteers,
    ngos: ngoRegistrations,
    citizenGroups,
    hydrated: registrationsHydrated,
  } = useRegistrationState();

  const [villages, setVillages] = useState<VillageLookup[]>([]);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [portalIdentity, setPortalIdentity] = useState<PortalIdentity | null>(
    null,
  );
  const [profileReady, setProfileReady] = useState(false);

  const [activeNgoId, setActiveNgoIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ACTIVE_NGO_STORAGE_KEY) || "";
  });

  const setActiveNgoId = useCallback((ngoId: string) => {
    setActiveNgoIdState(ngoId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_NGO_STORAGE_KEY, ngoId);
    }
  }, []);

  const [tickets, setTickets] = useState<ReliefTicket[]>([]);
  const [pledges, setPledges] = useState<NGOPledgeSubmission[]>([]);
  const [myLivePledges, setMyLivePledges] = useState<NGOPledgeSubmission[]>([]);
  const [myPledgesHydrated, setMyPledgesHydrated] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPortalSnapshot = useCallback(async () => {
    const result = await fetchNgoPortalSnapshot();
    if (!result.ok) return false;

    if (result.data.ngos.length > 0) {
      setNgos(result.data.ngos.filter((ngo) => ngo.status !== "INACTIVE"));
    }
    setVillages(result.data.villages);
    setPledges(result.data.pledges);
    setTickets(result.data.tickets.map((ticket) => refreshTicketSla(ticket)));
    return true;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPortalSnapshot();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPortalSnapshot]);

  // Resolve / persist Firestore user profile from auth + registration affiliation.
  useEffect(() => {
    if (authLoading || !registrationsHydrated) return;

    let cancelled = false;

    async function resolveProfile() {
      if (!user) {
        if (!cancelled) {
          setUserProfile(null);
          setProfileReady(true);
        }
        return;
      }

      const registration = findRegistrationForUser(
        volunteers,
        ngoRegistrations,
        {
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber,
        },
        citizenGroups,
      );

      let seed: Parameters<typeof ensureUserProfile>[1] = {};
      let identity: PortalIdentity = {
        kind: "VOLUNTEER",
        roleLabel: "Pledging as volunteer",
        displayName:
          user.displayName?.trim() || user.email?.trim() || "Volunteer",
      };

      if (registration?.kind === "ngo") {
        const reg = registration.record;
        const matchedNgo =
          ngos.find((entry) => entry.id === reg.ngoId) ||
          ngos.find(
            (entry) =>
              entry.name.trim().toLowerCase() ===
              reg.organizationLegalName.trim().toLowerCase(),
          );
        const organizationId = matchedNgo?.id ?? reg.ngoId;
        const organizationName =
          matchedNgo?.name ?? reg.organizationLegalName;
        seed = {
          userType: "NON_PROFIT",
          organizationId,
          organizationName,
        };
        identity = {
          kind: "NON_PROFIT",
          roleLabel: "Pledging as non-profit",
          displayName: organizationName,
        };
      } else if (registration?.kind === "volunteer") {
        const fullName = registration.record.fullName.trim();
        seed = { userType: "INDIVIDUAL", organizationId: null, organizationName: null };
        identity = {
          kind: "VOLUNTEER",
          roleLabel: "Pledging as volunteer",
          displayName:
            fullName ||
            user.displayName?.trim() ||
            user.email?.trim() ||
            "Volunteer",
        };
      } else if (registration?.kind === "citizenGroup") {
        const groupName = registration.record.groupName.trim();
        seed = { userType: "INDIVIDUAL", organizationId: null, organizationName: null };
        identity = {
          kind: "CITIZEN_GROUP",
          roleLabel: "Pledging as citizen group",
          displayName:
            groupName ||
            user.displayName?.trim() ||
            user.email?.trim() ||
            "Citizen group",
        };
      } else {
        seed = { userType: "INDIVIDUAL", organizationId: null, organizationName: null };
      }

      try {
        const profile = await ensureUserProfile(user, seed);
        if (!cancelled) {
          setUserProfile(profile);
          setPortalIdentity(
            profile.userType === "NON_PROFIT"
              ? {
                  kind: "NON_PROFIT",
                  roleLabel: "Pledging as non-profit",
                  displayName:
                    profile.organizationName ||
                    identity.displayName ||
                    "Affiliated non-profit",
                }
              : identity,
          );
          setProfileReady(true);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setUserProfile({
            uid: user.uid,
            userType: seed.userType ?? "INDIVIDUAL",
            phone: user.phoneNumber ?? null,
            organizationId: seed.organizationId ?? null,
            organizationName: seed.organizationName ?? null,
            displayName: user.displayName,
            email: user.email,
            status: "ACTIVE",
            role:
              seed.userType === "ADMIN"
                ? "ADMIN"
                : seed.userType === "NON_PROFIT"
                  ? "NON_PROFIT"
                  : "CITIZEN",
          });
          setPortalIdentity(identity);
          setProfileReady(true);
        }
      }
    }

    void resolveProfile();
    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    citizenGroups,
    ngoRegistrations,
    ngos,
    registrationsHydrated,
    user,
    volunteers,
  ]);

  // Identity is always locked to the signed-in user's affiliation — never a free NGO picker.
  const selectableNgos = useMemo(() => {
    if (userProfile?.userType === "NON_PROFIT" && userProfile.organizationId) {
      const matched = ngos.filter(
        (ngo) => ngo.id === userProfile.organizationId,
      );
      if (matched.length > 0) return matched;
      return [
        {
          id: userProfile.organizationId,
          name: userProfile.organizationName || "Affiliated non-profit",
          status: "ACTIVE" as const,
          primaryContact: {
            name: userProfile.displayName || "Org contact",
            phone: "",
            email: userProfile.email || "",
          },
          capabilities: [],
          assignedVillageIds: [],
        } satisfies NGOProfile,
      ];
    }
    return [];
  }, [ngos, userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    const nextId =
      userProfile.userType === "NON_PROFIT" && userProfile.organizationId
        ? userProfile.organizationId
        : "";

    if (activeNgoId === nextId) return;

    const id = window.setTimeout(() => {
      setActiveNgoId(nextId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeNgoId, setActiveNgoId, userProfile]);

  const activeNgo = useMemo(() => {
    if (userProfile?.userType !== "NON_PROFIT") return null;
    return (
      selectableNgos.find((ngo) => ngo.id === activeNgoId) ??
      selectableNgos[0] ??
      null
    );
  }, [activeNgoId, selectableNgos, userProfile?.userType]);

  const individualActorName = useMemo(() => {
    if (portalIdentity && portalIdentity.kind !== "NON_PROFIT") {
      return portalIdentity.displayName;
    }
    return (
      userProfile?.displayName?.trim() ||
      user?.displayName?.trim() ||
      user?.email?.trim() ||
      "Volunteer"
    );
  }, [portalIdentity, user, userProfile?.displayName]);

  // Real-time My Pledges listener scoped to auth user or affiliated org.
  useEffect(() => {
    if (!user || !userProfile) {
      const id = window.setTimeout(() => {
        setMyLivePledges([]);
        setMyPledgesHydrated(false);
      }, 0);
      return () => window.clearTimeout(id);
    }

    const hydrationTimeoutId = window.setTimeout(() => {
      setMyPledgesHydrated(false);
    }, 0);

    const onData = (next: NGOPledgeSubmission[]) => {
      setMyLivePledges(next);
      setMyPledgesHydrated(true);
    };

    const onError = (error: Error) => {
      console.error(error);
      setErrorMessage(error.message);
      setMyPledgesHydrated(true);
    };

    if (
      userProfile.userType === "NON_PROFIT" &&
      userProfile.organizationId
    ) {
      const unsubscribe = subscribePledgesByOrganizationId(
        userProfile.organizationId,
        onData,
        onError,
      );
      return () => {
        window.clearTimeout(hydrationTimeoutId);
        unsubscribe();
      };
    }

    const unsubscribe = subscribePledgesByUserId(user.uid, onData, onError);
    return () => {
      window.clearTimeout(hydrationTimeoutId);
      unsubscribe();
    };
  }, [user, userProfile]);

  const resolvedActiveNgoId = activeNgo?.id ?? "";

  const marketplaceTickets = useMemo(
    () => tickets.filter(isMarketplaceTicket),
    [tickets],
  );

  const myPledges = useMemo(() => {
    const byIdentity = (pledge: NGOPledgeSubmission) => {
      if (!user) return false;
      if (userProfile?.userType === "NON_PROFIT" && userProfile.organizationId) {
        return (
          pledge.organizationId === userProfile.organizationId ||
          pledge.ngoId === userProfile.organizationId
        );
      }
      return (
        pledge.userId === user.uid ||
        (!pledge.userId &&
          userProfile?.userType !== "INDIVIDUAL" &&
          pledge.ngoId === activeNgo?.id)
      );
    };

    if (!myPledgesHydrated) {
      return pledges.filter(byIdentity);
    }

    // Merge live query results with legacy docs that lack userId/organizationId.
    const liveIds = new Set(myLivePledges.map((pledge) => pledge.id));
    const legacyMatches = pledges.filter(
      (pledge) => byIdentity(pledge) && !liveIds.has(pledge.id),
    );
    return [...myLivePledges, ...legacyMatches].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }, [
    activeNgo?.id,
    myLivePledges,
    myPledgesHydrated,
    pledges,
    user,
    userProfile,
  ]);

  const capabilityProfiles = useMemo<OrganizationCapabilityProfile[]>(
    () =>
      selectableNgos.map((ngo) => {
        const activePledgeRows = pledges.filter(
          (pledge) =>
            pledge.ngoId === ngo.id &&
            pledge.status !== "FULFILLED" &&
            pledge.status !== "REJECTED",
        );
        const currentlyCommittedManpower = activePledgeRows.reduce(
          (sum, pledge) => sum + (pledge.pledgedManpowerCount ?? 0),
          0,
        );
        const maxManpowerCapacity = deriveMaxManpowerCapacity(ngo);
        return {
          entityId: ngo.id,
          entityName: ngo.name,
          entityType: "REGISTERED_NGO",
          maxManpowerCapacity,
          currentlyCommittedManpower,
          netAvailableManpower: Math.max(
            0,
            maxManpowerCapacity - currentlyCommittedManpower,
          ),
          activePledges: activePledgeRows.map((pledge) => ({
            pledgeId: pledge.id,
            ticketCode: pledge.ticketId ?? "District pool",
            districtName: pledge.targetDistrict ?? "Unknown District",
            totalFinancialValue: pledge.pledgedFinancialAmount ?? 0,
            committedManpowerCount: pledge.pledgedManpowerCount ?? 0,
            itemSummary: (pledge.ticketMatchedItems ?? [])
              .filter((item) => item.pledgedQuantity > 0)
              .map((item) => `${item.pledgedQuantity} ${item.itemName}`)
              .join(", "),
          })),
        };
      }),
    [pledges, selectableNgos],
  );

  const activeCapabilityProfile = useMemo(() => {
    if (userProfile?.userType === "INDIVIDUAL") {
      const currentlyCommittedManpower = myPledges
        .filter(
          (pledge) =>
            pledge.status !== "FULFILLED" && pledge.status !== "REJECTED",
        )
        .reduce((sum, pledge) => sum + (pledge.pledgedManpowerCount ?? 0), 0);
      const maxManpowerCapacity = 4;
      return {
        entityId: user?.uid ?? "individual",
        entityName: individualActorName,
        entityType: "INDIVIDUAL_VOLUNTEER" as const,
        maxManpowerCapacity,
        currentlyCommittedManpower,
        netAvailableManpower: Math.max(
          0,
          maxManpowerCapacity - currentlyCommittedManpower,
        ),
        activePledges: [],
      } satisfies OrganizationCapabilityProfile;
    }
    return (
      capabilityProfiles.find((profile) => profile.entityId === activeNgo?.id) ??
      null
    );
  }, [
    activeNgo?.id,
    capabilityProfiles,
    individualActorName,
    myPledges,
    user?.uid,
    userProfile?.userType,
  ]);

  const pendingCustomOffers = useMemo(
    () =>
      pledges.filter(
        (pledge) =>
          (pledge.customItems?.length ?? 0) > 0 &&
          pledge.adminApprovalStatus === "PENDING_REVIEW",
      ),
    [pledges],
  );

  const districtPool = useMemo<DistrictPoolItem[]>(
    () =>
      pledges.flatMap((pledge) => {
        if (
          pledge.adminApprovalStatus !== "APPROVED" ||
          pledge.ticketId ||
          !pledge.customItems?.length
        ) {
          return [];
        }

        const district = pledge.targetDistrict || "Unknown District";
        return pledge.customItems.map((item) => ({
          id: `pool-${pledge.id}-${item.id}`,
          pledgeId: pledge.id,
          ngoId: pledge.ngoId,
          ngoName: pledge.ngoName,
          district,
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
          acceptedAt: pledge.createdAt,
        }));
      }),
    [pledges],
  );

  const identityLocked = true;

  const submitPledge = useCallback(
    async (input: PledgeSubmitPayload) => {
      if (!user) {
        setErrorMessage("Sign in to submit a pledge.");
        return false;
      }

      const isIndividual = userProfile?.userType !== "NON_PROFIT";
      if (isAdminSourcedMode() && isIndividual) {
        setErrorMessage(
          "Admin-sourced mode: only verified non-profit partners can pledge.",
        );
        return false;
      }
      if (!isIndividual && !activeNgo) {
        setErrorMessage("Your non-profit affiliation is required before pledging.");
        return false;
      }

      const matched = input.ticketMatchedItems ?? [];
      const custom = input.customItems ?? [];
      const hasMatched = matched.some((item) => item.pledgedQuantity > 0);
      const hasCustom = custom.length > 0;

      if (!hasMatched && !hasCustom) {
        setErrorMessage("Pledge at least one ticket item or custom item.");
        return false;
      }
      if (
        (input.pledgedManpowerCount ?? 0) >
        (activeCapabilityProfile?.netAvailableManpower ?? 0)
      ) {
        setErrorMessage("Pledged manpower exceeds available active personnel.");
        return false;
      }

      const actorId = isIndividual
        ? `user-${user.uid}`
        : (activeNgo?.id as string);
      const actorName = isIndividual
        ? individualActorName
        : (activeNgo?.name as string);
      const entityType = isIndividual
        ? ("INDIVIDUAL_VOLUNTEER" as const)
        : ("REGISTERED_NGO" as const);
      const organizationId = isIndividual
        ? null
        : (userProfile?.organizationId ?? activeNgo?.id ?? null);

      const linkedTicket = input.ticketId
        ? tickets.find((entry) => entry.id === input.ticketId)
        : undefined;
      const needTitle = linkedTicket
        ? buildNeedTitle(linkedTicket)
        : input.targetVillageName
          ? `${input.targetVillageName} custom offer`
          : "District pool offer";

      const needsReview = hasCustom;
      const draft: NGOPledgeSubmission = {
        ...input,
        id: `pledge-${Date.now()}`,
        ngoId: actorId,
        ngoName: actorName,
        userId: user.uid,
        organizationId,
        needId: input.ticketId ?? linkedTicket?.id,
        needTitle,
        itemsPledged: buildItemsPledged(matched, custom),
        ticketMatchedItems: matched,
        customItems: custom,
        entityType,
        status: needsReview && !hasMatched ? "OFFERED" : "CONFIRMED",
        adminApprovalStatus: needsReview ? "PENDING_REVIEW" : "APPROVED",
        createdAt: new Date().toISOString(),
      };

      // Apply ticket-matched quantities immediately when present.
      if (hasMatched && input.ticketId) {
        const ticket = tickets.find((entry) => entry.id === input.ticketId);
        if (!ticket) {
          setErrorMessage("Ticket not found.");
          return false;
        }

        const result = applyConfirmedPledgeToTicket(ticket, {
          ngoId: draft.ngoId,
          ngoName: draft.ngoName,
          ticketMatchedItems: matched,
          estimatedDeliveryDate: draft.estimatedDeliveryDate,
        });
        if (!result.ok) {
          setErrorMessage(result.error);
          setFlashMessage("");
          return false;
        }

        const persistedTicket = refreshTicketSla(result.ticket);
        await Promise.all([
          upsertDistrictTicket(persistedTicket),
          upsertPledgeSubmission(draft),
        ]);

        const locationName =
          linkedTicket?.villageName?.trim() ||
          draft.targetVillageName?.trim() ||
          draft.targetDistrict?.trim() ||
          "Assam";
        const impactQuantity = sumPledgeImpactQuantity({
          ticketMatchedItems: matched,
          customItems: custom,
        });
        const impactUnit = primaryImpactUnit({
          ticketMatchedItems: matched,
          customItems: custom,
        });
        const itemSummary =
          matched.find((item) => item.pledgedQuantity > 0)?.itemName ||
          custom[0]?.itemName ||
          impactUnit;
        void recordActivityEvent({
          title:
            impactQuantity > 0
              ? `${impactQuantity} ${itemSummary} pledged for ${locationName}`
              : `${itemSummary} pledged for ${locationName}`,
          category: "WAREHOUSE_PLEDGE",
          status: "IN_PROGRESS",
          locationName,
          description: `Unmet need claimed via pledge ${draft.id} for ${locationName}.`,
          impactQuantity: impactQuantity > 0 ? impactQuantity : null,
          impactUnit,
        }).catch(() => undefined);

        // Community goal: marketplace need(s) newly covered to 100%.
        if (linkedTicket) {
          for (const covered of newlyFullyCoveredItems(
            linkedTicket,
            result.ticket,
          )) {
            const donorCount = Math.max(
              1,
              countTicketDonors(result.ticket),
            );
            const openedMs = Date.parse(linkedTicket.createdAt);
            const completionDurationMs = Number.isFinite(openedMs)
              ? Math.max(0, Date.now() - openedMs)
              : null;
            const hero = resolveHeroAccolade({
              progressPercent: 100,
              impactQuantity: covered.totalRequestedQuantity,
              donorCount,
              completionDurationMs,
            });
            void recordActivityEvent({
              title: communityGoalTitle(locationName, covered.itemName),
              category: "VILLAGE_NEED",
              status: "COMPLETED",
              locationName,
              description: `${covered.itemName} demand for ${locationName} is fully covered.`,
              isMilestone: true,
              milestoneType: "GOAL_100_PERCENT",
              badgeLabel: hero?.badgeText ?? communityGoalBadgeLabel(covered.itemName),
              impactQuantity: covered.totalRequestedQuantity,
              impactUnit: covered.unit || covered.itemName,
              progressPercent: 100,
              donorCount,
              completionDurationMs,
              heroAccolade: hero?.kind ?? "MISSION_CLEARED",
            }).catch(() => undefined);
          }
        }

        await loadPortalSnapshot();
        setFlashMessage(
          needsReview
            ? `${result.message} Custom items sent for district officer review.`
            : result.message,
        );
        setErrorMessage("");
        return true;
      }

      // Custom-only offer (village-attached or district pool) awaits admin review.
      await upsertPledgeSubmission(draft);
      await loadPortalSnapshot();
      setFlashMessage(
        input.targetVillageId
          ? "Custom village offer submitted for district officer review."
          : "Custom district-pool offer submitted for district officer review.",
      );
      setErrorMessage("");
      return true;
    },
    [
      activeCapabilityProfile?.netAvailableManpower,
      activeNgo,
      individualActorName,
      loadPortalSnapshot,
      tickets,
      user,
      userProfile?.organizationId,
      userProfile?.userType,
    ],
  );

  const acceptCustomOfferToVillage = useCallback(
    async (pledgeId: string, villageId?: string) => {
      const pledge = pledges.find((entry) => entry.id === pledgeId);
      if (!pledge || !pledge.customItems?.length) {
        setErrorMessage("Custom offer not found.");
        return false;
      }

      const ticket = villageId
        ? tickets.find((entry) => entry.villageId === villageId)
        : tickets.find((entry) => entry.id === pledge.ticketId) ||
          tickets.find((entry) => entry.villageId === pledge.targetVillageId);

      if (!ticket) {
        setErrorMessage("No matching village ticket found to attach this offer.");
        return false;
      }

      const updated = attachCustomItemsToTicket(
        ticket,
        pledge.customItems,
        { id: pledge.ngoId, name: pledge.ngoName },
      );
      const persistedTicket = refreshTicketSla(updated);

      await Promise.all([
        upsertDistrictTicket(persistedTicket),
        updatePledgeSubmission(pledgeId, {
          adminApprovalStatus: "APPROVED",
          status: "CONFIRMED",
          ticketId: ticket.id,
          needId: ticket.id,
          needTitle: buildNeedTitle(ticket),
          targetVillageId: ticket.villageId,
          targetVillageName: ticket.villageName,
        }),
      ]);

      const itemSummary = pledge.customItems?.[0]?.itemName || "Relief supplies";
      const qty = pledge.customItems?.[0]?.quantity;
      void recordActivityEvent({
        title:
          qty != null
            ? `${qty} ${itemSummary} pledged for ${ticket.villageName}`
            : `${itemSummary} pledged for ${ticket.villageName}`,
        category: "WAREHOUSE_PLEDGE",
        status: "IN_PROGRESS",
        locationName: ticket.villageName,
        description: `Custom offer ${pledgeId} accepted and assigned to ${ticket.villageName}.`,
      }).catch(() => undefined);

      await loadPortalSnapshot();
      setFlashMessage(
        `Accepted custom offer and assigned items to ${ticket.villageName} (${ticket.id}).`,
      );
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, pledges, tickets],
  );

  const acceptCustomOfferToWarehouse = useCallback(
    async (pledgeId: string) => {
      const pledge = pledges.find((entry) => entry.id === pledgeId);
      if (!pledge || !pledge.customItems?.length) {
        setErrorMessage("Custom offer not found.");
        return false;
      }

      const district = pledge.targetDistrict || "Unknown District";
      await updatePledgeSubmission(pledgeId, {
        adminApprovalStatus: "APPROVED",
        status: "CONFIRMED",
        targetVillageId: undefined,
        targetVillageName: undefined,
      });
      await loadPortalSnapshot();
      setFlashMessage(
        `Accepted ${pledge.customItems.length} custom item(s) into ${district} central warehouse pool.`,
      );
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, pledges],
  );

  const declineCustomOffer = useCallback(
    async (pledgeId: string, reason: string) => {
      const pledge = pledges.find((entry) => entry.id === pledgeId);
      if (!pledge) {
        setErrorMessage("Offer not found.");
        return false;
      }
      if (!reason.trim()) {
        setErrorMessage("Provide a decline reason.");
        return false;
      }

      await updatePledgeSubmission(pledgeId, {
        adminApprovalStatus: "REJECTED",
        status: "REJECTED",
        rejectionReason: reason.trim(),
      });
      await loadPortalSnapshot();
      setFlashMessage(`Declined offer ${pledgeId}.`);
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, pledges],
  );

  const markPledgeInTransit = useCallback(
    async (pledgeId: string, vehicleNumber: string, driverPhone: string) => {
      const pledge =
        myLivePledges.find((entry) => entry.id === pledgeId) ||
        pledges.find((entry) => entry.id === pledgeId);
      if (!pledge) {
        setErrorMessage("Pledge not found.");
        return false;
      }
      if (pledge.status !== "CONFIRMED" || pledge.adminApprovalStatus !== "APPROVED") {
        setErrorMessage("Only approved confirmed pledges can be marked in-transit.");
        return false;
      }
      if (!pledge.ticketId) {
        setErrorMessage("District-pool pledges must be assigned to a village ticket before dispatch.");
        return false;
      }

      const ticket = tickets.find((entry) => entry.id === pledge.ticketId);
      if (!ticket) {
        setErrorMessage("Linked ticket not found.");
        return false;
      }

      const result = applyDispatchToTicket(ticket, {
        ngoId: pledge.ngoId,
        vehicleNumber,
        driverPhone,
        estimatedArrival: pledge.estimatedDeliveryDate,
      });
      if (!result.ok) {
        setErrorMessage(result.error);
        return false;
      }

      const persistedTicket = refreshTicketSla(result.ticket);

      await Promise.all([
        upsertDistrictTicket(persistedTicket),
        updatePledgeSubmission(pledgeId, {
          status: "IN_TRANSIT",
          dispatchVehicleNumber: vehicleNumber,
          dispatchDriverPhone: driverPhone,
        }),
      ]);

      const locationName =
        pledge.targetVillageName?.trim() ||
        pledge.targetDistrict?.trim() ||
        "Assam";
      const impactQuantity = sumPledgeImpactQuantity({
        ticketMatchedItems: pledge.ticketMatchedItems,
        customItems: pledge.customItems,
        itemsPledged: pledge.itemsPledged,
      });
      const impactUnit = primaryImpactUnit({
        ticketMatchedItems: pledge.ticketMatchedItems,
        customItems: pledge.customItems,
      });
      const title =
        impactQuantity > 0
          ? `${impactQuantity} ${impactUnit} En Route to ${locationName}`
          : `${impactUnit} En Route to ${locationName}`;
      void recordActivityEvent({
        title,
        category: "WAREHOUSE_PLEDGE",
        status: "IN_PROGRESS",
        locationName,
        description: `Pledge ${pledgeId} dispatched via ${vehicleNumber} toward ${locationName}.`,
        impactQuantity: impactQuantity > 0 ? impactQuantity : null,
        impactUnit,
      }).catch(() => undefined);

      await loadPortalSnapshot();
      setFlashMessage(result.message);
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, myLivePledges, pledges, tickets],
  );

  const completePledgeDelivery = useCallback(
    async (
      pledgeId: string,
      proofOfDeliveryUrl: string,
      fieldConfirmationCode?: string,
    ) => {
      const pledge =
        myLivePledges.find((entry) => entry.id === pledgeId) ||
        pledges.find((entry) => entry.id === pledgeId);
      if (!pledge) {
        setErrorMessage("Pledge not found.");
        return false;
      }
      if (pledge.status !== "IN_TRANSIT" && pledge.status !== "CONFIRMED") {
        setErrorMessage("Pledge must be confirmed or in-transit to complete delivery.");
        return false;
      }
      if (!proofOfDeliveryUrl && !fieldConfirmationCode) {
        setErrorMessage("Provide a PoD photo URL or field confirmation code.");
        return false;
      }
      if (!pledge.ticketId) {
        setErrorMessage("No linked ticket for this pledge.");
        return false;
      }

      const ticket = tickets.find((entry) => entry.id === pledge.ticketId);
      if (!ticket) {
        setErrorMessage("Linked ticket not found.");
        return false;
      }

      const proof =
        proofOfDeliveryUrl ||
        `field-otp://${fieldConfirmationCode ?? "confirmed"}`;

      const result = applyDeliveryProofToTicket(ticket, proof);
      if (!result.ok) {
        setErrorMessage(result.error);
        return false;
      }

      const persistedTicket = refreshTicketSla(result.ticket);

      await Promise.all([
        upsertDistrictTicket(persistedTicket),
        updatePledgeSubmission(pledgeId, {
          status: "FULFILLED",
          proofOfDeliveryUrl: proof,
          fieldConfirmationCode,
        }),
      ]);

      const locationName =
        pledge.targetVillageName?.trim() ||
        pledge.targetDistrict?.trim() ||
        ticket.villageName?.trim() ||
        "Assam";
      const impactQuantity = sumPledgeImpactQuantity({
        ticketMatchedItems: pledge.ticketMatchedItems,
        customItems: pledge.customItems,
        itemsPledged: pledge.itemsPledged,
      });
      const impactUnit = primaryImpactUnit({
        ticketMatchedItems: pledge.ticketMatchedItems,
        customItems: pledge.customItems,
      });
      const entityName = pledge.ngoName?.trim() || "Relief partner";
      const quantity = impactQuantity > 0 ? impactQuantity : 1;

      const credit = await creditEntityContribution({
        userId: pledge.userId,
        organizationId: pledge.organizationId,
        units: quantity,
        unitLabel: impactUnit,
      });
      const crossedThresholds = credit.ok ? credit.data.crossedThresholds : [];
      const milestone = resolveDeliveryMilestoneDecorations({
        crossedThresholds,
        unitLabel: impactUnit,
        rapid: isRapidResponse(pledge.createdAt),
      });

      const progressContext = milestone.badgeLabel
        ? milestone.milestoneType === "ENTITY_THRESHOLD"
          ? "Entity milestone unlocked"
          : "Rapid response"
        : "Need fully covered";

      const proofUrl =
        proofOfDeliveryUrl.startsWith("http") ||
        proofOfDeliveryUrl.startsWith("/")
          ? proofOfDeliveryUrl
          : null;

      void recordActivityEvent({
        title: formatImpactDeliveryTitle({
          entityName,
          quantity,
          unit: impactUnit,
          locationName,
          progressContext,
        }),
        category: "VILLAGE_NEED",
        status: "COMPLETED",
        locationName,
        description: `Delivery confirmed for pledge ${pledgeId} at ${locationName}.`,
        proofImageUrl: proofUrl,
        impactQuantity: quantity,
        impactUnit,
        isMilestone: milestone.isMilestone,
        milestoneType: milestone.milestoneType,
        badgeLabel: milestone.badgeLabel,
      }).catch(() => undefined);

      // Community goal milestone when delivery closes the village need.
      for (const covered of newlyFullyCoveredItems(ticket, result.ticket)) {
        const donorCount = Math.max(1, countTicketDonors(result.ticket));
        const openedMs = Date.parse(ticket.createdAt);
        const completionDurationMs = Number.isFinite(openedMs)
          ? Math.max(0, Date.now() - openedMs)
          : null;
        const hero = resolveHeroAccolade({
          progressPercent: 100,
          impactQuantity: covered.totalRequestedQuantity,
          donorCount,
          completionDurationMs,
        });
        void recordActivityEvent({
          title: communityGoalTitle(locationName, covered.itemName),
          category: "VILLAGE_NEED",
          status: "COMPLETED",
          locationName,
          description: `${covered.itemName} demand for ${locationName} is fully covered.`,
          isMilestone: true,
          milestoneType: "GOAL_100_PERCENT",
          badgeLabel: hero?.badgeText ?? communityGoalBadgeLabel(covered.itemName),
          impactQuantity: covered.totalRequestedQuantity,
          impactUnit: covered.unit || covered.itemName,
          progressPercent: 100,
          donorCount,
          completionDurationMs,
          heroAccolade: hero?.kind ?? "MISSION_CLEARED",
          proofImageUrl: proofUrl,
        }).catch(() => undefined);
      }

      await loadPortalSnapshot();
      setFlashMessage(result.message);
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, myLivePledges, pledges, tickets],
  );

  return {
    userProfile,
    portalIdentity,
    profileReady,
    identityLocked,
    individualActorName,
    ngos: selectableNgos,
    activeNgo,
    activeNgoId: resolvedActiveNgoId,
    setActiveNgoId,
    villages,
    marketplaceTickets,
    myPledges,
    pendingCustomOffers,
    districtPool,
    flashMessage,
    errorMessage,
    setFlashMessage,
    setErrorMessage,
    submitPledge,
    acceptCustomOfferToVillage,
    acceptCustomOfferToWarehouse,
    declineCustomOffer,
    markPledgeInTransit,
    completePledgeDelivery,
    capabilityProfiles,
    activeCapabilityProfile,
    refreshPortal: loadPortalSnapshot,
  };
}
