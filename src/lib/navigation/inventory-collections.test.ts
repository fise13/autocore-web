import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBrandHref,
  buildCollectionHref,
  collectionMatchesCategory,
  parseCollectionFromSearchParams,
  resolveActiveCollection,
} from "@/lib/navigation/inventory-collections";

describe("inventory-collections", () => {
  it("builds href with collection and filter", () => {
    const href = buildCollectionHref({
      collection: "parts",
      filter: "available",
      brandLocalId: 3,
    });
    assert.equal(href, "/motors?collection=parts&filter=available&brand=3");
  });

  it("round-trips a brand + engine model link", () => {
    const href = buildBrandHref({ brandLocalId: 7, engineCode: "EJ253 AVCS" });
    assert.equal(href, "/motors?collection=engines&brand=7&engine=EJ253+AVCS");
    const parsed = parseCollectionFromSearchParams(new URL(href, "http://x").searchParams, "/motors");
    assert.equal(parsed.brandLocalId, 7);
    assert.equal(parsed.engineCode, "EJ253 AVCS");
  });

  it("ignores an engine param without a brand", () => {
    const parsed = parseCollectionFromSearchParams(new URLSearchParams("engine=EJ251"), "/motors");
    assert.equal(parsed.engineCode, undefined);
  });

  it("defaults motors route to engines collection", () => {
    const params = new URLSearchParams();
    const parsed = parseCollectionFromSearchParams(params, "/motors");
    assert.equal(parsed.collection, "engines");
    assert.equal(resolveActiveCollection("/motors", params), "engines");
  });

  it("maps warehouse route to consumables", () => {
    const params = new URLSearchParams();
    const parsed = parseCollectionFromSearchParams(params, "/warehouse");
    assert.equal(parsed.collection, "consumables");
  });

  it("matches parts collection to parts group categories", () => {
    assert.equal(
      collectionMatchesCategory("parts", "optics", "parts"),
      true,
    );
    assert.equal(
      collectionMatchesCategory("transmissions", "gearboxes", "aggregates"),
      true,
    );
    assert.equal(
      collectionMatchesCategory("engines", "gearboxes", "aggregates"),
      false,
    );
  });
});
