import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Keyboard, View } from 'react-native';

import { AutocompleteOverlay } from '@/components/autocomplete/autocomplete-overlay';
import { getAutocompleteDataSnapshot } from '@/lib/autocomplete/autocomplete-data-store';
import { AUTOCOMPLETE_BLUR_DISMISS_MS, AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/autocomplete/constants';
import { applySuggestion } from '@/lib/autocomplete/replace-token';
import { rememberFieldValue, rememberRecentValue } from '@/lib/autocomplete/recent-values-store';
import { searchAutocomplete } from '@/lib/autocomplete/search-registry';
import type {
  AutocompleteAnchor,
  AutocompleteConfig,
  AutocompleteOption,
  AutocompleteSession,
} from '@/lib/autocomplete/types';

type RegisterInputArgs = {
  inputId: string;
  config: AutocompleteConfig;
  replaceMode: 'full' | 'token';
  matchMode: 'prefix' | 'flexible';
  onChange: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  customOptions?: AutocompleteOption[];
};

type AutocompleteContextValue = {
  registerInput: (args: RegisterInputArgs) => void;
  unregisterInput: (inputId: string) => void;
  setQuery: (inputId: string, query: string) => void;
  setHighlightedIndex: (inputId: string, index: number) => void;
  moveHighlight: (inputId: string, delta: number) => void;
  commitHighlighted: (inputId: string) => void;
  dismiss: (inputId?: string) => void;
  setAnchor: (inputId: string, anchor: AutocompleteAnchor) => void;
  activeInputId: string | null;
  setChromeBottomInset: (height: number) => void;
};

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

const SEARCH_CACHE_LIMIT = 48;

function shouldShowPanel(query: string) {
  return query.trim().length > 0;
}

export function AutocompleteProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AutocompleteSession | null>(null);
  const [chromeBottomInset, setChromeBottomInset] = useState(0);
  const sessionRef = useRef<AutocompleteSession | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCacheRef = useRef<Map<string, AutocompleteOption[]>>(new Map());

  sessionRef.current = session;

  const cacheKey = useCallback(
    (query: string, config: AutocompleteConfig, customOptions?: AutocompleteOption[]) => {
      const custom = customOptions?.map((entry) => entry.value).join('|') ?? '';
      return `${config.source}::${config.matchMode ?? ''}::${config.fieldKey ?? ''}::${JSON.stringify(config.context ?? {})}::${query}::${custom}`;
    },
    [],
  );

  const runSearch = useCallback(
    (next: AutocompleteSession) => {
      const minLen = next.config.minQueryLength ?? 0;
      const trimmed = next.query.trim();
      if (trimmed.length < minLen) {
        const updated: AutocompleteSession = {
          ...next,
          suggestions: [],
          status: 'ready',
          visible: false,
          highlightedIndex: 0,
        };
        sessionRef.current = updated;
        setSession(updated);
        return;
      }

      const key = cacheKey(next.query, next.config, next.customOptions);
      let suggestions = searchCacheRef.current.get(key);
      if (!suggestions) {
        const data = getAutocompleteDataSnapshot();
        suggestions = searchAutocomplete(next.query, next.config, data, next.customOptions);
        searchCacheRef.current.set(key, suggestions);
        if (searchCacheRef.current.size > SEARCH_CACHE_LIMIT) {
          const first = searchCacheRef.current.keys().next().value;
          if (first) searchCacheRef.current.delete(first);
        }
      }

      const updated: AutocompleteSession = {
        ...next,
        suggestions,
        status: 'ready',
        visible: shouldShowPanel(next.query),
        highlightedIndex: Math.min(
          next.highlightedIndex,
          Math.max(0, suggestions.length - 1),
        ),
      };
      sessionRef.current = updated;
      setSession(updated);
    },
    [cacheKey],
  );

  const cancelBlurDismiss = useCallback(() => {
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }
  }, []);

  const dismiss = useCallback((inputId?: string) => {
    cancelBlurDismiss();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!inputId || sessionRef.current?.inputId === inputId) {
      sessionRef.current = null;
      setSession(null);
    }
  }, [cancelBlurDismiss]);

  /** Position of the focused field, so suggestions can hang off it like on web. */
  const setAnchor = useCallback((inputId: string, anchor: AutocompleteAnchor) => {
    setSession((current) => {
      if (!current || current.inputId !== inputId) return current;
      const previous = current.anchor;
      if (
        previous &&
        Math.abs(previous.x - anchor.x) < 1 &&
        Math.abs(previous.y - anchor.y) < 1 &&
        Math.abs(previous.width - anchor.width) < 1 &&
        Math.abs(previous.height - anchor.height) < 1
      ) {
        return current;
      }
      const next = { ...current, anchor };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const registerInput = useCallback((args: RegisterInputArgs) => {
    cancelBlurDismiss();

    const next: AutocompleteSession = {
      inputId: args.inputId,
      query: '',
      config: args.config,
      suggestions: [],
      highlightedIndex: 0,
      visible: false,
      status: 'idle',
      replaceMode: args.replaceMode,
      matchMode: args.matchMode,
      onChange: args.onChange,
      onOptionSelect: args.onOptionSelect,
      customOptions: args.customOptions,
    };
    sessionRef.current = next;
    setSession(next);
  }, [cancelBlurDismiss]);

  const unregisterInput = useCallback((inputId: string) => {
    blurRef.current = setTimeout(() => {
      if (sessionRef.current?.inputId === inputId) {
        setSession(null);
        sessionRef.current = null;
      }
    }, AUTOCOMPLETE_BLUR_DISMISS_MS);
  }, []);

  const setQuery = useCallback(
    (inputId: string, query: string) => {
      const current = sessionRef.current;
      if (!current || current.inputId !== inputId) return;

      const next = { ...current, query, highlightedIndex: 0 };
      sessionRef.current = next;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Immediate clear when empty.
      if (!query.trim()) {
        runSearch({ ...next, status: 'ready' });
        return;
      }

      // Show loading panel while debounced search runs.
      const loading: AutocompleteSession = {
        ...next,
        status: 'loading',
        visible: true,
        highlightedIndex: 0,
      };
      sessionRef.current = loading;
      setSession(loading);

      debounceRef.current = setTimeout(() => {
        const live = sessionRef.current;
        if (!live || live.inputId !== inputId) return;
        runSearch({ ...live, query: live.query, highlightedIndex: 0 });
      }, current.config.debounceMs ?? AUTOCOMPLETE_DEBOUNCE_MS);
    },
    [runSearch],
  );

  const setHighlightedIndex = useCallback((inputId: string, index: number) => {
    setSession((current) => {
      if (!current || current.inputId !== inputId) return current;
      const next = {
        ...current,
        highlightedIndex: Math.max(0, Math.min(index, current.suggestions.length - 1)),
      };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const moveHighlight = useCallback((inputId: string, delta: number) => {
    setSession((current) => {
      if (!current || current.inputId !== inputId || current.suggestions.length === 0) {
        return current;
      }
      const length = current.suggestions.length;
      const nextIndex = (current.highlightedIndex + delta + length) % length;
      const next = { ...current, highlightedIndex: nextIndex };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const commitSuggestion = useCallback(
    (inputId: string, index: number) => {
      const current = sessionRef.current;
      if (!current || current.inputId !== inputId) return;

      const option = current.suggestions[index];
      if (!option) return;

      cancelBlurDismiss();

      const nextValue = applySuggestion(current.query, option.value, current.replaceMode);
      current.onChange(nextValue);
      current.onOptionSelect?.(option.value);

      const companyId = getAutocompleteDataSnapshot().companyId;
      if (companyId) {
        rememberRecentValue(companyId, current.config.source, option.value);
        if (current.config.fieldKey) {
          rememberFieldValue(companyId, current.config.fieldKey, option.value);
        }
      }

      dismiss(inputId);
      Keyboard.dismiss();
    },
    [cancelBlurDismiss, dismiss],
  );

  const commitHighlighted = useCallback(
    (inputId: string) => {
      const current = sessionRef.current;
      if (!current || current.inputId !== inputId) return;
      if (current.suggestions.length === 0) return;
      commitSuggestion(inputId, current.highlightedIndex);
    },
    [commitSuggestion],
  );

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      dismiss();
    });
    return () => {
      sub.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurRef.current) clearTimeout(blurRef.current);
    };
  }, [dismiss]);

  const value = useMemo(
    () => ({
      registerInput,
      unregisterInput,
      setQuery,
      setHighlightedIndex,
      moveHighlight,
      commitHighlighted,
      dismiss,
      activeInputId: session?.inputId ?? null,
      setChromeBottomInset,
      setAnchor,
    }),
    [
      commitHighlighted,
      dismiss,
      moveHighlight,
      registerInput,
      session?.inputId,
      setAnchor,
      setHighlightedIndex,
      setQuery,
      unregisterInput,
    ],
  );

  return (
    <AutocompleteContext.Provider value={value}>
      {/* Host View gives KeyboardStickyView a full-screen absolute parent. */}
      <View style={{ flex: 1 }}>
        {children}
        <AutocompleteOverlay
          session={session}
          chromeBottomInset={chromeBottomInset}
          onInteractionStart={cancelBlurDismiss}
          onSelect={(index) => {
            const current = sessionRef.current;
            if (!current) return;
            commitSuggestion(current.inputId, index);
          }}
        />
      </View>
    </AutocompleteContext.Provider>
  );
}

export function useAutocompleteContext(): AutocompleteContextValue {
  const ctx = useContext(AutocompleteContext);
  if (!ctx) {
    throw new Error('useAutocompleteContext must be used within AutocompleteProvider');
  }
  return ctx;
}

/** Registers bottom chrome (e.g. sticky footer) so autocomplete stays above it. */
export function useRegisterAutocompleteChromeInset() {
  const ctx = useContext(AutocompleteContext);
  const setChromeBottomInset = ctx?.setChromeBottomInset;

  const updateChromeInset = useCallback((height: number) => {
    setChromeBottomInset?.(Math.max(0, Math.round(height)));
  }, [setChromeBottomInset]);

  useEffect(() => () => setChromeBottomInset?.(0), [setChromeBottomInset]);

  return updateChromeInset;
}
