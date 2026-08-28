/**
 * How a catalog's pinned bar reacts to its list scrolling.
 *
 * Pure — no React Native — so the node test runner can load it, and so both the
 * React Native list and the native SwiftUI one decide identically. They report
 * scrolling through different mechanisms; they must not also disagree about
 * what counts as scrolled.
 */

/**
 * A pinned navigation bar over a scrolling catalog — the UIKit large-title
 * arrangement, where the title is part of the content rather than part of the
 * chrome.
 *
 * Two independent transitions, because Apple's bar has two. The material and
 * its hairline arrive as soon as anything passes beneath the bar, so the bar
 * stops floating over the page. The name only moves into the bar once the large
 * title has actually gone under it — earlier and there would be two titles on
 * screen at once.
 */
export const CATALOG_BAR_MATERIAL_AT = 2;
/** The large title's block: title line, subtitle, and the gap under them. */
export const CATALOG_BAR_TITLE_AT = 62;
export const CATALOG_BAR_TITLE_BACK_AT = 42;

export type CatalogBarState = {
  /** Material and hairline behind the bar. */
  material: boolean;
  /** The screen's name, condensed into the bar. */
  inlineTitle: boolean;
};

export const CATALOG_BAR_AT_TOP: CatalogBarState = { material: false, inlineTitle: false };

export function catalogBarState(input: {
  offsetY: number;
  current: CatalogBarState;
}): CatalogBarState {
  const offset = Number.isFinite(input.offsetY) ? input.offsetY : 0;
  // Rubber-banding past the top reports a negative offset. Still the top.
  if (offset <= 0) return CATALOG_BAR_AT_TOP;
  const material = offset > CATALOG_BAR_MATERIAL_AT;
  const inlineTitle = input.current.inlineTitle
    ? offset > CATALOG_BAR_TITLE_BACK_AT
    : offset > CATALOG_BAR_TITLE_AT;
  // Same object when nothing moved, so the screen's `setState` bails out
  // instead of re-rendering a list of two hundred rows on every frame.
  if (material === input.current.material && inlineTitle === input.current.inlineTitle) {
    return input.current;
  }
  return { material, inlineTitle };
}
