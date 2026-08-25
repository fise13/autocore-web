import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDuplicateGroups,
  countDuplicateRows,
  resolveRowAction,
} from "@/lib/import/duplicate-resolution";

describe("buildDuplicateGroups", () => {
  it("groups rows that repeat a serial", () => {
    const groups = buildDuplicateGroups([
      { id: "a", values: { serial: "C085834" } },
      { id: "b", values: { serial: "c085834 " } },
      { id: "c", values: { serial: "C816379" } },
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.field, "serial");
    assert.deepEqual(groups[0]!.rowIds, ["a", "b"]);
  });

  it("never groups distinct engines that share a product name", () => {
    // Every EJ253 is now named "Subaru EJ253"; grouping on that would collapse
    // a hundred separate engines into one record.
    const groups = buildDuplicateGroups([
      { id: "a", values: { name: "Subaru EJ253", serial: "C816379" } },
      { id: "b", values: { name: "Subaru EJ253", serial: "C048730" } },
      { id: "c", values: { name: "Subaru EJ253", serial: "D508070" } },
    ]);
    assert.deepEqual(groups, []);
  });

  it("still groups by name when the rows have no identity of their own", () => {
    const groups = buildDuplicateGroups([
      { id: "a", values: { name: "Масло 5W30" } },
      { id: "b", values: { name: "масло 5w30" } },
    ]);
    assert.equal(groups[0]?.field, "name");
    assert.deepEqual(groups[0]?.rowIds, ["a", "b"]);
  });

  it("reports only the strongest field that finds anything", () => {
    const groups = buildDuplicateGroups([
      { id: "a", values: { serial: "S1", sku: "K1" } },
      { id: "b", values: { serial: "S1", sku: "K1" } },
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.field, "serial");
  });

  it("finds nothing in a clean file", () => {
    assert.deepEqual(
      buildDuplicateGroups([
        { id: "a", values: { serial: "S1" } },
        { id: "b", values: { serial: "S2" } },
      ]),
      [],
    );
  });
});

describe("countDuplicateRows", () => {
  it("counts what would be dropped, not what would be kept", () => {
    assert.equal(countDuplicateRows([{ rowIds: ["a", "b", "c"] }, { rowIds: ["d", "e"] }]), 3);
  });
});

describe("resolveRowAction", () => {
  const group = { field: "serial" as const, rowIds: ["a", "b", "c"], resolution: "update" as const };

  it("keeps the first row of an update group and drops its repeats", () => {
    // The bug: all three used to be committed, so one engine became three.
    assert.deepEqual(resolveRowAction("a", [group]), { skip: false, updateExisting: true });
    assert.deepEqual(resolveRowAction("b", [group]), { skip: true, updateExisting: false });
    assert.deepEqual(resolveRowAction("c", [group]), { skip: true, updateExisting: false });
  });

  it("keeps every row when the person asked for separate records", () => {
    const create = { ...group, resolution: "create" as const };
    for (const id of ["a", "b", "c"]) {
      assert.deepEqual(resolveRowAction(id, [create]), { skip: false, updateExisting: false });
    }
  });

  it("drops the whole group on skip, first row included", () => {
    const skip = { ...group, resolution: "skip" as const };
    for (const id of ["a", "b", "c"]) {
      assert.deepEqual(resolveRowAction(id, [skip]), { skip: true, updateExisting: false });
    }
  });

  it("leaves rows outside every group untouched", () => {
    assert.deepEqual(resolveRowAction("z", [group]), { skip: false, updateExisting: false });
  });

  it("lets an explicit skip win over an update in another group", () => {
    const other = { field: "name" as const, rowIds: ["a", "z"], resolution: "skip" as const };
    assert.deepEqual(resolveRowAction("a", [group, other]), { skip: true, updateExisting: false });
  });

  it("does not import a row twice when it repeats in two groups", () => {
    const bySerial = { field: "serial" as const, rowIds: ["a", "b"], resolution: "update" as const };
    const bySku = { field: "sku" as const, rowIds: ["b", "c"], resolution: "update" as const };
    // b is a repeat under serial; being first under sku must not resurrect it.
    assert.deepEqual(resolveRowAction("b", [bySerial, bySku]), { skip: true, updateExisting: false });
  });
});
