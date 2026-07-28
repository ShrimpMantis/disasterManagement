import type { User } from "firebase/auth";

export type AppRole = "admin" | "user";

function adminEmailAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve app role from Firebase custom claims and/or
 * NEXT_PUBLIC_ADMIN_EMAILS (comma-separated).
 */
export function resolveAppRole(
  user: User | null,
  tokenClaims?: Record<string, unknown> | null,
): AppRole {
  if (!user) return "user";

  const claimRole = tokenClaims?.role;
  console.log("claimRole", claimRole);
  if (claimRole === "admin" || claimRole === "ADMIN") return "admin";

  const email = user.email?.trim().toLowerCase();
  if (email && adminEmailAllowlist().includes(email)) return "admin"; 

  return "user";
}

export function isAdminRole(role: AppRole): boolean {
  return role === "admin";
}
