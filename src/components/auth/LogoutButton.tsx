"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { logoutFirebase } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LogoutButton({ className = "", compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await logoutFirebase();
      router.push("/login");
    } catch (error) {
      console.error(getAuthErrorMessage(error));
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthButton
      type="button"
      loading={loading}
      onClick={logout}
      className={className}
      title="Log out"
      aria-label="Log out"
    >
      {compact && !loading ? "Out" : "Log out"}
    </AuthButton>
  );
}
