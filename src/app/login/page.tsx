"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthButton } from "@/components/auth/AuthButton";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  clearRecaptcha,
  confirmPhoneOtp,
  loginWithEmail,
  sendPhoneOtp,
} from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";

type SignInMethod = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [method, setMethod] = useState<SignInMethod>("email");
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
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

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
    clearRecaptcha();
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      router.push("/dashboard");
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
    setLoading(true);

    try {
      const result = await sendPhoneOtp(phone);
      setConfirmation(result);
      setInfo("Verification code sent. Enter the OTP to continue.");
    } catch (err) {
      setError(getAuthErrorMessage(err));
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
      await confirmPhoneOtp(confirmation, otp);
      clearRecaptcha();
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your email and password, or verify with your phone number."
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-white/50 p-1">
        <button
          type="button"
          onClick={() => switchMethod("email")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            method === "email"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => switchMethod("phone")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            method === "phone"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Phone
        </button>
      </div>

      {method === "email" ? (
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
      ) : (
        <div className="space-y-5">
          <form className="space-y-5" onSubmit={confirmation ? onVerifyOtp : onSendOtp}>
            <AuthField
              label="Phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              disabled={Boolean(confirmation)}
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
              {confirmation ? "Verify and log in" : "Send verification code"}
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
    </AuthShell>
  );
}
