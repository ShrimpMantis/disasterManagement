"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { LoginValuePanel } from "@/components/auth/LoginValuePanel";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  clearRecaptcha,
  confirmPhoneOtp,
  loginWithEmail,
  sendPhoneOtp,
} from "@/lib/firebase/auth";
import { getAuthErrorMessage, phoneMissingCountryCode } from "@/lib/firebase/errors";
import { ensureUserProfile } from "@/lib/firestore/users";

type SignInMethod = "email" | "phone";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );
  const { user, loading: authLoading } = useAuth();

  const [method, setMethod] = useState<SignInMethod>("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(returnTo);
    }
  }, [authLoading, user, router, returnTo]);

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  function switchMethod(next: SignInMethod) {
    setMethod(next);
    setError("");
    setInfo("");
    setOtp("");
    setConfirmation(null);
    // Don't clearRecaptcha() here — verifier.clear() mutates #recaptcha-container
    // and can break React's DOM, which blocks toggling to Phone.
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      router.push(returnTo);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const trimmedPhone = phone.trim();
    if (!trimmedPhone.startsWith("+")) {
      setError(
        "Country code is required. Start with + and your country code (e.g. +919876543210).",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await sendPhoneOtp(trimmedPhone);
      setConfirmation(result);
      setInfo("Verification code sent. Enter the OTP to continue.");
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(
        phoneMissingCountryCode(trimmedPhone)
          ? "Country code is required. Start with + and your country code (e.g. +919876543210)."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation) {
      setError("Request a verification code first.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const authUser = await confirmPhoneOtp(confirmation, otp);
      // Seed a minimal profile as ACTIVE immediately after OTP sign-in.
      // (Write permissions in ADMIN_SOURCED are still gated by role / mode.)
      await ensureUserProfile(authUser, {
        userType: "INDIVIDUAL",
        organizationId: null,
        organizationName: null,
      });
      clearRecaptcha();
      router.push(returnTo);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign In or Create Account"
      subtitle="Takes under 10 seconds. No password needed."
      aside={<LoginValuePanel />}
    >
      {method === "phone" ? (
        <div className="space-y-5">
          <form className="space-y-5" onSubmit={confirmation ? onVerifyOtp : onSendOtp}>
            <AuthField
              label="Mobile phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              disabled={Boolean(confirmation)}
              hint="Include your country code with a leading + (e.g. +91 for India)."
            />

            {confirmation ? (
              <AuthField
                label="Verification code"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            ) : null}

            {info ? (
              <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
                {info}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
            ) : null}

            <AuthButton type="submit" loading={loading}>
              {confirmation ? "Verify and continue" : "Request OTP"}
            </AuthButton>
          </form>

          {confirmation ? (
            <button
              type="button"
              className="w-full text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
              onClick={() => {
                setConfirmation(null);
                setOtp("");
                setInfo("");
                setError("");
                clearRecaptcha();
              }}
            >
              Use a different phone number
            </button>
          ) : null}

          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[var(--line)]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              or
            </span>
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--bg-base)]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => switchMethod("email")}
            className="w-full text-sm font-medium text-[var(--ink-muted)] transition hover:text-[var(--accent)]"
          >
            Prefer email and password?
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <form className="space-y-5" onSubmit={onEmailSubmit}>
            <AuthField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <AuthField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
              >
                Forgot password?
              </Link>
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
            ) : null}

            <AuthButton type="submit" loading={loading}>
              Log in with email
            </AuthButton>
          </form>

          <button
            type="button"
            onClick={() => switchMethod("phone")}
            className="w-full text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
          >
            Use phone number instead
          </button>
        </div>
      )}

      <div id="recaptcha-container" />

      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
        >
          Create an account
        </Link>
        {" · "}
        <Link
          href="/volunteer-registration"
          className="font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
        >
          Volunteer / NGO registration
        </Link>
      </p>

      <p className="mt-4 text-center text-xs leading-relaxed text-[var(--ink-muted)]">
        By continuing, you agree to coordinate responsibly in accordance with
        local safety protocols.
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-[var(--ink-muted)]">Loading sign-in…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
