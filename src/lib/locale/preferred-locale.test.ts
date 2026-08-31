import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAccountLocale, UI_LOCALE_LOCK } from "./preferred-locale";

describe("resolveAccountLocale", () => {
  it("keeps English while the product UI lock is on, even if storage is Russian", () => {
    assert.equal(UI_LOCALE_LOCK, "en");
    assert.equal(
      resolveAccountLocale({
        profileLocale: "ru",
        storedLocale: "ru",
        queryLocale: "ru",
      }),
      "en",
    );
  });
});
