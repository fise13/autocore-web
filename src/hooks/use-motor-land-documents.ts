"use client";

import { useMemo } from "react";

import { useRealtimeQuery } from "@/hooks/use-realtime-query";
import { createMotorLandDocumentRepository } from "@/infrastructure/firestore/motor-land-document-repository";
import type { HistoryEntry } from "@/lib/motor-land/history";

let repository: ReturnType<typeof createMotorLandDocumentRepository> | null = null;

/** Created lazily: the Firestore client is only available in the browser. */
function getRepository() {
  repository ??= createMotorLandDocumentRepository();
  return repository;
}

/** Live history of the waybills the signed-in account has issued, newest first. */
export function useMotorLandDocuments(uid: string | null) {
  const enabled = Boolean(uid);
  const queryKey = useMemo(() => ["motor-land-documents", uid ?? ""] as const, [uid]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<HistoryEntry[]>({
    queryKey,
    enabled,
    initialData: [],
    subscribe: (onData, onError) => getRepository().subscribe(uid ?? "", onData, onError),
  });

  return {
    documents: enabled ? data : [],
    isLoading: enabled ? isBootstrapping : false,
    error: enabled ? errorMessage : null,
    async save(entry: Parameters<ReturnType<typeof createMotorLandDocumentRepository>["save"]>[1]) {
      if (!uid) return;
      await getRepository().save(uid, entry, new Date().toISOString());
    },
    async remove(id: string) {
      if (!uid) return;
      await getRepository().remove(uid, id);
    },
  };
}
