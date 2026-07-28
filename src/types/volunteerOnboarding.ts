import type { GovernmentIdType } from "@/types/registration";

export type AffiliationType = "INDIVIDUAL" | "REGISTERED_NGO" | "CITIZEN_GROUP";

export type GroupVerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED_ACTIVE"
  | "REJECTED";

export type GroupMemberBand = "5_10" | "10_25" | "25_PLUS";

export type CitizenGroupCapability =
  | "HAS_4X4_VEHICLE"
  | "HAS_LOCAL_BOATS"
  | "COOKED_FOOD_DISTRIBUTION"
  | "DEBRIS_CLEARING"
  | "FIRST_AID_CERTIFIED";

/** Spec-aligned individual volunteer profile (affiliation + skills). */
export interface VolunteerProfile {
  volunteerId: string;
  fullName: string;
  phone: string;
  email?: string;
  district: string;
  isAffiliatedWithNgo: boolean;
  affiliatedNgoId?: string;
  affiliatedNgoName?: string;
  skills: string[];
  availabilityStatus: "AVAILABLE" | "DEPLOYED" | "INACTIVE";
}

/** Informal citizen / volunteer group (not an official non-profit). */
export interface CitizenGroup {
  groupId: string;
  groupName: string;
  groupType: "CITIZEN_VOLUNTEER_GROUP";
  district: string;
  revenueCircle: string;
  primaryVillageTown: string;
  leadName: string;
  leadPhone: string;
  leadAltPhone?: string;
  leadGovtIdType?: GovernmentIdType;
  leadGovtIdNumber?: string;
  estimatedMemberCount: number;
  memberBand?: GroupMemberBand;
  capabilities: CitizenGroupCapability[];
  verificationStatus: GroupVerificationStatus;
  verifiedByUserId?: string;
  createdTimestamp: string;
  /** Firebase Auth uid of the submitting account, when known */
  uid?: string;
  reviewedAtTimestamp?: string;
  reviewNote?: string;
}

export const CITIZEN_GROUP_CAPABILITY_LABELS: Record<
  CitizenGroupCapability,
  string
> = {
  HAS_4X4_VEHICLE: "Has 4x4 Vehicle",
  HAS_LOCAL_BOATS: "Has Local Boats",
  COOKED_FOOD_DISTRIBUTION: "Cooked Food Distribution",
  DEBRIS_CLEARING: "Debris Clearing",
  FIRST_AID_CERTIFIED: "First Aid Certified",
};

export const GROUP_MEMBER_BAND_LABELS: Record<GroupMemberBand, string> = {
  "5_10": "5–10 members",
  "10_25": "10–25 members",
  "25_PLUS": "25+ members",
};

/** Representative headcount used when persisting a selected band. */
export const GROUP_MEMBER_BAND_COUNT: Record<GroupMemberBand, number> = {
  "5_10": 8,
  "10_25": 18,
  "25_PLUS": 30,
};

export const GROUP_VERIFICATION_STATUS_LABELS: Record<
  GroupVerificationStatus,
  string
> = {
  PENDING_VERIFICATION: "Pending Verification",
  VERIFIED_ACTIVE: "Verified · Active",
  REJECTED: "Rejected",
};

export const GROUP_VERIFICATION_STATUS_BADGE_CLASS: Record<
  GroupVerificationStatus,
  string
> = {
  PENDING_VERIFICATION: "bg-[#fff7ed] text-[#9a3412]",
  VERIFIED_ACTIVE: "bg-[#dcfce7] text-[#166534]",
  REJECTED: "bg-[#fef2f2] text-[#b91c1c]",
};

/** Sentinel option id for unlisted non-profits in the affiliation picker. */
export const NGO_AFFILIATION_OTHER_ID = "__OTHER__";
