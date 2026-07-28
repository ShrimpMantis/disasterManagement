"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MapsApiProvider } from "@/components/maps/MapsApiProvider";
import { createReliefTicket } from "@/actions/ticketCreationActions";
import {
  RELIEF_ITEM_CATEGORY_LABELS,
  RELIEF_ITEM_PRESETS,
  TICKET_CREATION_PRIORITY_LABELS,
  TICKET_SOURCE_CHANNEL_LABELS,
  type CreateReliefTicketInput,
  type ReliefItemCategory,
  type TicketItemRequest,
  type TicketPriority,
  type TicketSourceChannel,
} from "@/types/reliefTicketCreation";
import type { TicketDoc } from "@/lib/firestore/schema";
import { getGoogleMapsMapId } from "@/lib/maps/markers";
import { DEFAULT_MAP_CENTER } from "@/types/map";

type VillageOption = {
  id: string;
  name: string;
  revenueCircle: string;
  district: string;
  coordinates: { lat: number; lng: number };
};

type AdminTicketCreationModalProps = {
  open: boolean;
  isAdmin: boolean;
  villages: VillageOption[];
  onClose: () => void;
  onCreated: (ticket: TicketDoc) => void;
};

const itemSchema = z.object({
  itemId: z.string().optional(),
  category: z.enum([
    "FOOD",
    "WATER",
    "MEDICAL",
    "SHELTER",
    "HYGIENE",
    "CLOTHING",
    "RESCUE_OPERATION",
  ]),
  itemDisplayName: z.string().min(1, "Item name is required."),
  unitType: z.string().min(1, "Unit is required."),
  quantityRequested: z.coerce.number().int().positive("Quantity must be greater than 0."),
  quantityPledged: z.coerce.number().int().min(0).optional(),
  quantityFulfilled: z.coerce.number().int().min(0),
  estimatedUnitCost: z.coerce.number().min(0, "Estimated cost cannot be negative."),
  estimatedTotalCost: z.coerce.number().min(0),
});

const formSchema = z.object({
  districtId: z.string().min(1, "District is required."),
  districtName: z.string().min(1),
  revenueCircle: z.string().min(1, "Revenue circle is required."),
  villageOrShelterId: z.string().min(1, "Village / shelter is required."),
  villageOrShelterName: z.string().min(1, "Village / shelter is required."),
  dropCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  landmarkNotes: z.string().min(1, "Landmark notes are required."),
  sourceChannel: z.enum([
    "PHONE_CALL",
    "WHATSAPP_SOS",
    "FIELD_AGENT",
    "GOVT_HELPLINE",
  ]),
  contactPersonName: z.string().min(1, "Contact name is required."),
  contactPersonPhone: z.string().min(7, "Phone number is required."),
  contactPersonRole: z.string().min(1, "Contact role is required."),
  priority: z.enum(["CRITICAL_LIFE_SAFETY", "URGENT", "STANDARD_RELIEF"]),
  items: z.array(itemSchema).min(1, "Add at least one item."),
  specialInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

const CONTACT_ROLE_OPTIONS = [
  "Gaon Burah",
  "Shelter Lead",
  "Citizen",
  "MLA",
  "DC",
] as const;

function MapClickPicker({
  coordinates,
  onChange,
}: {
  coordinates: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  return (
    <div className="h-72 overflow-hidden rounded-xl border border-[var(--line)]">
      <MapsApiProvider>
        <Map
          defaultCenter={coordinates || DEFAULT_MAP_CENTER}
          defaultZoom={10}
          mapId={getGoogleMapsMapId()}
          gestureHandling="greedy"
          className="h-full w-full"
          onClick={(event: unknown) => {
            const detail = (event as { detail?: { latLng?: unknown } }).detail;
            const latLng = detail?.latLng as
              | { lat: number | (() => number); lng: number | (() => number) }
              | undefined;
            if (!latLng) return;
            const lat =
              typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
            const lng =
              typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
            if (typeof lat === "number" && typeof lng === "number") {
              onChange({ lat, lng });
            }
          }}
        >
          <AdvancedMarker position={coordinates}>
            <Pin background="#ea580c" borderColor="#9a3412" glyphColor="#fff" />
          </AdvancedMarker>
        </Map>
      </MapsApiProvider>
    </div>
  );
}

function buildDefaultItem(category: ReliefItemCategory): TicketItemRequest {
  const preset = RELIEF_ITEM_PRESETS[category][0];
  return {
    itemId: `${category}-${preset?.itemDisplayName ?? "item"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    category,
    itemDisplayName: preset?.itemDisplayName ?? "",
    unitType: preset?.unitType ?? "UNITS",
    quantityRequested: 1,
    quantityPledged: 0,
    quantityFulfilled: 0,
    estimatedUnitCost: 0,
    estimatedTotalCost: 0,
  };
}

export function AdminTicketCreationModal({
  open,
  isAdmin,
  villages,
  onClose,
  onCreated,
}: AdminTicketCreationModalProps) {
  const { user } = useAuth();
  const districts = useMemo(
    () => Array.from(new Set(villages.map((entry) => entry.district))).sort(),
    [villages],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      districtId: "",
      districtName: "",
      revenueCircle: "",
      villageOrShelterId: "",
      villageOrShelterName: "",
      dropCoordinates: { ...DEFAULT_MAP_CENTER },
      landmarkNotes: "",
      sourceChannel: "PHONE_CALL",
      contactPersonName: "",
      contactPersonPhone: "",
      contactPersonRole: "",
      priority: "STANDARD_RELIEF",
      items: [buildDefaultItem("FOOD")],
      specialInstructions: "",
    },
  });

  const { control, handleSubmit, register, reset, setValue, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const districtName = watch("districtName");
  const revenueCircle = watch("revenueCircle");
  const selectedVillageId = watch("villageOrShelterId");
  const coordinates = watch("dropCoordinates");
  const watchedItems = watch("items");

  const circles = useMemo(() => {
    if (!districtName) return [];
    return Array.from(
      new Set(
        villages
          .filter((entry) => entry.district === districtName)
          .map((entry) => entry.revenueCircle),
      ),
    ).sort();
  }, [districtName, villages]);

  const villageOptions = useMemo(() => {
    return villages.filter(
      (entry) =>
        (!districtName || entry.district === districtName) &&
        (!revenueCircle || entry.revenueCircle === revenueCircle),
    );
  }, [districtName, revenueCircle, villages]);
  const totalEstimatedTicketCost = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, item) => sum + (Number(item.estimatedTotalCost) || 0),
        0,
      ),
    [watchedItems],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      districtId: "",
      districtName: "",
      revenueCircle: "",
      villageOrShelterId: "",
      villageOrShelterName: "",
      dropCoordinates: { ...DEFAULT_MAP_CENTER },
      landmarkNotes: "",
      sourceChannel: "PHONE_CALL",
      contactPersonName: "",
      contactPersonPhone: user?.phoneNumber ?? "",
      contactPersonRole: "",
      priority: "STANDARD_RELIEF",
      items: [buildDefaultItem("FOOD")],
      specialInstructions: "",
    });
  }, [open, reset, user?.phoneNumber]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              Admin relief ticket creation
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              Create structured relief request
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Generate a dispatch-ready ticket from field calls, helpline reports,
              or shelter leads.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isAdmin ? (
          <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            Only administrators and dispatch leads can create relief tickets.
          </div>
        ) : (
          <form
            className="grid gap-5 lg:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.75fr)]"
            onSubmit={handleSubmit(async (values: FormValues) => {
              if (!user) return;
              const payload: CreateReliefTicketInput = {
                ...values,
                createdById: user.uid,
                createdByName: user.displayName || user.email || "Command Center",
              };
              const result = await createReliefTicket(payload);
              if (!result.ok) {
                form.setError("root", { message: result.error });
                return;
              }
              onCreated(result.data.queueTicket);
              onClose();
            })}
          >
            <section className="space-y-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">Location</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      District *
                    </span>
                    <select
                      {...register("districtName")}
                      required
                      className={inputClass}
                      onChange={(event) => {
                        const value = event.target.value;
                        setValue("districtName", value);
                        setValue("districtId", value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                        setValue("revenueCircle", "");
                        setValue("villageOrShelterId", "");
                        setValue("villageOrShelterName", "");
                      }}
                    >
                      <option value="">Select district…</option>
                      {districts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Revenue circle *
                    </span>
                    <select
                      {...register("revenueCircle")}
                      required
                      className={inputClass}
                      disabled={!districtName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setValue("revenueCircle", value);
                        setValue("villageOrShelterId", "");
                        setValue("villageOrShelterName", "");
                      }}
                    >
                      <option value="">Select circle…</option>
                      {circles.map((circle) => (
                        <option key={circle} value={circle}>
                          {circle}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Village / shelter *
                    </span>
                    <select
                      {...register("villageOrShelterId")}
                      required
                      className={inputClass}
                      disabled={!revenueCircle}
                      onChange={(event) => {
                        const selected = villageOptions.find(
                          (entry) => entry.id === event.target.value,
                        );
                        setValue("villageOrShelterId", selected?.id ?? "");
                        setValue("villageOrShelterName", selected?.name ?? "");
                        if (selected?.coordinates) {
                          setValue("dropCoordinates", selected.coordinates);
                        }
                      }}
                    >
                      <option value="">Select village / shelter…</option>
                      {villageOptions.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Landmark notes *
                    </span>
                    <input {...register("landmarkNotes")} required className={inputClass} />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Requester metadata
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Source channel *
                    </span>
                    <select {...register("sourceChannel")} required className={inputClass}>
                      {(Object.entries(TICKET_SOURCE_CHANNEL_LABELS) as Array<
                        [TicketSourceChannel, string]
                      >).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Priority *
                    </span>
                    <select {...register("priority")} required className={inputClass}>
                      {(Object.entries(TICKET_CREATION_PRIORITY_LABELS) as Array<
                        [TicketPriority, string]
                      >).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Contact person *
                    </span>
                    <input {...register("contactPersonName")} required className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Contact phone *
                    </span>
                    <input {...register("contactPersonPhone")} required className={inputClass} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Contact role *
                    </span>
                    <select
                      {...register("contactPersonRole")}
                      required
                      className={inputClass}
                    >
                      <option value="">Select contact role…</option>
                      {CONTACT_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Categorized item demand builder
                  </p>
                  <select
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                    defaultValue=""
                    onChange={(event) => {
                      const category = event.target.value as ReliefItemCategory;
                      if (category) append(buildDefaultItem(category));
                      event.target.value = "";
                    }}
                  >
                    <option value="">Add category row…</option>
                    {(Object.entries(RELIEF_ITEM_CATEGORY_LABELS) as Array<
                      [ReliefItemCategory, string]
                    >).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="hidden gap-3 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)] sm:grid sm:grid-cols-[1fr_1fr_110px_110px_120px_120px_auto]">
                    <span>Category</span>
                    <span>Item</span>
                    <span>Unit</span>
                    <span>Qty</span>
                    <span>Unit $</span>
                    <span>Total $</span>
                    <span />
                  </div>
                  {fields.map((field, index) => {
                    const category = watch(`items.${index}.category`);
                    const presets = RELIEF_ITEM_PRESETS[category];
                    return (
                      <div
                        key={field.id}
                        className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-3 sm:grid-cols-[1fr_1fr_110px_110px_120px_120px_auto]"
                      >
                        <select
                          {...register(`items.${index}.category`)}
                          className={inputClass}
                          onChange={(event) => {
                            const nextCategory = event.target.value as ReliefItemCategory;
                            const preset = RELIEF_ITEM_PRESETS[nextCategory][0];
                            setValue(`items.${index}.category`, nextCategory);
                            setValue(
                              `items.${index}.itemDisplayName`,
                              preset?.itemDisplayName ?? "",
                            );
                            setValue(`items.${index}.unitType`, preset?.unitType ?? "UNITS");
                            setValue(
                              `items.${index}.itemId`,
                              `${nextCategory}-${preset?.itemDisplayName ?? "item"}`
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-"),
                            );
                          }}
                        >
                          {(Object.entries(RELIEF_ITEM_CATEGORY_LABELS) as Array<
                            [ReliefItemCategory, string]
                          >).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <select
                          {...register(`items.${index}.itemDisplayName`)}
                          className={inputClass}
                        >
                          {presets.map((preset) => (
                            <option key={preset.itemDisplayName} value={preset.itemDisplayName}>
                              {preset.itemDisplayName}
                            </option>
                          ))}
                        </select>
                        <input
                          {...register(`items.${index}.unitType`)}
                          className={inputClass}
                        />
                        <input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantityRequested`, {
                            valueAsNumber: true,
                          })}
                          onChange={(event) => {
                            const quantity = Number(event.target.value) || 0;
                            setValue(`items.${index}.quantityRequested`, quantity);
                            const unitCost = watch(`items.${index}.estimatedUnitCost`) || 0;
                            setValue(
                              `items.${index}.estimatedTotalCost`,
                              Math.round(quantity * unitCost * 100) / 100,
                            );
                          }}
                          className={inputClass}
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={watch(`items.${index}.estimatedUnitCost`) ?? 0}
                          onChange={(event) => {
                            const unitCost = Number(event.target.value) || 0;
                            setValue(`items.${index}.estimatedUnitCost`, unitCost);
                            const quantity = watch(`items.${index}.quantityRequested`) || 0;
                            setValue(
                              `items.${index}.estimatedTotalCost`,
                              Math.round(quantity * unitCost * 100) / 100,
                            );
                          }}
                          className={inputClass}
                        />
                        <input
                          readOnly
                          value={(watch(`items.${index}.estimatedTotalCost`) ?? 0).toFixed(2)}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--ink)]">
                    Total estimated ticket cost:
                  </span>{" "}
                  <span className="font-semibold text-[var(--accent-strong)]">
                    ${totalEstimatedTicketCost.toFixed(2)}
                  </span>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                    Special instructions
                  </span>
                  <textarea
                    {...register("specialInstructions")}
                    className={`${inputClass} min-h-[84px]`}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Drop-zone GPS picker
                </p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Click the map to set an exact target drop point.
                </p>
                <div className="mt-3">
                  <MapClickPicker
                    coordinates={coordinates}
                    onChange={(coords) => setValue("dropCoordinates", coords)}
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Latitude
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={coordinates.lat}
                      onChange={(event) =>
                        setValue("dropCoordinates", {
                          ...coordinates,
                          lat: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Longitude
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={coordinates.lng}
                      onChange={(event) =>
                        setValue("dropCoordinates", {
                          ...coordinates,
                          lng: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {formState.errors.root?.message ? (
                <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                  {formState.errors.root.message}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formState.isSubmitting}
                  className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {formState.isSubmitting ? "Creating…" : "Create relief ticket"}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
