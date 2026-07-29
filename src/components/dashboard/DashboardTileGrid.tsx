"use client";

import { fetchCrossDockSnapshot } from "@/actions/crossDockActions";
import {
  readCrossDockMetrics,
  subscribeCrossDockMetrics,
  writeCrossDockMetrics,
} from "@/lib/crossDock/metricsStore";
import { emptyConsolidatedReliefMetrics } from "@/lib/crossDock/reliefMetrics";
import { computeCoverageMetrics } from "@/lib/ngo/coverage";
import { useSosTriageState } from "@/hooks/useSosTriageState";
import { useTransportationDispatchState } from "@/hooks/useTransportationDispatchState";
import type { MapBoundsLiteral } from "@/types/map";
import type {
  DistrictProgressSummary,
  KeyOfficialContact,
  ReliefCategoryProgress,
} from "@/types/dashboard";
import type { EmergencyMapFocus } from "@/types/emergencyDirectory";
import type { ConsolidatedReliefMetrics } from "@/types/reliefTotals";
import type { VillageGeoNode } from "@/types/geo";
import type { RapidDispatchAssetType, SOSAlertTicket } from "@/types/sos";
import type {
  CountryBoatOwner,
  HighLandZone,
  ReliefCampFacility,
} from "@/types/villageAssets";
import type {
  RentalTruckOperator,
  VolunteerCircleDeployment,
  WorkforceMetrics,
} from "@/types/workforceLogistics";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getOperationalMode } from "@/lib/features/operationalMode";
import { DistrictDashboardMap } from "@/components/maps/DistrictDashboardMap";
import { ConsolidatedReliefCounterTile } from "@/components/dashboard/ConsolidatedReliefCounterTile";
import { EmergencyDirectoryTile } from "@/components/dashboard/EmergencyDirectoryTile";
import { KeyOfficialsRosterTile } from "@/components/dashboard/KeyOfficialsRosterTile";
import { ReliefFulfillmentDonutTile } from "@/components/dashboard/ReliefFulfillmentDonutTile";
import { ReliefProgressTrackerTile } from "@/components/dashboard/ReliefProgressTrackerTile";
import { TimeCriticalSOSTile } from "@/components/dashboard/TimeCriticalSOSTile";
import { TotalFundsRaisedTile } from "@/components/dashboard/TotalFundsRaisedTile";
import { TransportationDemandTile } from "@/components/dashboard/TransportationDemandTile";
import { VillagesFullyCoveredTile } from "@/components/dashboard/VillagesFullyCoveredTile";
import { WarehouseCapacityTile } from "@/components/dashboard/WarehouseCapacityTile";
import { WorkforceSummaryTile } from "@/components/dashboard/WorkforceSummaryTile";
import { RapidDispatchDrawer } from "@/components/messaging/RapidDispatchDrawer";
import { TransportationChatDrawer } from "@/components/messaging/TransportationChatDrawer";

type DashboardTileGridProps = {
  villages: VillageGeoNode[];
  officials: KeyOfficialContact[];
  districtProgress: DistrictProgressSummary;
  boats: CountryBoatOwner[];
  highLands: HighLandZone[];
  camps: ReliefCampFacility[];
  sosAlerts: SOSAlertTicket[];
  workforceMetrics: WorkforceMetrics;
  volunteerDeployments: VolunteerCircleDeployment[];
  trucks: RentalTruckOperator[];
  alertSummary: string;
  selectedVillageId: string | null;
  onBoundsChange: (bounds: MapBoundsLiteral | null) => void;
  onVillageSelect: (villageId: string | null) => void;
  onDispatchSos: (sosId: string) => void;
  onFlash: (message: string) => void;
  volunteerFocus: boolean;
  onToggleVolunteerFocus: () => void;
};

/** Temporarily hide Relief distribution KPI; set true to restore beside warehouse. */
const SHOW_RELIEF_DISTRIBUTION_TILE = false;

function boatToRapidAsset(boat: CountryBoatOwner) {
  return {
    id: boat.id,
    type: (boat.boatType === "SPEED_BOAT"
      ? "RESCUE_BOAT"
      : "BOAT_AMBULANCE") as RapidDispatchAssetType,
    label: `${boat.ownerName} · ${boat.villageName}`,
    status: boat.status,
    etaMinutes: boat.status === "AVAILABLE" ? 15 : 30,
  };
}

export function DashboardTileGrid({
  villages,
  officials,
  districtProgress,
  boats,
  highLands,
  camps,
  sosAlerts,
  workforceMetrics,
  volunteerDeployments,
  trucks,
  alertSummary,
  selectedVillageId,
  onBoundsChange,
  onVillageSelect,
  onDispatchSos,
  onFlash,
  volunteerFocus,
  onToggleVolunteerFocus,
}: DashboardTileGridProps) {
  const dispatch = useTransportationDispatchState();
  const sosTriage = useSosTriageState(sosAlerts);
  const [mapFocus, setMapFocus] = useState<EmergencyMapFocus | null>(null);
  const [dispatchSos, setDispatchSos] = useState<SOSAlertTicket | null>(null);
  const [reliefMetrics, setReliefMetrics] = useState<ConsolidatedReliefMetrics>(
    emptyConsolidatedReliefMetrics(),
  );

  useEffect(() => {
    const load = async () => {
      const result = await fetchCrossDockSnapshot();
      if (result.ok) {
        setReliefMetrics(result.data.reliefMetrics);
        writeCrossDockMetrics(result.data.reliefMetrics);
        return;
      }
      setReliefMetrics(readCrossDockMetrics());
    };

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    const unsubscribe = subscribeCrossDockMetrics(() => {
      setReliefMetrics(readCrossDockMetrics());
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const villageCoverageMetrics = useMemo(
    () => computeCoverageMetrics(villages),
    [villages],
  );

  const rapidDispatchAssets = useMemo(
    () =>
      boats
        .filter((boat) => boat.status === "AVAILABLE" || boat.status === "DEPLOYED")
        .slice(0, 8)
        .map(boatToRapidAsset),
    [boats],
  );

  function handleNgoMobilization(category: ReliefCategoryProgress) {
    onFlash(
      `NGO mobilization requested for ${category.categoryName} (currently ${category.fulfillmentPercentage}% delivered).`,
    );
  }

  function handleSelectSos(sos: SOSAlertTicket) {
    setMapFocus({
      id: sos.sosId,
      kind: "SOS",
      title: `SOS · ${sos.citizenName}`,
      lat: sos.coordinates.lat,
      lng: sos.coordinates.lng,
    });
    onFlash(`Map focused on ${sos.sosId} · ${sos.villageName}.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <WorkforceSummaryTile
          metrics={workforceMetrics}
          volunteerFocusActive={volunteerFocus}
          onToggleVolunteerFocus={onToggleVolunteerFocus}
        />
        <TotalFundsRaisedTile financials={reliefMetrics.financials} />
        <VillagesFullyCoveredTile metrics={villageCoverageMetrics} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex animate-pulse items-center rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 font-semibold text-[#b91c1c]">
          Unassigned P1 SOS: {sosTriage.unassignedCriticalCount}
        </span>
        <Link
          href="/transport"
          className="rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 font-semibold text-[#b91c1c]"
        >
          Open transport requests: {dispatch.openRequestCount}
        </Link>
        {getOperationalMode() === "ADMIN_SOURCED" ? (
          <Link
            href="/registration-queue"
            className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 font-semibold text-[#9a3412]"
          >
            Registration queue
          </Link>
        ) : null}
      </div>

      <DistrictDashboardMap
        className="h-[min(58vh,620px)] min-h-[400px] w-full"
        villages={villages}
        boats={boats}
        highLands={highLands}
        camps={camps}
        trucks={trucks}
        volunteerDeployments={volunteerDeployments}
        onBoundsChange={onBoundsChange}
        selectedVillageId={selectedVillageId}
        onVillageSelect={onVillageSelect}
        onDispatchSos={(sosId) => {
          void sosTriage.setStatus(sosId, "DISPATCHED", {
            assetId: "field-team",
            assetLabel: "Nearest field response team",
          });
          onDispatchSos(sosId);
        }}
        volunteerFocus={volunteerFocus}
        mapFocus={mapFocus}
        sosAlerts={sosTriage.mapSosAlerts}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[min(48vh,480px)] min-h-[320px]">
          <TimeCriticalSOSTile
            alerts={sosTriage.alerts}
            selectedSosId={mapFocus?.kind === "SOS" ? mapFocus.id : null}
            onSelectSOS={handleSelectSos}
            onRapidDispatch={(sos) => setDispatchSos(sos)}
          />
        </div>
        <div className="h-[min(48vh,480px)] min-h-[320px]">
          <TransportationDemandTile
            requests={dispatch.requests}
            onOpenChat={dispatch.openChat}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EmergencyDirectoryTile />
        <div className="h-[min(42vh,420px)] min-h-[280px]">
          <KeyOfficialsRosterTile
            officials={officials}
            alertSummary={alertSummary}
            onBroadcastQueued={({ officialId }) =>
              onFlash(`Alert broadcast queued for official ${officialId}.`)
            }
          />
        </div>
      </div>

      <ReliefFulfillmentDonutTile />

      {SHOW_RELIEF_DISTRIBUTION_TILE ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReliefProgressTrackerTile
            summary={districtProgress}
            onRequestNgoMobilization={handleNgoMobilization}
          />
          <WarehouseCapacityTile />
        </div>
      ) : (
        <WarehouseCapacityTile />
      )}

      <ConsolidatedReliefCounterTile
        metrics={reliefMetrics}
        onExported={(filename) =>
          onFlash(`Downloaded audit workbook: ${filename}`)
        }
      />

      <TransportationChatDrawer
        open={Boolean(dispatch.activeRequest)}
        request={dispatch.activeRequest}
        messages={dispatch.activeThread}
        actingAs={dispatch.actingAs}
        onActingAsChange={dispatch.setActingAs}
        onClose={dispatch.closeChat}
        onSendMessage={dispatch.sendMessage}
        onSubmitOffer={async (offer) => {
          const ok = await dispatch.submitAssetOffer(offer);
          if (ok) onFlash(`Asset offer submitted on ${dispatch.activeRequestId}.`);
          return ok;
        }}
        onAcceptOffer={async (messageId) => {
          const ok = await dispatch.acceptOffer(messageId);
          if (ok) onFlash("Offer accepted and dispatch authorized.");
          return ok;
        }}
      />

      <RapidDispatchDrawer
        open={Boolean(dispatchSos)}
        sos={dispatchSos}
        assets={rapidDispatchAssets}
        onClose={() => setDispatchSos(null)}
        onConfirm={(assetId, assetLabel) => {
          if (!dispatchSos) return;
          void sosTriage.rapidDispatch(dispatchSos.sosId, assetId, assetLabel);
          onDispatchSos(dispatchSos.sosId);
          onFlash(
            `Rapid dispatch confirmed for ${dispatchSos.sosId} → ${assetLabel}.`,
          );
          setDispatchSos(null);
        }}
      />
    </div>
  );
}
