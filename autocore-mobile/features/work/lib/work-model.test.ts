import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { WorkNode, WorkspaceDomainId } from '@/lib/shell/types';

import {
  EMPTY_WORK_COUNTS,
  buildWorkModel,
  groupThousands,
  isAwaitingPlacement,
  resolveWorkRowDetail,
  type WorkCounts,
} from './work-model';

function node(id: string, domain: WorkspaceDomainId, subtitle: string): WorkNode {
  return {
    id,
    domain,
    title: id,
    subtitle,
    href: `/${id}`,
    sf: 'circle',
    modules: [],
  };
}

const ORDERS = node('orders', 'sales', 'Work orders');
const EARNINGS = node('earnings', 'sales', 'Shift and payouts');
const ENGINES = node('engines', 'inventory', 'Receive, photograph, catalog');
const PARTS = node('parts', 'inventory', 'Inventory items');
const RECEIVING = node('receiving', 'warehouse', 'Scan and place stock');
const LOCATIONS = node('locations', 'warehouse', 'Bins and racks');
const DOCUMENTS = node('documents', 'operations', 'Capture and extract');

function counts(partial: Partial<WorkCounts>): WorkCounts {
  return { ...EMPTY_WORK_COUNTS, ...partial };
}

describe('groupThousands', () => {
  it('groups without depending on the runtime locale', () => {
    assert.equal(groupThousands(0), '0');
    assert.equal(groupThousands(248), '248');
    assert.equal(groupThousands(1284), '1,284');
    assert.equal(groupThousands(1284000), '1,284,000');
  });

  it('never renders a negative count', () => {
    assert.equal(groupThousands(-5), '0');
  });
});

describe('isAwaitingPlacement', () => {
  it('treats a real shelf as placed', () => {
    assert.equal(isAwaitingPlacement({ primaryLocationCode: 'A-03-2' }), false);
    assert.equal(isAwaitingPlacement({ primaryLocationId: 'loc_1' }), false);
  });

  it('treats the UNLOCATED system leaf as unplaced', () => {
    assert.equal(
      isAwaitingPlacement({ primaryLocationCode: 'UNLOCATED', primaryLocationId: 'loc_sys' }),
      true,
    );
    assert.equal(isAwaitingPlacement({ primaryLocationCode: ' unlocated ' }), true);
  });

  it('treats stock with no location at all as unplaced', () => {
    assert.equal(isAwaitingPlacement({}), true);
    assert.equal(isAwaitingPlacement({ primaryLocationCode: '  ', primaryLocationId: ' ' }), true);
  });
});

describe('resolveWorkRowDetail', () => {
  it('falls back to the catalog description while counts are unknown', () => {
    const resolved = resolveWorkRowDetail(ENGINES, EMPTY_WORK_COUNTS);
    assert.equal(resolved.detail, 'Receive, photograph, catalog');
    assert.equal(resolved.detailKind, 'fallback');
  });

  it('states live inventory instead of the description', () => {
    assert.equal(
      resolveWorkRowDetail(ENGINES, counts({ engines: { total: 248, incoming: 0, awaiting: 0 } })).detail,
      '248 in yard',
    );
    assert.equal(
      resolveWorkRowDetail(PARTS, counts({ parts: { total: 1284, lowStock: 0 } })).detail,
      '1,284 items',
    );
  });

  it('never renders a zero count as state', () => {
    const orders = resolveWorkRowDetail(
      ORDERS,
      counts({ orders: { open: 0, attention: 0, total: 9 } }),
    );
    assert.equal(orders.detail, 'No open orders');
    assert.equal(orders.detailKind, 'clear');
  });

  it('turns an unused module into an onboarding point', () => {
    const orders = resolveWorkRowDetail(
      ORDERS,
      counts({ orders: { open: 0, attention: 0, total: 0 } }),
    );
    assert.equal(orders.detail, 'Create your first work order');
    assert.equal(orders.detailKind, 'onboarding');

    assert.equal(
      resolveWorkRowDetail(LOCATIONS, counts({ locations: { locations: 0, bins: 0 } })).detail,
      'Create your first location',
    );
  });

  it('surfaces orders that need a person', () => {
    const orders = resolveWorkRowDetail(
      ORDERS,
      counts({ orders: { open: 12, attention: 3, total: 40 } }),
    );
    assert.equal(orders.detail, '12 open · 3 requiring attention');
    assert.equal(orders.attention, 3);
  });

  it('surfaces payouts and claimable jobs as live earnings state', () => {
    const live = resolveWorkRowDetail(
      EARNINGS,
      counts({ earnings: { pendingCount: 2, claimable: 3, myOpen: 1, payoutTotal: 8 } }),
    );
    assert.equal(live.detail, '2 waiting to be paid · 3 to claim');
    assert.equal(live.attention, 5);
    assert.equal(live.todayLabel, '2 payouts waiting · 3 to claim');

    const board = resolveWorkRowDetail(
      EARNINGS,
      counts({ earnings: { pendingCount: 0, claimable: 0, myOpen: 2, payoutTotal: 4 } }),
    );
    assert.equal(board.detail, '2 open on your board');
    assert.equal(board.attention, 0);

    const clear = resolveWorkRowDetail(
      EARNINGS,
      counts({ earnings: { pendingCount: 0, claimable: 0, myOpen: 0, payoutTotal: 4 } }),
    );
    assert.equal(clear.detail, 'Caught up');
    assert.equal(clear.detailKind, 'clear');
  });

  it('folds incoming work into the Engines row', () => {
    assert.equal(
      resolveWorkRowDetail(
        ENGINES,
        counts({ engines: { total: 12, incoming: 3, awaiting: 4 } }),
      ).detail,
      '3 incoming · 12 in yard',
    );
    assert.equal(
      resolveWorkRowDetail(
        ENGINES,
        counts({ engines: { total: 0, incoming: 2, awaiting: 0 } }),
      ).detail,
      '2 incoming',
    );
    assert.equal(
      resolveWorkRowDetail(
        ENGINES,
        counts({ engines: { total: 0, incoming: 0, awaiting: 0 } }),
      ).detail,
      'Receive your first engine',
    );
  });

  it('counts unplaced stock as receiving work', () => {
    const receiving = resolveWorkRowDetail(
      RECEIVING,
      counts({ receiving: { awaitingPlacement: 8, total: 120 } }),
    );
    assert.equal(receiving.detail, '8 items awaiting placement');
    assert.equal(receiving.attention, 8);

    assert.equal(
      resolveWorkRowDetail(RECEIVING, counts({ receiving: { awaitingPlacement: 0, total: 120 } }))
        .detail,
      'All stock is placed',
    );
  });

  it('renders locations and bins together, and locations alone when there are no bins', () => {
    assert.equal(
      resolveWorkRowDetail(LOCATIONS, counts({ locations: { locations: 24, bins: 186 } })).detail,
      '24 locations · 186 bins',
    );
    assert.equal(
      resolveWorkRowDetail(LOCATIONS, counts({ locations: { locations: 24, bins: 0 } })).detail,
      '24 locations',
    );
  });

  it('singularizes every live count', () => {
    assert.equal(
      resolveWorkRowDetail(ENGINES, counts({ engines: { total: 1, incoming: 0, awaiting: 0 } })).detail,
      '1 in yard',
    );
    assert.equal(
      resolveWorkRowDetail(PARTS, counts({ parts: { total: 1, lowStock: 0 } })).detail,
      '1 item',
    );
    assert.equal(
      resolveWorkRowDetail(RECEIVING, counts({ receiving: { awaitingPlacement: 1, total: 4 } }))
        .detail,
      '1 item awaiting placement',
    );
    assert.equal(
      resolveWorkRowDetail(LOCATIONS, counts({ locations: { locations: 1, bins: 1 } })).detail,
      '1 location · 1 bin',
    );
  });

  it('keeps the description for rows that have no live state', () => {
    const documents = resolveWorkRowDetail(DOCUMENTS, EMPTY_WORK_COUNTS);
    assert.equal(documents.detail, 'Capture and extract');
    assert.equal(documents.detailKind, 'fallback');
  });
});

describe('buildWorkModel', () => {
  const grouped = [
    { domain: 'inventory' as const, title: 'Inventory', nodes: [ENGINES, PARTS] },
    { domain: 'warehouse' as const, title: 'Warehouse', nodes: [RECEIVING, LOCATIONS] },
    { domain: 'sales' as const, title: 'Sales', nodes: [ORDERS, EARNINGS] },
    { domain: 'operations' as const, title: 'Tools', nodes: [DOCUMENTS] },
  ];

  it('keeps the section order it was given', () => {
    const model = buildWorkModel(grouped, EMPTY_WORK_COUNTS);
    assert.deepEqual(
      model.sections.map((section) => section.id),
      ['inventory', 'warehouse', 'sales', 'operations'],
    );
  });

  it('summarizes attention across sections, biggest queue first', () => {
    const model = buildWorkModel(
      grouped,
      counts({
        orders: { open: 12, attention: 2, total: 40 },
        engines: { total: 12, incoming: 3, awaiting: 1 },
      }),
    );

    assert.equal(model.today.count, 3);
    assert.equal(model.today.title, 'Open work');
    assert.equal(model.today.breakdown, '2 orders · 1 incoming');
    assert.equal(model.today.href, '/orders');
    assert.equal(model.today.segments.length, 2);
    assert.equal(model.today.segments[0]?.id, 'orders');
    assert.equal(model.today.segments[0]?.count, 2);
    assert.equal(model.today.trend.points.length, 18);
    assert.equal(model.today.trend.shortWeeks, 8);
    assert.equal(model.today.trend.longWeeks, 18);
  });

  it('caps the breakdown so Work does not become a second Home', () => {
    const model = buildWorkModel(
      grouped,
      counts({
        orders: { open: 20, attention: 9, total: 40 },
        engines: { total: 0, incoming: 9, awaiting: 7 },
        receiving: { awaitingPlacement: 5, total: 90 },
        parts: { total: 300, lowStock: 3 },
      }),
    );

    assert.equal(model.today.count, 24);
    assert.equal(model.today.breakdown, '9 orders · 7 incoming · 5 to place');
  });

  it('says nothing is waiting rather than showing a zero', () => {
    const model = buildWorkModel(
      grouped,
      counts({ orders: { open: 4, attention: 0, total: 40 } }),
    );
    assert.equal(model.today.count, 0);
    assert.equal(model.today.title, 'Open work');
    assert.equal(model.today.breakdown, null);
    assert.equal(model.today.href, null);
    assert.deepEqual(model.today.segments, []);
    assert.match(model.today.trend.insight, /open work/i);
  });

  it('keeps Open work as the Health metric title for a single attention item', () => {
    const model = buildWorkModel(
      grouped,
      counts({ orders: { open: 4, attention: 1, total: 40 } }),
    );
    assert.equal(model.today.count, 1);
    assert.equal(model.today.title, 'Open work');
  });

  it('puts earnings in Today only when payouts or claims are waiting', () => {
    const waiting = buildWorkModel(
      grouped,
      counts({
        earnings: { pendingCount: 2, claimable: 1, myOpen: 4, payoutTotal: 6 },
      }),
    );
    assert.equal(waiting.today.count, 3);
    assert.equal(waiting.today.breakdown, '2 payouts waiting · 1 to claim');
    assert.equal(waiting.today.href, '/earnings');

    const boardOnly = buildWorkModel(
      grouped,
      counts({
        earnings: { pendingCount: 0, claimable: 0, myOpen: 4, payoutTotal: 6 },
      }),
    );
    assert.equal(boardOnly.today.count, 0);
    assert.equal(boardOnly.today.href, null);
  });

  it('reports bootstrapping only while every row is still on its fallback', () => {
    assert.equal(buildWorkModel(grouped, EMPTY_WORK_COUNTS).isBootstrapping, true);
    assert.equal(
      buildWorkModel(grouped, counts({ engines: { total: 3, incoming: 0, awaiting: 0 } })).isBootstrapping,
      false,
    );
    assert.equal(buildWorkModel([], EMPTY_WORK_COUNTS).isBootstrapping, false);
  });
});
