import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_TODAY_COUNTS,
  UNKNOWN_COUNT,
  buildSyncWidgetProps,
  buildTodayWidgetProps,
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
  });

  it('falls to orders waiting on parts next', () => {
    const props = buildTodayWidgetProps(
      counts({ awaitingPlacement: 0, attentionOrders: 2, lowStock: 7, openOrders: 12 }),
      AT,
    );
    assert.match(props.title, /2 orders waiting on parts/);
    assert.match(props.detail, /12 open in total/);
    assert.equal(props.urgent, true);
  });

  it('then low stock, then plain open work', () => {
    const low = buildTodayWidgetProps(counts({ lowStock: 3, openOrders: 12 }), AT);
    assert.match(low.title, /3 parts low on stock/);

    const open = buildTodayWidgetProps(counts({ openOrders: 12, engines: 248 }), AT);
    assert.match(open.title, /12 open orders/);
    assert.match(open.detail, /248 engines in stock/);
    assert.equal(open.urgent, false);
  });

  it('says the floor is clear instead of showing a bare zero', () => {
    const props = buildTodayWidgetProps(counts({ engines: 248 }), AT);
    assert.equal(props.headline, '0');
    assert.equal(props.title, 'No open orders');
    assert.equal(props.symbol, 'checkmark.circle.fill');
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
