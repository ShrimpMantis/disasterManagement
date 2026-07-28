"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardPen,
  MessageCircle,
  Phone,
  Send,
  X,
} from "lucide-react";
import type {
  AssetOfferDetails,
  DispatchChatMessage,
  DispatchSenderRole,
  TransportCapabilityRequest,
} from "@/types/transportationDispatch";
import {
  REQUEST_STATUS_LABELS,
  TRANSPORT_MODALITY_LABELS,
  URGENCY_LABELS,
} from "@/types/transportationDispatch";

type TransportationChatDrawerProps = {
  open: boolean;
  request: TransportCapabilityRequest | null;
  messages: DispatchChatMessage[];
  actingAs: DispatchSenderRole;
  onActingAsChange: (role: DispatchSenderRole) => void;
  onClose: () => void;
  onSendMessage: (text: string) => boolean | Promise<boolean>;
  onSubmitOffer: (offer: AssetOfferDetails) => boolean | Promise<boolean>;
  onAcceptOffer: (messageId: string) => boolean | Promise<boolean>;
};

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function TransportationChatDrawer({
  open,
  request,
  messages,
  actingAs,
  onActingAsChange,
  onClose,
  onSendMessage,
  onSubmitOffer,
  onAcceptOffer,
}: TransportationChatDrawerProps) {
  const [draft, setDraft] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [callsign, setCallsign] = useState("");
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState<"PER_DAY" | "PER_TRIP" | "PER_MISSION">(
    "PER_DAY",
  );
  const [isVolunteerService, setIsVolunteerService] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    const timer = window.setTimeout(() => {
      setDraft("");
      setShowOfferForm(false);
      setIsVolunteerService(request.modalityType === "VOLUNTEER_FORCE");
      setCapacity(
        request.modalityType === "VOLUNTEER_FORCE"
          ? "5 trained volunteers ready"
          : request.modalityType === "DRONE_SUPPLY"
            ? "500kg payload"
            : request.modalityType.includes("BOAT")
              ? "6-person capacity"
              : "Standard payload",
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, request]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  if (!open || !request) return null;

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    const ok = await onSendMessage(draft);
    if (ok) setDraft("");
  }

  async function handleOfferSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedRate = isVolunteerService ? null : Number(rate);
    if (
      !callsign.trim() ||
      !leadName.trim() ||
      !phone.trim() ||
      !capacity.trim() ||
      (!isVolunteerService && (!Number.isFinite(parsedRate) || (parsedRate ?? 0) <= 0))
    ) {
      return;
    }

    const ok = await onSubmitOffer({
      registrationOrCallsign: callsign.trim(),
      operatorOrTeamLeadName: leadName.trim(),
      operatorOrDriverPhone: phone.trim(),
      assetCapacity: capacity.trim(),
      proposedRateINR: parsedRate,
      isVolunteerService,
      rateUnit: isVolunteerService ? undefined : rateUnit,
    });

    if (ok) {
      setShowOfferForm(false);
      setCallsign("");
      setLeadName("");
      setPhone("");
      setRate("");
    }
  }

  const canSubmitOffer =
    actingAs === "ASSET_OWNER" || actingAs === "VOLUNTEER_LEAD";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(21,32,43,0.4)]">
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <header className="border-b border-[var(--line)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Dispatch negotiation chat
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">
                #{request.requestId}: {request.quantityNeeded}×{" "}
                {TRANSPORT_MODALITY_LABELS[request.modalityType]}
              </h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {request.requestorName}, {request.requestorDesignation}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {URGENCY_LABELS[request.urgency]} ·{" "}
                {REQUEST_STATUS_LABELS[request.status]} ·{" "}
                {request.quantityFulfilled}/{request.quantityNeeded} fulfilled
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={toTelHref(request.requestorPhone)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <Phone className="h-3 w-3" aria-hidden />
              Call Officer
            </a>
            <div className="inline-flex flex-wrap rounded-lg border border-[var(--line)] p-0.5 text-[11px]">
              {(
                [
                  ["ASSET_OWNER", "Asset owner"],
                  ["VOLUNTEER_LEAD", "Volunteer lead"],
                  ["REQUESTOR", "Requestor"],
                ] as const
              ).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onActingAsChange(role)}
                  className={`rounded-md px-2 py-1 font-semibold ${
                    actingAs === role
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--ink-muted)]">
              No messages yet. Offer an asset, crew, or volunteer team.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.senderRole === actingAs;
              const isOffer = Boolean(message.offeredAssetDetails);

              return (
                <div
                  key={message.messageId}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)]"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        mine ? "text-white/80" : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {message.senderName} · {message.senderRole.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{message.messageText}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleString()}
                    </p>

                    {isOffer ? (
                      <div
                        className={`mt-2 rounded-xl px-2.5 py-2 text-xs ${
                          mine
                            ? "bg-white/15"
                            : "bg-white ring-1 ring-[var(--line)]"
                        }`}
                      >
                        <p className="font-semibold">
                          {message.offeredAssetDetails?.registrationOrCallsign}
                        </p>
                        <p>{message.offeredAssetDetails?.assetCapacity}</p>
                        <p>
                          {message.offeredAssetDetails?.operatorOrTeamLeadName ??
                            "Operator"}{" "}
                          · {message.offeredAssetDetails?.operatorOrDriverPhone}
                        </p>
                        <p>
                          {message.isVolunteerService
                            ? "Free Volunteer Service"
                            : message.proposedRateINR != null
                              ? `Quoted ₹${message.proposedRateINR.toLocaleString("en-IN")}`
                              : "Rate TBD"}
                        </p>
                        {message.offerAccepted ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 font-semibold text-[#166534]">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            ACCEPTED
                          </span>
                        ) : actingAs === "REQUESTOR" &&
                          request.status !== "FULFILLED" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void onAcceptOffer(message.messageId);
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2 py-1 font-semibold text-white"
                          >
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Accept & Authorize Dispatch
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-[var(--line)] px-4 py-3">
          {canSubmitOffer ? (
            <button
              type="button"
              onClick={() => setShowOfferForm((prev) => !prev)}
              className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)]"
            >
              <ClipboardPen className="h-3.5 w-3.5" aria-hidden />
              {showOfferForm
                ? "Hide offer form"
                : "Submit Asset / Force Offer"}
            </button>
          ) : null}

          {showOfferForm && canSubmitOffer ? (
            <form
              onSubmit={handleOfferSubmit}
              className="mb-3 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
            >
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={isVolunteerService}
                  onChange={(event) => setIsVolunteerService(event.target.checked)}
                />
                Free volunteer service (no commercial rate)
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs sm:col-span-2">
                  <span className="mb-1 block font-medium">
                    Callsign / Registration / Team name
                  </span>
                  <input
                    required
                    value={callsign}
                    onChange={(event) => setCallsign(event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                    placeholder="AS-01-AC-4421 or Team Brahmaputra-A"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Driver / Team lead</span>
                  <input
                    required
                    value={leadName}
                    onChange={(event) => setLeadName(event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Contact phone</span>
                  <input
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                    placeholder="+91..."
                  />
                </label>
                <label className="text-xs sm:col-span-2">
                  <span className="mb-1 block font-medium">
                    Payload / capacity details
                  </span>
                  <input
                    required
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                  />
                </label>
                {!isVolunteerService ? (
                  <>
                    <label className="text-xs">
                      <span className="mb-1 block font-medium">Quoted rate (₹)</span>
                      <input
                        required
                        type="number"
                        min={1}
                        value={rate}
                        onChange={(event) => setRate(event.target.value)}
                        className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block font-medium">Rate unit</span>
                      <select
                        value={rateUnit}
                        onChange={(event) =>
                          setRateUnit(
                            event.target.value as
                              | "PER_DAY"
                              | "PER_TRIP"
                              | "PER_MISSION",
                          )
                        }
                        className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                      >
                        <option value="PER_DAY">Per day</option>
                        <option value="PER_TRIP">Per trip</option>
                        <option value="PER_MISSION">Per mission</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
              >
                Send formal offer
              </button>
            </form>
          ) : null}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2.5 text-white"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </footer>
      </aside>
    </div>
  );
}
