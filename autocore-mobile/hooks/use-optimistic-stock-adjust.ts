import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui';
import { useMobileStockAdjust } from '@/hooks/use-mobile-stock-adjust';
import { haptics } from '@/theme';
import type { InventoryItem } from '@/types/inventory';

type AdjustOp = {
  delta: 1 | -1;
  idempotencyKey: string;
};

function inventoryQueryKey(companyId: string) {
  return ['realtime', 'inventory-items', companyId] as const;
}

/**
 * Instant +/- in the UI via pending deltas; cloud sync runs in a per-item queue.
 * Firestore realtime updates do not fight the overlay until each op is confirmed.
 */
export function useOptimisticStockAdjust(companyId: string | null) {
  const queryClient = useQueryClient();
  const stockAdjust = useMobileStockAdjust();
  const [pendingDeltas, setPendingDeltas] = useState<Record<string, number>>({});
  const pendingDeltasRef = useRef(pendingDeltas);
  pendingDeltasRef.current = pendingDeltas;
  const queuesRef = useRef(new Map<string, AdjustOp[]>());
  const processingRef = useRef(new Set<string>());
  const seqRef = useRef(0);

  const bumpPending = useCallback((itemId: string, delta: 1 | -1) => {
    setPendingDeltas((prev) => {
      const next = { ...prev };
      const value = (next[itemId] ?? 0) + delta;
      if (value === 0) delete next[itemId];
      else next[itemId] = value;
      return next;
    });
  }, []);

  const getDisplayAvailable = useCallback(
    (item: InventoryItem) => Math.max(0, item.totalAvailable + (pendingDeltas[item.id] ?? 0)),
    [pendingDeltas],
  );

  const processQueue = useCallback(
    async (itemId: string) => {
      if (!companyId || processingRef.current.has(itemId)) return;

      const queue = queuesRef.current.get(itemId);
      if (!queue?.length) return;

      processingRef.current.add(itemId);

      while (true) {
        const currentQueue = queuesRef.current.get(itemId);
        const op = currentQueue?.[0];
        if (!op) break;

        try {
          const result = await stockAdjust.mutateAsync({
            itemId,
            direction: op.delta > 0 ? 'increase' : 'decrease',
            quantity: 1,
            idempotencyKey: op.idempotencyKey,
          });

          currentQueue!.shift();
          bumpPending(itemId, op.delta === 1 ? -1 : 1);

          const queryKey = inventoryQueryKey(companyId);
          queryClient.setQueryData<InventoryItem[]>(queryKey, (current) =>
            current?.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    totalAvailable: result.itemTotalAvailable,
                    totalOnHand: result.itemTotalOnHand,
                  }
                : item,
            ),
          );
        } catch (error) {
          currentQueue!.shift();
          bumpPending(itemId, op.delta === 1 ? -1 : 1);
          haptics.warning();
          toast({
            title: 'Не удалось изменить остаток',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
          break;
        }
      }

      processingRef.current.delete(itemId);

      const remaining = queuesRef.current.get(itemId);
      if (remaining?.length) {
        void processQueue(itemId);
      }
    },
    [bumpPending, companyId, queryClient, stockAdjust],
  );

  const adjust = useCallback(
    (item: InventoryItem, delta: 1 | -1) => {
      if (!companyId) return;

      const display = item.totalAvailable + (pendingDeltasRef.current[item.id] ?? 0);
      if (delta < 0 && display <= 0) return;

      bumpPending(item.id, delta);
      haptics.light();

      const queue = queuesRef.current.get(item.id) ?? [];
      queue.push({
        delta,
        idempotencyKey: `mobile:adjust:${item.id}:${++seqRef.current}:${Date.now()}`,
      });
      queuesRef.current.set(item.id, queue);

      void processQueue(item.id);
    },
    [bumpPending, companyId, processQueue],
  );

  return { getDisplayAvailable, adjust };
}
