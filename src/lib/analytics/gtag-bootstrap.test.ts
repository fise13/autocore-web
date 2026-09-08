import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRODUCTION_GA_MEASUREMENT_ID, PRODUCTION_GOOGLE_ADS_ID } from "./ga-config";
import { buildConsentCookie } from "./consent";
import {
  CONSENT_COOKIE_NAME,
  buildGtagBootstrapScript,
  documentGoogleTagIds,
  embeddedGoogleTagIds,
  gtagConsentUpdatePayload,
  gtagLoaderSrc,
  primaryGtagId,
  shouldEmbedGoogleTagInDocument,
} from "./gtag-bootstrap";

describe("shouldEmbedGoogleTagInDocument", () => {
  it("embeds on Vercel production even when env ids are unset", () => {
    assert.equal(shouldEmbedGoogleTagInDocument("production", "", ""), true);
  });

  it("does not embed on preview or an unset env", () => {
    assert.equal(shouldEmbedGoogleTagInDocument("preview", "", ""), false);
    assert.equal(shouldEmbedGoogleTagInDocument(undefined, "", ""), false);
  });

  it("embeds when an env id is set, including on preview", () => {
    assert.equal(shouldEmbedGoogleTagInDocument("preview", "G-EXPLICIT1", ""), true);
    assert.equal(shouldEmbedGoogleTagInDocument("preview", "", "AW-111"), true);
  });
});

describe("documentGoogleTagIds", () => {
  it("uses the production GA4 and Ads ids on Vercel production", () => {
    assert.deepEqual(documentGoogleTagIds("production", "", ""), {
      ga: PRODUCTION_GA_MEASUREMENT_ID,
      ads: PRODUCTION_GOOGLE_ADS_ID,
    });
  });

  it("stays empty on preview when env is unset", () => {
    assert.deepEqual(documentGoogleTagIds("preview", "", ""), { ga: "", ads: "" });
    assert.deepEqual(embeddedGoogleTagIds("preview", "", ""), []);
  });

  it("honours explicit env ids on preview", () => {
    assert.deepEqual(documentGoogleTagIds("preview", "G-EXPLICIT1", "AW-111"), {
      ga: "G-EXPLICIT1",
      ads: "AW-111",
    });
    assert.deepEqual(embeddedGoogleTagIds("preview", "G-EXPLICIT1", "AW-111"), [
      "G-EXPLICIT1",
      "AW-111",
    ]);
  });

  it("rejects ids that cannot be interpolated into a script", () => {
    assert.deepEqual(documentGoogleTagIds("preview", "G-QEVTMP0BYB';alert(1)//", "AW-1"), {
      ga: "",
      ads: "AW-1",
    });
  });
});

describe("buildGtagBootstrapScript", () => {
  it("contains Google's GA4 and Ads config lines plus Consent Mode defaults", () => {
    const js = buildGtagBootstrapScript([PRODUCTION_GA_MEASUREMENT_ID, PRODUCTION_GOOGLE_ADS_ID]);
    assert.match(js, /gtag\('config', 'G-QEVTMP0BYB'\);/);
    assert.match(js, /gtag\('config', 'AW-18344172044'\);/);
    assert.match(js, /gtag\('consent', 'default'/);
    assert.match(js, /"ad_storage":"denied"/);
    assert.match(js, /"wait_for_update":500/);
    assert.match(js, /url_passthrough/);
    assert.match(js, new RegExp(`${CONSENT_COOKIE_NAME}=granted`));
  });

  it("reads the same cookie consent.ts writes", () => {
    const cookie = buildConsentCookie("granted", "myautocore.com", "myautocore.com", true);
    assert.ok(cookie.startsWith(`${CONSENT_COOKIE_NAME}=granted`));
  });

  it("loads gtag.js with the GA4 id Google mailed", () => {
    const ids = [PRODUCTION_GOOGLE_ADS_ID, PRODUCTION_GA_MEASUREMENT_ID];
    assert.equal(primaryGtagId(ids), PRODUCTION_GA_MEASUREMENT_ID);
    assert.equal(
      gtagLoaderSrc(PRODUCTION_GA_MEASUREMENT_ID),
      "https://www.googletagmanager.com/gtag/js?id=G-QEVTMP0BYB",
    );
  });

  it("refuses to interpolate an unsafe id", () => {
    assert.throws(() => buildGtagBootstrapScript(["G-QEVTMP0BYB';alert(1)//"]));
  });
});

describe("gtagConsentUpdatePayload", () => {
  it("grants every Consent Mode v2 storage flag together", () => {
    assert.equal(gtagConsentUpdatePayload("granted").ad_storage, "granted");
    assert.equal(gtagConsentUpdatePayload("denied").analytics_storage, "denied");
  });
});
