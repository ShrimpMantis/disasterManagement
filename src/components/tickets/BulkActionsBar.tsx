"use client";

import { useState } from "react";
import { Download, Users } from "lucide-react";

type AssignableEntity = {
  id: string;
  name: string;
  kind: "NGO" | "WAREHOUSE";
};

type BulkActionsBarProps = {
  selectedCount: number;
  entities: AssignableEntity[];
  onBulkAssign: (entityId: string, entityName: string) => void;
  onExport: () => void;
};

export function BulkActionsBar({
  selectedCount,
  entities,
  onBulkAssign,
  onExport,
}: BulkActionsBarProps) {
  const [entityId, setEntityId] = useState("");

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-[var(--accent)] bg-white/95 px-4 py-3 shadow-[var(--shadow)] backdrop-blur">
      <p className="text-sm font-semibold text-[var(--ink)]">
        {selectedCount} selected
      </p>

      <select
        value={entityId}
        onChange={(event) => setEntityId(event.target.value)}
        className="min-w-[220px] flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
      >
        <option value="">Choose NGO / Warehouse…</option>
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            [{entity.kind}] {entity.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!entityId}
        onClick={() => {
          const entity = entities.find((entry) => entry.id === entityId);
          if (!entity) return;
          onBulkAssign(entity.id, entity.name);
          setEntityId("");
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Users className="h-4 w-4" aria-hidden />
        Bulk Assign to NGO
      </button>

      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"
      >
        <Download className="h-4 w-4" aria-hidden />
        Export Selected Dispatch Manifest
      </button>
    </div>
  );
}
