import type { JobPhotoSyncBar } from '@/features/engine-intake/lib/job-photo-sync-progress';
import type { MotorEntity } from '@/types/motor';

import type { EngineListLane, EngineRow } from '../lib/engine-list-sections';

export type { EngineListLane, EngineRow };

export type EngineCatalogActions = {
  onRelocate: (motor: MotorEntity) => void;
  onAddToOrder: (motor: MotorEntity) => void;
  onSell: (motor: MotorEntity) => void;
};

export type EngineIncomingActions = {
  onContinue: (motor: MotorEntity) => void;
  onAccept: (motor: MotorEntity) => void;
  onEdit: (motor: MotorEntity) => void;
  onCancel: (motor: MotorEntity) => void;
};

export type EngineFilterOption = { value: string; label: string };

/**
 * The part of the header that belongs to the content rather than the chrome.
 *
 * Apple puts a screen's large title, its search field and its filters inside
 * the scroll view, not above it: they scroll away with the rows, and the bar
 * that stays is only ever a bar. Doing the same means the list is the thing
 * that draws them — which is why they arrive here rather than being stacked
 * over the list by the screen.
 *
 * It also removes a whole class of defect. Nothing above the list changes size
 * any more, so the list is never re-laid out mid-scroll.
 */
export type EngineListHeader = {
  title: string;
  subtitle: string;
  /** Live query. The field owns its own text; this is for the clear button. */
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder: string;
  /** Incoming / Yard / All, or null when the person can only see one lane. */
  lanes: EngineFilterOption[] | null;
  lane: string;
  onLaneChange: (next: string) => void;
  /** Quality grades, or null in a lane where grades do not apply. */
  qualities: EngineFilterOption[] | null;
  quality: string;
  onQualityChange: (next: string) => void;
  /** Height of the pinned bar the content scrolls beneath. */
  topInset: number;
};

/**
 * One contract, two renderers.
 *
 * `engines-list.ios.tsx` draws a native SwiftUI `List` so that holding a row
 * gives the real UIKit menu — the lift, the blur and the haptic come from the
 * system rather than being redrawn in JavaScript. `engines-list.tsx` is the
 * React Native list every other platform gets. Metro picks between them by
 * filename, so the screen imports one name and never branches on platform.
 */
export type EnginesListProps = {
  rows: EngineRow[];
  /** Large title, search and filters — drawn as the list's first rows. */
  header: EngineListHeader;
  /**
   * Shown in place of rows when a filter matches nothing.
   *
   * Inside the list rather than instead of it: the search field is a list row
   * now, and unmounting the list to show an empty state would take the field —
   * and the keyboard — away at the exact keystroke that narrowed the results
   * to zero.
   */
  emptyMessage?: { title: string; hint: string } | null;
  onUnitPress: (motor: MotorEntity, lane: EngineListLane) => void;
  actions: EngineCatalogActions;
  incomingActions?: EngineIncomingActions;
  /** Per-intake-job upload bar, keyed by `motor.intakeJobId`. */
  uploadProgressByJobId: ReadonlyMap<string, JobPhotoSyncBar>;
  /**
   * Local capture to show before the server has a photo URL, keyed by
   * `motor.intakeJobId`. Precomputed by the screen: resolving it per row meant
   * scanning the whole outbox once for every visible engine.
   */
  previewUriByJobId: ReadonlyMap<string, string>;
  /**
   * Vertical scroll offset in points, for the collapsing header.
   *
   * Deliberately not React Native's `onScroll` event: the iOS list is a SwiftUI
   * `List`, which emits nothing an `NativeSyntheticEvent` consumer could read.
   * A plain number is the one thing both renderers can honestly produce.
   */
  onScrollOffset?: (offsetY: number) => void;
  /** Space the floating tab bar needs under the last row. */
  bottomInset: number;
};
