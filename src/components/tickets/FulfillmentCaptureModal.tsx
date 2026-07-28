"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, MapPin, QrCode, Upload, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import {
  buildExpectedItemQrs,
  haversineDistanceMeters,
  LOCATION_OVERRIDE_THRESHOLD_METERS,
} from "@/lib/tickets/fulfillmentAudit";
import type { ReliefTicket } from "@/types/ticket";

type GeoPoint = {
  lat: number;
  lng: number;
  accuracyMeters: number;
};

type FulfillmentCaptureModalProps = {
  open: boolean;
  ticket: ReliefTicket | null;
  targetCoordinates?: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (payload: {
    scannedQrCodes: string[];
    photoFile: File;
    deliveryCoordinates: GeoPoint;
    isLocationOverridden: boolean;
    locationOverrideReason?: string;
  }) => Promise<void> | void;
};

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]";

export function FulfillmentCaptureModal({
  open,
  ticket,
  targetCoordinates,
  onClose,
  onSubmit,
}: FulfillmentCaptureModalProps) {
  const scannerId = useMemo(
    () => `html5-qr-${ticket?.id ?? "capture"}`,
    [ticket?.id],
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [manualQr, setManualQr] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<GeoPoint | null>(
    null,
  );
  const [geoError, setGeoError] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expectedCodes = useMemo(
    () => (ticket ? buildExpectedItemQrs(ticket) : []),
    [ticket],
  );
  const totalExpectedItems = expectedCodes.length;
  const distanceFromTarget = useMemo(() => {
    if (!deliveryCoordinates || !targetCoordinates) return null;
    return haversineDistanceMeters(deliveryCoordinates, targetCoordinates);
  }, [deliveryCoordinates, targetCoordinates]);
  const needsOverride =
    typeof distanceFromTarget === "number" &&
    distanceFromTarget > LOCATION_OVERRIDE_THRESHOLD_METERS;

  useEffect(() => {
    if (!open || !ticket) return;
    setScannedCodes([]);
    setManualQr("");
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setDeliveryCoordinates(null);
    setGeoError("");
    setOverrideReason("");
  }, [open, ticket]);

  useEffect(() => {
    if (!open || !ticket) return;
    let cancelled = false;
    const qr = new Html5Qrcode(scannerId);
    scannerRef.current = qr;

    void qr
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (cancelled) return;
          setScannedCodes((prev) =>
            prev.includes(decodedText) ? prev : [...prev, decodedText],
          );
        },
        () => undefined,
      )
      .catch(() => undefined);

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        void instance
          .stop()
          .catch(() => undefined)
          .finally(() => {
            instance.clear();
          });
      }
    };
  }, [open, scannerId, ticket]);

  async function captureLocation() {
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => {
        setGeoError(error.message || "Could not capture current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  function addManualQr() {
    const value = manualQr.trim();
    if (!value) return;
    setScannedCodes((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setManualQr("");
  }

  async function handleSubmit() {
    if (!ticket || !photoFile || !deliveryCoordinates) return;
    if (needsOverride && !overrideReason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        scannedQrCodes: scannedCodes,
        photoFile,
        deliveryCoordinates,
        isLocationOverridden: Boolean(needsOverride),
        locationOverrideReason: needsOverride
          ? overrideReason.trim()
          : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,43,0.45)] px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              Batch fulfillment verification
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
              {ticket.id}
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Scan serialized item QR codes, capture a drop photo, and log GPS.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Camera batch scanner
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Scanned: {scannedCodes.length} / {totalExpectedItems} Kits
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {Math.round(
                    ((scannedCodes.length || 0) / Math.max(totalExpectedItems, 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div
                id={scannerId}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-black/5"
              />
              <div className="mt-3 flex gap-2">
                <input
                  value={manualQr}
                  onChange={(event) => setManualQr(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addManualQr();
                    }
                  }}
                  className={inputClass}
                  placeholder="Manual QR entry fallback"
                />
                <button
                  type="button"
                  onClick={addManualQr}
                  className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Scanned manifest
              </p>
              <ul className="mt-2 grid max-h-48 gap-1 overflow-auto rounded-lg bg-white p-2 text-xs text-[var(--ink-muted)] sm:grid-cols-2">
                {scannedCodes.length > 0 ? (
                  scannedCodes.map((code) => <li key={code}>{code}</li>)
                ) : (
                  <li>No QR codes captured yet.</li>
                )}
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                <Camera className="h-4 w-4" aria-hidden />
                Geo-tagged drop photo
              </p>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  Upload offload photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPhotoFile(file);
                    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : "");
                  }}
                  className={inputClass}
                />
              </label>
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Drop preview"
                  className="mt-3 h-48 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mt-3 flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--ink-muted)]">
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                  Photo preview appears here
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                    <MapPin className="h-4 w-4" aria-hidden />
                    Delivery coordinates
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Capture current GPS before submitting fulfillment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={captureLocation}
                  className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                >
                  Capture GPS
                </button>
              </div>
              {deliveryCoordinates ? (
                <div className="mt-3 space-y-1 rounded-lg bg-white p-2 text-xs text-[var(--ink-muted)]">
                  <p>
                    Lat/Lng: {deliveryCoordinates.lat.toFixed(5)},{" "}
                    {deliveryCoordinates.lng.toFixed(5)}
                  </p>
                  <p>
                    Accuracy: {Math.round(deliveryCoordinates.accuracyMeters)} m
                  </p>
                  {typeof distanceFromTarget === "number" ? (
                    <p>
                      Distance from village target:{" "}
                      {Math.round(distanceFromTarget)} m
                    </p>
                  ) : null}
                </div>
              ) : null}
              {geoError ? (
                <p className="mt-2 text-xs text-[#b91c1c]">{geoError}</p>
              ) : null}
              {needsOverride ? (
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-sm font-medium text-[#9a3412]">
                    GPS is more than 500m away from the target village. Override
                    reason required.
                  </span>
                  <textarea
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    className={`${inputClass} min-h-[88px]`}
                    placeholder="Road submerged 400m short of village, dropped at high ground shelter"
                  />
                </label>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              submitting ||
              scannedCodes.length === 0 ||
              !photoFile ||
              !deliveryCoordinates ||
              (needsOverride && !overrideReason.trim())
            }
            onClick={() => void handleSubmit()}
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit fulfillment proof"}
          </button>
        </div>
      </div>
    </div>
  );
}
