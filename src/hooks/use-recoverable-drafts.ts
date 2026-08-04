"use client";

import { useCallback, useEffect, useState } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import type { PersistenceDraftRecord } from "@/lib/persistence";

/** Loads recoverable local drafts for a company/kind and keeps the list fresh. */
export function useRecoverableDrafts(input: {
  companyId: string | null | undefined;
  kind?: string;
  /** Hide the draft currently being edited. */
  excludeId?: string | null;
  enabled?: boolean;
}) {
  const persistence = usePersistenceOptional();
  const [drafts, setDrafts] = useState<PersistenceDraftRecord[]>([]);
  const refreshToken = persistence
    ? `${persistence.snapshot.lastSavedAt ?? 0}:${persistence.snapshot.queueSize}:${persistence.snapshot.uiStatus}`
    : "off";

  const refresh = useCallback(async () => {
    if (!input.companyId || !persistence || input.enabled === false) {
      setDrafts([]);
      return;
    }
    const found = await persistence.engine.findRecoverableDrafts(input.companyId, input.kind);
    const exclude = input.excludeId?.trim();
    setDrafts(
      found
        .filter((draft) => !exclude || draft.id !== exclude)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }, [input.companyId, input.enabled, input.excludeId, input.kind, persistence]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshToken]);

  const discard = useCallback(
    async (draft: PersistenceDraftRecord) => {
      if (!persistence) return;
      await persistence.discardDraft({
        companyId: draft.companyId,
        kind: draft.kind,
        id: draft.id,
      });
      await refresh();
    },
    [persistence, refresh],
  );

  return { drafts, refresh, discard };
}
