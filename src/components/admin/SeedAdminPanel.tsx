"use client";

import { useState, useTransition } from "react";
import {
  grantBootstrapAdminRole,
  listSeedModules,
  seedAll,
  seedModule,
} from "@/actions/seedActions";
import { SEED_MODULE_TARGETS } from "@/lib/seeding/shared";
import type {
  SeedModuleCallResult,
  SeedModuleName,
  SeedModuleStatus,
} from "@/lib/seeding/shared";

type Props = {
  initialModules: SeedModuleStatus[];
};

function summarizeSeedResult(result: SeedModuleCallResult): string {
  if (result.skipped) {
    return `${result.module} skipped: ${result.reason ?? "already seeded"}`;
  }

  return `${result.module} seeded (${result.written ?? 0} writes).`;
}

export function SeedAdminPanel({ initialModules }: Props) {
  const [modules, setModules] = useState(initialModules);
  const [flash, setFlash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [lastGrantSummary, setLastGrantSummary] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function runTask(task: () => Promise<void>) {
    startTransition(() => {
      void task().catch((cause: unknown) => {
        setFlash("");
        setError(cause instanceof Error ? cause.message : "Seed action failed.");
      });
    });
  }

  async function refreshModules() {
    const next = await listSeedModules();
    setModules(next.modules);
  }

  function handleRefresh() {
    runTask(async () => {
      await refreshModules();
      setError("");
      setFlash("Seed module status refreshed.");
    });
  }

  function handleSeedModule(module: SeedModuleName) {
    runTask(async () => {
      const result = await seedModule(module);
      await refreshModules();
      setError("");
      setFlash(summarizeSeedResult(result));
    });
  }

  function handleSeedAll() {
    runTask(async () => {
      const result = await seedAll();
      await refreshModules();
      setError("");
      const seededCount = result.modules.filter((entry) => !entry.skipped).length;
      const skippedCount = result.modules.length - seededCount;
      setFlash(
        `Seed all complete: ${seededCount} seeded, ${skippedCount} skipped, ${result.totalWritten} writes.`,
      );
    });
  }

  function handleGrantBootstrapAdminRole() {
    runTask(async () => {
      const result = await grantBootstrapAdminRole();
      setError("");
      setLastGrantSummary(
        `Bootstrap admin role granted to ${result.uid}${result.email ? ` (${result.email})` : ""}.`,
      );
      setFlash("Bootstrap admin role updated.");
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Seed console
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
            Firestore bootstrap controls
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Each module is checked first. If Firestore already contains seed data for that
            module, the seeder is skipped instead of running again.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] disabled:opacity-60"
          >
            Refresh Status
          </button>
          <button
            type="button"
            onClick={handleSeedAll}
            disabled={isPending}
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Seed All
          </button>
          <button
            type="button"
            onClick={handleGrantBootstrapAdminRole}
            disabled={isPending}
            className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] disabled:opacity-60"
          >
            Grant Bootstrap Admin Role
          </button>
        </div>
      </div>

      {flash ? (
        <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {flash}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </div>
      ) : null}

      {lastGrantSummary ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--ink)]">
          {lastGrantSummary}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((entry) => (
          <article
            key={entry.module}
            className="rounded-2xl border border-[var(--line)] bg-white/75 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--ink)]">{entry.module}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {entry.seeded ? "Seed data already present." : "Not seeded yet."}
                </p>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  Firestore target: <code>{SEED_MODULE_TARGETS[entry.module]}</code>
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                  entry.seeded
                    ? "bg-[#dcfce7] text-[#166534]"
                    : "bg-[#fef3c7] text-[#92400e]"
                }`}
              >
                {entry.seeded ? "Seeded" : "Pending"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSeedModule(entry.module)}
              disabled={isPending}
              className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)] disabled:opacity-60"
            >
              Run {entry.module}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
