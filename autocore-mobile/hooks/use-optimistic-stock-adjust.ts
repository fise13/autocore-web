import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/toast';
import { useMobileStockAdjust } from '@/hooks/use-mobile-stock-adjust';
import { haptics } from '@/theme';
import type { InventoryItem } from '@/types/inventory';

function inventoryQueryKey(companyId: string) {
  return ['realtime', 'inventory-items', companyId] as const;
}

/**
 * Instant +/- in the UI via pending deltas. Firebase sync is deferred until `flush`
 * (e.g. when leaving the warehouse screen) so realtime snapshots do not fight edits.
 */
export function useOptimisticStockAdjust(companyId: string | null) {
  const queryClient = useQueryClient();
  const stockAdjust = useMobileStockAdjust();
  const [pendingDeltas, setPendingDeltas] = useState<Record<string, number>>({});
  const pendingDeltasRef = useRef(pendingDeltas);
  pendingDeltasRef.current = pendingDeltas;
  const baselineRef = useRef<Record<string, number>>({});
  const flushingRef = useRef(false);
  const seqRef = useRef(0);

  const bumpPending = useCallback((itemId: string, delta: 1 | -1) => {
    setPendingDeltas((prev) => {
      const next = { ...prev };
      const value = (next[itemId] ?? 0) + delta;
      if (value === 0) {
        delete next[itemId];
        delete baselineRef.current[itemId];
      } else {
        next[itemId] = value;
      }
      return next;
    });
  }, []);

  const getDisplayAvailable = useCallback(
    (item: InventoryItem) => {
      const base = baselineRef.current[item.id] ?? item.totalAvailable;
      return Math.max(0, base + (pendingDeltas[item.id] ?? 0));
    },
    [pendingDeltas],
  );

  const clearItemPending = useCallback((itemId: string) => {
    setPendingDeltas((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    delete baselineRef.current[itemId];
  }, []);

  const syncItemNet = useCallback(
    async (itemId: string, net: number) => {
      if (!companyId || net === 0) return;

      const direction = net > 0 ? 'increase' : 'decrease';
      const quantity = Math.abs(net);

      try {
        const result = await stockAdjust.mutateAsync({
          itemId,
          direction,
          quantity,
          idempotencyKey: `mobile:adjust:${itemId}:flush:${++seqRef.current}:${Date.now()}`,
        });

        clearItemPending(itemId);

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
        haptics.warning();
        toast({
          title: 'Failed to update stock',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [clearItemPending, companyId, queryClient, stockAdjust],
  );

  const flush = useCallback(async () => {
    if (!companyId || flushingRef.current) return;

    const entries = Object.entries(pendingDeltasRef.current).filter(([, net]) => net !== 0);
    if (entries.length === 0) return;

    flushingRef.current = true;
    try {
      for (const [itemId, net] of entries) {
        await syncItemNet(itemId, net);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [companyId, syncItemNet]);

  const adjust = useCallback(
    (item: InventoryItem, delta: 1 | -1) => {
      if (!companyId) return;

      if (!(item.id in baselineRef.current)) {
        baselineRef.current[item.id] = item.totalAvailable;
      }

      const base = baselineRef.current[item.id] ?? item.totalAvailable;
      const display = base + (pendingDeltasRef.current[item.id] ?? 0);
      if (delta < 0 && display <= 0) return;

      bumpPending(item.id, delta);
      haptics.light();
    },
    [bumpPending, companyId],
  );

  const hasPending = Object.keys(pendingDeltas).length > 0;

  return { getDisplayAvailable, adjust, flush, hasPending };
};
