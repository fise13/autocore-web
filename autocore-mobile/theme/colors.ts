/**
 * Semantic colour tokens.
 *
 * The values live in `@autocore/design-tokens` so that web and mobile cannot
 * drift apart — see packages/design-tokens/src/colors.ts. Never add a colour
 * here; add it to the package and run `npm run tokens:build` from the repo
 * root so the web CSS is regenerated too.
 */
export {
  colors,
  colorSchemes,
  getColors,
  type ColorScheme,
  type SemanticColors,
} from '@autocore/design-tokens';
