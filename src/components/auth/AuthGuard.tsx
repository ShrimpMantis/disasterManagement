"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGuard({
  children,
  allowGuest = false,
}: {
  children: ReactNode;
  /** When true, guests can view the page; mutations should prompt sign-in. */
  allowGuest?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !allowGuest) {
      router.replace("/login");
    }
  }, [loading, user, router, allowGuest]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-[var(--ink-muted)]">Checking authentication…</p>
      </main>
    );
  }

  if (!user && !allowGuest) {
    return null;
  }

  return <>{children}</>;
}
