"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignNgoToVillage,
  fetchNgoCoordinationSnapshot,
} from "@/actions/ngoCoordinationActions";
import {
  computeCoverageMetrics,
  withComputedCoverage,
} from "@/lib/ngo/coverage";
import { toPledgeAuditRow } from "@/lib/ngo/pledges";
import type { VillageGeoNode } from "@/types/geo";
import type { NGOProfile } from "@/types/ngo";
import type { SupplyPledge } from "@/types/pledge";

export type DispatchAlert = {
  id: string;
  villageId: string;
  villageName: string;
  ngoId: string;
  ngoName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  message: string;
};

/**
 * Shared coordination state that survives tab switches on /relief-coordination.
 * selectedVillageId / selectedNgoId remain set when toggling between coverage,
 * pledges, and directory views.
 */
export function useNGOCoordinationState() {
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [villages, setVillages] = useState<VillageGeoNode[]>([]);
  const [pledges, setPledges] = useState<SupplyPledge[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [selectedNgoId, setSelectedNgoId] = useState<string | null>(null);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [dispatchAlerts, setDispatchAlerts] = useState<DispatchAlert[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await fetchNgoCoordinationSnapshot();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNgos(result.data.ngos);
    setVillages(result.data.villages);
    setPledges(result.data.pledges);
    setError("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const coverageMetrics = useMemo(() => computeCoverageMetrics(villages), [villages]);

  const selectedVillage = useMemo(
    () => villages.find((village) => village.id === selectedVillageId) ?? null,
    [villages, selectedVillageId],
  );

  const selectedNgo = useMemo(
    () => ngos.find((ngo) => ngo.id === selectedNgoId) ?? null,
    [ngos, selectedNgoId],
  );

  const pledgeRows = useMemo(
    () => pledges.map((pledge) => toPledgeAuditRow(pledge)),
    [pledges],
  );

  const openAssignDrawer = useCallback((villageId: string) => {
    setSelectedVillageId(villageId);
    setIsAssignDrawerOpen(true);
  }, []);

  const closeAssignDrawer = useCallback(() => {
    setIsAssignDrawerOpen(false);
  }, []);

  const selectVillage = useCallback((villageId: string | null) => {
    setSelectedVillageId(villageId);
  }, []);

  const selectNgo = useCallback((ngoId: string | null) => {
    setSelectedNgoId(ngoId);
  }, []);

  const assignNGOToVillage = useCallback(
    async (villageId: string, ngoId: string) => {
      const ngo = ngos.find((entry) => entry.id === ngoId);
      const village = villages.find((entry) => entry.id === villageId);
      if (!ngo || !village) return;

      const result = await assignNgoToVillage({
        villageId,
        district: village.district,
        ngoId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setVillages((prev) =>
        prev.map((entry) => {
          if (entry.id !== villageId) return entry;
          return withComputedCoverage({
            ...entry,
            assignedNGOIds: result.data.assignedNGOIds,
          });
        }),
      );

      setNgos((prev) =>
        prev.map((entry) => {
          if (entry.id !== ngoId) return entry;
          return {
            ...entry,
            assignedVillageIds: result.data.assignedVillageIds,
          };
        }),
      );

      const alert: DispatchAlert = {
        id: `alert-${Date.now()}`,
        villageId,
        villageName: village.name,
        ngoId: ngo.id,
        ngoName: ngo.name,
        contactName: ngo.primaryContact.name,
        contactPhone: ngo.primaryContact.phone,
        contactEmail: ngo.primaryContact.email,
        createdAt: new Date().toISOString(),
        message: `Dispatch alert sent to ${ngo.primaryContact.name} (${ngo.primaryContact.phone} / ${ngo.primaryContact.email}) for ${village.name}.`,
      };

      setDispatchAlerts((prev) => [alert, ...prev].slice(0, 8));
      setSelectedVillageId(villageId);
      setSelectedNgoId(ngoId);
      setIsAssignDrawerOpen(false);
      setError("");
    },
    [ngos, villages],
  );

  const assignableNgos = useMemo(() => {
    if (!selectedVillage) return [];
    return ngos.filter(
      (ngo) =>
        ngo.status !== "INACTIVE" &&
        !selectedVillage.assignedNGOIds.includes(ngo.id),
    );
  }, [ngos, selectedVillage]);

  return {
    ngos,
    villages,
    pledges,
    pledgeRows,
    coverageMetrics,
    selectedVillage,
    selectedVillageId,
    selectedNgo,
    selectedNgoId,
    isAssignDrawerOpen,
    assignableNgos,
    dispatchAlerts,
    error,
    openAssignDrawer,
    closeAssignDrawer,
    selectVillage,
    selectNgo,
    assignNGOToVillage,
    refresh,
  };
}
