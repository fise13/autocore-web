import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Static guard over the paywall's feature list.
 *
 * Read as source text rather than imported: `pro-features.ts` pulls in the icon
 * registry, which pulls in React Native, and none of that loads under
 * `node --test`.
 *
 * The bug this exists for: the paywall advertised "inventory without limits",
 * "complete work orders", "advanced reports" and "API access". The free tier has
 * no cap on the first three and the fourth is not a feature the product has, so
 * every one of them was already free — the purchase screen was selling what
 * "Not now" handed over for nothing. App Store guideline 2.3.1 calls that
 * misleading, and a customer would call it worse.
 *
 * So: a row may only be advertised if something actually refuses the action
 * without Pro. Adding a row here means adding the enforcement first.
 */

const DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(DIR, 'pro-features.ts'), 'utf8');
const PAYWALL_SCREEN = readFileSync(join(DIR, '../paywall-screen.tsx'), 'utf8');
const PAYWALL_INCLUDES = readFileSync(join(DIR, '../components/paywall-includes.tsx'), 'utf8');
const PAYWALL_HERO = readFileSync(join(DIR, '../components/paywall-hero.tsx'), 'utf8');
const MANAGE_SCREEN = readFileSync(join(DIR, '../manage-subscription-screen.tsx'), 'utf8');

/**
 * Gates that are enforced today, each with the code that does the refusing.
 *
 * `priority_support` is the deliberate exception: it is a commitment the team
 * keeps rather than a check in code. It is listed so the allowlist stays a
 * complete account of the paywall, not so the exception can quietly grow.
 */
const ENFORCED = new Set([
  // src/lib/auth/verify-company-manager.server.ts → 402, and the client
  // `FeatureGate` wrapping the Team screen.
  'team_management',
  // src/lib/documents/verify-document-access.ts → 402.
  // src/lib/ai/tools/documents.server.ts refuses the assistant tool.
  'document_export',
  // src/lib/auth/verify-inventory-import-access.server.ts → 402.
  'bulk_import',
  // Not a code gate — see the note above.
  'priority_support',
]);

/** Sold before, enforced nowhere. Named so a regression reads as itself. */
const PREVIOUSLY_OVERSOLD = [
  'unlimited_inventory',
  'unlimited_work_orders',
  'advanced_reports',
  'api_access',
];

function advertisedFeatures(): string[] {
  return [...SOURCE.matchAll(/feature:\s*'([a-z_]+)'/g)].map((match) => match[1]);
}

describe('paywall advertises only what Pro actually gates', () => {
  it('finds the feature rows at all', () => {
    assert.ok(
      advertisedFeatures().length > 0,
      'no `feature:` keys found — this guard would pass vacuously',
    );
  });

  it('never advertises a feature nothing refuses without Pro', () => {
    for (const feature of advertisedFeatures()) {
      assert.ok(
        ENFORCED.has(feature),
        `"${feature}" is on the paywall but nothing enforces it. Add the ` +
          'server-side check first, then add it to ENFORCED here.',
      );
    }
  });

  it('keeps the four previously oversold promises off the paywall', () => {
    const advertised = new Set(advertisedFeatures());
    for (const feature of PREVIOUSLY_OVERSOLD) {
      assert.ok(
        !advertised.has(feature),
        `"${feature}" is free for everyone — selling it again is the ` +
          'original bug, not a copy change.',
      );
    }
  });

  it('every row carries a feature key, so none escapes this check', () => {
    const rowCount = [...SOURCE.matchAll(/^\s{4}id:\s*'/gm)].length;
    assert.equal(
      advertisedFeatures().length,
      rowCount,
      'a row without a `feature` key is a claim with nothing behind it',
    );
  });
});

/**
 * Guideline 3.1.2(c): the purchase screen must describe what the user receives
 * for the price. The list lived in this file and on the Settings screen, and
 * App Review still rejected the binary because the paywall itself only showed
 * a headline and a price.
 */
describe('purchase screen describes what Pro includes (3.1.2(c))', () => {
  it('renders the includes list, not just the catalog of copy', () => {
    assert.match(
      PAYWALL_SCREEN,
      /PaywallIncludes/,
      'paywall-screen.tsx must mount PaywallIncludes — a data file the screen never renders is how 3.1.2(c) came back',
    );
    assert.match(PAYWALL_INCLUDES, /PRO_FEATURE_ROWS/);
    assert.match(PAYWALL_INCLUDES, /PAYWALL_INCLUDES_HEADING/);
  });

  it('names the subscription on the purchase screen', () => {
    assert.match(PAYWALL_HERO, /PAYWALL_PRODUCT_NAME/);
    assert.match(PAYWALL_SCREEN, /showProductName/);
  });

  it('builds the App Store Connect description from the same rows', () => {
    assert.match(SOURCE, /function appStoreConnectSubscriptionDescription/);
    assert.match(SOURCE, /PRO_FEATURE_ROWS\.map/);
    for (const label of [
      'Team and roles',
      'Documents and PDFs',
      'AI paperwork',
      'Bulk import',
      'Priority support',
    ]) {
      assert.ok(SOURCE.includes(label), `ASC copy source is missing "${label}"`);
    }
  });

  it('does not sell the four free features from the Settings upgrade row', () => {
    assert.match(MANAGE_SCREEN, /PAYWALL_UPGRADE_SUBTITLE/);
    assert.doesNotMatch(MANAGE_SCREEN, /Unlimited engines, work orders, AI and reports/);
    const subtitle = SOURCE.match(/PAYWALL_UPGRADE_SUBTITLE = '([^']+)'/)?.[1] ?? '';
    assert.ok(subtitle.length > 0, 'upgrade subtitle missing');
    for (const banned of ['unlimited', 'API', 'reports']) {
      assert.ok(
        !subtitle.toLowerCase().includes(banned.toLowerCase()),
        `upgrade subtitle still mentions "${banned}"`,
      );
    }
  });
});
