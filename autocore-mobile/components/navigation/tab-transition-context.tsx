import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

export const TAB_ORDER = [
  'index',
  'work',
  'action',
  'accounting',
  'profile',
  // Hidden drill-in routes still under (tabs)
  'orders',
  'ai',
  'scan',
  'search',
  'warehouse',
  'my-earnings',
] as const;
export type TabRouteName = (typeof TAB_ORDER)[number];

type TabTransitionContextValue = {
  beginTransition: (from: TabRouteName, to: TabRouteName) => void;
  takeTransitionFor: (tab: TabRouteName) => number;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(null);

function isTabRouteName(name: string): name is TabRouteName {
  return TAB_ORDER.includes(name as TabRouteName);
}

export function resolveTabRouteName(name: string): TabRouteName | null {
  return isTabRouteName(name) ? name : null;
}

/**
 * Tracks tab-switch direction in refs — no re-renders on transition.
 * Consumed by AnimatedTabScreen on focus.
 */
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

  const value = useMemo(
    () => ({
      beginTransition,
      takeTransitionFor,
    }),
    [beginTransition, takeTransitionFor],
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

/**
 * Direction bookkeeping is optional: the native tab bar animates its own
 * switches, and `useNavigateTab` is also called from root-level screens that
 * sit outside the tab navigator. Missing provider means "no transition", not
 * a crash.
 */
const NO_TRANSITION: TabTransitionContextValue = {
  beginTransition: () => {},
  takeTransitionFor: () => 0,
};

export function useTabTransition(): TabTransitionContextValue {
  return useContext(TabTransitionContext) ?? NO_TRANSITION;
}
