import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_POST_LOGIN_PATH,
  buildLoginUrl,
  resolvePostLoginPath,
  sanitizeReturnTo,
} from "./return-to";

describe("sanitizeReturnTo", () => {
  it("keeps a same-origin path with its query and hash", () => {
    assert.equal(sanitizeReturnTo("/work-orders/123"), "/work-orders/123");
    assert.equal(sanitizeReturnTo("/work-orders/123?tab=parts"), "/work-orders/123?tab=parts");
    assert.equal(sanitizeReturnTo("/warehouse#stock"), "/warehouse#stock");
  });

  it("rejects anything that could leave the origin", () => {
    for (const value of [
      "https://evil.example/steal",
      "//evil.example/steal",
      "/\\evil.example",
      "http://app.myautocore.com/",
      "javascript:alert(1)",
      "work-orders/123",
    ]) {
      assert.equal(sanitizeReturnTo(value), null, value);
    }
  });

  it("rejects control characters and absurd lengths", () => {
    assert.equal(sanitizeReturnTo("/work-orders\n/123"), null);
    assert.equal(sanitizeReturnTo(`/${"a".repeat(4000)}`), null);
  });

  it("refuses destinations that would loop back through auth", () => {
    for (const value of ["/login", "/login?next=/x", "/auth/action", "/demo", "/deck/callback", "/api/x"]) {
      assert.equal(sanitizeReturnTo(value), null, value);
    }
  });

  it("treats empty input as no destination", () => {
    assert.equal(sanitizeReturnTo(null), null);
    assert.equal(sanitizeReturnTo(undefined), null);
    assert.equal(sanitizeReturnTo("   "), null);
  });
});

describe("buildLoginUrl", () => {
  it("carries a deep link through login", () => {
    assert.equal(
      buildLoginUrl("/work-orders/123?tab=parts"),
      "/login?next=%2Fwork-orders%2F123%3Ftab%3Dparts",
    );
  });

  it("stays bare when there is nothing worth returning to", () => {
    assert.equal(buildLoginUrl("/"), "/login");
    assert.equal(buildLoginUrl("/home"), "/login");
    assert.equal(buildLoginUrl(null), "/login");
    assert.equal(buildLoginUrl("https://evil.example"), "/login");
  });
});

describe("resolvePostLoginPath", () => {
  it("round-trips a destination built by buildLoginUrl", () => {
    const url = new URL(buildLoginUrl("/work-orders/123?tab=parts"), "https://app.myautocore.com");
    assert.equal(resolvePostLoginPath(url.searchParams.get("next")), "/work-orders/123?tab=parts");
  });

  it("falls back to the workspace root for a missing or hostile value", () => {
    assert.equal(resolvePostLoginPath(null), DEFAULT_POST_LOGIN_PATH);
    assert.equal(resolvePostLoginPath("https://evil.example"), DEFAULT_POST_LOGIN_PATH);
    assert.equal(resolvePostLoginPath("/login"), DEFAULT_POST_LOGIN_PATH);
  });
});
