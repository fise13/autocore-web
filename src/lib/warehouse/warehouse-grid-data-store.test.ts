import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { InventoryItem } from "@/domain/inventory";
import {
  buildWarehouseReconcilePreserveIds,
  reconcileWarehouseRowsWithRemote,
} from "@/lib/warehouse/warehouse-grid-data-store";

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "sku" | "name">): InventoryItem {
  return {
    companyId: "company",
    type: "consumable",
    barcodes: [],
    unit: "шт",
    currency: "KZT",
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
});
