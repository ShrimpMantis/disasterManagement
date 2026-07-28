"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { WarehouseModule } from "@/components/warehouse/WarehouseModule";

function WarehousePageBody() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="animate-rise border-b border-[var(--line)] pb-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Relief logistics · storage network
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          Multi-district warehouse module
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
          Monitor statewide storage headroom, drill into district facilities, and
          audit stocked weight against remaining capacity.
        </p>
      </header>

      <WarehouseModule />
    </main>
  );
}

export default function WarehousesPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <main className="mx-auto max-w-[1400px] px-4 py-8 text-sm text-[var(--ink-muted)]">
            Loading warehouses…
          </main>
        }
      >
        <WarehousePageBody />
      </Suspense>
    </AppShell>
  );
}
