import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRODUCTION_GA_MEASUREMENT_ID,
  allowsProductionGoogleTag,
  pickMeasurementId,
  resolveMeasurementIdFrom,
} from "./ga-config";

const MARKETING = "myautocore.com";
const APP = "app.myautocore.com";

const ONE_STREAM = { default: "G-MARKETING1", app: "" };
const TWO_STREAMS = { default: "G-MARKETING1", app: "G-APP000001" };

describe("GA measurement id resolution", () => {
  it("reports nothing when nothing is configured", () => {
    assert.equal(pickMeasurementId(MARKETING, { default: "", app: "" }), "");
  });

  it("uses one id for both hosts when only the default is set", () => {
    // The recommended shape: one stream with both domains listed in GA4, so a
    // visitor crossing from an ad page to signup stays one attributed session.
    assert.equal(pickMeasurementId(MARKETING, ONE_STREAM), "G-MARKETING1");
    assert.equal(pickMeasurementId(APP, ONE_STREAM), "G-MARKETING1");
  });

  it("gives the app host its own id when a second stream is configured", () => {
    assert.equal(pickMeasurementId(MARKETING, TWO_STREAMS), "G-MARKETING1");
    assert.equal(pickMeasurementId(APP, TWO_STREAMS), "G-APP000001");
  });

  it("treats www on the marketing host as marketing", () => {
    assert.equal(pickMeasurementId("www.myautocore.com", TWO_STREAMS), "G-MARKETING1");
  });

  it("routes any app.* subdomain to the app stream", () => {
    assert.equal(pickMeasurementId("app.staging.myautocore.com", TWO_STREAMS), "G-APP000001");
  });

  it("falls back to the app id when it is the only one set", () => {
    // A half-finished configuration should still measure something rather than
    // look like analytics silently failed.
    const appOnly = { default: "", app: "G-APP000001" };
    assert.equal(pickMeasurementId(MARKETING, appOnly), "G-APP000001");
    assert.equal(pickMeasurementId(APP, appOnly), "G-APP000001");
  });

  it("sends localhost to the default stream, not the app one", () => {
    // Local development is neither host; it must not land in the app property
    // just because no other branch matched.
    assert.equal(pickMeasurementId("localhost", TWO_STREAMS), "G-MARKETING1");
    assert.equal(pickMeasurementId("127.0.0.1", TWO_STREAMS), "G-MARKETING1");
  });
});

describe("production Google tag fallback", () => {
  const empty = { default: "", app: "" };

  it("loads the production tag on both live hosts when env is unset", () => {
    assert.equal(
      resolveMeasurementIdFrom(MARKETING, empty, PRODUCTION_GA_MEASUREMENT_ID),
      PRODUCTION_GA_MEASUREMENT_ID,
    );
    assert.equal(
      resolveMeasurementIdFrom(APP, empty, PRODUCTION_GA_MEASUREMENT_ID),
      PRODUCTION_GA_MEASUREMENT_ID,
    );
  });

  it("does not send the production tag from localhost", () => {
    assert.equal(allowsProductionGoogleTag("localhost"), false);
    assert.equal(
      resolveMeasurementIdFrom("localhost", empty, PRODUCTION_GA_MEASUREMENT_ID),
      "",
    );
  });

  it("does not send the production tag from a Vercel preview", () => {
    assert.equal(allowsProductionGoogleTag("autocore-web.vercel.app"), false);
    assert.equal(
      resolveMeasurementIdFrom("autocore-web.vercel.app", empty, PRODUCTION_GA_MEASUREMENT_ID),
      "",
    );
  });

  it("honours an explicit env id on localhost", () => {
    assert.equal(
      resolveMeasurementIdFrom("localhost", { default: "G-EXPLICIT1", app: "" }, PRODUCTION_GA_MEASUREMENT_ID),
      "G-EXPLICIT1",
    );
  });
});
