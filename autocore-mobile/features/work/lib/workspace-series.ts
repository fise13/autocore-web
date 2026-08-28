/**
 * The eight-week series behind each workspace spark.
 *
 * The row already answers "what is the state right now". The chart answers a
 * different question — "what is this workspace's rhythm" — and the two are
 * deliberately not the same number. Receiving reads `12 items awaiting
 * placement` beside bars of stock arriving each week; the backlog is the
 * headline, the arrival rate is the shape behind it.
 *
 * Firestore stores current state, not history, so only two things can be
 * reconstructed backwards without inventing anything:
 *
 *   - **level** — how many records existed at each week end. Honest for a
 *     catalog (`createdAt` is enough) and for work orders (`completedAt` and
 *     status make open/closed recoverable).
 *   - **flow** — how many records were created inside each week. Honest for
 *     anything with a create time.
 *
 * Everything a series cannot support is left out rather than approximated:
 *
 *   - Low stock, placement and intake state are not versioned, so "how many
 *     were below reorder level six weeks ago" is unanswerable. Those rows get
 *     the flow of arrivals instead, which is real.
 *   - Warehouse locations arrive from the mobile API with no timestamps at
 *     all (`MobileWarehouseLocation`), and Document import has no listener.
 *     Both are simply absent from this map, and the row draws a quiet
 *     placeholder rather than a shape.
 *
 * Pure — no React, no Firestore.
 */
import { coerceToDate } from '@/lib/firestore-timestamp';
import type { InventoryItem } from '@/types/inventory';
import type { WorkOrder } from '@/types/work-order';

import { recentWeekWindows, type WeekWindow } from './weeks';
import { openWorkCountAt } from './work-today-trend';

/** Matches the Today card's short window, so the two charts share a horizon. */
export const WORKSPACE_SERIES_WEEKS = 8;

export type WorkspaceSeriesShape =
  /** A quantity that exists at a point in time — drawn as a line. */
  | 'level'
  /** Events counted inside a week — drawn as bars. */
  | 'flow';

export type WorkspaceSeries = {
  shape: WorkspaceSeriesShape;
  /** Oldest → newest, one entry per week. */
  points: number[];
  /** What the shape is a picture of. Spoken by VoiceOver; never drawn. */
  caption: string;
};

export type WorkspaceSeriesMap = Partial<Record<string, WorkspaceSeries>>;

/** Anything carrying Firestore-ish timestamps. */
type Dated = { createdAt?: unknown; updatedAt?: unknown };

/**
 * `null` means the listener has not delivered yet — never "zero".
 * Same contract as `WorkCounts`: an unknown queue must not draw an empty chart.
 */
export type WorkspaceSeriesSources = {
  orders: WorkOrder[] | null;
  items: InventoryItem[] | null;
  motors: Dated[] | null;
  intakeJobs: Dated[] | null;
  payroll: Dated[] | null;
};

export const EMPTY_WORKSPACE_SERIES_SOURCES: WorkspaceSeriesSources = {
  orders: null,
  items: null,
  motors: null,
  intakeJobs: null,
  payroll: null,
};

/**
 * Running total of records in existence at each week end.
 *
 * Undated records are treated as pre-existing rather than dropped — the same
 * assumption the Today trend already makes. Dropping them would draw a catalog
 * of 500 motors as an empty chart, which is a bigger lie than placing them
 * before the window.
 */
function levelSeries(records: Dated[], windows: WeekWindow[]): number[] {
  const gained = new Array<number>(windows.length).fill(0);
  let carried = 0;

  for (const record of records) {
    const created = coerceToDate(record.createdAt) ?? coerceToDate(record.updatedAt);
    if (!created || created <= windows[0]!.start) {
      carried += 1;
      continue;
    }
    const index = windows.findIndex((window) => created <= window.end);
    // Created after the newest week — a clock ahead of ours. Not yet real.
    if (index === -1) continue;
    gained[index]! += 1;
  }

  let running = carried;
  return gained.map((count) => (running += count));
}

/**
 * Records created inside each week.
 *
 * Undated records are dropped here, the opposite of `levelSeries`: a bar chart
 * places an event in one specific week, and a record with no time cannot be
 * placed in one without picking a week for it.
 */
function flowSeries(records: Dated[], windows: WeekWindow[]): number[] {
  const counts = new Array<number>(windows.length).fill(0);

  for (const record of records) {
    const created = coerceToDate(record.createdAt);
    if (!created) continue;
    const index = windows.findIndex(
      (window) => created >= window.start && created <= window.end,
    );
    if (index >= 0) counts[index]! += 1;
  }

  return counts;
}

/**
 * A series earns its slot only if it has something to show.
 *
 * A flat run of zeroes is not a chart, it is an empty axis pretending to be
 * one. A flat run of a *non-zero* value is kept: "500 motors, unchanged for
 * eight weeks" is a real answer, and the line draws mid-height to say so.
 */
export function workspaceSeriesIsUseful(points: number[]): boolean {
  return points.length > 0 && points.some((value) => value > 0);
}

export function buildWorkspaceSeries(
  sources: WorkspaceSeriesSources,
  now = new Date(),
): WorkspaceSeriesMap {
  const windows = recentWeekWindows(now, WORKSPACE_SERIES_WEEKS);
  const map: WorkspaceSeriesMap = {};

  const put = (
    id: string,
    shape: WorkspaceSeriesShape,
    caption: string,
    points: number[],
  ): void => {
    if (!workspaceSeriesIsUseful(points)) return;
    map[id] = { shape, points, caption };
  };

  const { orders, items, motors, intakeJobs, payroll } = sources;

  if (orders) {
    put(
      'orders',
      'level',
      'Open orders at the end of each of the last 8 weeks',
      windows.map((window) => openWorkCountAt(orders, window.end)),
    );
  }

  if (motors) {
    put(
      'engines',
      'level',
      'Serialized motors on record, week by week for the last 8 weeks',
      levelSeries(motors, windows),
    );
  }

  if (items) {
    const active = items.filter((item) => item.status === 'active');
    put(
      'parts',
      'level',
      'Inventory items on record, week by week for the last 8 weeks',
      levelSeries(active, windows),
    );
    // Receiving is the arrival of stock, so its shape is the arrival rate —
    // not the placement backlog, which has no history to read.
    put(
      'receiving',
      'flow',
      'Stock received each week for the last 8 weeks',
      flowSeries(active, windows),
    );
  }

  if (intakeJobs) {
    // Mechanics have no motors catalog — Incoming flow is the Engines spark.
    if (!motors) {
      put(
        'engines',
        'flow',
        'Engines booked into receive each week for the last 8 weeks',
        flowSeries(intakeJobs, windows),
      );
    }
  }

  if (payroll) {
    put(
      'earnings',
      'flow',
      'Your payouts recorded each week for the last 8 weeks',
      flowSeries(payroll, windows),
    );
  }

  return map;
}
