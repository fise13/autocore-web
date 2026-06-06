"use client";

import { FeedList } from "@/components/marketing/ui/feed-list";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";

export function RealtimeFeedClient() {
  const events = useSimulatedFeed(3200);
  return <FeedList events={events} />;
}
