import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';

import { toast } from '@/components/ui';
import { useSession, useWorkOrdersRealtime } from '@/hooks';
import { haptics } from '@/theme';
import type { WorkOrderMotorOutcome } from '@/types/work-order';

import {
  navigateEditOrderWithMotor,
  navigateEditOrderWithPart,
  navigateNewOrderWithMotor,
  navigateNewOrderWithPart,
} from '../lib/order-composition-nav';

type PendingAdd =
  | { type: 'part'; itemId: string }
  | { type: 'motor'; motorId: string; outcome: WorkOrderMotorOutcome };

export function useAddToOrderFlow() {
  const router = useRouter();
  const { companyId } = useSession();
  const { domainOrders } = useWorkOrdersRealtime(companyId);
  const pickerRef = useRef<BottomSheetModal>(null);
  const pendingRef = useRef<PendingAdd | null>(null);

  const drafts = useMemo(
    () =>
      domainOrders
        .filter((order) => order.status === 'draft')
        .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
        .slice(0, 5),
    [domainOrders],
  );

  const finishNavigation = useCallback(
    (orderId: string | 'new', pending: PendingAdd) => {
      if (pending.type === 'part') {
        if (orderId === 'new') {
          navigateNewOrderWithPart(router, pending.itemId);
        } else {
          navigateEditOrderWithPart(router, orderId, pending.itemId);
        }
        return;
      }

      if (orderId === 'new') {
        navigateNewOrderWithMotor(router, pending.motorId, pending.outcome);
      } else {
        navigateEditOrderWithMotor(router, orderId, pending.motorId, pending.outcome);
      }
    },
    [router],
  );

  const presentPicker = useCallback((pending: PendingAdd) => {
    pendingRef.current = pending;
    pickerRef.current?.present();
  }, []);

  const addPartToOrder = useCallback(
    (itemId: string) => {
      haptics.light();
      presentPicker({ type: 'part', itemId });
    },
    [presentPicker],
  );

  const addMotorToOrder = useCallback(
    (motorId: string, outcome: WorkOrderMotorOutcome = 'install') => {
      haptics.light();
      presentPicker({ type: 'motor', motorId, outcome });
    },
    [presentPicker],
  );

  const handleSelectNew = useCallback(() => {
    const pending = pendingRef.current;
    pickerRef.current?.dismiss();
    if (!pending) return;
    finishNavigation('new', pending);
    pendingRef.current = null;
    toast({ title: 'New work order', description: 'The item will be added to it', variant: 'default' });
  }, [finishNavigation]);

  const handleSelectOrder = useCallback(
    (orderId: string) => {
      const pending = pendingRef.current;
      const order = drafts.find((entry) => entry.id === orderId);
      pickerRef.current?.dismiss();
      if (!pending) return;
      finishNavigation(orderId, pending);
      pendingRef.current = null;
      haptics.success();
      toast({
        title: 'Added to work order',
        description: order ? `№${order.number}` : undefined,
        variant: 'success',
      });
    },
    [drafts, finishNavigation],
  );

  const handlePickerDismiss = useCallback(() => {
    pendingRef.current = null;
  }, []);

  return {
    pickerRef,
    drafts,
    addPartToOrder,
    addMotorToOrder,
    handleSelectNew,
    handleSelectOrder,
    handlePickerDismiss,
  };
}
