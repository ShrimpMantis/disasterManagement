"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import { createTransportRequest } from "@/actions/transportActions";
import type { TransportCapabilityRequest } from "@/types/transportationDispatch";
import {
  TRANSPORT_MODALITY_LABELS,
  URGENCY_LABELS,
} from "@/types/transportationDispatch";
import { TRANSPORTER_BASE_DISTRICTS } from "@/types/transporterFleet";

const ROAD_MODALITIES = [
  "TRUCK_MINI_4X4",
  "TRUCK_HEAVY",
  "TRACTOR_TRAILER",
  "PASSENGER_CAR_4X4",
] as const;

const formSchema = z.object({
  district: z.string().min(1, "District is required."),
  revenueCircle: z.string().min(1, "Revenue circle / locality is required."),
  pickupLocation: z.string().min(1, "Pickup location is required."),
  destinationLocation: z.string().optional(),
  modalityType: z.enum(ROAD_MODALITIES),
  quantityNeeded: z.coerce.number().int().positive("Need at least 1 vehicle."),
  urgency: z.enum(["CRITICAL_IMMEDIATE", "HIGH_24HR", "STANDARD_SCHEDULED"]),
  cargoOrTaskDescription: z.string().min(1, "Describe the cargo or task."),
  requestorDesignation: z.string().min(1, "Your role / designation is required."),
  requestorPhone: z.string().min(7, "Contact phone is required."),
});

type FormValues = z.infer<typeof formSchema>;

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

type CreateTransportRequestModalProps = {
  open: boolean;
  requestorId: string;
  requestorName: string;
  defaultPhone?: string;
  onClose: () => void;
  onCreated: (request: TransportCapabilityRequest) => void;
};

export function CreateTransportRequestModal({
  open,
  requestorId,
  requestorName,
  defaultPhone = "",
  onClose,
  onCreated,
}: CreateTransportRequestModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      district: "Nagaon",
      revenueCircle: "",
      pickupLocation: "",
      destinationLocation: "",
      modalityType: "TRUCK_MINI_4X4",
      quantityNeeded: 1,
      urgency: "HIGH_24HR",
      cargoOrTaskDescription: "",
      requestorDesignation: "Field Coordinator",
      requestorPhone: defaultPhone,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        district: "Nagaon",
        revenueCircle: "",
        pickupLocation: "",
        destinationLocation: "",
        modalityType: "TRUCK_MINI_4X4",
        quantityNeeded: 1,
        urgency: "HIGH_24HR",
        cargoOrTaskDescription: "",
        requestorDesignation: "Field Coordinator",
        requestorPhone: defaultPhone,
      });
    }
  }, [defaultPhone, open, reset]);

  if (!open) return null;

  async function onSubmit(values: FormValues) {
    const result = await createTransportRequest({
      district: values.district,
      revenueCircle: values.revenueCircle,
      pickupLocation: values.pickupLocation,
      destinationLocation: values.destinationLocation || undefined,
      modalityType: values.modalityType,
      quantityNeeded: values.quantityNeeded,
      urgency: values.urgency,
      cargoOrTaskDescription: values.cargoOrTaskDescription,
      requestorId,
      requestorName,
      requestorDesignation: values.requestorDesignation,
      requestorPhone: values.requestorPhone,
    });

    if (!result.ok) {
      setError("root", { message: result.error });
      return;
    }

    onCreated(result.data);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-transport-title"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Dispatch demand
            </p>
            <h2
              id="create-transport-title"
              className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]"
            >
              Create transport request
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-muted)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--ink-muted)] sm:col-span-1">
            District
            <select className={`${inputClass} mt-1`} {...register("district")}>
              {TRANSPORTER_BASE_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {errors.district ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.district.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-[var(--ink-muted)]">
            Revenue circle / locality
            <input
              className={`${inputClass} mt-1`}
              placeholder="Nagaon Highland"
              {...register("revenueCircle")}
            />
            {errors.revenueCircle ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.revenueCircle.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-[var(--ink-muted)] sm:col-span-2">
            Pickup location
            <input
              className={`${inputClass} mt-1`}
              placeholder="Landmark or coordinates"
              {...register("pickupLocation")}
            />
            {errors.pickupLocation ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.pickupLocation.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-[var(--ink-muted)] sm:col-span-2">
            Destination (optional)
            <input
              className={`${inputClass} mt-1`}
              placeholder="Relief camp / warehouse"
              {...register("destinationLocation")}
            />
          </label>

          <label className="text-xs text-[var(--ink-muted)]">
            Vehicle type needed
            <select className={`${inputClass} mt-1`} {...register("modalityType")}>
              {ROAD_MODALITIES.map((modality) => (
                <option key={modality} value={modality}>
                  {TRANSPORT_MODALITY_LABELS[modality]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-[var(--ink-muted)]">
            Quantity needed
            <input
              type="number"
              min={1}
              className={`${inputClass} mt-1`}
              {...register("quantityNeeded")}
            />
            {errors.quantityNeeded ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.quantityNeeded.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-[var(--ink-muted)] sm:col-span-2">
            Urgency
            <select className={`${inputClass} mt-1`} {...register("urgency")}>
              {(
                Object.keys(URGENCY_LABELS) as Array<keyof typeof URGENCY_LABELS>
              ).map((urgency) => (
                <option key={urgency} value={urgency}>
                  {URGENCY_LABELS[urgency]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-[var(--ink-muted)] sm:col-span-2">
            Cargo / task description
            <textarea
              rows={3}
              className={`${inputClass} mt-1`}
              placeholder="e.g. 3 trucks needed for dry ration lift"
              {...register("cargoOrTaskDescription")}
            />
            {errors.cargoOrTaskDescription ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.cargoOrTaskDescription.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-[var(--ink-muted)]">
            Your designation
            <input
              className={`${inputClass} mt-1`}
              {...register("requestorDesignation")}
            />
          </label>

          <label className="text-xs text-[var(--ink-muted)]">
            Contact phone
            <input
              className={`${inputClass} mt-1`}
              {...register("requestorPhone")}
            />
            {errors.requestorPhone ? (
              <span className="mt-1 block text-[11px] text-[var(--danger)]">
                {errors.requestorPhone.message}
              </span>
            ) : null}
          </label>
        </div>

        {errors.root ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {errors.root.message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
