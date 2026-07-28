"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDistrictVillageCoverageSummaries,
  getVillageDemandsByDistrict,
  type VillageCoverageSource,
} from "@/actions/villageCoordinationActions";
import type {
  DistrictVillageCoverageSummary,
  VillageDemandMetric,
} from "@/types/villageCoordination";

export function useVillageCoordinationAnalytics() {
  const [districtSummaries, setDistrictSummaries] = useState<
    DistrictVillageCoverageSummary[]
  >([]);
  const [villageDemands, setVillageDemands] = useState<VillageDemandMetric[]>(
    [],
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [source, setSource] = useState<VillageCoverageSource>("empty");

  useEffect(() => {
    let cancelled = false;
    void getDistrictVillageCoverageSummaries().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDistrictSummaries(result.data.districts);
        setSource(result.data.source);
      }
      setLoadingDistricts(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectDistrict = useCallback(async (districtName: string | null) => {
    setSelectedDistrict(districtName);
    if (!districtName) {
      setVillageDemands([]);
      return;
    }

    setLoadingVillages(true);
    const result = await getVillageDemandsByDistrict(districtName);
    if (result.ok) {
      setVillageDemands(result.data.villages);
      setSource(result.data.source);
    } else {
      setVillageDemands([]);
    }
    setLoadingVillages(false);
  }, []);

  return {
    districtSummaries,
    villageDemands,
    selectedDistrict,
    selectDistrict,
    loadingDistricts,
    loadingVillages,
    source,
  };
}
