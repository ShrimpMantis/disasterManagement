import { haversineKm } from "@/lib/maps/markers";

export type ProximityOrigin = { lat: number; lng: number; label: string };

/** Reference points for emergency-directory proximity sorting. */
export const DIRECTORY_PROXIMITY_ORIGINS: ProximityOrigin[] = [
  { label: "Jorhat East", lat: 26.75, lng: 94.22 },
  { label: "Dhemaji", lat: 27.48, lng: 94.58 },
  { label: "Majuli / Garamur", lat: 26.95, lng: 94.17 },
  { label: "North Lakhimpur", lat: 27.24, lng: 94.1 },
  { label: "Dhubri", lat: 26.02, lng: 89.97 },
  { label: "Guwahati / Dispur", lat: 26.14, lng: 91.79 },
];

export function distanceKmFromOrigin(
  coordinates: { lat: number; lng: number },
  origin: ProximityOrigin | null,
): number | null {
  if (!origin) return null;
  return Math.round(haversineKm(origin, coordinates) * 10) / 10;
}
