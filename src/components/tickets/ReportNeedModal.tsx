"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { createCrowdReportedNeed } from "@/actions/ticketCreationActions";
import { mapCreatorTypeFromProfile } from "@/lib/tickets/crowdNeed";
import type { TicketDoc } from "@/lib/firestore/schema";
import type { CrowdNeedCategory } from "@/types/ticket";
import { CROWD_NEED_CATEGORY_LABELS } from "@/types/ticket";
import type { UserType } from "@/types/userProfile";

type VillageOption = {
  id: string;
  name: string;
  revenueCircle: string;
  district: string;
};

type ReportNeedModalProps = {
  open: boolean;
  villages?: VillageOption[];
  isAdmin: boolean;
  userId: string;
  userDisplayName: string;
  userType?: UserType | null;
  onClose: () => void;
  onCreated: (ticket: TicketDoc) => void;
};

const formSchema = z.object({
  title: z.string().min(3, "Add a short need title."),
  category: z.enum([
    "FOOD_WATER",
    "MEDICAL",
    "RESCUE_EQUIPMENT",
    "SHELTER_KIT",
  ]),
  locationName: z.string().min(2, "Village or landmark is required."),
  quantityRequired: z.coerce
    .number()
    .int()
    .positive("Quantity must be greater than 0."),
  urgency: z.enum(["CRITICAL", "HIGH", "MEDIUM"]),
  createdByPhone: z.string().min(7, "Phone number is required."),
  creatorRole: z.enum(["CITIZEN", "VILLAGE_LEAD", "NON_PROFIT", "ADMIN"]),
  districtName: z.string().optional(),
  revenueCircle: z.string().optional(),
  villageId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

const CATEGORY_OPTIONS = Object.keys(
  CROWD_NEED_CATEGORY_LABELS,
) as CrowdNeedCategory[];

export function ReportNeedModal({
  open,
  villages = [],
  isAdmin,
  userId,
  userDisplayName,
  userType,
  onClose,
  onCreated,
}: ReportNeedModalProps) {
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const defaultRole = mapCreatorTypeFromProfile({
    isAdmin,
    userType,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "FOOD_WATER",
      locationName: "",
      quantityRequired: 10,
      urgency: "HIGH",
      createdByPhone: "",
      creatorRole: defaultRole,
      districtName: "",
      revenueCircle: "",
      villageId: "",
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState } = form;
  const locationName = watch("locationName");

  const matchedVillage = useMemo(() => {
    const q = locationName.trim().toLowerCase();
    if (!q) return null;
    return (
      villages.find((entry) => entry.name.toLowerCase() === q) ||
      villages.find((entry) => entry.name.toLowerCase().includes(q)) ||
      null
    );
  }, [locationName, villages]);

  useEffect(() => {
    if (!open) return;
    reset({
      title: "",
      category: "FOOD_WATER",
      locationName: "",
      quantityRequired: 10,
      urgency: "HIGH",
      createdByPhone: "",
      creatorRole: defaultRole,
      districtName: "",
      revenueCircle: "",
      villageId: "",
    });
    setSubmitError("");
  }, [defaultRole, open, reset]);

  useEffect(() => {
    if (!matchedVillage) return;
    setValue("villageId", matchedVillage.id);
    setValue("districtName", matchedVillage.district);
    setValue("revenueCircle", matchedVillage.revenueCircle);
  }, [matchedVillage, setValue]);

  if (!open) return null;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError("");
    const result = await createCrowdReportedNeed({
      title: values.title,
      category: values.category,
      locationName: values.locationName,
      quantityRequired: values.quantityRequired,
      urgency: values.urgency,
      createdByPhone: values.createdByPhone,
      createdByType: values.creatorRole,
      createdById: userId,
      createdByName: userDisplayName,
      isAdminUser: isAdmin,
      districtName: values.districtName || matchedVillage?.district,
      revenueCircle: values.revenueCircle || matchedVillage?.revenueCircle,
      villageId: values.villageId || matchedVillage?.id,
    });
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    onCreated(result.data.queueTicket);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(21,32,43,0.45)] px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-need-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Crowdsourced demand
            </p>
            <h2
              id="report-need-title"
              className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]"
            >
              Report Urgent Need
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Fast ground entry — keep details short and accurate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">
              Need title
            </span>
            <input
              {...register("title")}
              placeholder='e.g. "50 Life Jackets Needed"'
              className={inputClass}
            />
            {formState.errors.title ? (
              <p className="mt-1 text-xs text-[#b91c1c]">
                {formState.errors.title.message}
              </p>
            ) : null}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">
              Category
            </span>
            <select {...register("category")} className={inputClass}>
              {CATEGORY_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {CROWD_NEED_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">
              Target location / village
            </span>
            <input
              {...register("locationName")}
              list="crowd-need-villages"
              placeholder="Village, landmark, or highland base"
              className={inputClass}
            />
            <datalist id="crowd-need-villages">
              {villages.map((village) => (
                <option key={village.id} value={village.name} />
              ))}
            </datalist>
            {matchedVillage ? (
              <p className="mt-1 text-xs text-[var(--accent-strong)]">
                Matched {matchedVillage.name} · {matchedVillage.district}
              </p>
            ) : null}
            {formState.errors.locationName ? (
              <p className="mt-1 text-xs text-[#b91c1c]">
                {formState.errors.locationName.message}
              </p>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                Quantity required
              </span>
              <input
                type="number"
                min={1}
                {...register("quantityRequired")}
                className={inputClass}
              />
              {formState.errors.quantityRequired ? (
                <p className="mt-1 text-xs text-[#b91c1c]">
                  {formState.errors.quantityRequired.message}
                </p>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                Urgency
              </span>
              <select {...register("urgency")} className={inputClass}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">
              Ground contact phone
            </span>
            <input
              {...register("createdByPhone")}
              type="tel"
              inputMode="tel"
              placeholder="+91 …"
              className={inputClass}
            />
            {formState.errors.createdByPhone ? (
              <p className="mt-1 text-xs text-[#b91c1c]">
                {formState.errors.createdByPhone.message}
              </p>
            ) : null}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">
              Reporting as
            </span>
            <select {...register("creatorRole")} className={inputClass}>
              <option value="CITIZEN">Citizen / volunteer</option>
              <option value="VILLAGE_LEAD">Village lead</option>
              <option value="NON_PROFIT">Non-profit partner</option>
              {isAdmin ? <option value="ADMIN">Admin / agency</option> : null}
            </select>
          </label>

          {submitError ? (
            <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {submitting ? "Submitting…" : "Submit Need"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
