"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { sendPasswordReset } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setMessage(
        "If an account exists for that email, a password reset link has been sent. Check your inbox.",
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter the email for your account. Password reset applies to email/password accounts."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
        ) : null}

        {message ? (
          <div className="space-y-2 rounded-xl bg-[var(--accent-soft)] px-3 py-3 text-sm text-[var(--accent-strong)]">
            <p>{message}</p>
            <p>
              After opening the email link, you can also finish on{" "}
              <Link href="/reset-password" className="font-semibold underline underline-offset-2">
                the reset password page
              </Link>{" "}
              if your Firebase action URL is configured to this app.
            </p>
          </div>
        ) : null}

        <AuthButton type="submit" loading={loading}>
          Send reset email
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">
        Remembered it?{" "}
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
