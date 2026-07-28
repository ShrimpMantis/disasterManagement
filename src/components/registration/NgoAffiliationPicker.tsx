"use client";

import { useMemo, useState } from "react";
import {
  filterAffiliationNgoOptions,
  type AffiliationNgoOption,
} from "@/lib/registration/affiliationNgos";
import { NGO_AFFILIATION_OTHER_ID } from "@/types/volunteerOnboarding";

type NgoAffiliationPickerProps = {
  options: AffiliationNgoOption[];
  selectedNgoId: string | null;
  selectedNgoName: string;
  otherName: string;
  otherRegistrationId: string;
  onSelectListed: (option: AffiliationNgoOption) => void;
  onSelectOther: () => void;
  onOtherNameChange: (value: string) => void;
  onOtherRegistrationIdChange: (value: string) => void;
  onClear: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

export function NgoAffiliationPicker({
  options,
  selectedNgoId,
  selectedNgoName,
  otherName,
  otherRegistrationId,
  onSelectListed,
  onSelectOther,
  onOtherNameChange,
  onOtherRegistrationIdChange,
  onClear,
}: NgoAffiliationPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(
    () => filterAffiliationNgoOptions(options, query),
    [options, query],
  );

  const isOther = selectedNgoId === NGO_AFFILIATION_OTHER_ID;
  const displayValue = isOther
    ? "Other / My Non-Profit is not listed"
    : selectedNgoName;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
          Search registered Non-Profit / NGO
          <span className="text-[var(--danger)]"> *</span>
        </span>
        {selectedNgoId && !isOther ? (
          <div className="flex items-center gap-2">
            <input readOnly value={displayValue} className={inputClass} />
            <button
              type="button"
              onClick={() => {
                onClear();
                setQuery("");
                setOpen(false);
              }}
              className="shrink-0 rounded-xl border border-[var(--line)] px-3 py-2.5 text-xs font-semibold text-[var(--ink-muted)]"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={isOther ? "" : query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                if (isOther) onClear();
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                // Allow option click before closing
                window.setTimeout(() => setOpen(false), 150);
              }}
              className={inputClass}
              placeholder="Type organization name…"
              autoComplete="off"
            />
            {open ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--line)] bg-white py-1 shadow-lg">
                {matches.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onSelectListed(option);
                        setQuery(option.name);
                        setOpen(false);
                      }}
                    >
                      {option.name}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="w-full border-t border-[var(--line)] px-3 py-2 text-left text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelectOther();
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    Other / My Non-Profit is not listed
                  </button>
                </li>
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-[var(--ink-muted)]">
                    No matches in the directory. Choose “Other” to enter a name.
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        )}
      </label>

      {isOther ? (
        <div className="grid gap-3 rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Organization name
              <span className="text-[var(--danger)]"> *</span>
            </span>
            <input
              required
              value={otherName}
              onChange={(event) => onOtherNameChange(event.target.value)}
              className={inputClass}
              placeholder="Legal / common name of your non-profit"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Registration / Darpan ID (if known)
            </span>
            <input
              value={otherRegistrationId}
              onChange={(event) =>
                onOtherRegistrationIdChange(event.target.value)
              }
              className={inputClass}
              placeholder="Optional"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
            }}
            className="text-left text-xs font-semibold text-[var(--ink-muted)] underline sm:col-span-2"
          >
            Back to directory search
          </button>
        </div>
      ) : null}
    </div>
  );
}
