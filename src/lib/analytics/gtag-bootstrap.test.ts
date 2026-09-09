import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRODUCTION_GA_MEASUREMENT_ID,
  PRODUCTION_GOOGLE_ADS_ID,
  PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO,
} from "./ga-config";
import { buildConsentCookie } from "./consent";
import {
  CONSENT_COOKIE_NAME,
  buildGoogleAdsSubscriptionEventSnippet,
  buildGtagBootstrapScript,
  buildGtagConfigCall,
  documentGoogleTagIds,
  embeddedGoogleTagIds,
  googleAdsConversionPixelSrc,
  gtagConsentUpdatePayload,
  gtagLinkerDomains,
  gtagLoaderSrc,
  gtagSharedCookieDomain,
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
    assert.match(js, /gtag\('config', 'AW-18344172044', \{"send_page_view":false,"conversion_linker":true\}\);/);
    assert.match(js, /gtag\('consent', 'default'/);
    assert.match(js, /"ad_storage":"denied"/);
    assert.match(js, /"wait_for_update":500/);
    assert.match(js, /url_passthrough/);
    assert.match(js, /ads_data_redaction/);
    assert.match(js, new RegExp(`${CONSENT_COOKIE_NAME}=granted`));
  });

  it("stitches marketing and app hosts on the GA4 config so Ads clicks stay one session", () => {
    const js = buildGtagBootstrapScript(
      [PRODUCTION_GA_MEASUREMENT_ID, PRODUCTION_GOOGLE_ADS_ID],
      CONSENT_COOKIE_NAME,
      ["myautocore.com", "app.myautocore.com"],
      "myautocore.com",
    );
    assert.match(js, /"linker":\{"domains":\["myautocore.com","app.myautocore.com"\],"decorate_forms":true\}/);
    assert.match(js, /"cookie_domain":"myautocore.com"/);
  });

  it("reads the same cookie consent.ts writes", () => {
    const cookie = buildConsentCookie("granted", "myautocore.com", "myautocore.com", true);
    assert.ok(cookie.startsWith(`${CONSENT_COOKIE_NAME}=granted`));
  });

  it("loads gtag.js with the Ads id so Google Ads' scanner finds AW- in the URL", () => {
    const ids = [PRODUCTION_GA_MEASUREMENT_ID, PRODUCTION_GOOGLE_ADS_ID];
    assert.equal(primaryGtagId(ids), PRODUCTION_GOOGLE_ADS_ID);
    assert.equal(
      gtagLoaderSrc(PRODUCTION_GOOGLE_ADS_ID),
      "https://www.googletagmanager.com/gtag/js?id=AW-18344172044",
    );
  });

  it("falls back to the GA4 id when Ads is not configured", () => {
    assert.equal(primaryGtagId([PRODUCTION_GA_MEASUREMENT_ID]), PRODUCTION_GA_MEASUREMENT_ID);
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

describe("Google Ads Подписка event snippet", () => {
  it("puts Google's conversion call and send_to in plain HTML source", () => {
    const js = buildGoogleAdsSubscriptionEventSnippet(PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO);
    assert.match(js, /gtag\('event', 'conversion'/);
    assert.match(js, /'send_to': 'AW-18344172044\/FsM2CKqomuscEIy0l6tE'/);
    assert.match(js, /sessionStorage/);
  });

  it("refuses to interpolate an unsafe send_to", () => {
    assert.throws(() => buildGoogleAdsSubscriptionEventSnippet("AW-1/not valid"));
  });

  it("builds the noscript conversion pixel Ads' crawler can fetch without JS", () => {
    assert.equal(
      googleAdsConversionPixelSrc(PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO),
      "https://www.googleadservices.com/pagead/conversion/18344172044/?label=FsM2CKqomuscEIy0l6tE&guid=ON&script=0",
    );
  });
});

describe("gtag cross-domain linker", () => {
  it("lists marketing and app hosts once, without www or localhost", () => {
    assert.deepEqual(
      gtagLinkerDomains("https://www.myautocore.com", "https://app.myautocore.com"),
      ["myautocore.com", "app.myautocore.com"],
    );
    assert.deepEqual(gtagLinkerDomains("http://localhost:3000", "http://127.0.0.1:3000"), []);
  });

  it("uses the registrable domain as the shared cookie domain", () => {
    assert.equal(
      gtagSharedCookieDomain(["app.myautocore.com", "myautocore.com"]),
      "myautocore.com",
    );
  });

  it("keeps GA4 page_view on G- and disables it on AW-", () => {
    assert.equal(buildGtagConfigCall("G-QEVTMP0BYB"), "gtag('config', 'G-QEVTMP0BYB');");
    assert.equal(
      buildGtagConfigCall("AW-18344172044"),
      `gtag('config', 'AW-18344172044', {"send_page_view":false,"conversion_linker":true});`,
    );
  });
});
