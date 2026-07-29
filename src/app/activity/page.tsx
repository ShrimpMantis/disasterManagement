"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActivityTicker } from "@/components/activity/ActivityTicker";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { useActivityEventsLive } from "@/hooks/useFirestoreLive";
import { useOperationalMode } from "@/hooks/useOperationalMode";
import {
  fetchActivityEvents,
  toggleActivityUpvote,
} from "@/actions/activityActions";
import type { ActivityEvent } from "@/types/activityEvent";

export default function ActivityPage() {
  const { user } = useAuth();
  const { canCommunityVerify } = useOperationalMode();
  const live = useActivityEventsLive();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [flash, setFlash] = useState("");
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(
    null,
  );
  const [upvoteBusyId, setUpvoteBusyId] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const requireAuth = useCallback((message: string) => {
    setAuthPrompt({ open: true, message });
  }, []);

  useEffect(() => {
    if (live.events.length > 0) {
      const id = window.setTimeout(() => {
        setEvents(live.events);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const timer = window.setTimeout(() => {
      void fetchActivityEvents().then((result) => {
        if (result.ok) setEvents(result.data);
        else setFlash(result.error);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [live.events]);

  useEffect(() => {
    if (!live.error) return;
    const id = window.setTimeout(() => {
      setFlash(live.error);
    }, 0);
    return () => window.clearTimeout(id);
  }, [live.error]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(""), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!highlightedEventId) return;
    const timer = window.setTimeout(() => setHighlightedEventId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [highlightedEventId]);

  function handleSelectEvent(eventId: string) {
    setHighlightedEventId(eventId);
    document
      .getElementById(`activity-event-${eventId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleUpvote(eventId: string) {
    if (!canCommunityVerify) return;
    if (!user) {
      requireAuth("Sign in to upvote and confirm ground activity.");
      return;
    }
    setUpvoteBusyId(eventId);
    const result = await toggleActivityUpvote({
      eventId,
      userId: user.uid,
    });
    setUpvoteBusyId(null);
    if (!result.ok) {
      setFlash(result.error);
      return;
    }
    setEvents((prev) =>
      prev.map((row) => (row.id === result.data.id ? result.data : row)),
    );
    setFlash(result.message ?? "Confirmation recorded.");
  }

  return (
    <AppShell allowGuest>
      <div className="flex min-h-screen w-full flex-col">
        <ActivityTicker events={events} onSelectEvent={handleSelectEvent} />

        <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <header className="animate-rise border-b border-[var(--line)] pb-6">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              Live activity
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
              Operational system log
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
              Read-only feed of in-progress and completed relief tasks. Entries
              are generated automatically from pledges, dispatches, and
              deliveries — confirm ground truth with community upvotes.
            </p>
          </header>

          {flash ? (
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">
              {flash}
            </div>
          ) : null}

          {live.loading && events.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Loading live activity…
            </p>
          ) : null}

          <ActivityFeed
            events={events}
            highlightedEventId={highlightedEventId}
            currentUserId={user?.uid}
            canUpvote={canCommunityVerify}
            upvoteBusyId={upvoteBusyId}
            onUpvote={handleUpvote}
          />
        </main>
      </div>

      <AuthPromptModal
        open={authPrompt.open}
        message={authPrompt.message}
        returnTo="/activity"
        onClose={() => setAuthPrompt({ open: false, message: "" })}
      />
    </AppShell>
  );
}
