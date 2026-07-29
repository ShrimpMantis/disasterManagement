"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  HandHeart,
  ShieldCheck,
  UsersRound,
  UserRoundPlus,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NgoAffiliationPicker } from "@/components/registration/NgoAffiliationPicker";
import { RegistrationProfile } from "@/components/registration/RegistrationProfile";
import {
  findRegistrationForUser,
  useRegistrationState,
} from "@/hooks/useRegistrationState";
import { useOperationalMode } from "@/hooks/useOperationalMode";
import { listAffiliationNgoOptions } from "@/lib/registration/affiliationNgos";
import { fetchNgoCoordinationSnapshot } from "@/actions/ngoCoordinationActions";
import {
  ASSAM_REGISTRATION_DISTRICTS,
  AVAILABILITY_LABELS,
  GOVERNMENT_ID_LABELS,
  NGO_CAPABILITY_LABELS,
  VOLUNTEER_SKILL_LABELS,
  type GovernmentIdType,
  type NGOCapability,
  type VolunteerAvailability,
  type VolunteerSkill,
} from "@/types/registration";
import {
  CITIZEN_GROUP_CAPABILITY_LABELS,
  GROUP_MEMBER_BAND_COUNT,
  GROUP_MEMBER_BAND_LABELS,
  NGO_AFFILIATION_OTHER_ID,
  type CitizenGroupCapability,
  type GroupMemberBand,
} from "@/types/volunteerOnboarding";

type PortalTab = "volunteer" | "ngo" | "citizenGroup";

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
      {children}
      {required ? <span className="text-[var(--danger)]"> *</span> : null}
    </span>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

export function RegistrationPortal() {
  const { user } = useAuth();
  const { isCrowdMode, isAdminSourcedMode } = useOperationalMode();
  const {
    hydrated,
    volunteers,
    ngos,
    citizenGroups,
    approvedNgos,
    submitVolunteer,
    submitNgo,
    submitCitizenGroup,
    linkRegistrationToUid,
  } = useRegistrationState();
  const [tab, setTab] = useState<PortalTab>("volunteer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Volunteer fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [age, setAge] = useState("");
  const [homeDistrict, setHomeDistrict] = useState("Jorhat");
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>([
    "Jorhat",
  ]);
  const [isAffiliatedWithNgo, setIsAffiliatedWithNgo] = useState<
    boolean | null
  >(null);
  const [affiliatedNgoId, setAffiliatedNgoId] = useState<string | null>(null);
  const [affiliatedNgoName, setAffiliatedNgoName] = useState("");
  const [otherNgoName, setOtherNgoName] = useState("");
  const [otherNgoRegistrationId, setOtherNgoRegistrationId] = useState("");
  const [skills, setSkills] = useState<VolunteerSkill[]>([]);
  const [hasMedicalLicense, setHasMedicalLicense] = useState(false);
  const [medicalLicenseDetails, setMedicalLicenseDetails] = useState("");
  const [governmentIdType, setGovernmentIdType] =
    useState<GovernmentIdType>("AADHAAR");
  const [governmentIdLast4, setGovernmentIdLast4] = useState("");
  const [availability, setAvailability] =
    useState<VolunteerAvailability>("IMMEDIATELY_AVAILABLE");

  // NGO fields
  const [orgName, setOrgName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [primaryDistrict, setPrimaryDistrict] = useState("Kamrup Metropolitan");
  const [operatingDistricts, setOperatingDistricts] = useState<string[]>([
    "Kamrup Metropolitan",
  ]);
  const [headName, setHeadName] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [capabilities, setCapabilities] = useState<NGOCapability[]>([]);
  const [volunteerCapacity, setVolunteerCapacity] = useState("");
  const [assetsSummary, setAssetsSummary] = useState("");

  // Citizen group fields
  const [groupName, setGroupName] = useState("");
  const [groupDistrict, setGroupDistrict] = useState("Majuli");
  const [groupCircle, setGroupCircle] = useState("");
  const [groupVillage, setGroupVillage] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadAltPhone, setLeadAltPhone] = useState("");
  const [leadGovtIdType, setLeadGovtIdType] =
    useState<GovernmentIdType>("AADHAAR");
  const [leadGovtIdNumber, setLeadGovtIdNumber] = useState("");
  const [memberBand, setMemberBand] = useState<GroupMemberBand>("10_25");
  const [groupCapabilities, setGroupCapabilities] = useState<
    CitizenGroupCapability[]
  >([]);
  const [directoryNgos, setDirectoryNgos] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNgoCoordinationSnapshot().then((result) => {
        if (!result.ok) return;
        setDirectoryNgos(
          result.data.ngos.map((ngo) => ({ id: ngo.id, name: ngo.name })),
        );
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  // Prefer typed values; fall back to Firebase profile without syncing via effect.
  const displayFullName = fullName || user?.displayName || "";
  const displayEmail = email || user?.email || "";
  const displayPhone = phone || user?.phoneNumber || "";
  const displayOrgEmail = orgEmail || user?.email || "";
  const displayLeadName = leadName || user?.displayName || "";
  const displayLeadPhone = leadPhone || user?.phoneNumber || "";

  const myRegistration = useMemo(() => {
    if (!hydrated || !user) return null;
    return findRegistrationForUser(
      volunteers,
      ngos,
      {
        uid: user.uid,
        email: user.email,
        phone: user.phoneNumber,
      },
      citizenGroups,
    );
  }, [hydrated, user, volunteers, ngos, citizenGroups]);

  useEffect(() => {
    if (!user || !myRegistration || myRegistration.record.uid === user.uid) {
      return;
    }
    linkRegistrationToUid(myRegistration, user.uid);
  }, [user, myRegistration, linkRegistrationToUid]);

  const skillOptions = useMemo(
    () => Object.entries(VOLUNTEER_SKILL_LABELS) as Array<[VolunteerSkill, string]>,
    [],
  );
  const capabilityOptions = useMemo(
    () =>
      Object.entries(NGO_CAPABILITY_LABELS) as Array<[NGOCapability, string]>,
    [],
  );
  const groupCapabilityOptions = useMemo(
    () =>
      Object.entries(CITIZEN_GROUP_CAPABILITY_LABELS) as Array<
        [CitizenGroupCapability, string]
      >,
    [],
  );
  const affiliationOptions = useMemo(
    () => listAffiliationNgoOptions(approvedNgos, directoryNgos),
    [approvedNgos, directoryNgos],
  );

  function clearAffiliationSelection() {
    setAffiliatedNgoId(null);
    setAffiliatedNgoName("");
    setOtherNgoName("");
    setOtherNgoRegistrationId("");
  }

  async function onSubmitVolunteer(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Sign in to submit a registration.");
      return;
    }

    const parsedAge = Number(age);
    if (!displayFullName.trim() || !displayPhone.trim() || !homeDistrict) {
      setError("Name, phone, and home district are required.");
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 18 || parsedAge > 80) {
      setError("Age must be between 18 and 80.");
      return;
    }
    if (isAffiliatedWithNgo === null) {
      setError("Indicate whether you are affiliated with a Non-Profit or NGO.");
      return;
    }
    if (isAffiliatedWithNgo) {
      if (!affiliatedNgoId) {
        setError("Select your Non-Profit from the directory, or choose Other.");
        return;
      }
      if (
        affiliatedNgoId === NGO_AFFILIATION_OTHER_ID &&
        !otherNgoName.trim()
      ) {
        setError("Enter the name of your Non-Profit.");
        return;
      }
    }
    if (skills.length === 0) {
      setError("Select at least one skill.");
      return;
    }
    if (!/^\d{4}$/.test(governmentIdLast4.trim())) {
      setError("Enter the last 4 digits of your government ID.");
      return;
    }
    if (preferredDistricts.length === 0) {
      setError("Select at least one preferred operating district.");
      return;
    }

    const resolvedNgoName =
      affiliatedNgoId === NGO_AFFILIATION_OTHER_ID
        ? otherNgoName.trim()
        : affiliatedNgoName.trim();

    setSubmitting(true);
    try {
      const entry = await submitVolunteer({
        uid: user.uid,
        fullName: displayFullName.trim(),
        phone: displayPhone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: displayEmail.trim() || user.email || undefined,
        gender,
        age: parsedAge,
        homeDistrict,
        preferredOperatingDistricts: preferredDistricts,
        isAffiliatedWithNgo,
        affiliatedNgoId:
          isAffiliatedWithNgo &&
          affiliatedNgoId &&
          affiliatedNgoId !== NGO_AFFILIATION_OTHER_ID
            ? affiliatedNgoId
            : undefined,
        affiliatedNgoName: isAffiliatedWithNgo ? resolvedNgoName : undefined,
        affiliatedNgoRegistrationId:
          isAffiliatedWithNgo && affiliatedNgoId === NGO_AFFILIATION_OTHER_ID
            ? otherNgoRegistrationId.trim() || undefined
            : undefined,
        skills,
        hasMedicalLicense,
        medicalLicenseDetails: hasMedicalLicense
          ? medicalLicenseDetails.trim() || undefined
          : undefined,
        governmentIdType,
        governmentIdNumberLast4: governmentIdLast4.trim(),
        availabilityStatus: availability,
      });
      setSuccess(
        isCrowdMode
          ? `Registration activated immediately (${entry.volunteerId}).`
          : `Registration received (${entry.volunteerId}). A district officer will verify your profile before deployment.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error &&
          submitError.message === "Already registered"
          ? "This account already has a registration on file."
          : "Could not submit registration. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitNgo(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Sign in to submit a registration.");
      return;
    }

    const capacity = Number(volunteerCapacity);
    if (
      !orgName.trim() ||
      !regNumber.trim() ||
      !headName.trim() ||
      !headPhone.trim() ||
      !pocName.trim() ||
      !pocPhone.trim() ||
      !displayOrgEmail.trim()
    ) {
      setError(
        "Organization, registration ID, leadership, and field POC details are required.",
      );
      return;
    }
    if (capabilities.length === 0) {
      setError("Select at least one core capability.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      setError("Enter active volunteer capacity (at least 1).");
      return;
    }
    if (operatingDistricts.length === 0) {
      setError("Select at least one operating district.");
      return;
    }

    setSubmitting(true);
    try {
      const entry = await submitNgo({
        uid: user.uid,
        organizationLegalName: orgName.trim(),
        registrationNumber: regNumber.trim(),
        primaryDistrictOfOperation: primaryDistrict,
        operatingDistricts,
        headOfOrgName: headName.trim(),
        headOfOrgPhone: headPhone.trim(),
        fieldPocName: pocName.trim(),
        fieldPocPhone: pocPhone.trim(),
        email: displayOrgEmail.trim(),
        coreCapabilities: capabilities,
        activeVolunteerCount: capacity,
        ownedAssetsSummary: assetsSummary.trim() || undefined,
      });
      setSuccess(
        isCrowdMode
          ? `NGO registration activated immediately (${entry.ngoId}).`
          : `NGO registration received (${entry.ngoId}). Pending district officer verification before roster activation.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error &&
          submitError.message === "Already registered"
          ? "This account already has a registration on file."
          : "Could not submit NGO registration. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCitizenGroup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Sign in to submit a registration.");
      return;
    }

    if (
      !groupName.trim() ||
      !groupCircle.trim() ||
      !groupVillage.trim() ||
      !displayLeadName.trim() ||
      !displayLeadPhone.trim() ||
      !leadGovtIdNumber.trim()
    ) {
      setError(
        "Group details, leader contact, and identity proof are required.",
      );
      return;
    }
    if (groupCapabilities.length === 0) {
      setError("Select at least one equipment / capability.");
      return;
    }

    setSubmitting(true);
    try {
      const entry = await submitCitizenGroup({
        uid: user.uid,
        groupName: groupName.trim(),
        district: groupDistrict,
        revenueCircle: groupCircle.trim(),
        primaryVillageTown: groupVillage.trim(),
        leadName: displayLeadName.trim(),
        leadPhone: displayLeadPhone.trim(),
        leadAltPhone: leadAltPhone.trim() || undefined,
        leadGovtIdType,
        leadGovtIdNumber: leadGovtIdNumber.trim(),
        estimatedMemberCount: GROUP_MEMBER_BAND_COUNT[memberBand],
        memberBand,
        capabilities: groupCapabilities,
      });
      setSuccess(
        isCrowdMode
          ? `Citizen group registration activated immediately (${entry.groupId}).`
          : `Citizen group registration received (${entry.groupId}). A district coordinator will verify the group leader by phone before activation.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error &&
          submitError.message === "Already registered"
          ? "This account already has a registration on file."
          : "Could not submit citizen group registration. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-muted)]">
        Loading registration…
      </div>
    );
  }

  if (myRegistration) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <RegistrationProfile registration={myRegistration} />
      </div>
    );
  }

  if (isAdminSourcedMode) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur-md sm:p-8">
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Workforce onboarding control
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)]">
            Public registration is disabled
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            This deployment requires district/officer verification before profiles
            can join the active roster. Ask an organization admin for access.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur-md sm:p-8">
        <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-[0.14em]">
            Field workforce onboarding
          </span>
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)]">
          Volunteer & partner registration
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {isCrowdMode
            ? "Self-register and activate immediately in crowdsourced mode. You can register once as a volunteer, NGO, or citizen group."
            : "Self-register for verification by district administrators. Approved profiles join the active deployment roster. You can register once as a volunteer, NGO, or citizen group."}
        </p>

        <div role="tablist" className="mt-6 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "volunteer"}
            onClick={() => {
              setTab("volunteer");
              setError("");
              setSuccess("");
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
              tab === "volunteer"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            <UserRoundPlus className="h-4 w-4 shrink-0" aria-hidden />
            Individual Volunteer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ngo"}
            onClick={() => {
              setTab("ngo");
              setError("");
              setSuccess("");
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
              tab === "ngo"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            <HandHeart className="h-4 w-4 shrink-0" aria-hidden />
            Official NGO / Non-Profit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "citizenGroup"}
            onClick={() => {
              setTab("citizenGroup");
              setError("");
              setSuccess("");
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
              tab === "citizenGroup"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
            Citizen / Volunteer Group
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 inline-flex w-full items-start gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {success}
          </p>
        ) : null}

        {tab === "volunteer" ? (
          <form onSubmit={onSubmitVolunteer} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required>Full name</FieldLabel>
                <input
                  required
                  value={displayFullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Phone</FieldLabel>
                <input
                  required
                  type="tel"
                  value={displayPhone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClass}
                  placeholder="+91 ..."
                />
              </label>
              <label className="block">
                <FieldLabel>Alternate phone</FieldLabel>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(event) => setAlternatePhone(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  value={displayEmail}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Age</FieldLabel>
                <input
                  required
                  type="number"
                  min={18}
                  max={80}
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Gender</FieldLabel>
                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value as typeof gender)
                  }
                  className={inputClass}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Home district</FieldLabel>
                <select
                  value={homeDistrict}
                  onChange={(event) => setHomeDistrict(event.target.value)}
                  className={inputClass}
                >
                  {ASSAM_REGISTRATION_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Availability</FieldLabel>
                <select
                  value={availability}
                  onChange={(event) =>
                    setAvailability(event.target.value as VolunteerAvailability)
                  }
                  className={inputClass}
                >
                  {(
                    Object.entries(AVAILABILITY_LABELS) as Array<
                      [VolunteerAvailability, string]
                    >
                  )
                    .filter(([key]) => key !== "DEPLOYED")
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div>
              <FieldLabel required>Preferred operating districts</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {ASSAM_REGISTRATION_DISTRICTS.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() =>
                      setPreferredDistricts((prev) =>
                        toggleValue(prev, district),
                      )
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      preferredDistricts.includes(district)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {district === "Kamrup Metropolitan" ? "Guwahati" : district}
                  </button>
                ))}
              </div>
            </div>

            <fieldset className="rounded-xl border border-[var(--line)] bg-white/60 p-3">
              <legend className="px-1 text-sm font-medium text-[var(--ink)]">
                Are you affiliated with an official Non-Profit or NGO?
                <span className="text-[var(--danger)]"> *</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="ngo-affiliation"
                    checked={isAffiliatedWithNgo === true}
                    onChange={() => {
                      setIsAffiliatedWithNgo(true);
                      clearAffiliationSelection();
                    }}
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="ngo-affiliation"
                    checked={isAffiliatedWithNgo === false}
                    onChange={() => {
                      setIsAffiliatedWithNgo(false);
                      clearAffiliationSelection();
                    }}
                  />
                  No
                </label>
              </div>
              {isAffiliatedWithNgo === true ? (
                <div className="mt-3">
                  <NgoAffiliationPicker
                    options={affiliationOptions}
                    selectedNgoId={affiliatedNgoId}
                    selectedNgoName={affiliatedNgoName}
                    otherName={otherNgoName}
                    otherRegistrationId={otherNgoRegistrationId}
                    onSelectListed={(option) => {
                      setAffiliatedNgoId(option.id);
                      setAffiliatedNgoName(option.name);
                      setOtherNgoName("");
                      setOtherNgoRegistrationId("");
                    }}
                    onSelectOther={() => {
                      setAffiliatedNgoId(NGO_AFFILIATION_OTHER_ID);
                      setAffiliatedNgoName("");
                    }}
                    onOtherNameChange={setOtherNgoName}
                    onOtherRegistrationIdChange={setOtherNgoRegistrationId}
                    onClear={clearAffiliationSelection}
                  />
                </div>
              ) : null}
            </fieldset>

            <div>
              <FieldLabel required>Skills</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {skillOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSkills((prev) => toggleValue(prev, value))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      skills.includes(value)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasMedicalLicense}
                onChange={(event) => setHasMedicalLicense(event.target.checked)}
              />
              I hold a medical / nursing license
            </label>
            {hasMedicalLicense ? (
              <label className="block">
                <FieldLabel>License details</FieldLabel>
                <input
                  value={medicalLicenseDetails}
                  onChange={(event) =>
                    setMedicalLicenseDetails(event.target.value)
                  }
                  className={inputClass}
                  placeholder="Council name · registration no."
                />
              </label>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Government ID type</FieldLabel>
                <select
                  value={governmentIdType}
                  onChange={(event) =>
                    setGovernmentIdType(event.target.value as GovernmentIdType)
                  }
                  className={inputClass}
                >
                  {(
                    Object.entries(GOVERNMENT_ID_LABELS) as Array<
                      [GovernmentIdType, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>ID last 4 digits</FieldLabel>
                <input
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={governmentIdLast4}
                  onChange={(event) =>
                    setGovernmentIdLast4(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  className={inputClass}
                  placeholder="••••"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit volunteer registration"}
            </button>
          </form>
        ) : null}

        {tab === "ngo" ? (
          <form onSubmit={onSubmitNgo} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required>Organization legal name</FieldLabel>
                <input
                  required
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel required>
                  NITI Aayog Darpan / Govt registration ID
                </FieldLabel>
                <input
                  required
                  value={regNumber}
                  onChange={(event) => setRegNumber(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Primary district</FieldLabel>
                <select
                  value={primaryDistrict}
                  onChange={(event) => {
                    setPrimaryDistrict(event.target.value);
                    setOperatingDistricts((prev) =>
                      prev.includes(event.target.value)
                        ? prev
                        : [...prev, event.target.value],
                    );
                  }}
                  className={inputClass}
                >
                  {ASSAM_REGISTRATION_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Active volunteer capacity</FieldLabel>
                <input
                  required
                  type="number"
                  min={1}
                  value={volunteerCapacity}
                  onChange={(event) => setVolunteerCapacity(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Head of organization</FieldLabel>
                <input
                  required
                  value={headName}
                  onChange={(event) => setHeadName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Head phone</FieldLabel>
                <input
                  required
                  type="tel"
                  value={headPhone}
                  onChange={(event) => setHeadPhone(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Field POC name</FieldLabel>
                <input
                  required
                  value={pocName}
                  onChange={(event) => setPocName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Field POC phone (24/7)</FieldLabel>
                <input
                  required
                  type="tel"
                  value={pocPhone}
                  onChange={(event) => setPocPhone(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel required>Organization email</FieldLabel>
                <input
                  required
                  type="email"
                  value={displayOrgEmail}
                  onChange={(event) => setOrgEmail(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <div>
              <FieldLabel required>Operating districts</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {ASSAM_REGISTRATION_DISTRICTS.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() =>
                      setOperatingDistricts((prev) =>
                        toggleValue(prev, district),
                      )
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      operatingDistricts.includes(district)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {district === "Kamrup Metropolitan" ? "Guwahati" : district}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel required>Core capabilities</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {capabilityOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setCapabilities((prev) => toggleValue(prev, value))
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      capabilities.includes(value)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <FieldLabel>Owned assets summary</FieldLabel>
              <textarea
                value={assetsSummary}
                onChange={(event) => setAssetsSummary(event.target.value)}
                className={`${inputClass} min-h-[88px]`}
                placeholder="e.g., 2 Mobile Kitchen Vans, 500 Tarpaulins"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit NGO registration"}
            </button>
          </form>
        ) : null}

        {tab === "citizenGroup" ? (
          <form onSubmit={onSubmitCitizenGroup} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required>Group name</FieldLabel>
                <input
                  required
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className={inputClass}
                  placeholder="e.g., Neighborhood Response Team"
                />
              </label>
              <label className="block">
                <FieldLabel required>Operational district</FieldLabel>
                <select
                  value={groupDistrict}
                  onChange={(event) => setGroupDistrict(event.target.value)}
                  className={inputClass}
                >
                  {ASSAM_REGISTRATION_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Revenue circle</FieldLabel>
                <input
                  required
                  value={groupCircle}
                  onChange={(event) => setGroupCircle(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel required>
                  Primary village / neighborhood base
                </FieldLabel>
                <input
                  required
                  value={groupVillage}
                  onChange={(event) => setGroupVillage(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-white/60 p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Group leader / POC
              </p>
              <label className="block sm:col-span-2">
                <FieldLabel required>Full name</FieldLabel>
                <input
                  required
                  value={displayLeadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Direct phone</FieldLabel>
                <input
                  required
                  type="tel"
                  value={displayLeadPhone}
                  onChange={(event) => setLeadPhone(event.target.value)}
                  className={inputClass}
                  placeholder="+91 ..."
                />
              </label>
              <label className="block">
                <FieldLabel>Emergency alt contact</FieldLabel>
                <input
                  type="tel"
                  value={leadAltPhone}
                  onChange={(event) => setLeadAltPhone(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Identity proof type</FieldLabel>
                <select
                  value={leadGovtIdType}
                  onChange={(event) =>
                    setLeadGovtIdType(event.target.value as GovernmentIdType)
                  }
                  className={inputClass}
                >
                  {(
                    Object.entries(GOVERNMENT_ID_LABELS) as Array<
                      [GovernmentIdType, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>ID number</FieldLabel>
                <input
                  required
                  value={leadGovtIdNumber}
                  onChange={(event) => setLeadGovtIdNumber(event.target.value)}
                  className={inputClass}
                  placeholder="Aadhaar / Voter ID number"
                />
              </label>
            </div>

            <fieldset>
              <FieldLabel required>Estimated active members</FieldLabel>
              <div className="flex flex-wrap gap-3 text-sm">
                {(
                  Object.entries(GROUP_MEMBER_BAND_LABELS) as Array<
                    [GroupMemberBand, string]
                  >
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="member-band"
                      checked={memberBand === value}
                      onChange={() => setMemberBand(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <FieldLabel required>Equipment & capabilities</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {groupCapabilityOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setGroupCapabilities((prev) => toggleValue(prev, value))
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      groupCapabilities.includes(value)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting
                ? "Submitting…"
                : "Submit citizen group registration"}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
