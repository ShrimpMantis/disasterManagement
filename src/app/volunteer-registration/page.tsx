"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RegistrationPortal } from "@/components/registration/RegistrationPortal";

export default function VolunteerRegistrationPage() {
  return (
    <AppShell>
      <main className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <div className="absolute right-0 top-40 h-48 w-48 rounded-full bg-[#cfe4ef] blur-3xl" />
        </div>
        <RegistrationPortal />
      </main>
    </AppShell>
  );
}
