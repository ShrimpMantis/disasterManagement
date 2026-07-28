export type VolunteerSkill =
  | "SWIMMING_RESCUE"
  | "FIRST_AID_MEDICAL"
  | "COMMUNITY_COOKING"
  | "CAMP_MANAGEMENT"
  | "HAM_RADIO_COMM"
  | "HEAVY_VEHICLE_DRIVER"
  | "CHILD_ELDERLY_CARE";

export type VerificationStatus =
  | "PENDING_VERIFICATION"
  | "APPROVED_ACTIVE"
  | "REJECTED"
  | "SUSPENDED";

export type VolunteerAvailability =
  | "IMMEDIATELY_AVAILABLE"
  | "AVAILABLE_WEEKENDS"
  | "DEPLOYED"
  | "UNAVAILABLE";

export type GovernmentIdType = "AADHAAR" | "VOTER_ID" | "DRIVING_LICENSE";

export type NGOCapability =
  | "FOOD_DISTRIBUTION"
  | "MEDICAL_CAMPS"
  | "SHELTER_TARPS"
  | "WATER_PURIFICATION"
  | "BOAT_RESCUE";

export interface VolunteerRegistration {
  volunteerId: string;
  /** Firebase Auth uid of the submitting account, when known */
  uid?: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  homeDistrict: string;
  preferredOperatingDistricts: string[];
  /** Whether the volunteer is affiliated with an official NGO / non-profit. */
  isAffiliatedWithNgo: boolean;
  /** References operational `ngos` / directory id when selected from list. */
  affiliatedNgoId?: string;
  /** Display / free-text name (listed NGO or unlisted org). */
  affiliatedNgoName?: string;
  /** Optional registration / Darpan ID when NGO is unlisted. */
  affiliatedNgoRegistrationId?: string;
  skills: VolunteerSkill[];
  hasMedicalLicense: boolean;
  medicalLicenseDetails?: string;
  governmentIdType: GovernmentIdType;
  governmentIdNumberLast4: string;
  availabilityStatus: VolunteerAvailability;
  verificationStatus: VerificationStatus;
  createdAtTimestamp: string;
  reviewedAtTimestamp?: string;
  reviewNote?: string;
}

export interface NGORegistration {
  ngoId: string;
  /** Firebase Auth uid of the submitting account, when known */
  uid?: string;
  organizationLegalName: string;
  registrationNumber: string;
  primaryDistrictOfOperation: string;
  operatingDistricts: string[];
  headOfOrgName: string;
  headOfOrgPhone: string;
  fieldPocName: string;
  fieldPocPhone: string;
  email: string;
  coreCapabilities: NGOCapability[];
  activeVolunteerCount: number;
  ownedAssetsSummary?: string;
  verificationStatus: VerificationStatus;
  createdAtTimestamp: string;
  reviewedAtTimestamp?: string;
  reviewNote?: string;
}

export const VOLUNTEER_SKILL_LABELS: Record<VolunteerSkill, string> = {
  SWIMMING_RESCUE: "Swimming & Rescue",
  FIRST_AID_MEDICAL: "First Aid / Medical",
  COMMUNITY_COOKING: "Community Cooking",
  CAMP_MANAGEMENT: "Camp Management",
  HAM_RADIO_COMM: "Ham Radio / Comms",
  HEAVY_VEHICLE_DRIVER: "Heavy Vehicle Driver",
  CHILD_ELDERLY_CARE: "Child & Elderly Care",
};

export const NGO_CAPABILITY_LABELS: Record<NGOCapability, string> = {
  FOOD_DISTRIBUTION: "Food Distribution",
  MEDICAL_CAMPS: "Medical Camps",
  SHELTER_TARPS: "Shelter / Tarps",
  WATER_PURIFICATION: "Water Purification",
  BOAT_RESCUE: "Boat Rescue",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING_VERIFICATION: "Pending Verification",
  APPROVED_ACTIVE: "Approved · Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const VERIFICATION_STATUS_BADGE_CLASS: Record<VerificationStatus, string> = {
  PENDING_VERIFICATION: "bg-[#fff7ed] text-[#9a3412]",
  APPROVED_ACTIVE: "bg-[#dcfce7] text-[#166534]",
  REJECTED: "bg-[#fef2f2] text-[#b91c1c]",
  SUSPENDED: "bg-[#f3f4f6] text-[#374151]",
};

export const AVAILABILITY_LABELS: Record<VolunteerAvailability, string> = {
  IMMEDIATELY_AVAILABLE: "Immediately Available",
  AVAILABLE_WEEKENDS: "Available Weekends / On Notice",
  DEPLOYED: "Currently Deployed",
  UNAVAILABLE: "Unavailable",
};

export const GOVERNMENT_ID_LABELS: Record<GovernmentIdType, string> = {
  AADHAAR: "Aadhaar",
  VOTER_ID: "Voter ID",
  DRIVING_LICENSE: "Driving License",
};

export const ASSAM_REGISTRATION_DISTRICTS = [
  "Barpeta",
  "Cachar",
  "Dhemaji",
  "Dhubri",
  "Dibrugarh",
  "Goalpara",
  "Golaghat",
  "Hailakandi",
  "Jorhat",
  "Kamrup",
  "Kamrup Metropolitan",
  "Karimganj",
  "Lakhimpur",
  "Majuli",
  "Morigaon",
  "Nalbari",
  "Sivasagar",
  "Tinsukia",
] as const;

export type RegistrationDistrict = (typeof ASSAM_REGISTRATION_DISTRICTS)[number];
