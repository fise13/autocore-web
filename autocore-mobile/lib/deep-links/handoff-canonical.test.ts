import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchCanonicalPath, parseCanonicalUrl } from './canonical-deep-links';
import {
  expoPathToCanonicalHttps,
  expoPathToCanonicalPath,
  normalizeExpoPathname,
} from './handoff-canonical';

describe('normalizeExpoPathname', () => {
  it('strips Expo groups and trailing slashes', () => {
    assert.equal(normalizeExpoPathname('/(tabs)/accounting'), '/accounting');
    assert.equal(normalizeExpoPathname('/(tabs)/profile/team'), '/profile/team');
    assert.equal(normalizeExpoPathname('/(tabs)'), '/');
    assert.equal(normalizeExpoPathname('/orders/wo_1/'), '/orders/wo_1');
  });
});

describe('expoPathToCanonicalPath', () => {
  it('maps workspace screens onto claimed Universal Link paths', () => {
    const expected: Array<[string, Record<string, string>, string]> = [
      ['/', {}, '/'],
      ['/(tabs)', {}, '/'],
      ['/orders', {}, '/work-orders'],
      ['/orders/wo_123', {}, '/work-orders/wo_123'],
      ['/orders/wo_123', { tab: 'parts' }, '/work-orders/wo_123?tab=parts'],
      ['/warehouse', {}, '/warehouse'],
      ['/objects/engines', {}, '/motors'],
      ['/objects/engines', { filter: 'incoming' }, '/engine-intake?filter=incoming'],
      ['/objects/new', {}, '/engine-intake?new=1'],
      ['/intake', {}, '/engine-intake'],
      ['/(tabs)/accounting', {}, '/accounting'],
      ['/earnings', {}, '/my-earnings'],
      ['/(tabs)/profile/team', {}, '/team'],
      ['/(tabs)/profile', {}, '/settings'],
      ['/(tabs)/ai', {}, '/ai'],
      ['/import', {}, '/import'],
      ['/import', { batchId: 'b1' }, '/imports/batch/b1'],
      ['/invite/tok_1', {}, '/invite/tok_1'],
      ['/join', { token: 'inv' }, '/join?token=inv'],
    ];

    for (const [expo, params, canonical] of expected) {
      assert.equal(expoPathToCanonicalPath(expo, params), canonical, expo);
    }
  });

  it('does not advertise screens with no claimed web URL', () => {
    for (const path of [
      '/login',
      '/forgot-password',
      '/journey/company',
      '/paywall',
      '/objects/engine/eng_1',
      '/warehouse/location/loc_1',
      '/scan',
      '/inbox',
      '/search',
    ]) {
      assert.equal(expoPathToCanonicalPath(path), null, path);
    }
  });

  it('strips credential-shaped query values', () => {
    assert.equal(
      expoPathToCanonicalPath('/orders/wo_1', { token: 'secret', tab: 'parts' }),
      '/work-orders/wo_1?tab=parts',
    );
  });
});

describe('Handoff URLs are Universal Links the iOS app can open', () => {
  it('every published path still resolves to a mobile screen', () => {
    const published = [
      '/',
      '/work-orders',
      '/work-orders/wo_123',
      '/warehouse',
      '/motors',
      '/engine-intake',
      '/accounting',
      '/my-earnings',
      '/team',
      '/settings',
      '/ai',
      '/import',
      '/imports/batch/b1',
      '/invite/tok',
      '/join',
    ];

    for (const path of published) {
      const parsed = parseCanonicalUrl(path);
      assert.ok(parsed, path);
      assert.ok(matchCanonicalPath(parsed.path, parsed.query), `no screen for ${path}`);
    }
  });

  it('builds https URLs on the app host', () => {
    assert.equal(
      expoPathToCanonicalHttps('/orders/wo_123'),
      'https://app.myautocore.com/work-orders/wo_123',
    );
  });
});
