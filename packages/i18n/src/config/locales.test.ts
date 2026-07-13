import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LOCALE,
  getLocaleMetadata,
  normalizeLocale,
  resolveLocale,
} from "./locales";

test("English is the source and fallback locale", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(resolveLocale([]), "en");
  assert.equal(resolveLocale(["de-DE"]), "en");
});

test("normalizes supported regional and underscore locale tags", () => {
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("ru_RU"), "ru");
  assert.equal(normalizeLocale(" RU-kz "), "ru");
});

test("rejects unsupported and malformed locale values", () => {
  assert.equal(normalizeLocale("de-DE"), null);
  assert.equal(normalizeLocale(""), null);
  assert.equal(normalizeLocale(null), null);
});

test("resolves the first supported locale in priority order", () => {
  assert.equal(resolveLocale(["de-DE", "ru-RU", "en-US"]), "ru");
  assert.equal(resolveLocale(["en-GB", "ru-RU"]), "en");
});

test("exposes native names and layout direction", () => {
  assert.deepEqual(getLocaleMetadata("ru"), {
    locale: "ru",
    bcp47: "ru-RU",
    nativeName: "Русский",
    englishName: "Russian",
    direction: "ltr",
    dateFnsLocale: "ru",
  });
});
