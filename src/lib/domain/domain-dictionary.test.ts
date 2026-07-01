import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCompanyDictionary,
  createCompanyEntry,
  getGlobalDictionary,
  searchDomain,
} from "@/lib/domain";
import { fold, levenshtein, normalizedVariants, transliterate } from "@/lib/domain/normalize";

function names(category: Parameters<typeof searchDomain>[0], query: string): string[] {
  return searchDomain(category, query).map((result) => result.entry.name);
}

test("fold strips separators and case", () => {
  assert.equal(fold("EJ-205"), "ej205");
  assert.equal(fold("U 660 E"), "u 660 e");
  assert.equal(fold("Масло 5W30"), "масло 5w30");
});

test("transliteration maps cyrillic to latin", () => {
  assert.equal(transliterate("субару"), "subaru");
  assert.equal(transliterate("ниссан"), "nissan");
});

test("normalizedVariants expands cyrillic into latin", () => {
  const variants = normalizedVariants("Субару");
  assert.ok(variants.includes("subaru"));
});

test("bounded levenshtein", () => {
  assert.equal(levenshtein("subaru", "subaru"), 0);
  assert.equal(levenshtein("subaru", "subary"), 1);
  assert.equal(levenshtein("ab", "yz", 2), 2);
});

test("brand: typed prefix resolves Subaru across scripts", () => {
  for (const query of ["суб", "субару", "sub", "subaru"]) {
    assert.equal(searchDomain("brands", query)[0]?.entry.name, "Subaru", `query=${query}`);
  }
});

test("engine codes tolerate spaces and dashes", () => {
  for (const query of ["ej205", "ej 205", "ej-205", "EJ205"]) {
    assert.equal(searchDomain("engines", query)[0]?.entry.name, "EJ205", `query=${query}`);
  }
});

test("engine family prefix surfaces the right variants", () => {
  const result = names("engines", "ej2");
  assert.ok(result.includes("EJ205"));
  assert.ok(result.includes("EJ207"));
  assert.ok(result.includes("EJ257"));
});

test("transmission alias u66 resolves U660E", () => {
  assert.equal(searchDomain("transmissions", "u66")[0]?.entry.name, "U660E");
});

test("body part prefix фа returns headlights", () => {
  const result = names("bodyParts", "фа");
  assert.ok(result.some((name) => name.startsWith("Фара")));
});

test("consumable prefix мас returns oils", () => {
  const result = names("consumables", "мас");
  assert.ok(result.some((name) => name.startsWith("Масло")));
});

test("typo correction recovers from a single edit", () => {
  // "субар" missing a letter and "тойта" misspelled.
  assert.equal(searchDomain("brands", "субар")[0]?.entry.name, "Subaru");
  assert.equal(searchDomain("brands", "тойта")[0]?.entry.name, "Toyota");
});

test("company overlay participates in search and de-dupes", () => {
  const company = buildCompanyDictionary([
    createCompanyEntry("engines", "Контрактный двигатель"),
  ]);
  const result = searchDomain("engines", "контр", company);
  assert.equal(result[0]?.entry.name, "Контрактный двигатель");
  assert.equal(result[0]?.entry.custom, true);
});

test("global dictionary is cached as a singleton", () => {
  assert.equal(getGlobalDictionary("brands"), getGlobalDictionary("brands"));
});

test("empty query returns nothing unless includeEmpty", () => {
  assert.equal(searchDomain("brands", "").length, 0);
  assert.ok(searchDomain("brands", "", null, { includeEmpty: true, limit: 5 }).length > 0);
});
