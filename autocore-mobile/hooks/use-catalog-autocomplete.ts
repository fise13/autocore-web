import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { AUTOCOMPLETE_BLUR_DISMISS_MS, AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/autocomplete/constants';
import { filterCatalogItems } from '@/lib/autocomplete/catalog';
import { tokens } from '@/theme/tokens';

type UseCatalogAutocompleteArgs<T> = {
  items: readonly T[];
  searchFields: ReadonlyArray<(item: T) => string>;
  query: string;
  onSelect: (item: T) => void;
  debounceMs?: number;
  limit?: number;
};

/**
 * Generic catalog filter for chip docks. Production WO fields go through
 * AutocompleteProvider instead — this hook is for standalone catalog UIs.
 */
export function useCatalogAutocomplete<T>({
  items,
  searchFields,
  query,
  onSelect,
  debounceMs = AUTOCOMPLETE_DEBOUNCE_MS,
  limit = tokens.autocomplete.maxChips,
}: UseCatalogAutocompleteArgs<T>): {
  suggestions: T[];
  visible: boolean;
  focused: boolean;
  keyboardVisible: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onInteractionStart: () => void;
  select: (item: T) => void;
} {
  const [focused, setFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [debounced, setDebounced] = useState(query);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), debounceMs);
    return () => clearTimeout(handle);
  }, [debounceMs, query]);

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const onHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const suggestions = useMemo(
    () => filterCatalogItems(items, debounced, searchFields, limit),
    [debounced, items, limit, searchFields],
  );

  const cancelBlur = useCallback(() => {
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelBlur(), [cancelBlur]);

  const onFocus = useCallback(() => {
    cancelBlur();
    setFocused(true);
  }, [cancelBlur]);

  const onBlur = useCallback(() => {
    cancelBlur();
    blurRef.current = setTimeout(() => {
      setFocused(false);
      blurRef.current = null;
    }, AUTOCOMPLETE_BLUR_DISMISS_MS);
  }, [cancelBlur]);

  const select = useCallback(
    (item: T) => {
      cancelBlur();
      setFocused(true);
      onSelect(item);
    },
    [cancelBlur, onSelect],
  );

  return {
    suggestions,
    visible: focused && keyboardVisible && suggestions.length > 0,
    focused,
    keyboardVisible,
    onFocus,
    onBlur,
    onInteractionStart: cancelBlur,
    select,
  };
}
