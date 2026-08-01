"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ReliefCoordinationPage } from "@/components/ngo/ReliefCoordinationPage";

export default function ReliefCoordinationRoutePage() {
  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Coordination matrix
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-3xl lg:text-4xl">
            Relief coordination
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">
            Switch views with the tab bar or URL query (`?tab=coverage|pledges|directory`).
            Village and NGO selections stay shared across tabs.
          </p>
        </header>

        <ReliefCoordinationPage />
      </main>
    </AppShell>
  );
}
