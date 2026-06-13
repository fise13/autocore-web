"use client";

import { useEffect, useState } from "react";

import { INITIAL_FEED, nextFeedEvent, type SimulatedFeedEvent } from "@/components/marketing/lib/simulated-feed";

const MAX_EVENTS = 6;

export function useSimulatedFeed(intervalMs = 3200) {
  const [events, setEvents] = useState<SimulatedFeedEvent[]>(INITIAL_FEED);
  const [paused, setPaused] = useState(false);

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
      setEvents((current) => [nextFeedEvent(), ...current].slice(0, MAX_EVENTS));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, paused]);

  return events;
}
