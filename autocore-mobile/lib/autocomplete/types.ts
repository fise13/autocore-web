export type AutocompleteFuelBadge = 'Gasoline' | 'Diesel' | 'Hybrid';

export type AutocompleteOptionMeta = {
  manufacturer?: string;
  generation?: string;
  badge?: AutocompleteFuelBadge | string;
  thumbnailUrl?: string;
  /** Display title override (e.g. "Subaru EJ205"); commit still uses `value`. */
  title?: string;
  matchRanges?: Array<{ start: number; end: number }>;
};

export type AutocompleteOption = {
  value: string;
  label?: string;
  keywords?: string;
  meta?: AutocompleteOptionMeta;
};

export type AutocompleteSourceId =
  | 'engineCode'
  | 'manufacturer'
  | 'customer'
  | 'supplier'
  | 'warehouse'
  | 'category'
  | 'previousValue'
  | 'recent';

export type AutocompleteReplaceMode = 'full' | 'token';

export type AutocompleteConfig = {
  source: AutocompleteSourceId;
  replaceMode?: AutocompleteReplaceMode;
  matchMode?: 'prefix' | 'flexible';
  debounceMs?: number;
  minQueryLength?: number;
  context?: Record<string, string>;
  fieldKey?: string;
};

/** Window-space rect of the input the suggestions belong to. */
export type AutocompleteAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AutocompleteSession = {
  inputId: string;
  anchor?: AutocompleteAnchor;
  query: string;
  config: AutocompleteConfig;
  suggestions: AutocompleteOption[];
  highlightedIndex: number;
  visible: boolean;
  replaceMode: AutocompleteReplaceMode;
  matchMode: 'prefix' | 'flexible';
  onChange: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  customOptions?: AutocompleteOption[];
};
