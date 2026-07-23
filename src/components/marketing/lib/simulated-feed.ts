export type FeedTone = "success" | "warning" | "operational" | "critical";

export type SimulatedFeedEvent = {
  id: string;
  actor: string;
  action: string;
  module: string;
  tone: FeedTone;
  time: string;
};

export type FeedEventTemplate = {
  actor: string;
  action: string;
  module: string;
  tone: FeedTone;
};

export type FeedCopy = {
  now: string;
  secondsAgo: (n: number) => string;
  events: FeedEventTemplate[];
};

let sequence = 0;

export function nextFeedEvent(copy: FeedCopy): SimulatedFeedEvent {
  const template = copy.events[sequence % copy.events.length];
  sequence += 1;
  return {
    ...template,
    id: `evt-${sequence}-${Date.now()}`,
    time: copy.now,
  };
}

export function buildInitialFeed(copy: FeedCopy): SimulatedFeedEvent[] {
  return copy.events.slice(0, 5).map((event, index) => ({
    ...event,
    id: `init-${index}`,
    time: index === 0 ? copy.now : copy.secondsAgo(index * 12),
  }));
}
