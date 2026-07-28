"use client";

import type { ValidationError } from "@/lib/villages/types";

type ValidationErrorModalProps = {
  open: boolean;
  errors: ValidationError[];
  onClose: () => void;
};

export function ValidationErrorModal({
  open,
  errors,
  onClose,
}: ValidationErrorModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-error-title"
      onClick={onClose}
    >
      <div
        className="animate-rise max-h-[80vh] w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--line)] px-6 py-5">
          <h2
            id="validation-error-title"
            className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]"
          >
            Upload validation failed
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Fix the highlighted cells and try again. The grid was not updated.
          </p>
        </div>

        <ul className="max-h-[48vh] space-y-2 overflow-y-auto px-6 py-4">
          {errors.map((error) => (
            <li
              key={`${error.row}-${error.column}-${error.field}-${error.message}`}
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]"
            >
              <p className="font-semibold">
                Cell {error.column}
                {error.row}
              </p>
              <p className="mt-1 leading-relaxed">{error.message}</p>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
