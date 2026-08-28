import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEEP_LINK_HOME,
  deepLinkTargetToPath,
  isCanonicalWebUrl,
  matchCanonicalPath,
  parseCanonicalUrl,
  resolveCanonicalDeepLink,
  stripSensitiveQuery,
} from './canonical-deep-links';

const APP = 'https://app.myautocore.com';
const MARKETING = 'https://myautocore.com';

function pathFor(url: string): string | null {
  const link = resolveCanonicalDeepLink(url);
  return link ? deepLinkTargetToPath(link) : null;
}

describe('parseCanonicalUrl', () => {
  it('accepts both public origins and the www variant', () => {
    assert.deepEqual(parseCanonicalUrl(`${APP}/warehouse`), { path: '/warehouse', query: {} });
    assert.deepEqual(parseCanonicalUrl(`${MARKETING}/warehouse`), { path: '/warehouse', query: {} });
    assert.deepEqual(parseCanonicalUrl('https://www.myautocore.com/warehouse'), {
      path: '/warehouse',
      query: {},
    });
  });

  it('ignores URLs belonging to other apps', () => {
    assert.equal(parseCanonicalUrl('https://accounts.google.com/o/oauth2/callback'), null);
    assert.equal(parseCanonicalUrl('exp://192.168.0.2:8081/--/orders/1'), null);
    assert.equal(parseCanonicalUrl('com.googleusercontent.apps.123://oauth'), null);
    assert.equal(parseCanonicalUrl(''), null);
  });

  it('normalizes trailing slashes, duplicate slashes and fragments', () => {
    assert.equal(parseCanonicalUrl(`${APP}/work-orders/`)?.path, '/work-orders');
    assert.equal(parseCanonicalUrl('/work-orders//123/')?.path, '/work-orders/123');
    assert.deepEqual(parseCanonicalUrl('/work-orders/123?tab=parts#top'), {
      path: '/work-orders/123',
      query: { tab: 'parts' },
    });
  });
});

describe('matchCanonicalPath', () => {
  it('maps every claimed canonical path to a real Expo Router route', () => {
    const expected: Record<string, string> = {
      '/': '/(tabs)',
      '/work-orders': '/orders',
      '/work-orders/wo_123': '/orders/wo_123',
      '/warehouse': '/warehouse',
      '/motors': '/objects/engines',
      '/engine-intake': '/objects/engines?filter=incoming',
      '/accounting': '/(tabs)/accounting',
      '/my-earnings': '/earnings',
      '/team': '/(tabs)/profile/team',
      '/settings': '/(tabs)/profile',
      '/ai': '/(tabs)/ai',
      '/import': '/import',
      '/imports': '/import',
      '/imports/batch/batch_9': '/import?batchId=batch_9',
      '/join': '/join',
      '/invite/tok_1': '/invite/tok_1',
    };

    for (const [canonical, route] of Object.entries(expected)) {
      const parsed = parseCanonicalUrl(canonical);
      assert.ok(parsed, `${canonical} should parse`);
      const target = matchCanonicalPath(parsed.path, parsed.query);
      assert.ok(target, `${canonical} should match`);
      assert.equal(deepLinkTargetToPath(target), route, canonical);
    }
  });

  it('matches route segments case-insensitively but keeps ids verbatim', () => {
    assert.equal(pathFor(`${APP}/Work-Orders/WO_AbC`), '/orders/WO_AbC');
  });

  it('decodes percent-encoded ids', () => {
    assert.equal(pathFor(`${APP}/work-orders/wo%20123`), '/orders/wo%20123');
    assert.equal(
      resolveCanonicalDeepLink(`${APP}/work-orders/wo%20123`)?.params.id,
      'wo 123',
    );
  });

  it('survives malformed percent-encoding instead of throwing', () => {
    assert.equal(resolveCanonicalDeepLink(`${APP}/work-orders/wo%zz`)?.params.id, 'wo%zz');
  });

  it('leaves paths this app has no screen for unmatched', () => {
    for (const path of ['/documents', '/quotes', '/sold', '/roles', '/status', '/changelog']) {
      assert.equal(matchCanonicalPath(path), null, path);
    }
  });
});

describe('query parameters', () => {
  it('forwards unrecognised query params to the screen', () => {
    assert.equal(pathFor(`${APP}/work-orders/123?tab=parts`), '/orders/123?tab=parts');
  });

  it('never carries credentials into route params', () => {
    assert.equal(pathFor(`${APP}/work-orders/123?token=secret&tab=parts`), '/orders/123?tab=parts');
    assert.deepEqual(stripSensitiveQuery({ access_token: 'a', id_token: 'b', view: 'grid' }), {
      view: 'grid',
    });
  });

  it('keeps the invite token, which is an invitation id and not a session', () => {
    assert.equal(pathFor(`${APP}/join?token=inv_1`), '/join?token=inv_1');
    assert.equal(pathFor(`${APP}/invite/inv_2`), '/invite/inv_2');
  });

  it('reads a batch id from either shape', () => {
    assert.equal(pathFor(`${APP}/imports/batch/b1`), '/import?batchId=b1');
    assert.equal(pathFor(`${APP}/import?batchId=b2`), '/import?batchId=b2');
  });

  it('does not mistake an import job id for a batch id', () => {
    assert.equal(pathFor(`${APP}/imports/job_7`), '/import');
  });
});

describe('auth requirements', () => {
  it('lets invite and join resolve before a session exists', () => {
    assert.equal(resolveCanonicalDeepLink(`${APP}/invite/tok`)?.requiresAuth, false);
    assert.equal(resolveCanonicalDeepLink(`${APP}/join`)?.requiresAuth, false);
  });

  it('gates every workspace route behind the session', () => {
    for (const path of ['/', '/work-orders/1', '/warehouse', '/accounting', '/settings']) {
      assert.equal(resolveCanonicalDeepLink(`${APP}${path}`)?.requiresAuth, true, path);
    }
  });
});

describe('unclaimed and unknown links', () => {
  it('refuses browser-owned routes so web auth keeps working', () => {
    for (const path of ['/login', '/auth/action', '/demo', '/api/pdf/x', '/render/documents/a/b']) {
      assert.equal(resolveCanonicalDeepLink(`${APP}${path}`), null, path);
    }
  });

  it('refuses marketing pages', () => {
    for (const path of ['/pricing', '/product', '/legal/terms']) {
      assert.equal(resolveCanonicalDeepLink(`${MARKETING}${path}`), null, path);
    }
  });

  it('falls back to Home for an unknown path on our own host', () => {
    assert.deepEqual(resolveCanonicalDeepLink(`${APP}/nope/nope`), DEEP_LINK_HOME);
    assert.equal(pathFor(`${APP}/something-that-does-not-exist`), '/(tabs)');
  });

  it('returns null for links that are not ours at all', () => {
    assert.equal(resolveCanonicalDeepLink('https://example.com/work-orders/1'), null);
    assert.equal(resolveCanonicalDeepLink('not a url'), null);
  });
});

describe('isCanonicalWebUrl', () => {
  it('is true only for HTTPS links on a claimed host', () => {
    assert.equal(isCanonicalWebUrl(`${APP}/warehouse`), true);
    assert.equal(isCanonicalWebUrl(`${MARKETING}/warehouse`), true);
    assert.equal(isCanonicalWebUrl('autocoremobile://work'), false);
    assert.equal(isCanonicalWebUrl('https://example.com/'), false);
  });
});
