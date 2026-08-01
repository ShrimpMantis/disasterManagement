import { AppShell } from "@/components/layout/AppShell";
import { SeedAdminPanel } from "@/components/admin/SeedAdminPanel";
import { listSeedModules } from "@/actions/seedActions";

export const dynamic = "force-dynamic";

export default async function SeedAdminPage() {
  const seedState = await listSeedModules();

  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Administration
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-3xl lg:text-4xl">
            Seed Data Console
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Call backend seed functions from the frontend app, inspect current seed state,
            and avoid reseeding modules that already contain Firestore data.
          </p>
        </header>

        <SeedAdminPanel initialModules={seedState.modules} />
      </main>
    </AppShell>
  );
}
