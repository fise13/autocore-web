import assert from "node:assert/strict";
import test from "node:test";

import {
  getHighlightedProductUpdate,
  getProductUpdateById,
  sortProductUpdatesByDate,
} from "@/lib/product/product-updates";
import { filterProductHelpSections, productHelpSections } from "@/lib/product/product-help";
import { getStatusPageHref } from "@/lib/product/product-status";

test("getHighlightedProductUpdate returns current highlight", () => {
  assert.equal(getHighlightedProductUpdate()?.id, "2026-06-motor-sale-client");
});

test("sortProductUpdatesByDate orders newest first", () => {
  const sorted = sortProductUpdatesByDate([
    getProductUpdateById("2026-05-sidebar-customize")!,
    getProductUpdateById("2026-06-motor-sale-client")!,
  ]);
  assert.equal(sorted[0]?.id, "2026-06-motor-sale-client");
});

test("filterProductHelpSections matches buyer question", () => {
  const filtered = filterProductHelpSections(productHelpSections, "покупател");
  assert.equal(
    filtered.some((section) => section.id === "motors"),
    true,
  );
  assert.equal(
    filtered.every((section) => section.items.length > 0),
    true,
  );
});

test("getStatusPageHref defaults to in-app page", () => {
  assert.equal(getStatusPageHref(), "/status");
});
