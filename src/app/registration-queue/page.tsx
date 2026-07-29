"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FeatureGate } from "@/components/features/FeatureGate";
import { VerificationQueueGrid } from "@/components/registration/VerificationQueueGrid";
import Link from "next/link";

export default function RegistrationQueuePage() {
  const [flash, setFlash] = useState("");

  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Workforce onboarding control
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Volunteer & NGO verification queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Review self-registered volunteers and NGOs. Approving an entry
            activates them on the engaged workforce roster.{" "}
            <Link
              href="/volunteer-registration"
              className="font-semibold text-[var(--accent)]"
            >
              Open public registration portal
            </Link>
          </p>
        </header>

        <FeatureGate
          mode="ADMIN_SOURCED"
          fallback={
            <p className="mt-6 text-sm text-[var(--ink-muted)]">
              Registration queue is disabled in crowdsourced mode. New
              registrations activate immediately.
            </p>
          }
        >
          {flash ? (
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
              {flash}
            </div>
          ) : null}

          <VerificationQueueGrid onFlash={setFlash} />
        </FeatureGate>
      </main>
    </AppShell>
  );
}
