import type { ReliefItemCategory } from "@/types/reliefTicketCreation";
import type {
  CrowdNeedCategory,
  TicketCreatorType,
  TicketPriority,
  TicketVerificationStatus,
} from "@/types/ticket";
import { COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD } from "@/types/ticket";

export const CROWD_NEED_TO_RELIEF_CATEGORY: Record<
  CrowdNeedCategory,
  ReliefItemCategory
> = {
  FOOD_WATER: "FOOD",
  MEDICAL: "MEDICAL",
  RESCUE_EQUIPMENT: "RESCUE_OPERATION",
  SHELTER_KIT: "SHELTER",
};

export const CROWD_NEED_DEFAULT_UNIT: Record<CrowdNeedCategory, string> = {
  FOOD_WATER: "Units",
  MEDICAL: "Kits",
  RESCUE_EQUIPMENT: "Units",
  SHELTER_KIT: "Kits",
};

export function resolveVerificationStatusFromUpvotes(
  upvoteCount: number,
  current: TicketVerificationStatus | undefined,
): TicketVerificationStatus {
  if (current === "OFFICIALLY_VERIFIED") return "OFFICIALLY_VERIFIED";
  if (upvoteCount >= COMMUNITY_CONFIRMATION_UPVOTE_THRESHOLD) {
    return "COMMUNITY_CONFIRMED";
  }
  return current === "COMMUNITY_CONFIRMED"
    ? "CROWD_REPORTED"
    : (current ?? "CROWD_REPORTED");
}

export function mapCreatorTypeFromProfile(input: {
  isAdmin: boolean;
  userType?: string | null;
  contactRole?: string | null;
}): TicketCreatorType {
  if (input.isAdmin) return "ADMIN";
  if (input.userType === "NON_PROFIT") return "NON_PROFIT";
  const role = input.contactRole?.toLowerCase() ?? "";
  if (
    role.includes("village") ||
    role.includes("gaon") ||
    role.includes("burah") ||
    role.includes("lead")
  ) {
    return "VILLAGE_LEAD";
  }
  return "CITIZEN";
}

export function urgencyToPriority(
  urgency: "CRITICAL" | "HIGH" | "MEDIUM",
): TicketPriority {
  return urgency;
}
