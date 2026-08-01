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
    <div className="sticky bottom-3 z-30 mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-[var(--accent)] bg-white/95 px-3 py-3 shadow-[var(--shadow)] backdrop-blur sm:bottom-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-4">
      <p className="shrink-0 text-sm font-semibold text-[var(--ink)]">
        {selectedCount} selected
      </p>

      <select
        value={entityId}
        onChange={(event) => setEntityId(event.target.value)}
        className="min-w-0 w-full flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm sm:min-w-[180px]"
      >
        <option value="">Choose NGO / Warehouse…</option>
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            [{entity.kind}] {entity.name}
          </option>
        ))}
      </select>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          disabled={!entityId}
          onClick={() => {
            const entity = entities.find((entry) => entry.id === entityId);
            if (!entity) return;
            onBulkAssign(entity.id, entity.name);
            setEntityId("");
          }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sm:hidden">Bulk Assign</span>
          <span className="hidden sm:inline">Bulk Assign to NGO</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-soft)] sm:flex-none"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sm:hidden">Export Manifest</span>
          <span className="hidden sm:inline">Export Selected Dispatch Manifest</span>
        </button>
      </div>
    </div>
  );
}
