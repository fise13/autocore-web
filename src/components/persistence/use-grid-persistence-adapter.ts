"use client";

import { useEffect, useRef } from "react";
import { userCopy } from "@/lib/user-copy";

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

  // Stable action refs — never depend on the whole context object (it changes on every emit).
  const register = persistence?.register;
  const unregister = persistence?.unregister;
  const patch = persistence?.patch;
  const markClean = persistence?.markClean;
  const flush = persistence?.flush;

  const sync: PersistenceSyncHandler = async () => {
    try {
      await pushRef.current();
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : userCopy.sync.error,
      };
    }
  };

  useEffect(() => {
    if (!enabled || !register || !unregister || !input.key) return;
    const key = input.key;
    register({
      key,
      snapshot: getSnapshotRef.current(),
      label: input.label,
      sync,
    });
    return () => unregister(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable key fields + stable actions
  }, [enabled, input.key?.companyId, input.key?.kind, input.key?.id, input.label, register, unregister]);

  useEffect(() => {
    if (!enabled || !patch || !markClean || !input.key) return;
    if (input.dirtyVersion <= 0) return;

    const snapshot = getSnapshotRef.current() as {
      dirtyRowIds?: string[];
      pendingArchiveIds?: string[];
      pendingDeleteIds?: string[];
    };
    const dirtyCount =
      (snapshot.dirtyRowIds?.length ?? 0) +
      (snapshot.pendingArchiveIds?.length ?? 0) +
      (snapshot.pendingDeleteIds?.length ?? 0);

    if (dirtyCount === 0) {
      void markClean(input.key);
      return;
    }

    void patch({
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
    markClean,
    patch,
  ]);

  // Flush when panel/grid unmounts or becomes inactive is handled by caller;
  // also flush on blur of window via provider lifecycle.

  return {
    flush: () => (input.key && flush ? flush(input.key, "manual") : Promise.resolve()),
  };
}
