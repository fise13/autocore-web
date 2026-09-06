export type GuideSignalDetail = Record<string, unknown>;

export type GuideSignal = {
  name: string;
  at: number;
  detail?: GuideSignalDetail;
};

type Listener = (signal: GuideSignal) => void;

const listeners = new Set<Listener>();
const recent = new Map<string, number>();

/** Emits a named completion signal. No-op when nothing is listening. */
export function emitGuideSignal(name: string, detail?: GuideSignalDetail): void {
  const signal: GuideSignal = { name, at: Date.now(), detail };
  recent.set(name, signal.at);
  for (const listener of listeners) listener(signal);
}

export function subscribeGuideSignals(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasRecentGuideSignal(name: string, sinceMs: number): boolean {
  const at = recent.get(name);
  if (at == null) return false;
  return at >= sinceMs;
}

export function clearGuideSignals(): void {
  recent.clear();
}
