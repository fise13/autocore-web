import assert from "node:assert/strict";
import { test } from "node:test";

import enMarketingMessages from "@autocore/i18n/messages/en/marketing.json";

import { routing } from "@/i18n/routing";
import {
  appHostRobotsDisallowPaths,
  buildAppHostRobotsTxt,
  marketingRobotsAllowPaths,
  marketingRobotsDisallowPaths,
} from "@/lib/seo/marketing-robots";
import { marketingCleanPaths, type MarketingPathKey } from "@/lib/seo/marketing-paths";
import { MARKETING_PRICING, formattedPrice } from "@/lib/seo/pricing-facts";
import { buildMarketingJsonLd, buildPricingOfferJsonLd } from "@/lib/seo/marketing-seo";

const KEYS = Object.keys(marketingCleanPaths) as MarketingPathKey[];

/* ---------------------------------------------------------------- pricing */
// The defect this guards against shipped to production: structured data said
// $39 while every visible surface said $40, which is a rich-result violation.

test("structured-data price matches the published monthly price", () => {
  const offer = buildPricingOfferJsonLd("en");
  assert.equal(offer.price, String(MARKETING_PRICING.monthly));
  assert.equal(offer.priceCurrency, MARKETING_PRICING.currency);
});

test("published pricing copy matches the pricing facts", () => {
  const plan = enMarketingMessages.pages.pricing.plan;
  assert.equal(
    plan.price,
    formattedPrice(MARKETING_PRICING.monthly),
    "pages.pricing.plan.price drifted from MARKETING_PRICING.monthly",
  );
  assert.equal(
    plan.yearlyPrice,
    formattedPrice(MARKETING_PRICING.yearly),
    "pages.pricing.plan.yearlyPrice drifted from MARKETING_PRICING.yearly",
  );
});

test("AggregateOffer spans the real price range and lists every plan", () => {
  const software = buildMarketingJsonLd("en").find(
    (graph) => graph["@type"] === "SoftwareApplication",
  ) as { offers: { lowPrice: string; highPrice: string; offerCount: number; offers: unknown[] } };

  assert.equal(software.offers.lowPrice, "0", "the free trial is the low end");
  assert.equal(
    software.offers.highPrice,
    String(MARKETING_PRICING.yearly),
    "highPrice must cover the yearly plan, not just the monthly one",
  );
  assert.equal(software.offers.offerCount, software.offers.offers.length);
});

/* ------------------------------------------------------------ geo signals */

test("no structured data claims a market the site does not target", () => {
  const serialized = JSON.stringify(buildMarketingJsonLd("en"));
  for (const stale of ["Kazakhstan", '"KZ"', '"RU"', '"kk"']) {
    assert.ok(
      !serialized.includes(stale),
      `JSON-LD still carries ${stale} while the site targets the US in English`,
    );
  }
});

/* ----------------------------------------------------------------- robots */

test("every private surface is disallowed on the app host, where it lives", () => {
  const appHost = appHostRobotsDisallowPaths();
  // These four are publicly reachable and two carry a secret in the URL.
  for (const path of ["/invite", "/warranty", "/join", "/deck"]) {
    assert.ok(appHost.includes(path), `${path} must be disallowed on the app host`);
  }
});

test("marketing and app hosts disallow the same private surfaces", () => {
  assert.deepEqual(
    [...marketingRobotsDisallowPaths()].sort(),
    [...appHostRobotsDisallowPaths()].sort(),
    "the two hosts drifted apart; that is how /invite ended up crawlable",
  );
});

test("no public marketing path is caught by a disallow prefix", () => {
  const disallow = marketingRobotsDisallowPaths();
  for (const path of marketingRobotsAllowPaths()) {
    if (path === "/") continue;
    const blocked = disallow.find((rule) => path.startsWith(rule));
    assert.equal(blocked, undefined, `${path} is blocked by "Disallow: ${blocked}"`);
  }
});

test("app-host robots.txt points at the marketing sitemap", () => {
  const txt = buildAppHostRobotsTxt("https://myautocore.com/sitemap.xml");
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Sitemap: https:\/\/myautocore\.com\/sitemap\.xml$/m);
  assert.ok(!txt.includes("Host:"), "the Host directive was retired by Yandex in 2018");
});

/* ------------------------------------------------------------- page cover */

test("every public path has a title, a description, and a breadcrumb label", () => {
  for (const key of KEYS) {
    const page = enMarketingMessages.seo.pages[key];
    assert.ok(page, `seo.pages.${key} is missing`);
    assert.ok(page.title.length > 0, `${key} has no title`);
    assert.ok(page.description.length > 0, `${key} has no description`);
    assert.ok(
      enMarketingMessages.seo.breadcrumbs[key],
      `${key} has no breadcrumb label, so its BreadcrumbList would render empty`,
    );
  }
});

test("titles and descriptions survive SERP truncation", () => {
  for (const key of KEYS) {
    const { title, description } = enMarketingMessages.seo.pages[key];
    assert.ok(title.length <= 65, `${key} title is ${title.length} chars (max 65)`);
    assert.ok(
      description.length <= 160,
      `${key} description is ${description.length} chars (max 160)`,
    );
  }
});

/* --------------------------------------------------------------- JSON-LD */

test("the JSON-LD graph resolves its own @id references", () => {
  const graphs = buildMarketingJsonLd("en");
  const ids = new Set(graphs.map((graph) => graph["@id"]).filter(Boolean));

  const website = graphs.find((graph) => graph["@type"] === "WebSite") as {
    publisher: { "@id": string };
  };
  assert.ok(
    ids.has(website.publisher["@id"]),
    "WebSite.publisher points at an Organization that is not in the graph",
  );
});

test("the marketing site declares exactly one locale", () => {
  // Several SEO decisions hang off this: hreflang is omitted, the sitemap emits
  // one URL per path, and `<html lang>` is a static "en". Adding a locale means
  // revisiting all three.
  assert.equal(routing.locales.length, 1);
  assert.equal(routing.defaultLocale, "en");
});
