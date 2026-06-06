"use client";

import { useEffect, useState } from "react";

import { INITIAL_FEED, nextFeedEvent, type SimulatedFeedEvent } from "@/components/marketing/lib/simulated-feed";

const MAX_EVENTS = 6;

export function useSimulatedFeed(intervalMs = 3200) {
  const [events, setEvents] = useState<SimulatedFeedEvent[]>(INITIAL_FEED);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEvents((current) => [nextFeedEvent(), ...current].slice(0, MAX_EVENTS));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return events;
}
