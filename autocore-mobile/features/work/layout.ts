import { rhythm } from '@/theme/screen';

/**
 * Work screen rhythm.
 *
 * Work is a catalog: a short priority block, then grouped workspace rows. It
 * runs a slightly tighter vertical rhythm than the generic `ListSection`
 * islands — the previous screen had section air sized for long content lists
 * and read as empty desert with five short cards on it.
 *
 * Horizontal inset stays on the app-wide `rhythm.pad` so Work lines up with
 * Home, Stock and Settings.
 */
export const workLayout = {
  pad: rhythm.pad,

  /** Large title → the `Today` heading (PageHeader already pays 6pt). */
  headingTop: 12,
  /** `Today` heading → its card. */
  todayTop: 18,
  /** Today card → the `Workspaces` heading. */
  todayBottom: 32,
  /** `Workspaces` heading → first section label. */
  workspacesBottom: 20,
  /** Section label → its card. */
  labelBottom: 14,
  /** Card → the next section label. */
  sectionGap: 28,

  cardRadius: 20,
  cardPadX: 20,

  /** Two-line rows; single-line rows shrink to the same optical weight. */
  rowMinHeight: 78,
  rowPadY: 16,
  rowGap: 3,

  todayMinHeight: 80,
  todayPad: 19,

  /** Hairline is deliberately 1pt: `colors.border` is already ~8% alpha. */
  dividerHeight: 1,
  dividerInset: 20,

  pressScale: 0.98,
} as const;

export type WorkLayout = typeof workLayout;
