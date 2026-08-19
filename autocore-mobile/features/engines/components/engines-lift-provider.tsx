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

export type EnginesLiftSession = {
  motorId: string;
  anchor: IosLiftMenuAnchor;
  preview: ReactNode;
  previewStyle?: object;
  items: IosLiftMenuItem[];
};

type EnginesLiftContextValue = {
  openLift: (session: EnginesLiftSession) => void;
  closeLift: () => void;
  activeMotorId: string | null;
};

const EnginesLiftContext = createContext<EnginesLiftContextValue | null>(null);

/**
 * Screen-level host for `IosLiftMenu` — one Modal for the whole Engines list.
 * Rows only call `openLift`; they never mount the menu themselves.
 */
export function EnginesLiftProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<EnginesLiftSession | null>(null);

  const openLift = useCallback((next: EnginesLiftSession) => {
    setSession(next);
  }, []);

  const closeLift = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      openLift,
      closeLift,
      activeMotorId: session?.motorId ?? null,
    }),
    [closeLift, openLift, session?.motorId],
  );

  return (
    <EnginesLiftContext.Provider value={value}>
      {children}
      <IosLiftMenu
        visible={Boolean(session)}
        onClose={closeLift}
        anchor={session?.anchor ?? null}
        preview={session?.preview ?? <></>}
        previewStyle={session?.previewStyle}
        items={session?.items ?? []}
      />
    </EnginesLiftContext.Provider>
  );
}

export function useEnginesLift() {
  const ctx = useContext(EnginesLiftContext);
  if (!ctx) {
    throw new Error('useEnginesLift must be used within EnginesLiftProvider');
  }
  return ctx;
}
