import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MarketplaceListing } from "@/domain/marketplace-listing";
import type { UsedPart } from "@/domain/used-part";
import { adsForChannel, buildAvitoXml, buildDromXml } from "@/lib/dismantler/build-marketplace-feed";

const part: UsedPart = {
  id: "p1",
  companyId: "c1",
  donorId: "d1",
  name: "Front bumper",
  oemNumber: "52119",
  sellPrice: 45_000,
  currency: "KZT",
  photoUrls: ["https://example.com/a.jpg"],
  applicability: "Camry 2014",
  status: "available",
  listedOnAvito: true,
  listedOnDrom: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdByUserId: "u1",
};

const listing: MarketplaceListing = {
  id: "l1",
  companyId: "c1",
  usedPartId: "p1",
  donorId: "d1",
  channel: "avito",
  status: "listed",
  title: "Front bumper Camry",
  price: 45_000,
  currency: "KZT",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("marketplace feeds", () => {
  it("marks sold listings inactive and escapes XML", () => {
    const sold: MarketplaceListing = { ...listing, status: "sold" };
    const ads = adsForChannel({
      channel: "avito",
      listings: [sold],
      parts: [{ ...part, status: "sold" }],
      donors: [],
    });
    assert.equal(ads[0]?.status, "inactive");
    const xml = buildAvitoXml(ads);
    assert.match(xml, /AdStatus>Inactive/);
    assert.match(buildDromXml(ads), /available>0/);
  });

  it("keeps listed available parts active", () => {
    const ads = adsForChannel({
      channel: "avito",
      listings: [listing],
      parts: [part],
      donors: [],
    });
    assert.equal(ads[0]?.status, "active");
    assert.match(buildAvitoXml(ads), /AdStatus>Free/);
  });
});
