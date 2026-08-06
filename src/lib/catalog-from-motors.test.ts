import assert from "node:assert/strict";
import { test } from "node:test";

import { MotorEntity } from "@/domain/motor";
import {
  collectUsedCatalogKeys,
  deriveCatalogFromMotors,
  mergeCatalogSources,
} from "@/lib/catalog-from-motors";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

function brand(partial: Partial<BrandEntity> & Pick<BrandEntity, "id" | "localId" | "name">): BrandEntity {
  return { companyId: "co", ...partial };
}

function engine(
  partial: Partial<EngineEntity> & Pick<EngineEntity, "id" | "localId" | "brandLocalId" | "code">,
): EngineEntity {
  return { companyId: "co", ...partial };
}

function motor(partial: Partial<MotorEntity> & Pick<MotorEntity, "id">): MotorEntity {
  return {
    companyId: "co",
    serialCode: partial.serialCode ?? "S1",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    ...partial,
  };
}

test("mergeCatalogSources without motorsLoaded prefers Firestore when present", () => {
  const primary = {
    brands: [brand({ id: "b1", localId: 1, name: "vffff" })],
    engines: [] as EngineEntity[],
  };
  const fallback = {
    brands: [brand({ id: "derived-brand-1", localId: 9, name: "Subaru" })],
    engines: [] as EngineEntity[],
  };
  const merged = mergeCatalogSources(primary, fallback);
  assert.equal(merged.brands.length, 1);
  assert.equal(merged.brands[0]?.name, "vffff");
});

test("mergeCatalogSources with motorsLoaded hides orphan Firestore brands", () => {
  const primary = {
    brands: [
      brand({ id: "b1", localId: 1, name: "Subaru" }),
      brand({ id: "b2", localId: 2, name: "vffff" }),
    ],
    engines: [
      engine({ id: "e1", localId: 1, brandLocalId: 1, code: "EJ251" }),
      engine({ id: "e2", localId: 2, brandLocalId: 2, code: "X" }),
    ],
  };
  const motors = [motor({ id: "m1", brandName: "Subaru", engineCode: "EJ251" })];
  const fallback = deriveCatalogFromMotors(motors, "co");
  const merged = mergeCatalogSources(primary, fallback, { motorsLoaded: true });
  assert.deepEqual(
    merged.brands.map((item) => item.name),
    ["Subaru"],
  );
  assert.equal(merged.brands[0]?.id, "b1");
  assert.deepEqual(
    merged.engines.map((item) => item.code),
    ["EJ251"],
  );
  assert.equal(merged.engines[0]?.id, "e1");
});

test("mergeCatalogSources with motorsLoaded keeps Firestore brands when motors have no brands", () => {
  const primary = {
    brands: [brand({ id: "b2", localId: 2, name: "EmptyFolder" })],
    engines: [] as EngineEntity[],
  };
  const fallback = deriveCatalogFromMotors([motor({ id: "m1", brandName: "" })], "co");
  const merged = mergeCatalogSources(primary, fallback, { motorsLoaded: true });
  assert.equal(merged.brands[0]?.name, "EmptyFolder");
});

test("deriveCatalogFromMotors excludes engines that are still in intake", () => {
  const catalog = deriveCatalogFromMotors(
    [
      motor({
        id: "draft",
        brandName: "Unverified Brand",
        engineCode: "DRAFT-1",
        status: "awaiting_verification",
      }),
      motor({
        id: "ready",
        brandName: "Toyota",
        engineCode: "2ZR-FE",
        status: "available",
      }),
    ],
    "co",
  );

  assert.deepEqual(catalog.brands.map((item) => item.name), ["Toyota"]);
  assert.deepEqual(catalog.engines.map((item) => item.code), ["2ZR-FE"]);
});

test("mergeCatalogSources with motorsLoaded keeps manual sidebar folders", () => {
  const primary = {
    brands: [
      brand({ id: "b1", localId: 1, name: "Subaru" }),
      brand({ id: "b2", localId: 2, name: "vffff" }),
      brand({ id: "b3", localId: 3, name: "ManualFolder", manual: true }),
    ],
    engines: [] as EngineEntity[],
  };
  const motors = [motor({ id: "m1", brandName: "Subaru", engineCode: "EJ251" })];
  const fallback = deriveCatalogFromMotors(motors, "co");
  const merged = mergeCatalogSources(primary, fallback, { motorsLoaded: true });
  assert.deepEqual(
    merged.brands.map((item) => item.name).sort(),
    ["ManualFolder", "Subaru"],
  );
});

test("collectUsedCatalogKeys ignores placeholder brand names", () => {
  const keys = collectUsedCatalogKeys([
    { brandName: "Subaru", engineCode: "EJ251" },
    { brandName: "Не указан", engineCode: "X" },
    { brandName: "vffff", engineCode: "—" },
  ]);
  assert.deepEqual([...keys.brandNames].sort(), ["subaru", "vffff"]);
  assert.deepEqual([...keys.engineKeys], ["subaru::ej251"]);
});
