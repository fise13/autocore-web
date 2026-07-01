/** Z-index layering — mirrors web stacking context */
export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  header: 30,
  sidebar: 40,
  overlay: 50,
  modal: 60,
  bottomSheet: 70,
  toast: 80,
  tooltip: 90,
  max: 100,
  /** Page transition veil from globals.css */
  pageTransition: 9999,
} as const;

export type ZIndexKey = keyof typeof zIndex;
