import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyLocationHeading,
  inferLocationType,
  joinLocationPath,
  pushLocationHeading,
  resolveImportLocationPath,
  splitLocationPath,
} from "@/lib/warehouse/location-path";

describe("splitLocationPath", () => {
  it("nests slash-separated boxes", () => {
    assert.deepEqual(splitLocationPath("СКЛАД А / КОРОБКА 1 / КОРОБКА 2"), [
      "СКЛАД А",
      "КОРОБКА 1",
      "КОРОБКА 2",
    ]);
  });

  it("nests structured warehouse coordinates", () => {
    assert.deepEqual(splitLocationPath("A-03-12"), ["A", "03", "12"]);
  });

  it("does not split an engine serial or a named box with a hyphen", () => {
    assert.deepEqual(splitLocationPath("EJ251-736084"), ["EJ251-736084"]);
    assert.deepEqual(splitLocationPath("КОРОБКА-12"), ["КОРОБКА-12"]);
  });

  it("treats a lone name as one leaf", () => {
    assert.deepEqual(splitLocationPath("СКЛАД НА СВЕРДЛОВА"), ["СКЛАД НА СВЕРДЛОВА"]);
  });
});

describe("pushLocationHeading", () => {
  it("starts a tree at a warehouse heading", () => {
    assert.deepEqual(pushLocationHeading([], "СКЛАД НА СВЕРДЛОВА"), ["СКЛАД НА СВЕРДЛОВА"]);
  });

  it("nests a box under the open warehouse", () => {
    const afterWarehouse = pushLocationHeading([], "СКЛАД НА СВЕРДЛОВА");
    assert.deepEqual(pushLocationHeading(afterWarehouse, "КОРОБКА 1"), [
      "СКЛАД НА СВЕРДЛОВА",
      "КОРОБКА 1",
    ]);
  });

  it("treats the next box as a sibling, not a child", () => {
    let stack = pushLocationHeading([], "СКЛАД А");
    stack = pushLocationHeading(stack, "КОРОБКА 1");
    stack = pushLocationHeading(stack, "КОРОБКА 2");
    assert.deepEqual(stack, ["СКЛАД А", "КОРОБКА 2"]);
  });

  it("nests a box under a rack", () => {
    let stack = pushLocationHeading([], "СКЛАД А");
    stack = pushLocationHeading(stack, "СТЕЛЛАЖ 3");
    stack = pushLocationHeading(stack, "КОРОБКА 1");
    assert.deepEqual(stack, ["СКЛАД А", "СТЕЛЛАЖ 3", "КОРОБКА 1"]);
  });

  it("resets when a new warehouse heading appears", () => {
    let stack = pushLocationHeading([], "СКЛАД А");
    stack = pushLocationHeading(stack, "КОРОБКА 1");
    stack = pushLocationHeading(stack, "СКЛАД Б");
    assert.deepEqual(stack, ["СКЛАД Б"]);
  });

  it("ignores a heading that is not a place", () => {
    const stack = pushLocationHeading(["СКЛАД А"], "ПАРТИЯ ЯНВАРЬ");
    assert.deepEqual(stack, ["СКЛАД А"]);
  });

  it("takes an explicit nested path as the whole tree", () => {
    assert.deepEqual(pushLocationHeading(["СКЛАД А"], "СКЛАД Б / КОРОБКА 1 / КОРОБКА 2"), [
      "СКЛАД Б",
      "КОРОБКА 1",
      "КОРОБКА 2",
    ]);
  });
});

describe("resolveImportLocationPath", () => {
  it("keeps the section when the row has no place of its own", () => {
    assert.deepEqual(
      resolveImportLocationPath({
        sectionPath: ["СКЛАД А", "КОРОБКА 1"],
      }),
      ["СКЛАД А", "КОРОБКА 1"],
    );
  });

  it("hangs a box cell off the warehouse section", () => {
    assert.deepEqual(
      resolveImportLocationPath({
        sectionPath: ["СКЛАД А"],
        cellLocation: "КОРОБКА 9",
      }),
      ["СКЛАД А", "КОРОБКА 9"],
    );
  });

  it("lets a cell that already names a warehouse win", () => {
    assert.deepEqual(
      resolveImportLocationPath({
        sectionPath: ["СКЛАД А"],
        cellLocation: "СКЛАД Б / КОРОБКА 2",
      }),
      ["СКЛАД Б", "КОРОБКА 2"],
    );
  });
});

describe("joinLocationPath / inferLocationType", () => {
  it("joins with the warehouse display separator", () => {
    assert.equal(joinLocationPath(["СКЛАД А", "КОРОБКА 1"]), "СКЛАД А-КОРОБКА 1");
  });

  it("types a named box as a bin", () => {
    assert.equal(inferLocationType("КОРОБКА 1", 1, 2), "bin");
    assert.equal(inferLocationType("СКЛАД А", 0, 2), "zone");
  });

  it("classifies warehouse and box headings", () => {
    assert.equal(classifyLocationHeading("СКЛАД НА СЕЙФУЛЛИНА"), "warehouse");
    assert.equal(classifyLocationHeading("ЯЧЕЙКА 4"), "box");
    assert.equal(classifyLocationHeading("ПАРТИЯ ЯНВАРЬ"), null);
  });
});
