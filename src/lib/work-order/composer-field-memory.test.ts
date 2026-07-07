import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  readComposerFieldValues,
  rememberComposerFieldValue,
} from "@/lib/work-order/composer-field-memory";

describe("composer field memory", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("stores and reads recent field values with mobile-compatible keys", () => {
    rememberComposerFieldValue("company-1", "assignee", "Виктор Мишкин");
    rememberComposerFieldValue("company-1", "assignee", "Алексей Иванов");

    assert.deepEqual(readComposerFieldValues("company-1", "assignee"), [
      "Алексей Иванов",
      "Виктор Мишкин",
    ]);
    assert.ok(storage.has("autocomplete:field:company-1:assignee"));
  });
});
