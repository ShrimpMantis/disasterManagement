"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNgoPortalSnapshot } from "@/actions/pledgeActions";
import {
  updatePledgeSubmission,
  upsertPledgeSubmission,
} from "@/lib/firestore/pledges";
import { upsertDistrictTicket } from "@/lib/firestore/tickets";
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
import type { ReliefTicket, VillageLookup } from "@/types/ticket";
import type { PledgeSubmitPayload } from "@/components/ngoPortal/PledgeSubmissionModal";

const ACTIVE_NGO_STORAGE_KEY = "reliefnet-active-ngo-id";

function deriveMaxManpowerCapacity(ngo: NGOProfile): number {
  const totalCapacity = ngo.capabilities.reduce(
    (sum, capability) => sum + capability.dailyCapacityUnits,
    0,
  );
  return Math.max(8, Math.round(totalCapacity / 200));
}

export function useNGOPledgePortalState() {
  const [villages, setVillages] = useState<VillageLookup[]>([]);
  const [ngos, setNgos] = useState<NGOProfile[]>([]);

  const [activeNgoId, setActiveNgoIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "ngo-1";
    return window.localStorage.getItem(ACTIVE_NGO_STORAGE_KEY) || "ngo-1";
  });

  const setActiveNgoId = useCallback((ngoId: string) => {
    setActiveNgoIdState(ngoId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_NGO_STORAGE_KEY, ngoId);
    }
  }, []);

  const activeNgo = useMemo(
    () => ngos.find((ngo) => ngo.id === activeNgoId) ?? ngos[0] ?? null,
    [activeNgoId, ngos],
  );

  const [tickets, setTickets] = useState<ReliefTicket[]>([]);

  const [pledges, setPledges] = useState<NGOPledgeSubmission[]>([]);
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

  const resolvedActiveNgoId = activeNgo?.id ?? ngos[0]?.id ?? "";

  const marketplaceTickets = useMemo(
    () => tickets.filter(isMarketplaceTicket),
    [tickets],
  );

  const myPledges = useMemo(
    () => pledges.filter((pledge) => pledge.ngoId === activeNgo?.id),
    [activeNgo?.id, pledges],
  );

  const capabilityProfiles = useMemo<OrganizationCapabilityProfile[]>(
    () =>
      ngos.map((ngo) => {
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
    [ngos, pledges],
  );

  const activeCapabilityProfile = useMemo(
    () =>
      capabilityProfiles.find((profile) => profile.entityId === activeNgo?.id) ?? null,
    [activeNgo?.id, capabilityProfiles],
  );

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

  const submitPledge = useCallback(
    async (input: PledgeSubmitPayload) => {
      if (!activeNgo) {
        setErrorMessage("Select an NGO identity before pledging.");
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

      const needsReview = hasCustom;
      const draft: NGOPledgeSubmission = {
        ...input,
        id: `pledge-${Date.now()}`,
        ngoId: activeNgo.id,
        ngoName: activeNgo.name,
        entityType: "REGISTERED_NGO",
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
    [activeCapabilityProfile?.netAvailableManpower, activeNgo, loadPortalSnapshot, tickets],
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
          targetVillageId: ticket.villageId,
          targetVillageName: ticket.villageName,
        }),
      ]);
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
      const pledge = pledges.find((entry) => entry.id === pledgeId);
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
      await loadPortalSnapshot();
      setFlashMessage(result.message);
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, pledges, tickets],
  );

  const completePledgeDelivery = useCallback(
    async (
      pledgeId: string,
      proofOfDeliveryUrl: string,
      fieldConfirmationCode?: string,
    ) => {
      const pledge = pledges.find((entry) => entry.id === pledgeId);
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
      await loadPortalSnapshot();
      setFlashMessage(result.message);
      setErrorMessage("");
      return true;
    },
    [loadPortalSnapshot, pledges, tickets],
  );

  return {
    ngos,
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
  };
}
