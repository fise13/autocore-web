import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { InventoryItem } from '@/types/inventory';
import type { WorkOrder } from '@/types/work-order';

import { recentWeekWindows } from './weeks';
import {
  EMPTY_WORKSPACE_SERIES_SOURCES,
  WORKSPACE_SERIES_WEEKS,
  buildWorkspaceSeries,
  workspaceSeriesIsUseful,
  type WorkspaceSeriesSources,
} from './workspace-series';

/** A Thursday, so the current week is genuinely partial. */
const NOW = new Date('2026-08-20T10:00:00.000Z');
const WINDOWS = recentWeekWindows(NOW, WORKSPACE_SERIES_WEEKS);

/** Midday inside the week `index` counts back from the newest. */
function inWeek(index: number): Date {
  const window = WINDOWS[WINDOWS.length - 1 - index]!;
  return new Date(window.start.getTime() + 36 * 60 * 60 * 1000);
}

function order(partial: Partial<WorkOrder> & { createdAt: Date }): WorkOrder {
  return {
    id: `wo-${partial.createdAt.getTime()}-${partial.status ?? 'open'}`,
    status: 'in_progress',
    updatedAt: partial.createdAt,
    ...partial,
  } as WorkOrder;
}

function item(partial: Partial<InventoryItem>): InventoryItem {
  return {
    id: `it-${Math.trunc(partial.createdAt?.getTime() ?? 0)}`,
    status: 'active',
    totalOnHand: 1,
    totalAvailable: 1,
    ...partial,
  } as InventoryItem;
}

function sources(partial: Partial<WorkspaceSeriesSources>): WorkspaceSeriesSources {
  return { ...EMPTY_WORKSPACE_SERIES_SOURCES, ...partial };
}

describe('workspaceSeriesIsUseful', () => {
  it('rejects an axis with nothing on it', () => {
    assert.equal(workspaceSeriesIsUseful([]), false);
    assert.equal(workspaceSeriesIsUseful([0, 0, 0, 0]), false);
  });

  it('keeps a flat non-zero run — "unchanged" is an answer', () => {
    assert.equal(workspaceSeriesIsUseful([500, 500, 500, 500]), true);
  });
});

describe('a workspace with no history to read', () => {
  it('draws nothing at all rather than a zeroed chart', () => {
    assert.deepEqual(buildWorkspaceSeries(EMPTY_WORKSPACE_SERIES_SOURCES, NOW), {});
  });

  it('never invents a series for locations or document import', () => {
    // Neither has a timestamped source: the locations endpoint returns none,
    // and document import has no listener. They must stay absent.
    const series = buildWorkspaceSeries(
      sources({
        orders: [order({ createdAt: inWeek(2) })],
        items: [item({ createdAt: inWeek(1) })],
        motors: [{ createdAt: inWeek(3) }],
        intakeJobs: [{ createdAt: inWeek(1) }],
        payroll: [{ createdAt: inWeek(0) }],
      }),
      NOW,
    );

    assert.equal(series.locations, undefined);
    assert.equal(series.documents, undefined);
  });

  it('treats a listener that has not answered as unknown, not empty', () => {
    const series = buildWorkspaceSeries(sources({ orders: [] }), NOW);
    // An empty *loaded* list is still nothing to draw…
    assert.equal(series.orders, undefined);
    // …and an unloaded one must not differ by accident.
    assert.equal(buildWorkspaceSeries(sources({ orders: null }), NOW).orders, undefined);
  });
});

describe('levels', () => {
  it('reconstructs open orders at each week end', () => {
    const series = buildWorkspaceSeries(
      sources({
        orders: [
          order({ createdAt: inWeek(7), status: 'in_progress' }),
          order({ createdAt: inWeek(4), status: 'in_progress' }),
          order({
            createdAt: inWeek(6),
            status: 'completed',
            completedAt: inWeek(3),
            updatedAt: inWeek(3),
          }),
        ],
      }),
      NOW,
    );

    assert.equal(series.orders?.shape, 'level');
    // One runs the whole window; a second opens in week 6 and closes during
    // week 3; a third opens in week 4 and never closes. The peak of 3 is the
    // one week all three overlap, which is the point of reconstructing rather
    // than counting what is open today.
    assert.deepEqual(series.orders?.points, [1, 2, 2, 3, 2, 2, 2, 2]);
  });

  it('accumulates a catalog forward, week by week', () => {
    const series = buildWorkspaceSeries(
      sources({ motors: [{ createdAt: inWeek(5) }, { createdAt: inWeek(5) }, { createdAt: inWeek(1) }] }),
      NOW,
    );

    assert.deepEqual(series.engines?.points, [0, 0, 2, 2, 2, 2, 3, 3]);
  });

  it('counts undated records as already there, not as missing', () => {
    // 500 motors with no create time must not draw an empty catalog.
    const series = buildWorkspaceSeries(
      sources({ motors: [{}, {}, { createdAt: inWeek(0) }] }),
      NOW,
    );

    assert.deepEqual(series.engines?.points, [2, 2, 2, 2, 2, 2, 2, 3]);
  });

  it('leaves out anything dated after the newest week', () => {
    const ahead = new Date(NOW.getTime() + 40 * 24 * 60 * 60 * 1000);
    const series = buildWorkspaceSeries(
      sources({ motors: [{ createdAt: inWeek(0) }, { createdAt: ahead }] }),
      NOW,
    );

    assert.equal(series.engines?.points.at(-1), 1);
  });

  it('ignores archived stock when counting the parts catalog', () => {
    const series = buildWorkspaceSeries(
      sources({
        items: [
          item({ createdAt: inWeek(4), status: 'active' }),
          item({ createdAt: inWeek(4), status: 'archived' }),
        ],
      }),
      NOW,
    );

    assert.equal(series.parts?.points.at(-1), 1);
  });
});

describe('flows', () => {
  it('drops each event into the week it happened in', () => {
    const series = buildWorkspaceSeries(
      sources({
        intakeJobs: [
          { createdAt: inWeek(6) },
          { createdAt: inWeek(2) },
          { createdAt: inWeek(2) },
          { createdAt: inWeek(0) },
        ],
      }),
      NOW,
    );

    assert.equal(series.engines?.shape, 'flow');
    assert.deepEqual(series.engines?.points, [0, 1, 0, 0, 0, 2, 0, 1]);
  });

  it('drops undated events instead of guessing a week for them', () => {
    const series = buildWorkspaceSeries(
      sources({ payroll: [{ createdAt: inWeek(3) }, {}, { updatedAt: inWeek(1) }] }),
      NOW,
    );

    assert.equal(
      series.earnings?.points.reduce((sum, value) => sum + value, 0),
      1,
    );
  });

  it('reads Receiving as stock arriving, which is the part that has a history', () => {
    // The row's own number is the placement backlog, and placement is not
    // versioned — so the chart shows arrivals, and says so in its caption.
    const series = buildWorkspaceSeries(
      sources({ items: [item({ createdAt: inWeek(1) }), item({ createdAt: inWeek(1) })] }),
      NOW,
    );

    assert.equal(series.receiving?.shape, 'flow');
    assert.deepEqual(series.receiving?.points, [0, 0, 0, 0, 0, 0, 2, 0]);
    assert.match(series.receiving?.caption ?? '', /received/i);
  });
});

describe('shape of the output', () => {
  it('always spans exactly the advertised window', () => {
    const series = buildWorkspaceSeries(
      sources({ motors: [{ createdAt: inWeek(2) }], payroll: [{ createdAt: inWeek(2) }] }),
      NOW,
    );

    assert.equal(series.engines?.points.length, WORKSPACE_SERIES_WEEKS);
    assert.equal(series.earnings?.points.length, WORKSPACE_SERIES_WEEKS);
  });

  it('gives every series something for VoiceOver to say', () => {
    const series = buildWorkspaceSeries(
      sources({
        orders: [order({ createdAt: inWeek(3) })],
        items: [item({ createdAt: inWeek(3) })],
        motors: [{ createdAt: inWeek(3) }],
        intakeJobs: [{ createdAt: inWeek(3) }],
        payroll: [{ createdAt: inWeek(3) }],
      }),
      NOW,
    );

    for (const entry of Object.values(series)) {
      assert.ok((entry?.caption.length ?? 0) > 0);
    }
  });
});
