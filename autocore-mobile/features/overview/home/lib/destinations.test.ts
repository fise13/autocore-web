import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { homeAttentionDestination, homeMetricDestination } from './destinations';

describe('homeMetricDestination', () => {
  it('opens finance metric detail instead of the accounting tab', () => {
    assert.deepEqual(homeMetricDestination('money.net'), {
      pathname: '/(tabs)/accounting/metric/[id]',
      params: { id: 'net' },
    });
    assert.deepEqual(homeMetricDestination('money.revenue'), {
      pathname: '/(tabs)/accounting/metric/[id]',
      params: { id: 'revenue' },
    });
    assert.deepEqual(homeMetricDestination('cash.balance'), {
      pathname: '/(tabs)/accounting/metric/[id]',
      params: { id: 'cash' },
    });
  });

  it('opens filtered operational screens', () => {
    assert.deepEqual(homeMetricDestination('orders.open'), {
      pathname: '/orders',
      params: { filter: 'open' },
    });
    assert.deepEqual(homeMetricDestination('work.assigned_open'), {
      pathname: '/orders',
      params: { filter: 'open', mine: '1' },
    });
    assert.deepEqual(homeMetricDestination('parts.low_stock'), {
      pathname: '/warehouse',
      params: { lowStock: '1' },
    });
    assert.deepEqual(homeMetricDestination('intake.in_progress'), {
      pathname: '/objects/engines',
      params: { filter: 'incoming' },
    });
    assert.deepEqual(homeMetricDestination('engines.aging'), {
      pathname: '/search',
      params: { filter: 'motors', stale: '1' },
    });
  });
});

describe('homeAttentionDestination', () => {
  it('lands on the same filtered view as the matching metric when possible', () => {
    assert.deepEqual(homeAttentionDestination('orders.waiting_parts'), {
      pathname: '/orders',
      params: { filter: 'waiting' },
    });
    assert.deepEqual(homeAttentionDestination('intake.quarantine'), {
      pathname: '/objects/engines',
      params: { filter: 'incoming' },
    });
  });
});
