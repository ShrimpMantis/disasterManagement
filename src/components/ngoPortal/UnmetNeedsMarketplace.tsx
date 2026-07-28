"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { HandHeart, LayoutGrid, List, Search } from "lucide-react";
import {
  getItemDeficit,
  getTicketDeficitPercent,
} from "@/lib/tickets/applyPledgeToTicket";
import type { ReliefTicket, TicketPriority } from "@/types/ticket";
import { TICKET_PRIORITY_LABELS } from "@/types/ticket";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#0f6e56",
  backgroundColor: "rgba(255,255,255,0.92)",
  borderColor: "rgba(21, 32, 43, 0.12)",
  headerBackgroundColor: "#e8f2ee",
  headerTextColor: "#15202b",
  foregroundColor: "#15202b",
  fontFamily: "var(--font-outfit), system-ui, sans-serif",
  borderRadius: 8,
  spacing: 6,
});

type UnmetNeedsMarketplaceProps = {
  tickets: ReliefTicket[];
  onPledge: (ticketId: string) => void;
};

type MarketplaceRow = ReliefTicket & {
  deficitPercent: number;
  itemSummary: string;
  categories: string;
  remainingFinancialGap: number;
  requiredDeliveryManpower: number;
};

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    CRITICAL: "bg-[#7f1d1d] text-white",
    HIGH: "bg-[#9a3412] text-white",
    MEDIUM: "bg-[#a16207] text-white",
    LOW: "bg-[#334155] text-white",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function UnmetNeedsMarketplace({ tickets, onPledge }: UnmetNeedsMarketplaceProps) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("ALL");
  const [circle, setCircle] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState<TicketPriority | "ALL">("ALL");

  const districts = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.district))).sort(),
    [tickets],
  );
  const circles = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.revenueCircle))).sort(),
    [tickets],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(tickets.flatMap((ticket) => ticket.items.map((item) => item.category))),
      ).sort(),
    [tickets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (district !== "ALL" && ticket.district !== district) return false;
      if (circle !== "ALL" && ticket.revenueCircle !== circle) return false;
      if (priority !== "ALL" && ticket.priority !== priority) return false;
      if (
        category !== "ALL" &&
        !ticket.items.some((item) => item.category === category)
      ) {
        return false;
      }
      if (!q) return true;
      const blob = [
        ticket.villageName,
        ticket.district,
        ticket.revenueCircle,
        ticket.id,
        ...ticket.items.map((item) => `${item.itemName} ${item.category}`),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [category, circle, district, priority, search, tickets]);

  const rows = useMemo<MarketplaceRow[]>(
    () =>
      filtered.map((ticket) => ({
        ...ticket,
        deficitPercent: getTicketDeficitPercent(ticket),
        itemSummary: ticket.items
          .filter((item) => getItemDeficit(item) > 0)
          .map((item) => `${item.itemName} (${getItemDeficit(item)} ${item.unit})`)
          .join(", "),
        categories: Array.from(new Set(ticket.items.map((item) => item.category))).join(
          ", ",
        ),
        remainingFinancialGap: ticket.items.reduce(
          (sum, item) =>
            sum + getItemDeficit(item) * Math.max(0, item.estimatedUnitCost ?? 0),
          0,
        ),
        requiredDeliveryManpower: Math.max(
          1,
          Math.ceil(
            ticket.items.reduce((sum, item) => sum + getItemDeficit(item), 0) / 25,
          ),
        ),
      })),
    [filtered],
  );

  const columnDefs = useMemo<ColDef<MarketplaceRow>[]>(
    () => [
      { field: "villageName", headerName: "Village", flex: 1.2, minWidth: 140, filter: true },
      { field: "district", headerName: "District", flex: 1, minWidth: 120, filter: true },
      {
        field: "revenueCircle",
        headerName: "Revenue Circle",
        flex: 1,
        minWidth: 130,
        filter: true,
      },
      {
        field: "priority",
        headerName: "Priority",
        flex: 0.9,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<MarketplaceRow, TicketPriority>) =>
          params.value ? <PriorityBadge priority={params.value} /> : null,
      },
      {
        field: "deficitPercent",
        headerName: "Deficit %",
        flex: 0.8,
        minWidth: 110,
        valueFormatter: (params) => `${params.value ?? 0}%`,
      },
      {
        field: "itemSummary",
        headerName: "Missing Items",
        flex: 1.8,
        minWidth: 240,
        tooltipField: "itemSummary",
      },
      {
        field: "remainingFinancialGap",
        headerName: "Remaining $",
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (params) => `$${Number(params.value ?? 0).toFixed(2)}`,
      },
      {
        field: "requiredDeliveryManpower",
        headerName: "Manpower",
        flex: 0.8,
        minWidth: 110,
      },
      {
        headerName: "Action",
        flex: 1.1,
        minWidth: 170,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<MarketplaceRow>) =>
          params.data ? (
            <button
              type="button"
              onClick={() => onPledge(params.data!.id)}
              className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white"
            >
              Pledge Help
            </button>
          ) : null,
      },
    ],
    [onPledge],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[var(--accent)]">
            <HandHeart className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              Unmet demand marketplace
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
            Open village deficits
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Browse REQUESTED / PARTIALLY_FULFILLED tickets and pledge partial or full aid.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[var(--line)] bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              view === "cards" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-muted)]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              view === "table" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-muted)]"
            }`}
          >
            <List className="h-4 w-4" aria-hidden />
            Table
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search village, item, ticket…"
            className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter label="District" value={district} onChange={setDistrict} options={districts} />
          <SelectFilter label="Revenue Circle" value={circle} onChange={setCircle} options={circles} />
          <SelectFilter label="Category" value={category} onChange={setCategory} options={categories} />
          <label className="text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TicketPriority | "ALL")}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            >
              <option value="ALL">All priorities</option>
              {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((key) => (
                <option key={key} value={key}>
                  {TICKET_PRIORITY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
              No open deficits match your filters.
            </p>
          ) : (
            rows.map((ticket) => (
              <article
                key={ticket.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                      {ticket.villageName}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {ticket.district} · {ticket.revenueCircle}
                    </p>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[var(--ink-muted)]">Deficit remaining</span>
                    <span className="font-semibold text-[var(--ink)]">
                      {ticket.deficitPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(21,32,43,0.08)]">
                    <div
                      className="h-full rounded-full bg-[#dc2626]"
                      style={{ width: `${ticket.deficitPercent}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5">
                  {ticket.items
                    .filter((item) => getItemDeficit(item) > 0)
                    .map((item) => (
                      <li
                        key={`${ticket.id}-${item.itemName}`}
                        className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-[var(--ink)] ring-1 ring-[var(--line)]"
                      >
                        {item.itemName}: {getItemDeficit(item)} {item.unit} · {item.category}
                      </li>
                    ))}
                </ul>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-[var(--line)]">
                    <p className="text-[var(--ink-muted)]">Remaining financial gap</p>
                    <p className="mt-1 font-semibold text-[var(--ink)]">
                      ${ticket.remainingFinancialGap.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-[var(--line)]">
                    <p className="text-[var(--ink-muted)]">Required manpower</p>
                    <p className="mt-1 font-semibold text-[var(--ink)]">
                      {ticket.requiredDeliveryManpower}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPledge(ticket.id)}
                  className="mt-4 w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                >
                  Pledge Help for this Village
                </button>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="h-[min(65vh,640px)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
          <AgGridReact<MarketplaceRow>
            theme={gridTheme}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true, filter: true, floatingFilter: true }}
            getRowId={(params) => params.data.id}
            tooltipShowDelay={300}
          />
        </div>
      )}
    </section>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-[var(--ink-muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
      >
        <option value="ALL">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
