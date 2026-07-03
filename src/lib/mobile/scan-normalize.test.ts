import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildScanCodeVariants } from "@/lib/mobile/scan-normalize";
import { rankFuzzyScanCandidates } from "@/lib/mobile/scan-fuzzy.server";
import type { MobileScanItem } from "@/lib/mobile/scan-types";

describe("scan-normalize", () => {
  it("strips common prefixes and normalizes EAN", () => {
    const variants = buildScanCodeVariants("EAN:4012345678901");
    assert.ok(variants.includes("4012345678901"));
    assert.ok(variants.some((value) => value.includes("4012345678901")));
  });
});

describe("scan-fuzzy", () => {
  const items: MobileScanItem[] = [
    {
      id: "1",
      sku: "FILTER-MANN",
      name: "Масляный фильтр Mann",
      unit: "шт",
      barcodes: ["4012345678901"],
      totalOnHand: 3,
      totalReserved: 0,
      totalAvailable: 3,
    },
  ];

  it("ranks close sku matches", () => {
    const ranked = rankFuzzyScanCandidates("FILTERMANN", items, 3);
    assert.equal(ranked[0]?.item.id, "1");
    assert.ok(ranked[0]!.score > 0.5);
  });
});
