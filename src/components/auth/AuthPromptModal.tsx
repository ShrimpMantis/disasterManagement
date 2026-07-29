"use client";

import Link from "next/link";
import { X } from "lucide-react";

type AuthPromptModalProps = {
  open: boolean;
  message: string;
  returnTo?: string;
  onClose: () => void;
};

export function AuthPromptModal({
  open,
  message,
  returnTo = "/transport",
  onClose,
}: AuthPromptModalProps) {
  if (!open) return null;

  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Sign in required
            </p>
            <h2
              id="auth-prompt-title"
              className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]"
            >
              Continue with ReliefNet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-3 text-sm text-[var(--ink-muted)]">{message}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={loginHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
