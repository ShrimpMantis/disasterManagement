"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useFirestoreOfflinePersistence } from "@/hooks/useFirestoreLive";

function FirestoreBootstrap({ children }: { children: ReactNode }) {
  useFirestoreOfflinePersistence();
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <FirestoreBootstrap>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </FirestoreBootstrap>
    </AuthGuard>
  );
}
