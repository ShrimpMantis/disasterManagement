"use client";

import { useState } from "react";
import { Siren, X, Zap } from "lucide-react";
import type { RapidDispatchAssetType, SOSAlertTicket } from "@/types/sos";
import {
  RAPID_DISPATCH_ASSET_LABELS,
  SOS_CATEGORY_LABELS,
} from "@/types/sos";

export type RapidDispatchAssetOption = {
  id: string;
  type: RapidDispatchAssetType;
  label: string;
  status: string;
  etaMinutes: number;
};

type RapidDispatchDrawerProps = {
  open: boolean;
  sos: SOSAlertTicket | null;
  assets?: RapidDispatchAssetOption[];
  onClose: () => void;
  onConfirm: (assetId: string, assetLabel: string) => void;
};

export function RapidDispatchDrawer({
  open,
  sos,
  assets = [],
  onClose,
  onConfirm,
}: RapidDispatchDrawerProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  if (!open || !sos) return null;

  const selected = assets.find((asset) => asset.id === selectedAssetId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(21,32,43,0.4)]">
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <header className="border-b border-[var(--line)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[#b91c1c]">
                <Siren className="h-3.5 w-3.5" aria-hidden />
                Rapid dispatch
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                {sos.sosId} · {sos.villageName}
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {SOS_CATEGORY_LABELS[sos.category]} · {sos.peopleCount} people
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--ink-muted)]">
            Assign available rescue asset
          </p>
          {assets.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--ink-muted)]">
              No live rescue assets available from Firestore.
            </p>
          ) : (
            assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left ${
                  selectedAssetId === asset.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {asset.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {RAPID_DISPATCH_ASSET_LABELS[asset.type]} · ETA ~
                  {asset.etaMinutes} min · {asset.status}
                </p>
              </button>
            ))
          )}
        </div>

        <footer className="border-t border-[var(--line)] px-4 py-3">
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onConfirm(selected.id, selected.label);
              setSelectedAssetId(null);
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#b91c1c] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Confirm rapid dispatch
          </button>
        </footer>
      </aside>
    </div>
  );
}
