import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/toast';
import { useMobileStockAdjust } from '@/hooks/use-mobile-stock-adjust';
import {
  resolveAdjustIdempotencyKey,
  type AdjustAttempt,
} from '@/lib/warehouse/adjust-idempotency';
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
  /**
   * The idempotency key already sent for an item's current net, kept so a retry
   * reuses it.
   *
   * A failed flush leaves the pending delta in place and the next flush sends
   * the same net again. When the failure was a client-side timeout on a request
   * the server actually applied, a fresh key made that second send a second
   * movement — stock silently counted twice, with nothing in the UI to show it.
   * Keyed by the net as well as the item: a different net is a different
   * adjustment and must not reuse a key the server has already accepted.
   */
  const attemptKeyRef = useRef<Record<string, AdjustAttempt>>({});

  const bumpPending = useCallback((itemId: string, delta: 1 | -1) => {
    setPendingDeltas((prev) => {
      const next = { ...prev };
      const value = (next[itemId] ?? 0) + delta;
      if (value === 0) {
        delete next[itemId];
        delete baselineRef.current[itemId];
        // Back to square one, so any key held for an outstanding net is spent.
        // Leaving it would let a later adjustment that happens to land on the
        // same net reuse it, and the server would answer with the *old*
        // movement — quietly dropping the new adjustment instead of applying it.
        delete attemptKeyRef.current[itemId];
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
    delete attemptKeyRef.current[itemId];
  }, []);

  const syncItemNet = useCallback(
    async (itemId: string, net: number) => {
      if (!companyId || net === 0) return;

      const direction = net > 0 ? 'increase' : 'decrease';
      const quantity = Math.abs(net);

      const attempt = resolveAdjustIdempotencyKey({
        itemId,
        net,
        previous: attemptKeyRef.current[itemId],
        sequence: ++seqRef.current,
        now: Date.now(),
      });
      attemptKeyRef.current[itemId] = attempt;

      try {
        const result = await stockAdjust.mutateAsync({
          itemId,
          direction,
          quantity,
          idempotencyKey: attempt.key,
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
