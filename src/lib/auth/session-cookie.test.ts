import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasAppSessionCookie } from "@/lib/auth/session-cookie";

describe("session-cookie", () => {
  it("recognizes the signed-in session marker", () => {
    assert.equal(hasAppSessionCookie("1"), true);
    assert.equal(hasAppSessionCookie(undefined), false);
    assert.equal(hasAppSessionCookie("0"), false);
  });
});
