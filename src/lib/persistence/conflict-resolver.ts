/**
 * v1 conflict policy: last-write-wins with optional updatedAt guard.
 * Returns true when the local revision should win / proceed.
 */
export function shouldAcceptLocalWrite(input: {
  localBaseRevision: string | null;
  serverRevision: string | null;
}): { accept: boolean; conflict: boolean } {
  if (!input.localBaseRevision || !input.serverRevision) {
    return { accept: true, conflict: false };
  }
  if (input.localBaseRevision === input.serverRevision) {
    return { accept: true, conflict: false };
  }

  const localTime = Date.parse(input.localBaseRevision);
  const serverTime = Date.parse(input.serverRevision);
  if (!Number.isNaN(localTime) && !Number.isNaN(serverTime)) {
    if (serverTime > localTime) {
      return { accept: false, conflict: true };
    }
    return { accept: true, conflict: false };
  }

  // Non-timestamp revisions that differ → conflict for user resolution.
  return { accept: false, conflict: true };
}

export type FieldDiff = {
  path: string;
  local: unknown;
  server: unknown;
};

export function diffSnapshots(
  local: unknown,
  server: unknown,
  prefix = "",
): FieldDiff[] {
  if (local === server) return [];
  if (
    local === null ||
    server === null ||
    typeof local !== "object" ||
    typeof server !== "object" ||
    Array.isArray(local) ||
    Array.isArray(server)
  ) {
    return [{ path: prefix || "(root)", local, server }];
  }

  const localObj = local as Record<string, unknown>;
  const serverObj = server as Record<string, unknown>;
  const keys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)]);
  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    diffs.push(...diffSnapshots(localObj[key], serverObj[key], path));
  }
  return diffs;
}
