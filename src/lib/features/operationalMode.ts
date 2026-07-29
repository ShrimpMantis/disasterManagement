/**
 * Deployment-level operational mode for ReliefNet Assam.
 *
 * Set `NEXT_PUBLIC_OPERATIONAL_MODE` at build time:
 * - `CROWDSOURCED`  — community contribution tools (default / public deploy)
 * - `ADMIN_SOURCED` — verified agency workflow; public writes hidden
 *
 * Dual hosts (e.g. crowd.reliefnet.in vs admin.reliefnet.in) share one
 * codebase and differ only by this build-time env value.
 */

export const OPERATIONAL_MODES = ["CROWDSOURCED", "ADMIN_SOURCED"] as const;

export type OperationalMode = (typeof OPERATIONAL_MODES)[number];

const DEFAULT_MODE: OperationalMode = "CROWDSOURCED";

function normalizeMode(raw: string | undefined): OperationalMode {
  const value = raw?.trim().toUpperCase();
  if (value === "ADMIN_SOURCED" || value === "ADMIN") return "ADMIN_SOURCED";
  if (value === "CROWDSOURCED" || value === "CROWD") return "CROWDSOURCED";
  return DEFAULT_MODE;
}

/** Resolved once from the build-time public env (inlined by Next.js). */
export const OPERATIONAL_MODE: OperationalMode = normalizeMode(
  process.env.NEXT_PUBLIC_OPERATIONAL_MODE,
);

export function getOperationalMode(): OperationalMode {
  return OPERATIONAL_MODE;
}

export function isCrowdMode(): boolean {
  return OPERATIONAL_MODE === "CROWDSOURCED";
}

export function isAdminSourcedMode(): boolean {
  return OPERATIONAL_MODE === "ADMIN_SOURCED";
}

/**
 * Community write tools (public SOS / transport requests, inline fleet add):
 * available to everyone in crowdsourced mode; admins only in admin-sourced mode.
 */
export function allowsOperationalWrite(isAdminUser: boolean): boolean {
  return isCrowdMode() || isAdminUser;
}

/**
 * Community upvote / verify badges: crowdsourced mode only.
 * Admin-sourced statuses come from verified government updates.
 */
export function allowsCommunityVerification(): boolean {
  return isCrowdMode();
}

/**
 * Individual / citizen pledging: open in crowdsourced mode.
 * Admin-sourced mode locks pledging to verified non-profit partners.
 */
export function allowsIndividualPledging(): boolean {
  return isCrowdMode();
}
