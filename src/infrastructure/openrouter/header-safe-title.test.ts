import assert from "node:assert/strict";
import test from "node:test";

import { headerSafeTitle } from "./header-safe-title";

/**
 * The case that cost a whole feature: every business-import call carried
 * "AutoCore Business Import — discovery" as its X-Title, `fetch` refused the
 * header, and the import reported that AI analysis was unavailable.
 */
test("the em dash that disabled the business import is now safe", () => {
  const title = headerSafeTitle("AutoCore Business Import — discovery");
  assert.equal(title, "AutoCore Business Import - discovery");
  assertHeaderSafe(title);
});

test("typographic punctuation keeps its meaning", () => {
  assert.equal(headerSafeTitle("AutoCore – “Import” … ok"), 'AutoCore - "Import" ... ok');
});

test("a title with no ASCII left falls back rather than sending nothing", () => {
  assert.equal(headerSafeTitle("Импорт бизнеса"), "AutoCore");
  assert.equal(headerSafeTitle("   "), "AutoCore");
  assert.equal(headerSafeTitle("🚗"), "AutoCore");
});

test("mixed scripts keep the readable half", () => {
  assert.equal(headerSafeTitle("AutoCore Импорт v2"), "AutoCore v2");
});

test("control characters cannot forge a header", () => {
  const title = headerSafeTitle("AutoCore\r\nX-Evil: 1");
  assert.equal(title, "AutoCore X-Evil: 1");
  assertHeaderSafe(title);
});

test("a very long title is trimmed", () => {
  assert.equal(headerSafeTitle("A".repeat(500)).length, 120);
});

test("an ordinary ASCII title is left alone", () => {
  assert.equal(headerSafeTitle("AutoCore Import"), "AutoCore Import");
});

/** What `fetch` itself enforces: every character must fit in a byte. */
function assertHeaderSafe(value: string): void {
  for (const character of value) {
    assert.ok(
      character.codePointAt(0)! <= 255,
      `character ${character} would throw inside fetch`,
    );
  }
  assert.doesNotThrow(() => new Headers({ "X-Title": value }));
}
