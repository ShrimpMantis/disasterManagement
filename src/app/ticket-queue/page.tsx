"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TicketOperationsConsole } from "@/components/tickets/TicketOperationsConsole";

export default function TicketQueuePage() {
  return (
    <AppShell allowGuest>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-4 px-3 py-5 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-4 sm:pb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-muted)] sm:text-sm">
            Epic 4 · Demand queue
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-3xl lg:text-4xl">
            Relief demand & ticket queue
          </h1>
          <p className="mt-2 max-w-3xl text-xs text-[var(--ink-muted)] sm:text-sm">
            Multi-channel ingestion, village-level deduplication, lifecycle enforcement, and
            operator queue management. Crowdsourced reporters can submit urgent needs after
            phone sign-in.
          </p>
        </header>

        <TicketOperationsConsole />
      </main>
    </AppShell>
  );
}
