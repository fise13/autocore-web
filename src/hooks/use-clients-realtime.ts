"use client";

import { useEffect, useState } from "react";

import { ClientEntity } from "@/domain/client";
import { ClientRepository } from "@/infrastructure/firestore/client-repository";

export function useClientsRealtime(
  repository: ClientRepository,
  companyId: string,
  enabled = true,
) {
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setClients(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [repository, companyId, enabled]);

  const active = Boolean(companyId && enabled);
  return { clients: active ? clients : [], isLoading: active ? isLoading : false, error: active ? error : null };
}
