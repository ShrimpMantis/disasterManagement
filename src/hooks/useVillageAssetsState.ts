"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEmergencyAssetsSnapshot } from "@/actions/emergencyAssetActions";
import { buildVillageAssetSummaries } from "@/lib/villageAssets/aggregation";
import type { VillageGeoNode } from "@/types/geo";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";

export function useVillageAssetsState() {
  const [villages, setVillages] = useState<VillageGeoNode[]>([]);
  const [boats, setBoats] = useState<CountryBoatOwner[]>([]);
  const [highLands, setHighLands] = useState<HighLandZone[]>([]);
  const [camps, setCamps] = useState<ReliefCampFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const result = await fetchEmergencyAssetsSnapshot();
        if (result.ok) {
          setVillages(result.data.villages);
          setBoats(result.data.boats);
          setHighLands(result.data.highLands);
          setCamps(result.data.camps);
        } else {
          setFlashMessage(result.error);
        }
        setLoading(false);
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const summaries = useMemo(
    () =>
      buildVillageAssetSummaries(
        villages.map((village) => ({
          id: village.id,
          name: village.name,
          revenueCircle: village.revenueCircle,
          district: village.district,
          coordinates: village.coordinates,
        })),
        boats,
        highLands,
        camps,
      ),
    [boats, camps, highLands, villages],
  );

  const kpis = useMemo(() => {
    const availableBoats = boats.filter((boat) => boat.status === "AVAILABLE").length;
    const clearHighLands = highLands.filter(
      (zone) => zone.accessRouteStatus === "CLEAR",
    ).length;
    const openCampBeds = camps
      .filter((camp) => camp.status === "ACTIVE" || camp.status === "STANDBY")
      .reduce(
        (sum, camp) => sum + Math.max(0, camp.maxCapacityPersons - camp.currentOccupancy),
        0,
      );
    return { availableBoats, clearHighLands, openCampBeds };
  }, [boats, camps, highLands]);

  const dispatchBoatAlert = useCallback(
    (payload: {
      boatIds: string[];
      destinationLabel: string;
      coordinates: string;
      message: string;
    }) => {
      const recipients = boats.filter((boat) => payload.boatIds.includes(boat.id));
      if (recipients.length === 0) {
        setFlashMessage("No boat operators selected.");
        return false;
      }

      setBoats((prev) =>
        prev.map((boat) =>
          payload.boatIds.includes(boat.id) && boat.status === "AVAILABLE"
            ? {
                ...boat,
                status: "DEPLOYED",
                currentAssignmentLocation: payload.destinationLabel,
              }
            : boat,
        ),
      );

      setFlashMessage(
        `Dispatch SMS queued to ${recipients.length} operator(s) for ${payload.destinationLabel} (${payload.coordinates}).`,
      );
      return true;
    },
    [boats],
  );

  return {
    loading,
    villages,
    boats,
    highLands,
    camps,
    summaries,
    kpis,
    flashMessage,
    setFlashMessage,
    dispatchBoatAlert,
  };
}
