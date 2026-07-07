import type { AutocompleteOption } from './types';

export type AutocompleteOptionDisplay = {
  primary: string;
  secondary: string | null;
};

export function formatAutocompleteOption(option: AutocompleteOption): AutocompleteOptionDisplay {
  const value = option.value.trim();
  const label = option.label?.trim() || value;

  if (label.includes(' · ')) {
    const parts = label
      .split(' · ')
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      primary: parts[0] ?? value,
      secondary: parts.length > 1 ? parts.slice(1).join(' · ') : null,
    };
  }

  if (option.label && option.label !== value) {
    return { primary: value, secondary: option.label };
  }

  return { primary: value, secondary: null };
}
