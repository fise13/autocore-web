import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

export const TAB_ORDER = ['index', 'search', 'scan', 'orders', 'accounting', 'profile'] as const;
export type TabRouteName = (typeof TAB_ORDER)[number];

type TabEntryContextValue = {
  direction: number;
};

const TabTransitionContext = createContext<{
  beginTransition: (from: TabRouteName, to: TabRouteName) => void;
  takeTransitionFor: (tab: TabRouteName) => number;
  markFocused: (tab: TabRouteName) => void;
} | null>(null);

const TabEntryContext = createContext<TabEntryContextValue>({ direction: 0 });

function isTabRouteName(name: string): name is TabRouteName {
  return TAB_ORDER.includes(name as TabRouteName);
}

export function TabTransitionProvider({ children }: { children: ReactNode }) {
  const pendingDirection = useRef(0);
  const pendingTarget = useRef<TabRouteName | null>(null);

  const beginTransition = useCallback((from: TabRouteName, to: TabRouteName) => {
    const fromIdx = TAB_ORDER.indexOf(from);
    const toIdx = TAB_ORDER.indexOf(to);
    pendingDirection.current = toIdx === fromIdx ? 0 : toIdx > fromIdx ? 1 : -1;
    pendingTarget.current = to;
  }, []);

  const takeTransitionFor = useCallback((tab: TabRouteName) => {
    if (pendingTarget.current !== tab) return 0;
    const direction = pendingDirection.current;
    pendingTarget.current = null;
    pendingDirection.current = 0;
    return direction;
  }, []);

  const markFocused = useCallback((_tab: TabRouteName) => {}, []);

  const value = useMemo(
    () => ({
      beginTransition,
      takeTransitionFor,
      markFocused,
    }),
    [beginTransition, markFocused, takeTransitionFor],
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

export function useTabTransition() {
  const context = useContext(TabTransitionContext);
  if (!context) {
    throw new Error('useTabTransition must be used within TabTransitionProvider');
  }
  return context;
}

export function useTabEntryDirection(): number {
  return useContext(TabEntryContext).direction;
}

export function TabEntryProvider({
  direction,
  children,
}: {
  direction: number;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ direction }), [direction]);
  return <TabEntryContext.Provider value={value}>{children}</TabEntryContext.Provider>;
}

export function resolveTabRouteName(name: string): TabRouteName | null {
  return isTabRouteName(name) ? name : null;
}
