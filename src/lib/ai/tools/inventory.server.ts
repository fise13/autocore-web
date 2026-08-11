import "server-only";

import { hasPermission } from "@autocore/rbac";

import type { StockLine } from "@/domain/ai/tool-schemas";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { TOP_LEVEL_COLLECTIONS } from "@/infrastructure/firestore/collections";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { normalizeCompanyId } from "@/lib/company-id";
import { createMobileInventoryItem } from "@/lib/mobile/create-inventory-item.server";
import { quickReceiveMobileStock } from "@/lib/mobile/quick-receive.server";
import { relocateMobileStock } from "@/lib/mobile/relocate-stock.server";

/**
 * Read cap for one inventory sweep.
 *
 * The `companyId + updatedAt DESC` index exists, so this reads the most
 * recently touched items and filters in memory — Firestore has no substring
 * search, and `searchTokens` array-contains would miss partial words.
 */
const INVENTORY_READ_CAP = 200;

type InventoryRow = {
  line: StockLine;
  tokens: string[];
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRow(id: string, data: Record<string, unknown>): InventoryRow {
  const sku = String(data.sku ?? id);
  const name = String(data.name ?? "");
  const brandName =
    typeof data.brandName === "string" && data.brandName.trim()
      ? data.brandName.trim()
      : typeof data.brand === "string" && data.brand.trim()
        ? data.brand.trim()
        : undefined;

  const onHand = toNumber(data.totalOnHand ?? data.quantity);
  const reserved = toNumber(data.totalReserved);
  const available = toNumber(data.totalAvailable, onHand);
  const lowStockThreshold = toNumber(data.lowStockThreshold, 1);

  const declaredTokens = Array.isArray(data.searchTokens)
    ? data.searchTokens.map((token) => String(token).toLowerCase())
    : [];

  return {
    line: {
      id,
      sku,
      name,
      brandName,
      unit: String(data.unit ?? "pcs"),
      onHand,
      available,
      reserved,
      lowStock: available <= lowStockThreshold,
      href: `/warehouse?item=${encodeURIComponent(id)}`,
    },
    tokens: [...declaredTokens, sku.toLowerCase(), name.toLowerCase(), (brandName ?? "").toLowerCase()]
      .filter(Boolean),
  };
}

/** Every whitespace-separated term must appear somewhere in the row. */
function matchesQuery(row: InventoryRow, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => row.tokens.some((token) => token.includes(term)));
}

async function readInventoryRows(companyId: string): Promise<InventoryRow[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(TOP_LEVEL_COLLECTIONS.inventoryItems)
    .where("companyId", "==", normalizeCompanyId(companyId))
    .orderBy("updatedAt", "desc")
    .limit(INVENTORY_READ_CAP)
    .get();

  return snapshot.docs.map((doc) => mapRow(doc.id, doc.data() as Record<string, unknown>));
}

export async function searchInventory(
  ctx: CoreToolContext,
  input: { query: string; lowStockOnly?: boolean; limit: number },
) {
  if (ctx.scopes.inventory === "none") {
    return toolFailure("You do not have access to inventory in this company.");
  }

  const rows = await readInventoryRows(ctx.companyId);
  const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);

  const matched = rows
    .filter((row) => matchesQuery(row, terms))
    .filter((row) => (input.lowStockOnly ? row.line.lowStock : true));

  return {
    ok: true as const,
    items: matched.slice(0, input.limit).map((row) => row.line),
    totalMatched: matched.length,
    truncated: rows.length >= INVENTORY_READ_CAP,
    href: "/warehouse",
  };
}

export async function findStockLocation(ctx: CoreToolContext, input: { sku: string }) {
  if (ctx.scopes.inventory === "none") {
    return toolFailure("You do not have access to inventory in this company.");
  }

  const needle = input.sku.trim().toLowerCase();
  const rows = await readInventoryRows(ctx.companyId);
  const exact = rows.find(
    (row) => row.line.sku.toLowerCase() === needle || row.line.name.toLowerCase() === needle,
  );
  const row = exact ?? rows.find((row) => matchesQuery(row, [needle]));

  if (!row) {
    return toolFailure(`No stock item matches "${input.sku}".`);
  }

  const db = getAdminFirestore();
  const balances = await db
    .collection(TOP_LEVEL_COLLECTIONS.inventoryLocationBalances)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .where("itemId", "==", row.line.id)
    .limit(50)
    .get();

  const locationIds = balances.docs
    .map((doc) => String((doc.data() as Record<string, unknown>).locationId ?? ""))
    .filter(Boolean);

  // Firestore `in` accepts at most 30 values; placements beyond that are rare
  // and the balance rows still carry the quantity.
  const locationDocs = locationIds.length
    ? await db.getAll(
        ...locationIds
          .slice(0, 30)
          .map((id) => db.collection(TOP_LEVEL_COLLECTIONS.warehouseLocations).doc(id)),
      )
    : [];

  const displayCodeById = new Map(
    locationDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return [doc.id, String(data.displayCode ?? data.code ?? doc.id)] as const;
      }),
  );

  const placements = balances.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const locationId = String(data.locationId ?? "");
      if (!locationId) return null;
      return {
        locationId,
        displayCode: displayCodeById.get(locationId) ?? locationId,
        warehouseId: String(data.warehouseId ?? ""),
        quantity: toNumber(data.onHand ?? data.quantity),
        href: `/warehouse?location=${encodeURIComponent(locationId)}`,
      };
    })
    .filter((placement): placement is NonNullable<typeof placement> => placement !== null)
    .sort((a, b) => b.quantity - a.quantity);

  return { ok: true as const, item: row.line, placements };
}

export async function createInventoryItem(
  ctx: CoreToolContext,
  input: {
    name: string;
    barcode: string;
    sku?: string;
    brandName?: string;
    unit?: string;
    sellPrice?: number;
    purchasePrice?: number;
    initialQuantity?: number;
    warehouseLocation?: string;
  },
) {
  if (!hasPermission(ctx.profile, "inventory_edit")) {
    return toolFailure("Your role cannot create stock items.");
  }

  const created = await createMobileInventoryItem({
    companyId: ctx.companyId,
    actorUserId: ctx.uid,
    name: input.name,
    barcode: input.barcode,
    sku: input.sku,
    brandName: input.brandName,
    unit: input.unit,
    sellPrice: input.sellPrice,
    purchasePrice: input.purchasePrice,
    initialQuantity: input.initialQuantity,
    warehouseLocation: input.warehouseLocation,
  });

  return {
    ok: true as const,
    itemId: created.itemId,
    sku: created.sku,
    name: created.name,
    barcode: created.barcode,
    href: `/warehouse?item=${encodeURIComponent(created.itemId)}`,
  };
}

export async function receiveStock(
  ctx: CoreToolContext,
  input: { itemId: string; quantity: number; unitCost?: number; warehouseId?: string },
) {
  if (!hasPermission(ctx.profile, "inventory_edit")) {
    return toolFailure("Your role cannot receive stock.");
  }

  const result = await quickReceiveMobileStock({
    companyId: ctx.companyId,
    itemId: input.itemId.trim(),
    quantity: input.quantity,
    actorUserId: ctx.uid,
    unitCost: input.unitCost,
    warehouseId: input.warehouseId,
    idempotencyKey: `core:receive:${input.itemId}:${input.quantity}:${ctx.uid}:${Date.now()}`,
  });

  return {
    ok: true as const,
    itemId: input.itemId.trim(),
    quantity: input.quantity,
    onHand: result.itemTotalOnHand,
    available: result.itemTotalAvailable,
    movementId: result.movementId,
    href: `/warehouse?item=${encodeURIComponent(input.itemId.trim())}`,
  };
}

export async function relocateStock(
  ctx: CoreToolContext,
  input: {
    itemId: string;
    toLocationCode?: string;
    toLocationId?: string;
    fromLocationId?: string;
    quantity?: number;
    warehouseId?: string;
  },
) {
  if (!hasPermission(ctx.profile, "inventory_edit")) {
    return toolFailure("Your role cannot relocate stock.");
  }
  if (!input.toLocationCode?.trim() && !input.toLocationId?.trim()) {
    return toolFailure("Provide toLocationCode or toLocationId.");
  }

  const result = await relocateMobileStock({
    companyId: ctx.companyId,
    itemId: input.itemId.trim(),
    actorUserId: ctx.uid,
    toLocationCode: input.toLocationCode?.trim(),
    toLocationId: input.toLocationId?.trim(),
    fromLocationId: input.fromLocationId?.trim(),
    quantity: input.quantity,
    warehouseId: input.warehouseId,
    idempotencyKey: `core:relocate:${input.itemId}:${input.toLocationCode ?? input.toLocationId}:${ctx.uid}:${Date.now()}`,
  });

  return {
    ok: true as const,
    itemId: input.itemId.trim(),
    quantity: result.quantity,
    toLocationCode: result.toLocationCode,
    movementId: result.movementId,
    href: `/warehouse?location=${encodeURIComponent(result.toLocationId)}`,
  };
}
