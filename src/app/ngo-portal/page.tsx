"use client";

import { AppShell } from "@/components/layout/AppShell";
import { NGOSelfServicePortal } from "@/components/ngoPortal/NGOSelfServicePortal";

export default function NGOPortalPage() {
  return (
    <AppShell allowGuest>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Self-service pledging
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Pledge help portal
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Browse unmet village demand tickets, submit itemized pledges, and manage active
            shipments through delivery confirmation.
          </p>
        </header>

        <NGOSelfServicePortal />
      </main>
    </AppShell>
  );
}
