"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { PropsWithChildren } from "react";
import { getGoogleMapsApiKey } from "@/lib/maps/markers";

export function MapsApiProvider({ children }: PropsWithChildren) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return <MapsApiKeyMissing />;
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["marker", "routes", "geometry"]}>
      {children}
    </APIProvider>
  );
}

export function MapsApiKeyMissing({
  title = "Google Maps API key required",
}: {
  title?: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 text-center sm:min-h-[280px] sm:px-6">
      <div>
        <p className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--ink)] sm:text-xl">
          {title}
        </p>
        <p className="mt-2 max-w-md text-xs text-[var(--ink-muted)] sm:text-sm">
          Set <code className="text-[var(--accent-strong)]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          in <code>.env.local</code> (Maps JavaScript API + Directions enabled). Optionally set{" "}
          <code className="text-[var(--accent-strong)]">NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID</code> for
          Advanced Markers.
        </p>
      </div>
    </div>
  );
}
