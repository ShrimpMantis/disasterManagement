import ngeohash from "ngeohash";

/** Default precision (~150m cells) — good for district map pins. */
export const DEFAULT_GEOHASH_PRECISION = 7;

export function encodeGeohash(
  lat: number,
  lng: number,
  precision = DEFAULT_GEOHASH_PRECISION,
): string {
  return ngeohash.encode(lat, lng, precision);
}

export function decodeGeohash(hash: string): { lat: number; lng: number } {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lng: longitude };
}

/**
 * Neighboring geohash prefixes for a bounding-box style query around a point.
 * Query each prefix with `where('geohash', '>=', prefix)` / `< prefix + '\uf8ff'`.
 */
export function geohashQueryBounds(
  lat: number,
  lng: number,
  precision = DEFAULT_GEOHASH_PRECISION,
): string[] {
  const center = ngeohash.encode(lat, lng, precision);
  const neighbors = ngeohash.neighbors(center);
  return Array.from(new Set([center, ...Object.values(neighbors)]));
}

export function slugifyDistrictId(district: string): string {
  return district
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
