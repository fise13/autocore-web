import assert from "node:assert/strict";
import test from "node:test";

import {
  getHighlightedProductUpdate,
  getProductUpdateById,
  sortProductUpdatesByDate,
} from "@/lib/product/product-updates";
import {
  filterProductHelpSections,
  getProductHelpSections,
} from "@/lib/product/product-help";
import { productHelpSectionsEn } from "@/lib/product/product-help.en";
import { productHelpSectionsRu } from "@/lib/product/product-help.ru";
import { getStatusPageHref } from "@/lib/product/product-status";
import { setActiveUserCopyLocale } from "@/lib/user-copy";

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
  const filtered = filterProductHelpSections(productHelpSectionsRu, "покупател");
  assert.equal(
    filtered.some((section) => section.id === "motors"),
    true,
  );
  assert.equal(
    filtered.every((section) => section.items.length > 0),
    true,
  );
});

test("filterProductHelpSections matches keywords and new domains", () => {
  const byKeyword = filterProductHelpSections(productHelpSectionsRu, "сканер");
  assert.equal(
    byKeyword.some((section) => section.id === "mobile"),
    true,
  );

  const byFinance = filterProductHelpSections(productHelpSectionsRu, "проводк");
  assert.equal(
    byFinance.some((section) => section.id === "finance"),
    true,
  );

  assert.equal(
    productHelpSectionsRu.some((section) => section.id === "documents"),
    true,
  );
  assert.ok(productHelpSectionsRu.every((section) => section.items.length > 0));
  assert.ok(
    productHelpSectionsRu.every((section) =>
      section.items.every((item) => item.id && item.q && item.a),
    ),
  );
});

test("getProductHelpSections returns English titles for en locale", () => {
  setActiveUserCopyLocale("en");
  const sections = getProductHelpSections();
  assert.equal(sections[0]?.title, "Getting started");
  assert.equal(sections.find((section) => section.id === "warehouse")?.title, "Warehouse");
  assert.equal(sections.find((section) => section.id === "finance")?.title, "Finance");
  assert.ok(sections.every((section) => !/[А-Яа-яЁё]/.test(section.title)));
  assert.equal(sections.length, productHelpSectionsEn.length);
});

test("getProductHelpSections returns Russian titles for ru locale", () => {
  setActiveUserCopyLocale("ru");
  const sections = getProductHelpSections();
  assert.equal(sections[0]?.title, "С чего начать");
  assert.equal(sections.find((section) => section.id === "warehouse")?.title, "Склад");
  assert.equal(sections.length, productHelpSectionsRu.length);
});

test("EN help articles match RU structure", () => {
  assert.equal(productHelpSectionsEn.length, productHelpSectionsRu.length);
  for (let i = 0; i < productHelpSectionsRu.length; i += 1) {
    const ru = productHelpSectionsRu[i]!;
    const en = productHelpSectionsEn[i]!;
    assert.equal(en.id, ru.id);
    assert.equal(en.items.length, ru.items.length);
    for (let j = 0; j < ru.items.length; j += 1) {
      assert.equal(en.items[j]!.id, ru.items[j]!.id);
      assert.ok(en.items[j]!.q.length > 0);
      assert.ok(en.items[j]!.a.length > 0);
    }
  }
});

test("getStatusPageHref defaults to in-app page", () => {
  assert.equal(getStatusPageHref(), "/status");
});
