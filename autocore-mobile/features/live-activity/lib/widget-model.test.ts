import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_INTAKE_BAY_COUNTS,
  EMPTY_TODAY_COUNTS,
  EMPTY_WAREHOUSE_WIDGET_COUNTS,
  EMPTY_WORK_WIDGET_COUNTS,
  UNKNOWN_COUNT,
  buildIntakeBayWidgetProps,
  buildSyncWidgetProps,
  buildTodayWidgetProps,
  buildWarehouseWidgetProps,
  buildWorkWidgetProps,
  countIntakeAwaitingFromJobs,
  countIntakeBayFromJobs,
  widgetSnapshotKey,
  type TodayWidgetCounts,
} from './widget-model';

const AT = Date.parse('2026-08-13T09:00:00.000Z');

function counts(partial: Partial<TodayWidgetCounts> = {}): TodayWidgetCounts {
  return {
    openOrders: 0,
    attentionOrders: 0,
    engines: 0,
    awaitingPlacement: 0,
    lowStock: 0,
    earningsPending: 0,
    earningsClaimable: 0,
    intakeAwaiting: 0,
    ...partial,
  };
}

describe('buildTodayWidgetProps', () => {
  it('shows an em dash rather than inventing a zero before anything has loaded', () => {
    const props = buildTodayWidgetProps(EMPTY_TODAY_COUNTS, AT);
    assert.equal(props.headline, '—');
    assert.equal(props.urgent, false);
    assert.doesNotMatch(props.title, /\b0\b/);
  });

  it('leads with stock nobody can find — it is the least recoverable', () => {
    const props = buildTodayWidgetProps(
      counts({ awaitingPlacement: 4, attentionOrders: 9, lowStock: 7, openOrders: 12 }),
      AT,
    );
    assert.equal(props.headline, '4');
    assert.match(props.title, /4 items to place/);
    assert.equal(props.symbol, 'shippingbox.fill');
    assert.equal(props.urgent, true);
    assert.match(props.link, /scan$/);
  });

  it('falls to orders waiting on parts next', () => {
    const props = buildTodayWidgetProps(
      counts({ awaitingPlacement: 0, attentionOrders: 2, lowStock: 7, openOrders: 12 }),
      AT,
    );
    assert.match(props.title, /2 orders waiting on parts/);
    assert.match(props.detail, /12 open in total/);
    assert.equal(props.urgent, true);
    assert.match(props.link, /orders$/);
  });

  it('then low stock, pay, intake, then plain open work', () => {
    const low = buildTodayWidgetProps(counts({ lowStock: 3, openOrders: 12 }), AT);
    assert.match(low.title, /3 parts low on stock/);
    assert.match(low.link, /warehouse$/);

    const pay = buildTodayWidgetProps(
      counts({ openOrders: 12, earningsPending: 2, earningsClaimable: 1, intakeAwaiting: 5 }),
      AT,
    );
    assert.match(pay.title, /2 payouts waiting/);
    assert.match(pay.link, /earnings$/);

    const claim = buildTodayWidgetProps(
      counts({ openOrders: 12, earningsClaimable: 3, intakeAwaiting: 5 }),
      AT,
    );
    assert.match(claim.title, /3 jobs to claim/);

    const intake = buildTodayWidgetProps(counts({ openOrders: 12, intakeAwaiting: 5 }), AT);
    assert.match(intake.title, /5 engines awaiting intake/);
    assert.match(intake.link, /intake$/);

    const open = buildTodayWidgetProps(counts({ openOrders: 12, engines: 248 }), AT);
    assert.match(open.title, /12 open orders/);
    assert.match(open.detail, /248 engines in stock/);
    assert.equal(open.urgent, false);
    assert.match(open.link, /orders$/);
  });

  it('says the floor is clear instead of showing a bare zero', () => {
    const props = buildTodayWidgetProps(counts({ engines: 248 }), AT);
    assert.equal(props.headline, '0');
    assert.equal(props.title, 'No open orders');
    assert.equal(props.symbol, 'checkmark.circle.fill');
    assert.match(props.link, /work$/);
  });

  it('reads naturally in the singular', () => {
    assert.match(buildTodayWidgetProps(counts({ awaitingPlacement: 1 }), AT).title, /1 item to place/);
    assert.match(buildTodayWidgetProps(counts({ openOrders: 1 }), AT).title, /1 open order$/);
  });

  it('does not treat an unloaded count as an all-clear', () => {
    const props = buildTodayWidgetProps(
      counts({ openOrders: UNKNOWN_COUNT, awaitingPlacement: UNKNOWN_COUNT, attentionOrders: UNKNOWN_COUNT, lowStock: UNKNOWN_COUNT }),
      AT,
    );
    assert.equal(props.headline, '—');
    assert.notEqual(props.title, 'No open orders');
  });

  it('carries the raw counts through for the multi-stat medium widget', () => {
    const props = buildTodayWidgetProps(counts({ openOrders: 12, engines: 248, awaitingPlacement: 4 }), AT);
    assert.equal(props.openOrders, 12);
    assert.equal(props.engines, 248);
    assert.equal(props.awaitingPlacement, 4);
    assert.equal(props.updatedAtMs, AT);
  });
});

describe('buildSyncWidgetProps', () => {
  const base = {
    status: 'SYNCING' as const,
    headline: 'Syncing 8 of 18',
    detail: '10 photos left.',
    progressLabel: '8/18',
    progress: 8 / 18,
    pending: 10,
    blocked: 0,
    total: 18,
  };

  it('mirrors an in-flight wave', () => {
    const props = buildSyncWidgetProps(base, AT);
    assert.equal(props.short, '8/18');
    assert.equal(props.caption, 'photos');
    assert.equal(props.determinate, true);
    assert.equal(props.symbol, 'icloud.and.arrow.up.fill');
  });

  it('drops the countdown from the title — WidgetKit may draw this minutes later', () => {
    const props = buildSyncWidgetProps(
      { ...base, status: 'RETRYING', headline: 'Retrying in 30s', total: 0 },
      AT,
    );
    assert.equal(props.title, 'Waiting to retry');
    assert.doesNotMatch(props.title, /\d/);
  });

  it('shows the blocked count alone when a person is needed', () => {
    const props = buildSyncWidgetProps(
      { ...base, status: 'ACTION_REQUIRED', headline: 'Action required', pending: 0, blocked: 3 },
      AT,
    );
    assert.equal(props.short, '3');
    assert.equal(props.caption, 'blocked');
    assert.equal(props.determinate, false);
  });

  it('reads as settled when the queue is empty', () => {
    const props = buildSyncWidgetProps(
      { ...base, status: 'SYNCED', headline: 'Synced', detail: null, pending: 0, blocked: 0, total: 0 },
      AT,
    );
    assert.equal(props.short, 'All set');
    assert.equal(props.progress, 1);
    assert.equal(props.detail, '');
  });

  it('never shows a spinner-style bar for a parked offline queue', () => {
    const props = buildSyncWidgetProps({ ...base, status: 'WAITING_FOR_NETWORK' }, AT);
    assert.equal(props.determinate, false);
    assert.equal(props.symbol, 'wifi.slash');
  });
});

describe('widgetSnapshotKey', () => {
  it('ignores the clock, so an unchanged snapshot never burns a WidgetKit reload', () => {
    const a = buildTodayWidgetProps(counts({ openOrders: 3 }), AT);
    const b = buildTodayWidgetProps(counts({ openOrders: 3 }), AT + 600_000);
    assert.equal(widgetSnapshotKey(a), widgetSnapshotKey(b));
  });

  it('changes when the data changes', () => {
    const a = buildTodayWidgetProps(counts({ openOrders: 3 }), AT);
    const b = buildTodayWidgetProps(counts({ openOrders: 4 }), AT);
    assert.notEqual(widgetSnapshotKey(a), widgetSnapshotKey(b));
  });

  it('does not depend on key order', () => {
    assert.equal(
      widgetSnapshotKey({ a: 1, b: 2, updatedAtMs: 1 }),
      widgetSnapshotKey({ b: 2, a: 1, updatedAtMs: 2 }),
    );
  });
});

describe('countIntakeBayFromJobs', () => {
  it('splits Ready from documenting and ignores released engines', () => {
    const counts = countIntakeBayFromJobs([
      { state: 'in_session' },
      { state: 'paused' },
      { state: 'awaiting_verification' },
      { state: 'quarantine' },
      { state: 'verified' },
    ]);
    assert.equal(counts.active, 2);
    assert.equal(counts.ready, 2);
  });
});

describe('countIntakeAwaitingFromJobs', () => {
  it('counts only engines waiting to be picked up, not in-session work', () => {
    assert.equal(
      countIntakeAwaitingFromJobs([
        { state: 'open' },
        { state: 'rework' },
        { state: 'in_session' },
        { state: 'paused' },
        { state: 'awaiting_verification' },
      ]),
      2,
    );
  });
});

describe('buildIntakeBayWidgetProps', () => {
  it('leads with Ready so Finish lands on the Lock Screen immediately', () => {
    const props = buildIntakeBayWidgetProps(
      { active: 1, ready: 3, syncing: 2 },
      AT,
    );
    assert.equal(props.headline, '3');
    assert.match(props.title, /ready for review/);
    assert.match(props.link, /filter=ready/);
    assert.equal(props.urgent, true);
    assert.equal(props.symbol, 'checkmark.seal.fill');
  });

  it('falls to syncing photos when nothing is waiting for review', () => {
    const props = buildIntakeBayWidgetProps(
      { active: 2, ready: 0, syncing: 4 },
      AT,
    );
    assert.equal(props.headline, '4');
    assert.match(props.title, /photos syncing/);
  });

  it('then documenting, then a clear bay', () => {
    const active = buildIntakeBayWidgetProps({ active: 2, ready: 0, syncing: 0 }, AT);
    assert.match(active.title, /documenting/);
    assert.match(active.link, /filter=active/);

    const clear = buildIntakeBayWidgetProps({ active: 0, ready: 0, syncing: 0 }, AT);
    assert.equal(clear.headline, '0');
    assert.equal(clear.title, 'Bay is clear');
  });

  it('shows an em dash before the bay has loaded', () => {
    const props = buildIntakeBayWidgetProps(EMPTY_INTAKE_BAY_COUNTS, AT);
    assert.equal(props.headline, '—');
    assert.doesNotMatch(props.title, /\b0\b/);
  });
});

describe('buildWorkWidgetProps', () => {
  it('leads with orders waiting on parts', () => {
    const props = buildWorkWidgetProps({ openOrders: 12, attentionOrders: 3 }, AT);
    assert.equal(props.headline, '3');
    assert.match(props.title, /3 orders waiting on parts/);
    assert.match(props.link, /orders$/);
    assert.equal(props.urgent, true);
  });

  it('falls to open work, then a clear board', () => {
    const open = buildWorkWidgetProps({ openOrders: 4, attentionOrders: 0 }, AT);
    assert.match(open.title, /4 open orders/);
    assert.equal(open.urgent, false);

    const clear = buildWorkWidgetProps({ openOrders: 0, attentionOrders: 0 }, AT);
    assert.equal(clear.headline, '0');
    assert.equal(clear.title, 'No open orders');
  });

  it('shows an em dash before orders have loaded', () => {
    const props = buildWorkWidgetProps(EMPTY_WORK_WIDGET_COUNTS, AT);
    assert.equal(props.headline, '—');
    assert.doesNotMatch(props.title, /\b0\b/);
  });
});

describe('buildWarehouseWidgetProps', () => {
  it('leads with stock to place and deep-links into scan', () => {
    const props = buildWarehouseWidgetProps(
      { awaitingPlacement: 4, lowStock: 7, engines: 248 },
      AT,
    );
    assert.equal(props.headline, '4');
    assert.match(props.title, /4 items to place/);
    assert.match(props.link, /scan$/);
    assert.equal(props.actionTarget, 'openScan');
    assert.equal(props.urgent, true);
  });

  it('falls to low stock, then a placed warehouse', () => {
    const low = buildWarehouseWidgetProps(
      { awaitingPlacement: 0, lowStock: 2, engines: 248 },
      AT,
    );
    assert.match(low.title, /2 parts low on stock/);
    assert.match(low.link, /warehouse$/);
    assert.equal(low.actionTarget, 'openWarehouse');

    const clear = buildWarehouseWidgetProps(
      { awaitingPlacement: 0, lowStock: 0, engines: 248 },
      AT,
    );
    assert.equal(clear.headline, '0');
    assert.equal(clear.title, 'Stock is placed');
    assert.match(clear.detail, /248 engines/);
  });

  it('shows an em dash before warehouse counts have loaded', () => {
    const props = buildWarehouseWidgetProps(EMPTY_WAREHOUSE_WIDGET_COUNTS, AT);
    assert.equal(props.headline, '—');
    assert.doesNotMatch(props.title, /\b0\b/);
  });
});
