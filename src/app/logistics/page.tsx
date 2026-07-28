"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TransportationDemandTile } from "@/components/dashboard/TransportationDemandTile";
import { TransportationChatDrawer } from "@/components/messaging/TransportationChatDrawer";
import { useTransportationDispatchState } from "@/hooks/useTransportationDispatchState";
import { useState } from "react";

export default function LogisticsPage() {
  const dispatch = useTransportationDispatchState();
  const [flash, setFlash] = useState("");

  return (
    <AppShell>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="animate-rise border-b border-[var(--line)] pb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Multi-modal transport & volunteer dispatch
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Transportation & capability request board
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
            Field teams post needs across trucks, boats, ambulances, drones,
            helicopters, and volunteer forces. Asset owners and volunteer leads
            negotiate and submit structured dispatch offers in-app.
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

        <div className="h-[min(75vh,720px)]">
          <TransportationDemandTile
            requests={dispatch.requests}
            onOpenChat={dispatch.openChat}
          />
        </div>

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
            if (ok) setFlash(`Asset offer submitted on ${dispatch.activeRequestId}.`);
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
