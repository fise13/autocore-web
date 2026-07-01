import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSpecificRecordDataFromMigrationRow,
  isMigrationCatalogRecordType,
} from "./migration-row-builders";
import { resolveMigrationBrandName } from "./migration-brand-resolve";

describe("migration brand resolve", () => {
  it("infers Subaru from gearbox serial prefix", () => {
    assert.equal(resolveMigrationBrandName({ serial: "TV1A4YFEAB" }, "transmission"), "Subaru");
  });

  it("uses explicit brand column", () => {
    assert.equal(resolveMigrationBrandName({ brand: "Toyota", serial: "X" }, "transmission"), "Toyota");
  });

  it("resolves U660E from dictionary", () => {
    assert.equal(resolveMigrationBrandName({ name: "U660E" }, "transmission"), "Toyota");
  });
});

describe("migration catalog routing helpers", () => {
  it("marks transmission as catalog type", () => {
    assert.equal(isMigrationCatalogRecordType("transmission"), true);
    assert.equal(isMigrationCatalogRecordType("consumable"), false);
  });

  it("maps transmission row into specific catalog columns with brand", () => {
    const data = buildSpecificRecordDataFromMigrationRow(
      { serial: "TR580DD5AA", comment: "с разбора" },
      "transmission",
    );
    assert.equal(data?.["Номер двигателя"], "TR580DD5AA");
    assert.equal(data?.["Комплектация"], "Subaru");
  });
});
