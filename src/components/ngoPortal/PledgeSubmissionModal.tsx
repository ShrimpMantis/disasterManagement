"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { toPledgeItemInputs } from "@/lib/tickets/applyPledgeToTicket";
import type {
  CustomItemCategory,
  CustomItemUnit,
  CustomPledgeItem,
  CustomPledgeTarget,
  ItemPledgeInput,
  NGOPledgeSubmission,
} from "@/types/pledgeIntake";
import {
  CUSTOM_ITEM_CATEGORIES,
  CUSTOM_ITEM_UNITS,
} from "@/types/pledgeIntake";
import type { ReliefTicket } from "@/types/ticket";

export type PledgeSubmitPayload = Omit<
  NGOPledgeSubmission,
  "id" | "status" | "createdAt" | "ngoId" | "ngoName" | "adminApprovalStatus"
>;

type PledgeSubmissionModalProps = {
  open: boolean;
  ticket: ReliefTicket | null;
  ngoName: string;
  defaultDistrict?: string;
  availableManpowerCapacity?: number;
  onClose: () => void;
  onSubmit: (payload: PledgeSubmitPayload) => Promise<boolean>;
};

function emptyCustomItem(): CustomPledgeItem {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemName: "",
    category: "Clothing",
    quantity: 1,
    unit: "Pieces",
    description: "",
  };
}

export function PledgeSubmissionModal({
  open,
  ticket,
  ngoName,
  defaultDistrict,
  availableManpowerCapacity = 0,
  onClose,
  onSubmit,
}: PledgeSubmissionModalProps) {
  const [items, setItems] = useState<ItemPledgeInput[]>([]);
  const [customItems, setCustomItems] = useState<CustomPledgeItem[]>([]);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customTarget, setCustomTarget] = useState<CustomPledgeTarget>("VILLAGE_TICKET");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [dispatchHubOrLocation, setDispatchHubOrLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [pledgedFinancialAmount, setPledgedFinancialAmount] = useState("");
  const [providesDistributionManpower, setProvidesDistributionManpower] = useState(false);
  const [pledgedManpowerCount, setPledgedManpowerCount] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open || !ticket) return;
    const timer = window.setTimeout(() => {
      setItems(toPledgeItemInputs(ticket));
      setCustomItems([]);
      setShowCustomBuilder(false);
      setCustomTarget("VILLAGE_TICKET");
      setEstimatedDeliveryDate("");
      setContactPersonName("");
      setContactPersonPhone("");
      setDispatchHubOrLocation("");
      setNotes("");
      setPledgedFinancialAmount("");
      setProvidesDistributionManpower(false);
      setPledgedManpowerCount("");
      setFormError("");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, ticket]);

  if (!open || !ticket) return null;

  function updateQty(ticketItemId: string, value: string) {
    const qty = value === "" ? 0 : Number(value);
    setItems((prev) =>
      prev.map((item) => {
        if (item.ticketItemId !== ticketItemId) return item;
        if (!Number.isFinite(qty) || qty < 0) {
          return { ...item, pledgedQuantity: 0 };
        }
        return {
          ...item,
          pledgedQuantity: Math.min(item.requiredQuantity, Math.floor(qty)),
        };
      }),
    );
  }

  function addCustomItem() {
    setCustomItems((prev) => [...prev, emptyCustomItem()]);
    setShowCustomBuilder(true);
  }

  function removeCustomItem(id: string) {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateCustomItem<K extends keyof CustomPledgeItem>(
    id: string,
    key: K,
    value: CustomPledgeItem[K],
  ) {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!ticket) return;
    const activeTicket = ticket;

    for (const item of items) {
      if (item.pledgedQuantity < 0) {
        setFormError(`${item.itemName}: quantity cannot be negative.`);
        return;
      }
      if (item.pledgedQuantity > item.requiredQuantity) {
        setFormError(
          `${item.itemName}: cannot exceed remaining ${item.requiredQuantity} ${item.unit}.`,
        );
        return;
      }
    }

    const matched = items.filter((item) => item.pledgedQuantity > 0);
    const cleanedCustom = customItems
      .map((item) => ({
        ...item,
        itemName: item.itemName.trim(),
        description: item.description?.trim() || undefined,
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      }))
      .filter((item) => item.itemName.length > 0 || item.quantity > 0);

    for (const item of cleanedCustom) {
      if (!item.itemName) {
        setFormError("Custom item name is required.");
        return;
      }
      if (item.quantity <= 0) {
        setFormError(`${item.itemName}: quantity must be greater than zero.`);
        return;
      }
    }

    if (matched.length === 0 && cleanedCustom.length === 0) {
      setFormError("Pledge at least one ticket item or add a custom item.");
      return;
    }

    if (!estimatedDeliveryDate || !contactPersonName.trim() || !contactPersonPhone.trim()) {
      setFormError("Delivery time, contact name, and phone are required.");
      return;
    }

    if (!dispatchHubOrLocation.trim()) {
      setFormError("Dispatch origin hub is required.");
      return;
    }
    const manpowerCount = Math.max(0, Math.floor(Number(pledgedManpowerCount) || 0));
    if (providesDistributionManpower && manpowerCount <= 0) {
      setFormError("Enter pledged manpower count.");
      return;
    }
    if (manpowerCount > availableManpowerCapacity) {
      setFormError(
        `Pledged manpower exceeds available capacity (${availableManpowerCapacity}).`,
      );
      return;
    }

    const hasCustom = cleanedCustom.length > 0;
    const onlyCustomToPool =
      matched.length === 0 && hasCustom && customTarget === "DISTRICT_POOL";

    const ok = await onSubmit({
      pledgeType:
        matched.length > 0 && !hasCustom ? "TICKET_MATCHED" : "SPONTANEOUS_OFFER",
      ticketId: onlyCustomToPool ? undefined : activeTicket.id,
      targetVillageId:
        hasCustom && customTarget === "DISTRICT_POOL"
          ? undefined
          : activeTicket.villageId,
      targetVillageName:
        hasCustom && customTarget === "DISTRICT_POOL"
          ? undefined
          : activeTicket.villageName,
      targetDistrict: activeTicket.district || defaultDistrict,
      ticketMatchedItems: matched.length > 0 ? matched : undefined,
      customItems: hasCustom ? cleanedCustom : undefined,
      estimatedDeliveryDate: new Date(estimatedDeliveryDate).toISOString(),
      dispatchHubOrLocation: dispatchHubOrLocation.trim(),
      contactPersonName: contactPersonName.trim(),
      contactPersonPhone: contactPersonPhone.trim(),
      pledgedFinancialAmount: Math.max(0, Number(pledgedFinancialAmount) || 0),
      providesDistributionManpower,
      pledgedManpowerCount: providesDistributionManpower ? manpowerCount : 0,
      notes: notes.trim() || undefined,
    });

    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Pledge submission · {ngoName}
            </p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {ticket.villageName}
            </h3>
            <p className="text-sm text-[var(--ink-muted)]">
              Ticket {ticket.id} · {ticket.district}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--ink)]">Ticket-matched items</p>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  No open ticket line items. You can still offer custom unlisted items below.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.ticketItemId}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--ink)]">{item.itemName}</p>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {item.category} · Remaining {item.requiredQuantity} {item.unit}
                        </p>
                      </div>
                      <label className="text-sm">
                        <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                          Pledge qty
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={item.requiredQuantity}
                          value={item.pledgedQuantity || ""}
                          onChange={(event) =>
                            updateQty(item.ticketItemId, event.target.value)
                          }
                          className="w-28 rounded-lg border border-[var(--line)] px-2 py-1.5"
                        />
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-white">
              <button
                type="button"
                onClick={() => {
                  setShowCustomBuilder((prev) => {
                    const next = !prev;
                    if (next && customItems.length === 0) {
                      setCustomItems([emptyCustomItem()]);
                    }
                    return next;
                  });
                }}
                className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold text-[var(--ink)]"
              >
                <span>+ Add Unlisted / Custom Item</span>
                <ChevronDown
                  className={`h-4 w-4 transition ${showCustomBuilder ? "rotate-180" : ""}`}
                />
              </button>

              {showCustomBuilder ? (
                <div className="space-y-3 border-t border-[var(--line)] px-3 py-3">
                  <div className="space-y-2 rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
                    <p className="font-medium text-[var(--accent-strong)]">
                      Where should custom items go?
                    </p>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="customTarget"
                        checked={customTarget === "VILLAGE_TICKET"}
                        onChange={() => setCustomTarget("VILLAGE_TICKET")}
                      />
                      <span>
                        Attach to this village/camp ticket ({ticket.villageName})
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="customTarget"
                        checked={customTarget === "DISTRICT_POOL"}
                        onChange={() => setCustomTarget("DISTRICT_POOL")}
                      />
                      <span>
                        Offer to District Central Warehouse Pool ({ticket.district}) for
                        officer re-routing
                      </span>
                    </label>
                  </div>

                  {customItems.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--ink)]">Custom item</p>
                        <button
                          type="button"
                          onClick={() => removeCustomItem(item.id)}
                          className="rounded-lg p-1 text-[var(--danger)]"
                          aria-label="Remove custom item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-sm sm:col-span-2">
                          <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                            Item name
                          </span>
                          <input
                            value={item.itemName}
                            onChange={(event) =>
                              updateCustomItem(item.id, "itemName", event.target.value)
                            }
                            className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                            placeholder="Winter Jackets"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                            Category
                          </span>
                          <select
                            value={item.category}
                            onChange={(event) =>
                              updateCustomItem(
                                item.id,
                                "category",
                                event.target.value as CustomItemCategory,
                              )
                            }
                            className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                          >
                            {CUSTOM_ITEM_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-[var(--ink-muted)]">Unit</span>
                          <select
                            value={item.unit}
                            onChange={(event) =>
                              updateCustomItem(
                                item.id,
                                "unit",
                                event.target.value as CustomItemUnit,
                              )
                            }
                            className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                          >
                            {CUSTOM_ITEM_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                            Quantity
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateCustomItem(
                                item.id,
                                "quantity",
                                Number(event.target.value) || 0,
                              )
                            }
                            className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                            Condition / notes
                          </span>
                          <input
                            value={item.description ?? ""}
                            onChange={(event) =>
                              updateCustomItem(item.id, "description", event.target.value)
                            }
                            className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5"
                            placeholder="Brand new boxed items"
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add another custom item
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium">Estimated delivery</span>
                <input
                  required
                  type="datetime-local"
                  value={estimatedDeliveryDate}
                  onChange={(event) => setEstimatedDeliveryDate(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Contact person name</span>
                <input
                  required
                  value={contactPersonName}
                  onChange={(event) => setContactPersonName(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Contact person phone</span>
                <input
                  required
                  value={contactPersonPhone}
                  onChange={(event) => setContactPersonPhone(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                  placeholder="+91..."
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium">Dispatch origin hub</span>
                <input
                  required
                  value={dispatchHubOrLocation}
                  onChange={(event) => setDispatchHubOrLocation(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                  placeholder="e.g., Jorhat Central Warehouse"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Pledged financial amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={pledgedFinancialAmount}
                  onChange={(event) => setPledgedFinancialAmount(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                  placeholder="e.g. 700"
                />
              </label>
              <div className="block text-sm">
                <span className="mb-1.5 block font-medium">Distribution manpower</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={providesDistributionManpower}
                    onChange={(event) =>
                      setProvidesDistributionManpower(event.target.checked)
                    }
                  />
                  Provide field manpower
                </label>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Available capacity: {availableManpowerCapacity}
                </p>
              </div>
              {providesDistributionManpower ? (
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium">
                    Pledged manpower count
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={availableManpowerCapacity}
                    value={pledgedManpowerCount}
                    onChange={(event) => setPledgedManpowerCount(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                  />
                </label>
              ) : null}
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                />
              </label>
            </div>

            {formError ? (
              <p className="rounded-xl bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                {formError}
              </p>
            ) : null}
          </div>

          <footer className="border-t border-[var(--line)] px-5 py-4">
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              Confirm pledge
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
