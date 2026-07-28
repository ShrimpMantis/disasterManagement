"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isAdminRole, resolveAppRole, type AppRole } from "@/lib/auth/roles";

export function useAppRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) {
          setRole("user");
          setLoading(false);
        }
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        if (!cancelled) {
          setRole(resolveAppRole(user, token.claims as Record<string, unknown>));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRole(resolveAppRole(user, null));
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    role,
    isAdmin: isAdminRole(role),
    loading: authLoading || loading,
  };
}
