"use client";

import { AppShell } from "@/components/layout/AppShell";
import { VillageAssetDirectory } from "@/components/villageAssets/VillageAssetDirectory";

export default function EmergencyAssetsPage() {
  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Local infrastructure & emergency assets
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-3xl lg:text-4xl">
            Emergency asset & infrastructure directory
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Register hyper-local boats and transport, elevated safe assembly zones, and
            relief camp facilities so district officers can mobilize village-level assets
            when central equipment is not enough.
          </p>
        </header>

        <VillageAssetDirectory />
      </main>
    </AppShell>
  );
}
