"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserLabel } from "@/lib/firebase/auth";
import { TransportationChatDrawer } from "@/components/messaging/TransportationChatDrawer";
import { CreateTransportRequestModal } from "@/components/transport/CreateTransportRequestModal";
import { TransportRequestsStream } from "@/components/transport/TransportRequestsStream";
import { TransporterFleetGrid } from "@/components/transport/TransporterFleetGrid";
import { useOperationalMode } from "@/hooks/useOperationalMode";
import { useTransportationDispatchState } from "@/hooks/useTransportationDispatchState";
import {
  createTransporterRecord,
  fetchTransporters,
  verifyTransporterRecord,
} from "@/actions/transporterActions";
import type {
  CreateTransporterInput,
  TransporterGridFilter,
  TransporterRecord,
} from "@/types/transporterFleet";
import { modalityToFleetVehicleTypes } from "@/types/transporterFleet";
import type { TransportCapabilityRequest } from "@/types/transportationDispatch";

export default function TransportPage() {
  const { user } = useAuth();
  const { canOperationalWrite, isCrowdMode } = useOperationalMode();
  const dispatch = useTransportationDispatchState();
  const [transporters, setTransporters] = useState<TransporterRecord[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [gridFilter, setGridFilter] = useState<TransporterGridFilter>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [authPrompt, setAuthPrompt] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const isAuthenticated = Boolean(user);

  const requireAuth = useCallback((message: string) => {
    setAuthPrompt({ open: true, message });
  }, []);

  const loadFleet = useCallback(async () => {
    const result = await fetchTransporters();
    if (result.ok) {
      setTransporters(result.data);
    } else {
      setFlash(result.error);
    }
    setFleetLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFleet();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFleet]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(""), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  function handleCreateRequestClick() {
    if (!canOperationalWrite) return;
    if (!user) {
      requireAuth("Sign in to create a transport request.");
      return;
    }
    setCreateOpen(true);
  }

  function handleDispatchMatch(request: TransportCapabilityRequest) {
    const vehicleTypes = modalityToFleetVehicleTypes(request.modalityType);
    setGridFilter({
      vehicleTypes,
      district: request.district,
      matchedRequestId: request.requestId,
    });
    const label = vehicleTypes?.join(", ") ?? "all vehicle types";
    setFlash(
      `Matching fleet for ${request.requestId}: ${label} near ${request.district}.`,
    );
    document
      .getElementById("transporter-fleet-grid")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleAddTransporter(
    input: Omit<CreateTransporterInput, "createdBy">,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!canOperationalWrite) {
      return { ok: false, error: "Fleet edits are restricted in this deployment." };
    }
    if (!user) {
      requireAuth("Sign in to list a transporter or driver.");
      return { ok: false, error: "Sign in to list a transporter or driver." };
    }
    try {
      const result = await createTransporterRecord({
        ...input,
        createdBy: user.uid,
      });
      if (!result.ok) {
        setFlash(result.error);
        return { ok: false, error: result.error };
      }
      setTransporters((prev) => {
        const without = prev.filter((row) => row.id !== result.data.id);
        return [result.data, ...without].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
      setFlash(result.message ?? "Transporter added.");
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create transporter record.";
      setFlash(message);
      return { ok: false, error: message };
    }
  }

  async function handleVerifyTransporter(transporterId: string): Promise<boolean> {
    if (!user) {
      requireAuth("Sign in to verify this transporter or driver.");
      return false;
    }
    const result = await verifyTransporterRecord({
      transporterId,
      userId: user.uid,
    });
    if (!result.ok) {
      setFlash(result.error);
      return false;
    }
    setTransporters((prev) =>
      prev.map((row) => (row.id === result.data.id ? result.data : row)),
    );
    setFlash(result.message ?? "Confirmation recorded.");
    return true;
  }

  function handleCreatedRequest(request: TransportCapabilityRequest) {
    void dispatch.refresh();
    setFlash(`Transport request ${request.requestId} created.`);
    handleDispatchMatch(request);
  }

  return (
    <AppShell allowGuest>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Transport & fleet management
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] sm:text-3xl lg:text-4xl">
            Dispatch requests with Assam&apos;s transporter directory
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            {isCrowdMode
              ? "Pair active community vehicle needs with a crowdsourced, editable grid of transporters and drivers. Dispatch / Match filters the fleet below by vehicle type and district for rapid emergency response."
              : "Browse the verified transporter directory and official vehicle needs. Public write actions are locked; transport admins manage fleet listings and broadcast needs."}
          </p>
        </header>

        {flash ? (
          <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
            {flash}
          </div>
        ) : null}

        {dispatch.loading ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Loading transport requests…
          </p>
        ) : null}

        <TransportRequestsStream
          requests={dispatch.requests}
          onCreateRequest={handleCreateRequestClick}
          onDispatchMatch={handleDispatchMatch}
          onOpenChat={isAuthenticated ? dispatch.openChat : undefined}
          canCreateRequest={canOperationalWrite}
        />

        <div id="transporter-fleet-grid">
          {fleetLoading ? (
            <p className="mb-2 text-sm text-[var(--ink-muted)]">
              Loading transporter directory…
            </p>
          ) : null}
          <TransporterFleetGrid
            transporters={transporters}
            filter={gridFilter}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.uid}
            onRequireAuth={requireAuth}
            onAddTransporter={handleAddTransporter}
            onVerifyTransporter={handleVerifyTransporter}
            onClearFilter={() => setGridFilter({})}
          />
        </div>

        <CreateTransportRequestModal
          open={createOpen && canOperationalWrite}
          requestorId={user?.uid ?? ""}
          requestorName={getUserLabel(user) || "Field operator"}
          defaultPhone={user?.phoneNumber ?? ""}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreatedRequest}
        />

        <AuthPromptModal
          open={authPrompt.open}
          message={authPrompt.message}
          returnTo="/transport"
          onClose={() => setAuthPrompt({ open: false, message: "" })}
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
            if (ok) {
              setFlash(`Asset offer submitted on ${dispatch.activeRequestId}.`);
            }
            return ok;
          }}
          onAcceptOffer={async (messageId) => {
            const ok = await dispatch.acceptOffer(messageId);
            if (ok) setFlash("Offer accepted and dispatch authorized.");
            return ok;
          }}
        />
      </main>
    </AppShell>
  );
}
