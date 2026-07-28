"use client";

import { useEffect, useState } from "react";
import { fetchWarehouseModuleSnapshot } from "@/actions/warehouseModuleActions";
import { WarehouseSummaryTile } from "@/components/warehouse/WarehouseSummaryTile";
import type { WarehouseModuleSnapshot } from "@/types/warehouseModule";

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

/** Dashboard KPI tile — district sub-tiles link into the warehouse module. */
export function WarehouseCapacityTile() {
  const [snapshot, setSnapshot] = useState<WarehouseModuleSnapshot>(
    emptyWarehouseSnapshot,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchWarehouseModuleSnapshot().then((result) => {
      if (!cancelled && result.ok) setSnapshot(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WarehouseSummaryTile
      macro={snapshot.macro}
      districts={snapshot.districts}
      linkToModule
      compact
    />
  );
}
