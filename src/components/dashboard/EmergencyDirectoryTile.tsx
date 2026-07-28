"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchEmergencyDirectorySnapshot } from "@/actions/emergencyAssetActions";
import type { EmergencyDirectorySnapshot } from "@/actions/emergencyAssetActions";
import { Building2, ChevronRight, Hospital, Shield } from "lucide-react";
import type { EmergencyDirectoryTab } from "@/types/emergencyDirectory";

type DistrictSummary = {
  district: string;
  hospitals: number;
  police: number;
  army: number;
};

function buildDistrictSummaries(input: {
  hospitals: Array<{ district: string }>;
  police: Array<{ district: string }>;
  armyCamps: Array<{ district: string }>;
}): DistrictSummary[] {
  const map = new Map<string, DistrictSummary>();

  function ensure(district: string): DistrictSummary {
    const existing = map.get(district);
    if (existing) return existing;
    const created: DistrictSummary = {
      district,
      hospitals: 0,
      police: 0,
      army: 0,
    };
    map.set(district, created);
    return created;
  }

  for (const hospital of input.hospitals) {
    ensure(hospital.district).hospitals += 1;
  }
  for (const station of input.police) {
    ensure(station.district).police += 1;
  }
  for (const camp of input.armyCamps) {
    ensure(camp.district).army += 1;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.district.localeCompare(b.district),
  );
}

function districtLabel(district: string): string {
  return district === "Kamrup Metropolitan" ? "Guwahati" : district;
}

function directoryHref(district: string, tab: EmergencyDirectoryTab): string {
  const params = new URLSearchParams({
    district,
    tab,
  });
  return `/emergency-directory?${params.toString()}`;
}

export function EmergencyDirectoryTile() {
  const [snapshot, setSnapshot] = useState<EmergencyDirectorySnapshot>({
    hospitals: [],
    police: [],
    armyCamps: [],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchEmergencyDirectorySnapshot().then((result) => {
        if (result.ok) setSnapshot(result.data);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const districts = useMemo(() => buildDistrictSummaries(snapshot), [snapshot]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
            <Building2 className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.14em]">
              Emergency directory
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
            Hospitals, police & army by district
          </h2>
          <p className="text-xs text-[var(--ink-muted)]">
            Pick a district service to open that tab in the directory grid
          </p>
        </div>
        <Link
          href="/emergency-directory"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {districts.map((entry) => (
          <article
            key={entry.district}
            className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
          >
            <Link
              href={directoryHref(entry.district, "hospitals")}
              className="mb-2 flex items-center justify-between gap-2 font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {districtLabel(entry.district)}
              <ChevronRight className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden />
            </Link>

            <div className="grid gap-1.5">
              <Link
                href={directoryHref(entry.district, "hospitals")}
                className="inline-flex items-center justify-between rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Hospital className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  Hospitals & Beds
                </span>
                <span className="text-[var(--ink-muted)]">{entry.hospitals}</span>
              </Link>
              <Link
                href={directoryHref(entry.district, "police")}
                className="inline-flex items-center justify-between rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  Police
                </span>
                <span className="text-[var(--ink-muted)]">{entry.police}</span>
              </Link>
              <Link
                href={directoryHref(entry.district, "army")}
                className="inline-flex items-center justify-between rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  Army Camps
                </span>
                <span className="text-[var(--ink-muted)]">{entry.army}</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
