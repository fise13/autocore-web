import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LEGAL_URLS } from './legal-urls';

/**
 * These links shipped broken: the paywall pointed at `myautocore.com/terms` and
 * `/privacy`, both of which 404 in production, while the real pages live under
 * `/legal/`. App Store guideline 3.1.2 has App Review open exactly those two
 * links, so the mistake was worth a rejection and was invisible from the code.
 */
describe('legal urls', () => {
  it('uses the /legal/ tree the marketing site actually serves', () => {
    for (const [key, url] of Object.entries(LEGAL_URLS)) {
      assert.ok(
        new URL(url).pathname.startsWith('/legal/'),
        `${key} must point into /legal/, got ${url}`,
      );
    }
  });

  it('exposes the two links a subscription screen has to carry', () => {
    assert.equal(LEGAL_URLS.terms, 'https://myautocore.com/legal/terms');
    assert.equal(LEGAL_URLS.privacy, 'https://myautocore.com/legal/privacy');
  });

  it('keeps every link absolute and https', () => {
    for (const [key, url] of Object.entries(LEGAL_URLS)) {
      assert.equal(new URL(url).protocol, 'https:', `${key} must be https`);
    }
  });
});
