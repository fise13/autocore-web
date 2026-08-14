import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSameStackInboxReturn,
  notificationInboxHref,
  resolveInboxReturnToFromSegments,
  resolveInboxReturnToFromTab,
  resolveNotificationInboxReturnHref,
} from './open-notification-inbox.ts';

describe('resolveInboxReturnToFromTab', () => {
  it('maps Home index and missing tab to overview (not hub)', () => {
    assert.equal(resolveInboxReturnToFromTab(undefined), 'overview');
    assert.equal(resolveInboxReturnToFromTab(''), 'overview');
    assert.equal(resolveInboxReturnToFromTab('index'), 'overview');
  });

  it('maps shell tabs work and finance', () => {
    assert.equal(resolveInboxReturnToFromTab('work'), 'work');
    assert.equal(resolveInboxReturnToFromTab('accounting'), 'accounting');
    assert.equal(resolveInboxReturnToFromTab('finance'), 'accounting');
  });

  it('defaults unknown tabs to overview instead of profile hub', () => {
    assert.equal(resolveInboxReturnToFromTab('something-new'), 'overview');
  });
});

describe('resolveInboxReturnToFromSegments', () => {
  it('treats bare (tabs) as Home overview — Expo omits index', () => {
    assert.equal(resolveInboxReturnToFromSegments(['(tabs)']), 'overview');
  });

  it('resolves Home, Work, and Finance', () => {
    assert.equal(resolveInboxReturnToFromSegments(['(tabs)', 'index']), 'overview');
    assert.equal(resolveInboxReturnToFromSegments(['(tabs)', 'work']), 'work');
    assert.equal(resolveInboxReturnToFromSegments(['(tabs)', 'accounting']), 'accounting');
  });

  it('keeps profile settings as notifications / hub', () => {
    assert.equal(
      resolveInboxReturnToFromSegments(['(tabs)', 'profile', 'notifications']),
      'notifications',
    );
    assert.equal(resolveInboxReturnToFromSegments(['(tabs)', 'profile']), 'hub');
  });

  it('resolves root-stack warehouse, orders, and earnings', () => {
    assert.equal(resolveInboxReturnToFromSegments(['warehouse']), 'warehouse');
    assert.equal(resolveInboxReturnToFromSegments(['orders']), 'orders');
    assert.equal(resolveInboxReturnToFromSegments(['orders', 'wo_1']), 'orders');
    assert.equal(resolveInboxReturnToFromSegments(['earnings']), 'earnings');
  });
});

describe('inbox back targets', () => {
  it('sends overview back to Home, not Profile', () => {
    assert.equal(String(resolveNotificationInboxReturnHref('overview')), '/(tabs)');
    assert.equal(String(resolveNotificationInboxReturnHref(undefined)), '/(tabs)');
  });

  it('opens Activity on the root stack so push/pop can slide', () => {
    assert.deepEqual(notificationInboxHref('overview'), {
      pathname: '/inbox',
      params: { returnTo: 'overview' },
    });
  });

  it('only treats profile-stack keys as same-stack pops', () => {
    assert.equal(isSameStackInboxReturn('hub'), true);
    assert.equal(isSameStackInboxReturn('notifications'), true);
    assert.equal(isSameStackInboxReturn('overview'), false);
    assert.equal(isSameStackInboxReturn('work'), false);
    assert.equal(isSameStackInboxReturn('earnings'), false);
    assert.equal(isSameStackInboxReturn(undefined), false);
  });
});
