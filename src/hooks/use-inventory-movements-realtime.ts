"use client";

import { useEffect, useState } from "react";

import { InventoryMovement } from "@/domain/inventory-movement";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";

export function useInventoryMovementsRealtime(
  repository: InventoryMovementRepository,
  companyId: string,
  itemId?: string,
  enabled = true,
) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      setMovements([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const handleData = (next: InventoryMovement[]) => {
      setMovements(next);
      setLoading(false);
      setErrorMessage(null);
    };
    const handleError = (error: Error) => {
      setErrorMessage(error.message);
      setLoading(false);
    };
    const unsubscribe = itemId
      ? repository.subscribeByItem(companyId, itemId, handleData, handleError)
      : repository.subscribeRecent(companyId, handleData, handleError);

    return () => unsubscribe();
  }, [repository, companyId, itemId, enabled]);

  return { movements, loading, errorMessage };
}
