import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { orderOpenGuard } from '@/lib/navigation/navigation-guard';
import { haptics } from '@/theme';

import type { WorkOrder } from '../types';

type SourceLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OrderTransitionContextValue = {
  openOrder: (order: WorkOrder, layout?: SourceLayout) => void;
  activeOrderId: string | null;
};

const OrderTransitionContext = createContext<OrderTransitionContextValue | null>(null);

/**
 * Opens order detail as a page sheet over the Orders stack.
 */
export function OrderTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const activeOrderIdRef = useRef<string | null>(null);

  const openOrder = useCallback(
    (order: WorkOrder, _layout?: SourceLayout) => {
      if (activeOrderIdRef.current === order.id || orderOpenGuard.isLocked) return;

      orderOpenGuard.tryNavigate(() => {
        haptics.light();
        activeOrderIdRef.current = order.id;
        setActiveOrderId(order.id);
        router.push(`/orders/${order.id}`);
        activeOrderIdRef.current = null;
        setActiveOrderId(null);
        orderOpenGuard.release();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({
      openOrder,
      activeOrderId,
    }),
    [activeOrderId, openOrder],
  );

  return (
    <OrderTransitionContext.Provider value={value}>{children}</OrderTransitionContext.Provider>
  );
}

export function useOrderTransition() {
  const ctx = useContext(OrderTransitionContext);
  if (!ctx) {
    throw new Error('useOrderTransition must be used within OrderTransitionProvider');
  }
  return ctx;
}
