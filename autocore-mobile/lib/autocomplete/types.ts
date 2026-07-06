export type AutocompleteOption = {
  value: string;
  label?: string;
  keywords?: string;
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

export type AutocompleteSession = {
  inputId: string;
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
