/**
 * Convert Firestore Admin SDK values into plain JSON-safe data for Server Actions.
 * Timestamp classes cannot cross the Server → Client Component boundary.
 */
export function toPlainData<T>(value: T): T {
  return revivePlain(value) as T;
}

function revivePlain(value: unknown): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }

  // Already-decoded timestamp shapes from some drivers
  if (
    Object.prototype.hasOwnProperty.call(value, "_seconds") &&
    Object.prototype.hasOwnProperty.call(value, "_nanoseconds")
  ) {
    const seconds = Number((value as { _seconds: unknown })._seconds);
    const nanos = Number((value as { _nanoseconds: unknown })._nanoseconds);
    if (Number.isFinite(seconds) && Number.isFinite(nanos)) {
      return new Date(seconds * 1000 + nanos / 1e6).toISOString();
    }
  }

  if (Array.isArray(value)) {
    return value.map(revivePlain);
  }

  const plain: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    // Internal Admin write markers are not part of app types
    if (key === "serverCreatedAt" || key === "serverUpdatedAt") continue;
    plain[key] = revivePlain(entry);
  }
  return plain;
}
