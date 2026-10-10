/** Grid selection colours, themed through design tokens (light and dark). */
export const gridPalette = {
  selectionFill: "var(--grid-selection)",
  /** Pinned cells sit on an opaque layer, so they use the same opaque fill. */
  pinnedSelectionFill: "var(--grid-selection)",
  activeBorder: "var(--grid-active-border)",
  /** Secondary ranges of a multi-range selection. */
  secondaryRangeBorder: "color-mix(in oklab, var(--grid-active-border) 55%, transparent)",
} as const;
