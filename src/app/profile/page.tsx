"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserLabel, getUserSecondary } from "@/lib/firebase/auth";

function ProfileContent() {
  const { user } = useAuth();

  const fields = [
    { label: "Display name", value: user?.displayName || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Phone", value: user?.phoneNumber || "—" },
    { label: "User ID", value: user?.uid || "—" },
    {
      label: "Email verified",
      value: user?.emailVerified ? "Yes" : user?.email ? "No" : "—",
    },
    {
      label: "Last sign-in",
      value: user?.metadata.lastSignInTime || "—",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <div className="animate-rise rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur-md sm:p-10">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Account
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl tracking-tight text-[var(--ink)]">
          User profile
        </h1>
        <p className="mt-3 text-[var(--ink-muted)]">
          Signed in as <span className="font-medium text-[var(--ink)]">{getUserLabel(user)}</span>
          {" · "}
          {getUserSecondary(user)}
        </p>

        <dl className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-sm font-medium text-[var(--ink-muted)]">{field.label}</dt>
              <dd className="break-all text-sm text-[var(--ink)] sm:text-right">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileContent />
    </AppShell>
  );
}
