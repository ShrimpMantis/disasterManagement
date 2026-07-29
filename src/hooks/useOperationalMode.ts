"use client";

import {
  allowsCommunityVerification,
  allowsIndividualPledging,
  allowsOperationalWrite,
  getOperationalMode,
  isAdminSourcedMode,
  isCrowdMode,
} from "@/lib/features/operationalMode";
import { useAppRole } from "@/hooks/useAppRole";

/**
 * React hook for deployment operational mode + common write-gate helpers.
 */
export function useOperationalMode() {
  const { isAdmin, loading: roleLoading } = useAppRole();
  const mode = getOperationalMode();

  return {
    mode,
    isCrowdMode: isCrowdMode(),
    isAdminSourcedMode: isAdminSourcedMode(),
    isAdmin,
    roleLoading,
    /** Public write tools (requests, fleet add): crowd mode, or admin in admin mode. */
    canOperationalWrite: allowsOperationalWrite(isAdmin),
    /** Community upvote / verify: crowd mode only. */
    canCommunityVerify: allowsCommunityVerification(),
    /** Individual pledging: crowd mode only (NGOs always allowed when verified). */
    canIndividualPledge: allowsIndividualPledging(),
  };
}
