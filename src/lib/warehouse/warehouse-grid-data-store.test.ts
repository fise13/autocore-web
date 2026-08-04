import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { InventoryItem } from "@/domain/inventory";
import {
  buildWarehouseReconcilePreserveIds,
  createEmptyWarehouseRow,
  reconcileWarehouseRowsWithRemote,
} from "@/lib/warehouse/warehouse-grid-data-store";

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "sku" | "name">): InventoryItem {
  return {
    companyId: "company",
    type: "consumable",
    barcodes: [],
    unit: "шт",
    currency: "USD",
    totalOnHand: 1,
    totalReserved: 0,
    totalAvailable: 1,
    stockValue: 0,
    status: "active",
    searchTokens: [],
    ...partial,
  };
}

describe("warehouse grid reconcile preserve ids", () => {
  it("collects dirty, pending ack, editing, and context menu rows", () => {
    const preserve = buildWarehouseReconcilePreserveIds({
      dirtyRowIds: ["saved-a", "saved-b"],
      pendingAckRowIds: ["saved-c"],
      editingRowId: "saved-d",
      contextMenuRowId: "saved-e",
    });

    assert.deepEqual([...preserve].sort(), [
      "saved-a",
      "saved-b",
      "saved-c",
      "saved-d",
      "saved-e",
    ]);
  });

  it("keeps dirty saved rows during remote reconcile", () => {
    const localRow = {
      ...item({ id: "item-1", sku: "SKU-1", name: "Локальное имя" }),
      rowKind: "saved" as const,
      rowId: "saved-item-1",
    };
    const remoteItems = [item({ id: "item-1", sku: "SKU-1", name: "Удалённое имя" })];

    const next = reconcileWarehouseRowsWithRemote(
      [localRow],
      remoteItems,
      new Set(["saved-item-1"]),
    );

    assert.equal(next[0]?.rowKind, "saved");
    if (next[0]?.rowKind === "saved") {
      assert.equal(next[0].name, "Локальное имя");
    }
  });

  it("keeps saved rows in their visual positions when remote order changes", () => {
    const first = {
      ...item({ id: "item-1", sku: "SKU-1", name: "First" }),
      rowKind: "saved" as const,
      rowId: "saved-item-1",
    };
    const blank = createEmptyWarehouseRow();
    const third = {
      ...item({ id: "item-2", sku: "SKU-2", name: "Third" }),
      rowKind: "saved" as const,
      rowId: "saved-item-2",
    };

    const next = reconcileWarehouseRowsWithRemote(
      [first, blank, third],
      [
        item({ id: "item-2", sku: "SKU-2", name: "Third updated" }),
        item({ id: "item-1", sku: "SKU-1", name: "First updated" }),
      ],
      new Set(),
    );

    assert.equal(next[0]?.rowKind === "saved" ? next[0].id : null, "item-1");
    assert.equal(next[1]?.rowKind, "empty");
    assert.equal(next[2]?.rowKind === "saved" ? next[2].id : null, "item-2");
  });

  it("replaces a saved draft in place instead of moving it to the top", () => {
    const first = {
      ...item({ id: "item-1", sku: "SKU-1", name: "First" }),
      rowKind: "saved" as const,
      rowId: "saved-item-1",
    };
    const draft = createEmptyWarehouseRow();
    draft.draft.sku = "SKU-NEW";
    draft.draft.name = "New row";

    const next = reconcileWarehouseRowsWithRemote(
      [first, draft],
      [
        item({ id: "item-new", sku: "SKU-NEW", name: "New row" }),
        item({ id: "item-1", sku: "SKU-1", name: "First" }),
      ],
      new Set([draft.rowId]),
    );

    assert.equal(next[0]?.rowKind === "saved" ? next[0].id : null, "item-1");
    assert.equal(next[1]?.rowKind === "saved" ? next[1].id : null, "item-new");
  });
});
