/**
 * CSS custom-property projection of the canonical tokens.
 *
 * `renderTokensCss()` produces `src/styles/design-tokens.css`, which
 * `src/app/globals.css` imports. Run `npm run tokens:build` after changing
 * `colors.ts`; `npm run tokens:check` fails CI when the file is stale.
 */
import type { ColorScheme, SemanticColors } from './colors';
import { getColors } from './colors';

/** `primaryOnSubtle` -> `primary-on-subtle`, `chart1` -> `chart-1`. */
export function cssVariableName(token: string): string {
  return token
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
}

export function toCssVariables(scheme: ColorScheme): Record<string, string> {
  const palette = getColors(scheme);
  const entries = Object.entries(palette) as Array<[keyof SemanticColors, string]>;
  return Object.fromEntries(
    entries.map(([token, value]) => [`--${cssVariableName(token)}`, value]),
  );
}

function renderBlock(selector: string, scheme: ColorScheme, extra: string[]): string {
  const declarations = Object.entries(toCssVariables(scheme)).map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return [`${selector} {`, ...declarations, ...extra.map((line) => `  ${line}`), '}'].join('\n');
}

export const GENERATED_HEADER = [
  '/*',
  ' * GENERATED FILE — DO NOT EDIT.',
  ' * Source: packages/design-tokens/src/colors.ts',
  ' * Regenerate: npm run tokens:build',
  ' */',
].join('\n');

export function renderTokensCss(): string {
  return [
    GENERATED_HEADER,
    '',
    renderBlock(':root', 'light', ['--radius: 0.625rem;', 'color-scheme: light;']),
    '',
    renderBlock('.dark', 'dark', ['color-scheme: dark;']),
    '',
  ].join('\n');
}
