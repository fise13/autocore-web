import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildConsentCookie, consentCookieDomain } from "./consent";

const SHARED = "myautocore.com";

/**
 * These exist because the first version stored the answer in `localStorage`,
 * which is per-origin. Accepting on `myautocore.com` left
 * `app.myautocore.com` none the wiser, so the same person was asked twice on
 * the way from an ad landing page to signup — the one journey the whole
 * measurement setup is meant to keep intact.
 */
describe("consent cookie domain", () => {
  it("scopes to the shared parent so both hosts read one answer", () => {
    assert.equal(consentCookieDomain("myautocore.com", SHARED), ".myautocore.com");
    assert.equal(consentCookieDomain("app.myautocore.com", SHARED), ".myautocore.com");
    assert.equal(consentCookieDomain("www.myautocore.com", SHARED), ".myautocore.com");
  });

  it("omits the domain off our own hosts, where a browser would reject it", () => {
    // A `domain` attribute the host does not belong to is dropped outright,
    // which would lose the answer silently rather than loudly.
    assert.equal(consentCookieDomain("localhost", SHARED), null);
    assert.equal(consentCookieDomain("autocore-web.vercel.app", SHARED), null);
    assert.equal(consentCookieDomain("myautocore.com.evil.test", SHARED), null);
  });

  it("omits the domain when no shared host is configured", () => {
    assert.equal(consentCookieDomain("myautocore.com", ""), null);
  });
});

describe("consent cookie", () => {
  it("carries the choice, a path, and a year of life", () => {
    const cookie = buildConsentCookie("granted", "app.myautocore.com", SHARED, true);
    assert.match(cookie, /^autocore_cookie_consent=granted;/);
    assert.ok(cookie.includes("path=/"));
    assert.ok(cookie.includes(`max-age=${365 * 24 * 60 * 60}`));
    assert.ok(cookie.includes("domain=.myautocore.com"));
  });

  it("uses SameSite=Lax so the answer survives an ad click", () => {
    // Strict would drop the cookie on the cross-site navigation that brought
    // the visitor in, and the banner would reappear for someone who answered.
    const cookie = buildConsentCookie("denied", "myautocore.com", SHARED, true);
    assert.ok(cookie.includes("SameSite=Lax"));
    assert.ok(!cookie.includes("SameSite=Strict"));
  });

  it("marks the cookie Secure only over https", () => {
    assert.ok(buildConsentCookie("granted", "myautocore.com", SHARED, true).includes("Secure"));
    // Local development is http; a Secure cookie there would never be stored.
    assert.ok(!buildConsentCookie("granted", "localhost", SHARED, false).includes("Secure"));
  });

  it("records a refusal as durably as an acceptance", () => {
    // A denial that expires early turns into nagging, which is its own dark
    // pattern — the two answers get identical treatment.
    const granted = buildConsentCookie("granted", "myautocore.com", SHARED, true);
    const denied = buildConsentCookie("denied", "myautocore.com", SHARED, true);
    assert.equal(
      granted.replace("=granted", "=X"),
      denied.replace("=denied", "=X"),
      "both answers must share every attribute",
    );
  });
});
