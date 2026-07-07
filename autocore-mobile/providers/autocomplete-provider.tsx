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
import { Keyboard } from 'react-native';

import { AutocompleteOverlay } from '@/components/autocomplete/autocomplete-overlay';
import { getAutocompleteDataSnapshot } from '@/lib/autocomplete/autocomplete-data-store';
import { AUTOCOMPLETE_BLUR_DISMISS_MS, AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/autocomplete/constants';
import { applySuggestion } from '@/lib/autocomplete/replace-token';
import { rememberFieldValue, rememberRecentValue } from '@/lib/autocomplete/recent-values-store';
import { searchAutocomplete } from '@/lib/autocomplete/search-registry';
import type { AutocompleteConfig, AutocompleteOption, AutocompleteSession } from '@/lib/autocomplete/types';

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
  commitHighlighted: (inputId: string) => void;
  activeInputId: string | null;
  setChromeBottomInset: (height: number) => void;
};

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

export function AutocompleteProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AutocompleteSession | null>(null);
  const [chromeBottomInset, setChromeBottomInset] = useState(0);
  const sessionRef = useRef<AutocompleteSession | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  sessionRef.current = session;

  const runSearch = useCallback((next: AutocompleteSession) => {
    const data = getAutocompleteDataSnapshot();
    const suggestions = searchAutocomplete(next.query, next.config, data, next.customOptions);
    const updated: AutocompleteSession = {
      ...next,
      suggestions,
      visible: suggestions.length > 0,
      highlightedIndex: Math.min(next.highlightedIndex, Math.max(0, suggestions.length - 1)),
    };
    sessionRef.current = updated;
    setSession(updated);
  }, []);

  const cancelBlurDismiss = useCallback(() => {
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }
  }, []);

  const registerInput = useCallback((args: RegisterInputArgs) => {
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }

    const next: AutocompleteSession = {
      inputId: args.inputId,
      query: '',
      config: args.config,
      suggestions: [],
      highlightedIndex: 0,
      visible: false,
      replaceMode: args.replaceMode,
      matchMode: args.matchMode,
      onChange: args.onChange,
      onOptionSelect: args.onOptionSelect,
      customOptions: args.customOptions,
    };
    sessionRef.current = next;
    setSession(next);
  }, []);

  const unregisterInput = useCallback((inputId: string) => {
    blurRef.current = setTimeout(() => {
      if (sessionRef.current?.inputId === inputId) {
        setSession(null);
      }
    }, AUTOCOMPLETE_BLUR_DISMISS_MS);
  }, []);

  const setQuery = useCallback(
    (inputId: string, query: string) => {
      const current = sessionRef.current;
      if (!current || current.inputId !== inputId) return;

      const next = { ...current, query, highlightedIndex: 0 };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const live = sessionRef.current;
        if (!live || live.inputId !== inputId) return;
        runSearch({ ...live, query: live.query });
      }, current.config.debounceMs ?? AUTOCOMPLETE_DEBOUNCE_MS);

      runSearch(next);
    },
    [runSearch],
  );

  const setHighlightedIndex = useCallback((inputId: string, index: number) => {
    setSession((current) => {
      if (!current || current.inputId !== inputId) return current;
      return { ...current, highlightedIndex: index };
    });
  }, []);

  const commitSuggestion = useCallback((inputId: string, index: number) => {
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

    setSession(null);
    Keyboard.dismiss();
  }, [cancelBlurDismiss]);

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
      cancelBlurDismiss();
      setSession(null);
    });
    return () => {
      sub.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurRef.current) clearTimeout(blurRef.current);
    };
  }, [cancelBlurDismiss]);

  const value = useMemo(
    () => ({
      registerInput,
      unregisterInput,
      setQuery,
      setHighlightedIndex,
      commitHighlighted,
      activeInputId: session?.inputId ?? null,
      setChromeBottomInset,
    }),
    [commitHighlighted, registerInput, session?.inputId, setHighlightedIndex, setQuery, unregisterInput],
  );

  return (
    <AutocompleteContext.Provider value={value}>
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
