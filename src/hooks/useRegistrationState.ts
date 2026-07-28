"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCitizenGroupRegistration,
  createNgoRegistration,
  createVolunteerRegistration,
  fetchRegistrationRosterSnapshot,
  updateRegistrationVerification,
} from "@/actions/registrationActions";
import type {
  NGORegistration,
  VerificationStatus,
  VolunteerRegistration,
} from "@/types/registration";
import type {
  CitizenGroup,
  GroupVerificationStatus,
} from "@/types/volunteerOnboarding";

export type MyRegistration =
  | { kind: "volunteer"; record: VolunteerRegistration }
  | { kind: "ngo"; record: NGORegistration }
  | { kind: "citizenGroup"; record: CitizenGroup };

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function findRegistrationForUser(
  volunteers: VolunteerRegistration[],
  ngos: NGORegistration[],
  identity: { uid?: string | null; email?: string | null; phone?: string | null },
  citizenGroups: CitizenGroup[] = [],
): MyRegistration | null {
  const uid = identity.uid?.trim();
  if (uid) {
    const byUidVolunteer = volunteers.find((entry) => entry.uid === uid);
    if (byUidVolunteer) return { kind: "volunteer", record: byUidVolunteer };
    const byUidNgo = ngos.find((entry) => entry.uid === uid);
    if (byUidNgo) return { kind: "ngo", record: byUidNgo };
    const byUidGroup = citizenGroups.find((entry) => entry.uid === uid);
    if (byUidGroup) return { kind: "citizenGroup", record: byUidGroup };
  }

  const email = identity.email?.trim().toLowerCase();
  if (email) {
    const byEmailVolunteer = volunteers.find(
      (entry) => entry.email?.trim().toLowerCase() === email,
    );
    if (byEmailVolunteer) {
      return { kind: "volunteer", record: byEmailVolunteer };
    }
    const byEmailNgo = ngos.find(
      (entry) => entry.email?.trim().toLowerCase() === email,
    );
    if (byEmailNgo) return { kind: "ngo", record: byEmailNgo };
  }

  const phone = normalizePhone(identity.phone);
  if (phone.length >= 10) {
    const last10 = phone.slice(-10);
    const byPhoneVolunteer = volunteers.find((entry) => {
      const primary = normalizePhone(entry.phone);
      const alternate = normalizePhone(entry.alternatePhone);
      return primary.endsWith(last10) || alternate.endsWith(last10);
    });
    if (byPhoneVolunteer) {
      return { kind: "volunteer", record: byPhoneVolunteer };
    }

    const byPhoneNgo = ngos.find((entry) => {
      const head = normalizePhone(entry.headOfOrgPhone);
      const poc = normalizePhone(entry.fieldPocPhone);
      return head.endsWith(last10) || poc.endsWith(last10);
    });
    if (byPhoneNgo) return { kind: "ngo", record: byPhoneNgo };

    const byPhoneGroup = citizenGroups.find((entry) => {
      const lead = normalizePhone(entry.leadPhone);
      const alt = normalizePhone(entry.leadAltPhone);
      return lead.endsWith(last10) || alt.endsWith(last10);
    });
    if (byPhoneGroup) return { kind: "citizenGroup", record: byPhoneGroup };
  }

  return null;
}

export function useRegistrationState() {
  const [volunteers, setVolunteers] = useState<VolunteerRegistration[]>([]);
  const [ngos, setNgos] = useState<NGORegistration[]>([]);
  const [citizenGroups, setCitizenGroups] = useState<CitizenGroup[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const result = await fetchRegistrationRosterSnapshot();
    if (result.ok) {
      setVolunteers(result.data.volunteers);
      setNgos(result.data.ngos);
      setCitizenGroups(result.data.citizenGroups);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const submitVolunteer = useCallback(
    async (
      input: Omit<
        VolunteerRegistration,
        "volunteerId" | "verificationStatus" | "createdAtTimestamp"
      >,
    ) => {
      if (
        input.uid &&
        findRegistrationForUser(volunteers, ngos, { uid: input.uid }, citizenGroups)
      ) {
        throw new Error("Already registered");
      }
      const entry: VolunteerRegistration = {
        ...input,
        volunteerId: `vol-${Date.now()}`,
        verificationStatus: "PENDING_VERIFICATION",
        createdAtTimestamp: new Date().toISOString(),
      };
      const result = await createVolunteerRegistration(entry);
      if (!result.ok) throw new Error(result.error);
      await refresh();
      return entry;
    },
    [citizenGroups, ngos, refresh, volunteers],
  );

  const submitNgo = useCallback(
    async (
      input: Omit<
        NGORegistration,
        "ngoId" | "verificationStatus" | "createdAtTimestamp"
      >,
    ) => {
      if (
        input.uid &&
        findRegistrationForUser(volunteers, ngos, { uid: input.uid }, citizenGroups)
      ) {
        throw new Error("Already registered");
      }
      const entry: NGORegistration = {
        ...input,
        ngoId: `ngo-reg-${Date.now()}`,
        verificationStatus: "PENDING_VERIFICATION",
        createdAtTimestamp: new Date().toISOString(),
      };
      const result = await createNgoRegistration(entry);
      if (!result.ok) throw new Error(result.error);
      await refresh();
      return entry;
    },
    [citizenGroups, ngos, refresh, volunteers],
  );

  const submitCitizenGroup = useCallback(
    async (
      input: Omit<
        CitizenGroup,
        "groupId" | "groupType" | "verificationStatus" | "createdTimestamp"
      >,
    ) => {
      if (
        input.uid &&
        findRegistrationForUser(volunteers, ngos, { uid: input.uid }, citizenGroups)
      ) {
        throw new Error("Already registered");
      }
      const entry: CitizenGroup = {
        ...input,
        groupId: `cg-${Date.now()}`,
        groupType: "CITIZEN_VOLUNTEER_GROUP",
        verificationStatus: "PENDING_VERIFICATION",
        createdTimestamp: new Date().toISOString(),
      };
      const result = await createCitizenGroupRegistration(entry);
      if (!result.ok) throw new Error(result.error);
      await refresh();
      return entry;
    },
    [citizenGroups, ngos, refresh, volunteers],
  );

  const setVolunteerStatus = useCallback(
    async (volunteerId: string, status: VerificationStatus, reviewNote?: string) => {
      const result = await updateRegistrationVerification({
        kind: "volunteers",
        id: volunteerId,
        verificationStatus: status,
        reviewNote,
      });
      if (!result.ok) return;
      await refresh();
    },
    [refresh],
  );

  const setNgoStatus = useCallback(
    async (ngoId: string, status: VerificationStatus, reviewNote?: string) => {
      const result = await updateRegistrationVerification({
        kind: "ngos",
        id: ngoId,
        verificationStatus: status,
        reviewNote,
      });
      if (!result.ok) return;
      await refresh();
    },
    [refresh],
  );

  const setCitizenGroupStatus = useCallback(
    async (
      groupId: string,
      status: GroupVerificationStatus,
      reviewNote?: string,
      verifiedByUserId?: string,
    ) => {
      const result = await updateRegistrationVerification({
        kind: "citizenGroups",
        id: groupId,
        verificationStatus: status,
        reviewNote,
        verifiedByUserId,
      });
      if (!result.ok) return;
      await refresh();
    },
    [refresh],
  );

  const linkRegistrationToUid = useCallback(
    async (registration: MyRegistration, uid: string) => {
      if (registration.kind === "volunteer") {
        if (registration.record.uid === uid) return;
        await updateRegistrationVerification({
          kind: "volunteers",
          id: registration.record.volunteerId,
          verificationStatus: registration.record.verificationStatus,
          uid,
        });
      } else if (registration.kind === "ngo") {
        if (registration.record.uid === uid) return;
        await updateRegistrationVerification({
          kind: "ngos",
          id: registration.record.ngoId,
          verificationStatus: registration.record.verificationStatus,
          uid,
        });
      } else {
        if (registration.record.uid === uid) return;
        await updateRegistrationVerification({
          kind: "citizenGroups",
          id: registration.record.groupId,
          verificationStatus: registration.record.verificationStatus,
          uid,
        });
      }
      await refresh();
    },
    [refresh],
  );

  const pendingVolunteers = useMemo(
    () =>
      volunteers.filter(
        (entry) => entry.verificationStatus === "PENDING_VERIFICATION",
      ),
    [volunteers],
  );

  const pendingNgos = useMemo(
    () =>
      ngos.filter(
        (entry) => entry.verificationStatus === "PENDING_VERIFICATION",
      ),
    [ngos],
  );

  const pendingCitizenGroups = useMemo(
    () =>
      citizenGroups.filter(
        (entry) => entry.verificationStatus === "PENDING_VERIFICATION",
      ),
    [citizenGroups],
  );

  const approvedVolunteers = useMemo(
    () =>
      volunteers.filter(
        (entry) => entry.verificationStatus === "APPROVED_ACTIVE",
      ),
    [volunteers],
  );

  const approvedNgos = useMemo(
    () =>
      ngos.filter((entry) => entry.verificationStatus === "APPROVED_ACTIVE"),
    [ngos],
  );

  const verifiedCitizenGroups = useMemo(
    () =>
      citizenGroups.filter(
        (entry) => entry.verificationStatus === "VERIFIED_ACTIVE",
      ),
    [citizenGroups],
  );

  const rosterDelta = useMemo(() => {
    const approvedNgoVolunteerCapacity = approvedNgos.reduce(
      (sum, ngo) => sum + ngo.activeVolunteerCount,
      0,
    );
    const verifiedGroupMemberCapacity = verifiedCitizenGroups.reduce(
      (sum, group) => sum + group.estimatedMemberCount,
      0,
    );
    return {
      approvedVolunteerCount: approvedVolunteers.length,
      approvedNgoCount: approvedNgos.length,
      pendingVolunteerCount: pendingVolunteers.length,
      pendingNgoCount: pendingNgos.length,
      pendingCitizenGroupCount: pendingCitizenGroups.length,
      verifiedCitizenGroupCount: verifiedCitizenGroups.length,
      approvedNgoVolunteerCapacity,
      verifiedGroupMemberCapacity,
      immediatelyAvailableVolunteers: approvedVolunteers.filter(
        (entry) => entry.availabilityStatus === "IMMEDIATELY_AVAILABLE",
      ).length,
    };
  }, [
    approvedNgos,
    approvedVolunteers,
    pendingCitizenGroups.length,
    pendingNgos.length,
    pendingVolunteers.length,
    verifiedCitizenGroups,
  ]);

  return {
    hydrated,
    volunteers,
    ngos,
    citizenGroups,
    pendingVolunteers,
    pendingNgos,
    pendingCitizenGroups,
    approvedVolunteers,
    approvedNgos,
    verifiedCitizenGroups,
    rosterDelta,
    submitVolunteer,
    submitNgo,
    submitCitizenGroup,
    setVolunteerStatus,
    setNgoStatus,
    setCitizenGroupStatus,
    linkRegistrationToUid,
    refresh,
  };
}
