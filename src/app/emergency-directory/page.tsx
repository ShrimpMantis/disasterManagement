"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchEmergencyDirectorySnapshot } from "@/actions/emergencyAssetActions";
import { AppShell } from "@/components/layout/AppShell";
import { EmergencyDirectoryModule } from "@/components/emergency/EmergencyDirectoryModule";
import type { EmergencyDirectoryTab } from "@/types/emergencyDirectory";

function parseTab(value: string | null): EmergencyDirectoryTab {
  if (value === "police" || value === "army" || value === "hospitals") return value;
  return "hospitals";
}

function EmergencyDirectoryContent() {
  const searchParams = useSearchParams();
  const initialTab = parseTab(searchParams.get("tab"));
  const initialDistrict = searchParams.get("district");
  const [flash, setFlash] = useState("");
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({
    hospitals: [],
    police: [],
    armyCamps: [],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const result = await fetchEmergencyDirectorySnapshot();
        if (result.ok) {
          setSnapshot(result.data);
        } else {
          setFlash(result.error);
        }
        setLoading(false);
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const districtLabel = useMemo(() => {
    if (!initialDistrict) return null;
    return initialDistrict === "Kamrup Metropolitan"
      ? "Guwahati"
      : initialDistrict;
  }, [initialDistrict]);

  return (
    <>
      <header className="animate-rise border-b border-[var(--line)] pb-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Emergency response contacts
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          Emergency directory
          {districtLabel ? ` · ${districtLabel}` : ""}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
          Hospitals & ICU beds, police stations, and army camps with proximity
          sorting. Open a district from the dashboard to jump straight into that
          filter.
        </p>
      </header>

      {flash ? (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
          {flash}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading directory data…</p>
      ) : null}

      <EmergencyDirectoryModule
        hospitals={snapshot.hospitals}
        police={snapshot.police}
        armyCamps={snapshot.armyCamps}
        initialTab={initialTab}
        initialDistrict={initialDistrict}
        onLocate={() => undefined}
        onRequestSupport={(payload) =>
          setFlash(
            `Support ticket queued for ${payload.kind} · ${payload.entityName} (${payload.contactPhone}).`,
          )
        }
      />
    </>
  );
}

export default function EmergencyDirectoryPage() {
  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <p className="text-sm text-[var(--ink-muted)]">Loading directory…</p>
          }
        >
          <EmergencyDirectoryContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
