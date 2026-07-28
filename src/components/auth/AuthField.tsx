import type { InputHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AuthField({ label, error, id, className = "", ...props }: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="mb-2 block text-sm font-medium text-[var(--ink)]">{label}</span>
      <input
        id={fieldId}
        className={`w-full rounded-xl border bg-white/70 px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] ${
          error ? "border-[var(--danger)]" : "border-[var(--line)]"
        } ${className}`}
        {...props}
      />
      {error ? <span className="mt-1.5 block text-sm text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
