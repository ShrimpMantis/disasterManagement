"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { confirmPasswordUpdate } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const oobCodeFromQuery = useMemo(() => {
    return searchParams.get("oobCode") || searchParams.get("token") || "";
  }, [searchParams]);

  const [manualOobCode, setManualOobCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const code = oobCodeFromQuery || manualOobCode;
    if (!code) {
      setError("Reset code is missing. Open the link from your email.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordUpdate(code, password);
      setMessage("Password updated. You can log in now.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a new password using the code from your reset email."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {!oobCodeFromQuery ? (
          <AuthField
            label="Reset code (oobCode)"
            name="oobCode"
            value={manualOobCode}
            onChange={(event) => setManualOobCode(event.target.value)}
            required
          />
        ) : null}
        <AuthField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
        <AuthField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={6}
        />

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
        ) : null}

        {message ? (
          <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
            {message}
          </p>
        ) : null}

        <AuthButton type="submit" loading={loading}>
          Update password
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">
        <Link
          href="/login"
          className="font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
        >
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Set new password" subtitle="Loading reset form…">
          <p className="text-sm text-[var(--ink-muted)]">Please wait…</p>
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
