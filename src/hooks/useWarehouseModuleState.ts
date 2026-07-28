"use client";

import { useCallback, useEffect, useState } from "react";
import {
  auditWarehouseStock,
  fetchWarehouseModuleSnapshot,
} from "@/actions/warehouseModuleActions";
import { aggregateWarehouseModule } from "@/lib/warehouse/model";
import type {
  WarehouseLocation,
  WarehouseModuleSnapshot,
} from "@/types/warehouseModule";

function rebuildSnapshot(
  warehouses: WarehouseLocation[],
  source: WarehouseModuleSnapshot["source"],
): WarehouseModuleSnapshot {
  const { districts, macro } = aggregateWarehouseModule(warehouses);
  return { warehouses, districts, macro, source };
}

function emptyWarehouseSnapshot(): WarehouseModuleSnapshot {
  return {
    warehouses: [],
    districts: [],
    macro: {
      totalCapacityTons: 0,
      totalStockedTons: 0,
      totalOutstandingCapacityTons: 0,
      fillPercentage: 0,
      totalWarehousesCount: 0,
      districtCount: 0,
    },
    source: "firestore",
  };
}

export function useWarehouseModuleState(initialDistrict?: string | null) {
  const [snapshot, setSnapshot] = useState<WarehouseModuleSnapshot>(
    emptyWarehouseSnapshot,
  );
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
    initialDistrict ?? null,
  );
  const [focusedWarehouseId, setFocusedWarehouseId] = useState<string | null>(
    null,
  );
  const [flash, setFlash] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchWarehouseModuleSnapshot();
    if (result.ok) {
      setSnapshot(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedDistrict(initialDistrict ?? null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialDistrict]);

  const warehouses = selectedDistrict
    ? snapshot.warehouses.filter(
        (entry) =>
          entry.district.toLowerCase() === selectedDistrict.toLowerCase(),
      )
    : snapshot.warehouses;

  const focusedWarehouse =
    snapshot.warehouses.find(
      (entry) => entry.warehouseId === focusedWarehouseId,
    ) ?? null;

  const selectDistrict = useCallback((district: string | null) => {
    setSelectedDistrict(district);
  }, []);

  const selectWarehouse = useCallback(
    (coordinates: { lat: number; lng: number }, warehouseId: string) => {
      setFocusedWarehouseId(warehouseId);
      const match = snapshot.warehouses.find(
        (entry) => entry.warehouseId === warehouseId,
      );
      if (match) {
        setSelectedDistrict(match.district);
        setFlash(
          `Map focused on ${match.warehouseName} (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}).`,
        );
      }
    },
    [snapshot.warehouses],
  );

  const auditStock = useCallback(
    async (warehouseId: string, currentStockTons: number) => {
      const existing = snapshot.warehouses.find(
        (entry) => entry.warehouseId === warehouseId,
      );
      if (!existing) return false;

      const result = await auditWarehouseStock({
        warehouseId,
        district: existing.district,
        currentStockTons,
      });

      if (!result.ok) {
        setFlash(result.error);
        return false;
      }

      setSnapshot((prev) =>
        rebuildSnapshot(
          prev.warehouses.map((entry) =>
            entry.warehouseId === warehouseId ? result.data : entry,
          ),
          prev.source,
        ),
      );
      setFlash(
        result.message ??
          `Stock audit saved for ${result.data.warehouseName}: ${result.data.currentStockTons} MT.`,
      );
      return true;
    },
    [snapshot.warehouses],
  );

  const upsertWarehouses = useCallback((incoming: WarehouseLocation[]) => {
    setSnapshot((prev) => {
      const byId = new Map(
        prev.warehouses.map((entry) => [entry.warehouseId, entry] as const),
      );
      for (const entry of incoming) {
        byId.set(entry.warehouseId, entry);
      }
      return rebuildSnapshot(Array.from(byId.values()), prev.source);
    });
    setFlash(
      `Imported ${incoming.length} warehouse row(s) into the directory.`,
    );
  }, []);

  return {
    loading,
    snapshot,
    warehouses,
    selectedDistrict,
    focusedWarehouse,
    focusedWarehouseId,
    flash,
    setFlash,
    selectDistrict,
    selectWarehouse,
    auditStock,
    upsertWarehouses,
    refresh,
  };
}
