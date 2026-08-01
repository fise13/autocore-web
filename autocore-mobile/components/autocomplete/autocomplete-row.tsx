/**
 * @deprecated Prefer InlineAutocompleteRow — kept for graph/compat imports.
 */
export { InlineAutocompleteRow as AutocompleteRow } from './inline-autocomplete-row';

/** @deprecated Panel chrome lives in InlineAutocomplete. */
export function AutocompletePanel({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
