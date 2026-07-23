"use client";

import { useEffect, useMemo, useState } from "react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import {
  buildInitialFeed,
  nextFeedEvent,
  type SimulatedFeedEvent,
} from "@/components/marketing/lib/simulated-feed";

const MAX_EVENTS = 6;

export function useSimulatedFeed(intervalMs = 3200) {
  const { feed } = useDemoChrome();
  const initial = useMemo(() => buildInitialFeed(feed), [feed]);
  const [events, setEvents] = useState<SimulatedFeedEvent[]>(initial);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setEvents(buildInitialFeed(feed));
  }, [feed]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    const onSuspend = () => setPaused(true);
    const onResume = () => setPaused(false);

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("panel:suspend", onSuspend);
    document.addEventListener("panel:resume", onResume);
    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("panel:suspend", onSuspend);
      document.removeEventListener("panel:resume", onResume);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (paused) return;
      setEvents((current) => [nextFeedEvent(feed), ...current].slice(0, MAX_EVENTS));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [feed, intervalMs, paused]);

  return events;
}
