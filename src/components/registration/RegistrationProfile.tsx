"use client";

import { CheckCircle2, HandHeart, UsersRound, UserRoundPlus } from "lucide-react";
import type { MyRegistration } from "@/hooks/useRegistrationState";
import {
  AVAILABILITY_LABELS,
  GOVERNMENT_ID_LABELS,
  NGO_CAPABILITY_LABELS,
  VERIFICATION_STATUS_BADGE_CLASS,
  VERIFICATION_STATUS_LABELS,
  VOLUNTEER_SKILL_LABELS,
} from "@/types/registration";
import {
  CITIZEN_GROUP_CAPABILITY_LABELS,
  GROUP_MEMBER_BAND_LABELS,
  GROUP_VERIFICATION_STATUS_BADGE_CLASS,
  GROUP_VERIFICATION_STATUS_LABELS,
} from "@/types/volunteerOnboarding";

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[var(--ink)]">{value}</p>
    </div>
  );
}

export function RegistrationProfile({
  registration,
}: {
  registration: MyRegistration;
}) {
  const status = registration.record.verificationStatus;
  const isGroup = registration.kind === "citizenGroup";
  const statusLabel = isGroup
    ? GROUP_VERIFICATION_STATUS_LABELS[registration.record.verificationStatus]
    : VERIFICATION_STATUS_LABELS[
        registration.record.verificationStatus as keyof typeof VERIFICATION_STATUS_LABELS
      ];
  const statusClass = isGroup
    ? GROUP_VERIFICATION_STATUS_BADGE_CLASS[
        registration.record.verificationStatus
      ]
    : VERIFICATION_STATUS_BADGE_CLASS[
        registration.record.verificationStatus as keyof typeof VERIFICATION_STATUS_BADGE_CLASS
      ];

  const title =
    registration.kind === "volunteer"
      ? registration.record.fullName
      : registration.kind === "ngo"
        ? registration.record.organizationLegalName
        : registration.record.groupName;

  const kindLabel =
    registration.kind === "volunteer"
      ? "Volunteer registration"
      : registration.kind === "ngo"
        ? "NGO registration"
        : "Citizen group registration";

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur-md sm:p-8">
      <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
        {registration.kind === "volunteer" ? (
          <UserRoundPlus className="h-4 w-4" aria-hidden />
        ) : registration.kind === "ngo" ? (
          <HandHeart className="h-4 w-4" aria-hidden />
        ) : (
          <UsersRound className="h-4 w-4" aria-hidden />
        )}
        <span className="text-xs font-medium uppercase tracking-[0.14em]">
          {kindLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Your submitted registration details. Status updates when a district
            officer reviews your profile.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {status === "PENDING_VERIFICATION" ? (
        <p className="mt-4 inline-flex w-full items-start gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Registration received and awaiting district verification.
        </p>
      ) : null}

      {registration.kind === "volunteer" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Registration ID" value={registration.record.volunteerId} />
          <Detail
            label="Submitted"
            value={new Date(registration.record.createdAtTimestamp).toLocaleString()}
          />
          <Detail label="Phone" value={registration.record.phone} />
          <Detail label="Alternate phone" value={registration.record.alternatePhone} />
          <Detail label="Email" value={registration.record.email} />
          <Detail label="Age" value={registration.record.age} />
          <Detail label="Gender" value={registration.record.gender} />
          <Detail label="Home district" value={registration.record.homeDistrict} />
          <Detail
            label="NGO affiliation"
            value={
              registration.record.isAffiliatedWithNgo
                ? registration.record.affiliatedNgoName || "Yes"
                : "Independent (no NGO)"
            }
          />
          <Detail
            label="Availability"
            value={AVAILABILITY_LABELS[registration.record.availabilityStatus]}
          />
          <Detail
            label="Government ID"
            value={`${GOVERNMENT_ID_LABELS[registration.record.governmentIdType]} · ****${registration.record.governmentIdNumberLast4}`}
          />
          <Detail
            label="Preferred districts"
            value={registration.record.preferredOperatingDistricts.join(", ")}
          />
          <Detail
            label="Skills"
            value={registration.record.skills
              .map((skill) => VOLUNTEER_SKILL_LABELS[skill])
              .join(", ")}
          />
          <Detail
            label="Medical license"
            value={
              registration.record.hasMedicalLicense
                ? registration.record.medicalLicenseDetails || "Yes"
                : "No"
            }
          />
          <Detail label="Review note" value={registration.record.reviewNote} />
        </div>
      ) : null}

      {registration.kind === "ngo" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Registration ID" value={registration.record.ngoId} />
          <Detail
            label="Submitted"
            value={new Date(registration.record.createdAtTimestamp).toLocaleString()}
          />
          <Detail
            label="Govt / Darpan ID"
            value={registration.record.registrationNumber}
          />
          <Detail
            label="Primary district"
            value={registration.record.primaryDistrictOfOperation}
          />
          <Detail
            label="Operating districts"
            value={registration.record.operatingDistricts.join(", ")}
          />
          <Detail label="Organization email" value={registration.record.email} />
          <Detail label="Head of organization" value={registration.record.headOfOrgName} />
          <Detail label="Head phone" value={registration.record.headOfOrgPhone} />
          <Detail label="Field POC" value={registration.record.fieldPocName} />
          <Detail label="Field POC phone" value={registration.record.fieldPocPhone} />
          <Detail
            label="Active volunteers"
            value={registration.record.activeVolunteerCount}
          />
          <Detail
            label="Capabilities"
            value={registration.record.coreCapabilities
              .map((cap) => NGO_CAPABILITY_LABELS[cap])
              .join(", ")}
          />
          <Detail
            label="Owned assets"
            value={registration.record.ownedAssetsSummary}
          />
          <Detail label="Review note" value={registration.record.reviewNote} />
        </div>
      ) : null}

      {registration.kind === "citizenGroup" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Group ID" value={registration.record.groupId} />
          <Detail
            label="Submitted"
            value={new Date(registration.record.createdTimestamp).toLocaleString()}
          />
          <Detail label="District" value={registration.record.district} />
          <Detail label="Revenue circle" value={registration.record.revenueCircle} />
          <Detail
            label="Primary base"
            value={registration.record.primaryVillageTown}
          />
          <Detail label="Group lead" value={registration.record.leadName} />
          <Detail label="Lead phone" value={registration.record.leadPhone} />
          <Detail label="Alt contact" value={registration.record.leadAltPhone} />
          <Detail
            label="Identity proof"
            value={
              registration.record.leadGovtIdType
                ? `${GOVERNMENT_ID_LABELS[registration.record.leadGovtIdType]} · ${registration.record.leadGovtIdNumber ?? ""}`
                : registration.record.leadGovtIdNumber
            }
          />
          <Detail
            label="Estimated members"
            value={
              registration.record.memberBand
                ? GROUP_MEMBER_BAND_LABELS[registration.record.memberBand]
                : registration.record.estimatedMemberCount
            }
          />
          <Detail
            label="Capabilities"
            value={registration.record.capabilities
              .map((cap) => CITIZEN_GROUP_CAPABILITY_LABELS[cap])
              .join(", ")}
          />
          <Detail label="Review note" value={registration.record.reviewNote} />
        </div>
      ) : null}
    </section>
  );
}
