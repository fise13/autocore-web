import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  IosLiftMenu,
  type IosLiftMenuAnchor,
  type IosLiftMenuItem,
} from '@/components/ui/ios-lift-menu';

export type OrdersLiftSession = {
  orderId?: string;
  filter?: boolean;
  anchor: IosLiftMenuAnchor;
  preview: ReactNode;
  previewStyle?: object;
  items: IosLiftMenuItem[];
  menuPlacement?: 'auto' | 'above' | 'below';
};

type OrdersLiftContextValue = {
  openLift: (session: OrdersLiftSession) => void;
  closeLift: () => void;
  activeOrderId: string | null;
  filterLifted: boolean;
};

const OrdersLiftContext = createContext<OrdersLiftContextValue | null>(null);

/**
 * Screen-level host for `IosLiftMenu` — one Modal for the whole Orders list
 * (rows + filter). Rows only call `openLift`; they never mount the menu themselves.
 */
export function OrdersLiftProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OrdersLiftSession | null>(null);

  const openLift = useCallback((next: OrdersLiftSession) => {
    setSession(next);
  }, []);

  const closeLift = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      openLift,
      closeLift,
      activeOrderId: session?.orderId ?? null,
      filterLifted: Boolean(session?.filter),
    }),
    [closeLift, openLift, session?.filter, session?.orderId],
  );

  return (
    <OrdersLiftContext.Provider value={value}>
      {children}
      <IosLiftMenu
        visible={Boolean(session)}
        onClose={closeLift}
        anchor={session?.anchor ?? null}
        preview={session?.preview ?? <></>}
        previewStyle={session?.previewStyle}
        items={session?.items ?? []}
        menuPlacement={session?.menuPlacement ?? 'auto'}
      />
    </OrdersLiftContext.Provider>
  );
}

export function useOrdersLift() {
  const ctx = useContext(OrdersLiftContext);
  if (!ctx) {
    throw new Error('useOrdersLift must be used within OrdersLiftProvider');
  }
  return ctx;
}
