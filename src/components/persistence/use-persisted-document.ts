"use client";

import { useEffect, useRef } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import type { PersistenceKey, PersistenceSyncHandler } from "@/lib/persistence";

/**
 * Registers a document with the Persistence Engine and keeps drafts + debounced sync in sync.
 */
export function usePersistedDocument(input: {
  key: PersistenceKey | null;
  value: unknown;
  baseRevision?: string | null;
  label?: string;
  sync?: PersistenceSyncHandler | null;
  enabled?: boolean;
  /** Skip initial registration patch when value is empty bootstrap. */
  skipEmpty?: boolean;
  /** When true, the first value after enable is treated as a user edit and scheduled. */
  patchOnEnable?: boolean;
}) {
  const persistence = usePersistenceOptional();
  const enabled = input.enabled !== false && Boolean(input.key) && Boolean(persistence);
  const syncRef = useRef(input.sync);
  syncRef.current = input.sync;
  const lastPatchedRef = useRef<string>("");
  const bootstrappedKeyRef = useRef<string>("");

  const register = persistence?.register;
  const unregister = persistence?.unregister;
  const setSyncHandler = persistence?.setSyncHandler;
  const patch = persistence?.patch;
  const flush = persistence?.flush;
  const markClean = persistence?.markClean;

  useEffect(() => {
    if (!enabled || !register || !unregister || !input.key) return;
    const key = input.key;
    register({
      key,
      snapshot: input.value,
      baseRevision: input.baseRevision ?? null,
      label: input.label,
      sync: syncRef.current ? (args) => syncRef.current!(args) : null,
    });
    return () => {
      unregister(key);
    };
    // Register once per key identity; sync updates via setSyncHandler.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key string identity
  }, [enabled, input.key?.companyId, input.key?.kind, input.key?.id, register, unregister]);

  useEffect(() => {
    if (!enabled || !setSyncHandler || !input.key) return;
    setSyncHandler(
      input.key,
      syncRef.current ? (args) => syncRef.current!(args) : null,
    );
  }, [enabled, input.key, input.sync, setSyncHandler]);

  useEffect(() => {
    if (!enabled || !patch || !input.key) return;
    if (input.skipEmpty && (input.value == null || input.value === "")) return;

    const keyId = `${input.key.companyId}:${input.key.kind}:${input.key.id}`;
    const serialized = JSON.stringify(input.value);

    if (bootstrappedKeyRef.current !== keyId) {
      bootstrappedKeyRef.current = keyId;
      if (!input.patchOnEnable) {
        lastPatchedRef.current = serialized;
        return;
      }
      lastPatchedRef.current = "";
    }

    if (serialized === lastPatchedRef.current) return;
    lastPatchedRef.current = serialized;

    void patch({
      key: input.key,
      snapshot: input.value,
      label: input.label,
      schedule: Boolean(syncRef.current),
    });
  }, [
    enabled,
    input.key,
    input.label,
    input.patchOnEnable,
    input.skipEmpty,
    input.value,
    patch,
  ]);

  return {
    flush: (reason: "blur" | "manual" | "route" = "manual") =>
      input.key && flush ? flush(input.key, reason) : Promise.resolve(),
    markClean: (baseRevision?: string | null) =>
      input.key && markClean ? markClean(input.key, baseRevision) : Promise.resolve(),
  };
}
