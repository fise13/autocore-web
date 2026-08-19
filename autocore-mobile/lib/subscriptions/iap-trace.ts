/**
 * In-memory IAP step log. Metro prints `[IAP +123ms]` in development
 * (or when `EXPO_PUBLIC_IAP_DEBUG=1`). Diagnostics reads the same ring.
 */
export type IapTraceEvent = {
  at: number;
  deltaMs: number;
  step: string;
  data?: Record<string, unknown>;
};

const RING = 60;
const events: IapTraceEvent[] = [];
const listeners = new Set<() => void>();

let originMs = 0;
let seq = 0;

function notify(): void {
  seq += 1;
  for (const listener of listeners) listener();
}

export function isIapDebugEnabled(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_IAP_DEBUG === '1';
}

export function iapTraceReset(reason = 'reset'): void {
  originMs = Date.now();
  events.length = 0;
  events.push({ at: originMs, deltaMs: 0, step: reason });
  notify();
  if (isIapDebugEnabled()) {
    console.log(`[IAP +0ms] ${reason}`);
  }
}

export function iapTrace(step: string, data?: Record<string, unknown>): void {
  const now = Date.now();
  if (originMs === 0) originMs = now;
  const event: IapTraceEvent = {
    at: now,
    deltaMs: now - originMs,
    step,
    data,
  };
  events.push(event);
  if (events.length > RING) events.shift();
  notify();
  if (isIapDebugEnabled()) {
    const extra = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[IAP +${event.deltaMs}ms] ${step}${extra}`);
  }
}

export function getIapTrace(): readonly IapTraceEvent[] {
  return events;
}

export function getIapTraceSeq(): number {
  return seq;
}

export function subscribeIapTrace(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatIapTraceLines(limit = 12): string[] {
  const slice = events.slice(-limit);
  return slice.map((event) => {
    const extra = event.data ? ` ${JSON.stringify(event.data)}` : '';
    return `+${event.deltaMs}ms ${event.step}${extra}`;
  });
}

export function formatIapPaywallStatus(input: {
  connected: boolean;
  storePrepared: boolean;
  sku: string | null;
  warmed: boolean;
  flowPhase: string;
}): string {
  const last = events[events.length - 1];
  return [
    input.connected ? 'connected' : 'disconnected',
    input.storePrepared ? 'ready' : 'preparing',
    input.sku ?? 'no-sku',
    input.warmed ? 'warm' : 'cold',
    input.flowPhase,
    last ? `+${last.deltaMs}ms ${last.step}` : 'no-trace',
  ].join(' · ');
}
