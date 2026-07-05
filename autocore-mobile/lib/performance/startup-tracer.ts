type StartupMark =
  | 'js_bundle_eval'
  | 'session_cache_read'
  | 'snapshots_preloaded'
  | 'auth_ready'
  | 'tabs_interactive'
  | 'splash_hidden';

type MarkEntry = {
  mark: StartupMark;
  at: number;
  deltaMs: number;
};

const origin = typeof performance !== 'undefined' ? performance.now() : Date.now();
const marks = new Map<StartupMark, MarkEntry>();

export function markStartup(mark: StartupMark): void {
  if (marks.has(mark)) return;
  const at = typeof performance !== 'undefined' ? performance.now() : Date.now();
  marks.set(mark, { mark, at, deltaMs: Math.round(at - origin) });
}

export function getStartupMarks(): MarkEntry[] {
  return Array.from(marks.values());
}

export function getStartupSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of marks.values()) {
    summary[entry.mark] = entry.deltaMs;
  }
  return summary;
}

export function logStartupTable(): void {
  if (!__DEV__) return;
  const rows = getStartupMarks();
  if (rows.length === 0) return;
  // eslint-disable-next-line no-console
  console.table(rows.map((row) => ({ mark: row.mark, ms: row.deltaMs })));
}
