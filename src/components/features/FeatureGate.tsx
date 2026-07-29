"use client";

import type { ReactNode } from "react";
import {
  getOperationalMode,
  type OperationalMode,
} from "@/lib/features/operationalMode";

type FeatureGateProps = {
  /** Render children only when the deployment mode matches. */
  mode: OperationalMode | OperationalMode[];
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Conditionally render UI by `NEXT_PUBLIC_OPERATIONAL_MODE`.
 *
 * @example
 * <FeatureGate mode="CROWDSOURCED">
 *   <PublicPledgeButton />
 * </FeatureGate>
 *
 * <FeatureGate mode="ADMIN_SOURCED">
 *   <AdminDispatchControls />
 * </FeatureGate>
 */
export function FeatureGate({
  mode,
  children,
  fallback = null,
}: FeatureGateProps) {
  const current = getOperationalMode();
  const allowed = Array.isArray(mode)
    ? mode.includes(current)
    : mode === current;

  return <>{allowed ? children : fallback}</>;
}
