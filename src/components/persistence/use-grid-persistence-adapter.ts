"use client";

import { useEffect, useRef } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import type { PersistenceKey, PersistenceSyncHandler } from "@/lib/persistence";

/**
 * Adapter for excel grids: keeps a durable draft of dirty rows and
 * registers the existing pushToCloud as the sync handler.
 * Does not replace in-grid debounce — complements it with IDB + lifecycle flush.
 */
export function useGridPersistenceAdapter(input: {
  key: PersistenceKey | null;
  dirtyVersion: number;
  getSnapshot: () => unknown;
  pushToCloud: () => Promise<void>;
  enabled?: boolean;
  label?: string;
  /** When true, engine also schedules debounce (motors). When false, grid owns debounce. */
  scheduleInEngine?: boolean;
}) {
  const persistence = usePersistenceOptional();
  const enabled = input.enabled !== false && Boolean(input.key) && Boolean(persistence);
  const pushRef = useRef(input.pushToCloud);
  pushRef.current = input.pushToCloud;
  const getSnapshotRef = useRef(input.getSnapshot);
  getSnapshotRef.current = input.getSnapshot;

  const sync: PersistenceSyncHandler = async () => {
    try {
      await pushRef.current();
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Не удалось сохранить",
      };
    }
  };

  useEffect(() => {
    if (!enabled || !persistence || !input.key) return;
    const key = input.key;
    persistence.register({
      key,
      snapshot: getSnapshotRef.current(),
      label: input.label,
      sync,
    });
    return () => persistence.unregister(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable key fields
  }, [enabled, input.key?.companyId, input.key?.kind, input.key?.id, input.label, persistence]);

  useEffect(() => {
    if (!enabled || !persistence || !input.key) return;
    if (input.dirtyVersion <= 0) return;

    const snapshot = getSnapshotRef.current() as { dirtyRowIds?: string[]; pendingArchiveIds?: string[]; pendingDeleteIds?: string[] };
    const dirtyCount =
      (snapshot.dirtyRowIds?.length ?? 0) +
      (snapshot.pendingArchiveIds?.length ?? 0) +
      (snapshot.pendingDeleteIds?.length ?? 0);

    if (dirtyCount === 0) {
      void persistence.markClean(input.key);
      return;
    }

    void persistence.patch({
      key: input.key,
      snapshot,
      label: input.label,
      schedule: input.scheduleInEngine === true,
    });
  }, [
    enabled,
    input.dirtyVersion,
    input.key,
    input.label,
    input.scheduleInEngine,
    persistence,
  ]);

  // Flush when panel/grid unmounts or becomes inactive is handled by caller;
  // also flush on blur of window via provider lifecycle.

  return {
    flush: () =>
      input.key && persistence ? persistence.flush(input.key, "manual") : Promise.resolve(),
  };
}
