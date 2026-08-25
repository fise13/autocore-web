import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  entityKeysFor,
  findMergeCandidates,
  resolveEntities,
} from "@/lib/import/business/entity-resolution";
import { makeConfidence } from "@/lib/import/confidence";
import type { CanonicalField, ClassifiedRow, RecordType } from "@/lib/import/types";
import { RECORD_TYPE_TARGET } from "@/lib/import/types";

const VIN_A = "JH4KA7561PC008269";
const VIN_B = "JT2BF22K1W0123456";

function classified(
  index: number,
  recordType: RecordType,
  values: Partial<Record<CanonicalField, string>>,
): ClassifiedRow {
  return {
    index,
    raw: {},
    values,
    classification: {
      recordType,
      target: RECORD_TYPE_TARGET[recordType],
      confidence: makeConfidence(0.9, "тест", "rules"),
    },
    confidence: makeConfidence(0.9, "тест", "rules"),
    fieldConfidence: {},
    issues: [],
    needsAi: false,
  };
}

function entry(
  index: number,
  recordType: RecordType,
  values: Partial<Record<CanonicalField, string>>,
  table = "Лист1",
) {
  return { row: classified(index, recordType, values), table };
}

describe("entityKeysFor", () => {
  it("takes a VIN only when it really is one", () => {
    assert.deepEqual(entityKeysFor({ vin: VIN_A }, "donor"), [
      { field: "vin", value: VIN_A.toLowerCase() },
    ]);
    assert.deepEqual(entityKeysFor({ vin: "не указан" }, "donor"), []);
  });

  it("never treats a VIN as the identity of a part", () => {
    // Every part off one car carries that car's VIN; it is a reference, not
    // an identity, and using it as one collapsed a parts list into one part.
    assert.deepEqual(entityKeysFor({ vin: VIN_A, serial: "P-1" }, "usedPart"), [
      { field: "serial", value: "p-1" },
    ]);
    assert.deepEqual(entityKeysFor({ vin: VIN_A }, "engine"), []);
  });

  it("folds case and spacing so one key matches its own spellings", () => {
    assert.deepEqual(entityKeysFor({ serial: " C085834 " }, "engine"), [
      { field: "serial", value: "c085834" },
    ]);
  });
});

describe("resolveEntities", () => {
  it("collapses rows that repeat one VIN into a single donor", () => {
    // Eleven lines for one car used to produce eleven donors.
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, brand: "Acura", model: "TLX", year: "2015" }),
        entry(1, "donorCar", { vin: VIN_A, brand: "Acura", model: "TLX", year: "2015" }),
        entry(2, "donorCar", { vin: VIN_B, brand: "Toyota", model: "Camry" }),
      ],
    });
    assert.equal(entities.length, 2);
    assert.equal(entities[0]!.sources.length, 2);
  });

  it("matches a donor across two sheets", () => {
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, brand: "Acura" }, "Машины"),
        entry(4, "donorCar", { vin: VIN_A, model: "TLX" }, "Разбор"),
      ],
    });
    assert.equal(entities.length, 1);
    assert.deepEqual(
      entities[0]!.sources.map((source) => source.table),
      ["Машины", "Разбор"],
    );
    // Values from both sightings are folded together.
    assert.equal(entities[0]!.values.brand?.normalized, "Acura");
    assert.equal(entities[0]!.values.model?.normalized, "TLX");
  });

  it("keeps the original text next to the normalized one", () => {
    const { entities } = resolveEntities({
      rows: [entry(0, "donorCar", { vin: VIN_A, brand: "  Acura  " })],
    });
    assert.equal(entities[0]!.values.brand?.raw, "  Acura  ");
    assert.equal(entities[0]!.values.brand?.normalized, "Acura");
  });

  it("reports a disagreement instead of overwriting the first value", () => {
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, price: "400000" }),
        entry(1, "donorCar", { vin: VIN_A, price: "450000" }),
      ],
    });
    assert.equal(entities[0]!.values.price?.normalized, "400000");
    assert.equal(entities[0]!.review[0]?.code, "conflicting-values");
    assert.equal(entities[0]!.review[0]?.field, "price");
  });

  it("does not merge a part into a donor that shares its VIN", () => {
    // Both rows carry the car's VIN; they are still two different things.
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, brand: "Acura" }),
        entry(1, "body", { vin: VIN_A, name: "Бампер передний" }),
      ],
    });
    assert.equal(entities.length, 2);
    assert.deepEqual(entities.map((entity) => entity.kind), ["donor", "usedPart"]);
  });

  it("keeps engines with distinct serials apart", () => {
    const { entities } = resolveEntities({
      rows: [
        entry(0, "engine", { serial: "C085834" }),
        entry(1, "engine", { serial: "C816379" }),
        entry(2, "engine", { serial: "c085834" }),
      ],
    });
    assert.equal(entities.length, 2);
  });
});

describe("relationships", () => {
  it("links a part and an engine to the car they came off", () => {
    const { entities, relationships } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, brand: "Acura", model: "TLX" }),
        entry(1, "body", { vin: VIN_A, name: "Бампер передний", serial: "P-1" }),
        entry(2, "engine", { vin: VIN_A, serial: "J35Y-1" }),
      ],
    });
    const donor = entities.find((entity) => entity.kind === "donor")!;
    assert.deepEqual(
      relationships.map((link) => link.kind).sort(),
      ["engine-of-donor", "part-of-donor"],
    );
    for (const link of relationships) assert.equal(link.toId, donor.id);
  });

  it("links nothing when no VIN ties the rows together", () => {
    const { relationships } = resolveEntities({
      rows: [
        entry(0, "donorCar", { brand: "Acura", model: "TLX" }),
        entry(1, "body", { name: "Бампер передний", serial: "P-1" }),
      ],
    });
    assert.deepEqual(relationships, []);
  });

  it("does not attach a part to a car that is not in the file", () => {
    const { relationships } = resolveEntities({
      rows: [entry(0, "body", { vin: VIN_A, name: "Бампер", serial: "P-1" })],
    });
    assert.deepEqual(relationships, []);
  });
});

describe("findMergeCandidates", () => {
  it("proposes — never performs — a merge of two VIN-less cars that look alike", () => {
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { brand: "Toyota", model: "Camry", year: "2015", serial: "A" }),
        entry(1, "donorCar", { brand: "toyota", model: "camry", year: "2015", serial: "B" }),
      ],
    });
    // Resolution itself left them separate.
    assert.equal(entities.length, 2);
    const candidates = findMergeCandidates(entities);
    assert.equal(candidates.length, 1);
    assert.ok(candidates[0]!.confidence < 0.7, "a guess must not read as certain");
  });

  it("does not second-guess cars that already matched on VIN", () => {
    const { entities } = resolveEntities({
      rows: [
        entry(0, "donorCar", { vin: VIN_A, brand: "Toyota", model: "Camry", year: "2015" }),
        entry(1, "donorCar", { vin: VIN_B, brand: "Toyota", model: "Camry", year: "2015" }),
      ],
    });
    assert.deepEqual(findMergeCandidates(entities), []);
  });
});
