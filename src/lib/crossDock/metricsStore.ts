import type { ConsolidatedReliefMetrics } from "@/types/reliefTotals";
import { emptyConsolidatedReliefMetrics } from "@/lib/crossDock/reliefMetrics";

const STORAGE_KEY = "reliefnet-crossdock-metrics-v1";

export function readCrossDockMetrics(): ConsolidatedReliefMetrics {
  if (typeof window === "undefined") return emptyConsolidatedReliefMetrics();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyConsolidatedReliefMetrics();
    return JSON.parse(raw) as ConsolidatedReliefMetrics;
  } catch {
    return emptyConsolidatedReliefMetrics();
  }
}

export function writeCrossDockMetrics(metrics: ConsolidatedReliefMetrics): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  window.dispatchEvent(new Event("reliefnet-crossdock-metrics-updated"));
}

export function subscribeCrossDockMetrics(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("reliefnet-crossdock-metrics-updated", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("reliefnet-crossdock-metrics-updated", listener);
  };
}
