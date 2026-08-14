import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WIDGET_URL,
  parseIntakeBayFilter,
  parseWidgetDeepLink,
} from './widget-links';

describe('parseIntakeBayFilter', () => {
  it('accepts the three bay tabs', () => {
    assert.equal(parseIntakeBayFilter('ready'), 'ready');
    assert.equal(parseIntakeBayFilter('active'), 'active');
    assert.equal(parseIntakeBayFilter('all'), 'all');
  });

  it('rejects anything else', () => {
    assert.equal(parseIntakeBayFilter('review'), null);
    assert.equal(parseIntakeBayFilter(''), null);
    assert.equal(parseIntakeBayFilter(undefined), null);
  });
});

describe('parseWidgetDeepLink', () => {
  it('opens Work', () => {
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.work), { dest: 'work' });
  });

  it('opens shop hubs from the dedicated widgets', () => {
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.orders), { dest: 'orders' });
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.warehouse), { dest: 'warehouse' });
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.scan), { dest: 'scan' });
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.earnings), { dest: 'earnings' });
  });

  it('opens Intake, including the Ready filter Finish uses', () => {
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.intake), {
      dest: 'intake',
      filter: null,
    });
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.intakeReady), {
      dest: 'intake',
      filter: 'ready',
    });
    assert.deepEqual(parseWidgetDeepLink(WIDGET_URL.intakeActive), {
      dest: 'intake',
      filter: 'active',
    });
  });

  it('ignores notification paths', () => {
    assert.equal(parseWidgetDeepLink('autocoremobile://orders/wo_1'), null);
    assert.equal(parseWidgetDeepLink('https://app.myautocore.com/intake'), null);
  });
});
