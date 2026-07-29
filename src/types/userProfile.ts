/**
 * Firestore `/users/{uid}` profile used to scope Pledge Portal identity
 * and My Pledges & Shipments queries.
 */
export type UserType = "INDIVIDUAL" | "NON_PROFIT" | "ADMIN";

export type UserRole = "CITIZEN" | "VOLUNTEER" | "NON_PROFIT" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserProfile {
  uid: string;
  userType: UserType;
  /** Primary phone number associated with phone/OTP sign-in (when present). */
  phone?: string | null;
  /** Affiliated non-profit id when `userType` is NON_PROFIT (or affiliated). */
  organizationId: string | null;
  /** Display name for the affiliated non-profit. */
  organizationName: string | null;
  displayName?: string | null;
  email?: string | null;
  /**
   * Deployment trust gate. In CROWDSOURCED mode, this should be set to ACTIVE
   * immediately upon successful OTP verification.
   */
  status?: UserStatus;
  /** Simplified role label used by UI and badge copy. */
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
  /** Lifetime units delivered across fulfilled pledges. */
  totalUnitsDelivered?: number;
  /** Badge labels unlocked from contribution thresholds. */
  milestoneBadges?: string[];
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  INDIVIDUAL: "Individual",
  NON_PROFIT: "Non-profit",
  ADMIN: "Admin",
};
