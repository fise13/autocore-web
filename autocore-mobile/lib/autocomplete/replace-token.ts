import type { AutocompleteReplaceMode } from './types';

export function applySuggestion(
  currentValue: string,
  suggestion: string,
  mode: AutocompleteReplaceMode,
): string {
  if (mode === 'full') return suggestion;
  return replaceLastToken(currentValue, suggestion);
}

export function replaceLastToken(value: string, replacement: string): string {
  const trimmed = value.trimEnd();
  if (!trimmed) return replacement;

  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace < 0) return replacement;

  const prefix = trimmed.slice(0, lastSpace + 1);
  const suffix = value.slice(trimmed.length);
  return `${prefix}${replacement}${suffix}`;
}
