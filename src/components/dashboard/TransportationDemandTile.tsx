"use client";

import { useMemo, useState } from "react";
import {
  Ambulance,
  Anchor,
  Bike,
  Car,
  Helicopter,
  MessageCircle,
  Plane,
  Tractor,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  DistrictFilter,
  ModalityFilterGroup,
  RequestUrgency,
  TransportCapabilityRequest,
  TransportModalType,
} from "@/types/transportationDispatch";
import {
  DISTRICT_FILTERS,
  MODALITY_FILTER_GROUPS,
  REQUEST_STATUS_LABELS,
  TRANSPORT_MODALITY_BADGE_CLASS,
  TRANSPORT_MODALITY_LABELS,
  URGENCY_BADGE_CLASS,
  URGENCY_LABELS,
} from "@/types/transportationDispatch";

type TransportationDemandTileProps = {
  requests: TransportCapabilityRequest[];
  onOpenChat: (requestId: string) => void;
};

const MODALITY_ICONS: Record<TransportModalType, LucideIcon> = {
  TRUCK_MINI_4X4: Truck,
  TRUCK_HEAVY: Truck,
  TRACTOR_TRAILER: Tractor,
  RESCUE_BOAT: Anchor,
  BOAT_AMBULANCE: Anchor,
  TERRESTRIAL_AMBULANCE: Ambulance,
  MOTORCYCLE_AMBULANCE: Bike,
  PASSENGER_CAR_4X4: Car,
  DRONE_SUPPLY: Plane,
  HELICOPTER_AIRLIFT: Helicopter,
  VOLUNTEER_FORCE: Users,
};

function UrgencyBadge({ urgency }: { urgency: RequestUrgency }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${URGENCY_BADGE_CLASS[urgency]}`}
    >
      {URGENCY_LABELS[urgency]}
    </span>
  );
}

function ModalityBadge({ modality }: { modality: TransportModalType }) {
  const Icon = MODALITY_ICONS[modality];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TRANSPORT_MODALITY_BADGE_CLASS[modality]}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {TRANSPORT_MODALITY_LABELS[modality]}
    </span>
  );
}

export function TransportationDemandTile({
  requests,
  onOpenChat,
}: TransportationDemandTileProps) {
  const [modalityFilter, setModalityFilter] = useState<ModalityFilterGroup>("ALL");
  const [districtFilter, setDistrictFilter] = useState<DistrictFilter>("ALL");

  const filtered = useMemo(() => {
    const group = MODALITY_FILTER_GROUPS.find((entry) => entry.id === modalityFilter);
    return [...requests]
      .filter(
        (request) =>
          request.status === "OPEN" || request.status === "IN_NEGOTIATION",
      )
      .filter((request) => {
        if (!group || group.modalities === "ALL") return true;
        return group.modalities.includes(request.modalityType);
      })
      .filter((request) =>
        districtFilter === "ALL" ? true : request.district === districtFilter,
      )
      .sort((a, b) => {
        const urgencyRank: Record<RequestUrgency, number> = {
          CRITICAL_IMMEDIATE: 0,
          HIGH_24HR: 1,
          STANDARD_SCHEDULED: 2,
        };
        const byUrgency = urgencyRank[a.urgency] - urgencyRank[b.urgency];
        if (byUrgency !== 0) return byUrgency;
        return Date.parse(b.createdAtTimestamp) - Date.parse(a.createdAtTimestamp);
      });
  }, [districtFilter, modalityFilter, requests]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <header className="border-b border-[var(--line)] px-4 py-3">
        <div className="mb-1 inline-flex items-center gap-2 text-[var(--accent)]">
          <Truck className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-[0.14em]">
            Multi-modal transport needs
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
          Transportation & capability dispatch
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          {filtered.length} open request{filtered.length === 1 ? "" : "s"} · trucks,
          boats, air, ambulances & volunteers
        </p>
      </header>

      <div className="space-y-2 border-b border-[var(--line)] px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {MODALITY_FILTER_GROUPS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setModalityFilter(filter.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                modalityFilter === filter.id
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DISTRICT_FILTERS.map((district) => (
            <button
              key={district}
              type="button"
              onClick={() => setDistrictFilter(district)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                districtFilter === district
                  ? "bg-[#15202b] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--ink-muted)]"
              }`}
            >
              {district === "ALL"
                ? "All districts"
                : district === "Kamrup Metropolitan"
                  ? "Guwahati"
                  : district}
            </button>
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-8 text-center text-sm text-[var(--ink-muted)]">
            No open requests for this modality/district filter.
          </li>
        ) : (
          filtered.map((request) => (
            <li
              key={request.requestId}
              className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                    {request.requestId} · {REQUEST_STATUS_LABELS[request.status]}
                  </p>
                  <p className="mt-0.5 font-semibold text-[var(--ink)]">
                    {request.quantityFulfilled}/{request.quantityNeeded}{" "}
                    {TRANSPORT_MODALITY_LABELS[request.modalityType]} fulfilled
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <UrgencyBadge urgency={request.urgency} />
                  <ModalityBadge modality={request.modalityType} />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
                {request.revenueCircle}, {request.district} ·{" "}
                {request.cargoOrTaskDescription}
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                Pickup: {request.pickupLocation}
                {request.destinationLocation
                  ? ` → ${request.destinationLocation}`
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => onOpenChat(request.requestId)}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Offer Asset / Respond
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
