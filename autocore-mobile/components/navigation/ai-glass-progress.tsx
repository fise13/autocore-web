import { createContext, useContext, type ReactNode } from 'react';
import { makeMutable, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * How far the AI action has expanded: `0` is the compact glass button, `1` is
 * the open composer.
 *
 * The value is shared so the navigation can step back a plane while the
 * composer is open without either component owning the other — one progress
 * drives both, entirely on the UI thread.
 */
const CLOSED = makeMutable(0);

const AiGlassProgressContext = createContext<SharedValue<number>>(CLOSED);

export function AiGlassProgressProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);

  return (
    <AiGlassProgressContext.Provider value={progress}>{children}</AiGlassProgressContext.Provider>
  );
}

/** Always safe to call — outside a provider it reads a permanently closed value. */
export function useAiGlassProgress(): SharedValue<number> {
  return useContext(AiGlassProgressContext);
}
