import type { AutocompleteOption } from './types';

export type AutocompleteOptionDisplay = {
  primary: string;
  secondary: string | null;
};

export function formatAutocompleteOption(option: AutocompleteOption): AutocompleteOptionDisplay {
  const value = (option.value ?? '').trim();
  if (option.meta?.title?.trim()) {
    return {
      primary: option.meta.title.trim(),
      secondary:
        [option.meta.manufacturer, option.meta.generation].filter(Boolean).join(' · ') || null,
    };
  }

  const label = option.label?.trim() || value;
  if (!value) {
    return { primary: label, secondary: null };
  }

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
