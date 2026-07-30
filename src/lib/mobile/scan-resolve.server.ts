import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeBarcode } from "@/lib/warehouse/warehouse-sync-ids";

import { isBarcodeLikeCode, rankFuzzyScanCandidates } from "./scan-fuzzy.server";
import { buildScanCodeVariants, primaryScanCode, scanToken } from "./scan-normalize";
import type {
  MobileScanCandidate,
  MobileScanItem,
  MobileScanMatchType,
  MobileScanResolveResult,
  MobileScanStockLevel,
} from "./scan-types";

export type {
  MobileScanCandidate,
  MobileScanItem,
  MobileScanMatchType,
  MobileScanResolveResult,
  MobileScanStockLevel,
} from "./scan-types";

type ResolveCacheEntry = {
  expiresAt: number;
  result: MobileScanResolveResult;
};

const RESOLVE_CACHE = new Map<string, ResolveCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 500;

function cacheKey(companyId: string, barcode: string, strict = false): string {
  return `${companyId}::${strict ? "strict:" : "loose:"}${barcode}`;
}

function readCache(
  companyId: string,
  barcode: string,
  strict = false,
): MobileScanResolveResult | null {
  const key = cacheKey(companyId, barcode, strict);
  const entry = RESOLVE_CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    RESOLVE_CACHE.delete(key);
    return null;
  }
  return entry.result;
}

function writeCache(
  companyId: string,
  barcode: string,
  result: MobileScanResolveResult,
  strict = false,
): void {
  if (RESOLVE_CACHE.size >= CACHE_LIMIT) {
    const firstKey = RESOLVE_CACHE.keys().next().value;
    if (firstKey) RESOLVE_CACHE.delete(firstKey);
  }
  RESOLVE_CACHE.set(cacheKey(companyId, barcode, strict), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result,
  });
}

function mapItem(id: string, data: Record<string, unknown>): MobileScanItem {
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  const totalReserved = Number(data.totalReserved ?? 0);
  return {
    id,
    sku: String(data.sku ?? ""),
    name: String(data.name ?? ""),
    unit: typeof data.unit === "string" ? data.unit : "pcs",
    barcodes: Array.isArray(data.barcodes) ? data.barcodes.map(String) : [],
    brandName: typeof data.brandName === "string" ? data.brandName : undefined,
    warehouseLocation:
      typeof data.warehouseLocation === "string" ? data.warehouseLocation : undefined,
    primaryLocationCode:
      typeof data.primaryLocationCode === "string" ? data.primaryLocationCode : undefined,
    sellPrice: data.sellPrice == null ? undefined : Number(data.sellPrice),
    purchasePrice: data.purchasePrice == null ? undefined : Number(data.purchasePrice),
    totalOnHand,
    totalReserved,
    totalAvailable: Number(data.totalAvailable ?? totalOnHand - totalReserved),
    lowStockThreshold:
      data.lowStockThreshold == null ? undefined : Number(data.lowStockThreshold),
  };
}

async function loadWarehouseNames(
  companyId: string,
  warehouseIds: string[],
): Promise<Map<string, string>> {
  const db = getAdminFirestore();
  const names = new Map<string, string>();
  await Promise.all(
    warehouseIds.map(async (warehouseId) => {
      const snap = await db.collection("warehouses").doc(warehouseId).get();
      names.set(
        warehouseId,
        snap.exists ? String(snap.data()?.name ?? warehouseId) : warehouseId,
      );
    }),
  );
  return names;
}

async function loadStockLevels(
  companyId: string,
  itemId: string,
): Promise<MobileScanStockLevel[]> {
  const db = getAdminFirestore();
  const stockSnap = await db
    .collection("inventoryStockLevels")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .where("itemId", "==", itemId)
    .limit(20)
    .get();

  const warehouseIds = stockSnap.docs.map((doc) => String(doc.data().warehouseId ?? ""));
  const warehouseNames = await loadWarehouseNames(companyId, warehouseIds);

  const stockLevels = stockSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const warehouseId = String(data.warehouseId ?? "");
    const onHand = Number(data.onHand ?? 0);
    const reserved = Number(data.reserved ?? 0);
    return {
      warehouseId,
      warehouseName: warehouseNames.get(warehouseId) ?? warehouseId,
      onHand,
      reserved,
      available: Number(data.available ?? onHand - reserved),
    };
  });

  stockLevels.sort((a, b) => b.onHand - a.onHand);
  return stockLevels;
}

async function loadItem(
  companyId: string,
  itemId: string,
): Promise<MobileScanItem | null> {
  const db = getAdminFirestore();
  const itemSnap = await db.collection("inventoryItems").doc(itemId).get();
  if (!itemSnap.exists) return null;
  const data = itemSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
    return null;
  }
  return mapItem(itemSnap.id, data);
}

async function resolveExactTier(
  companyId: string,
  variants: string[],
): Promise<{ itemId: string; matchType: MobileScanMatchType } | null> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const mappingHits = await Promise.all(
    variants.map(async (variant) => {
      const mappingSnap = await db
        .collection("barcodeMappings")
        .where("companyId", "==", normalizedCompanyId)
        .where("barcode", "==", variant)
        .limit(1)
        .get();
      if (mappingSnap.empty) return null;
      const itemId = String(mappingSnap.docs[0]!.data().itemId ?? "");
      if (!itemId) return null;
      return { itemId, matchType: "barcode_mapping" as const, variant };
    }),
  );
  for (const variant of variants) {
    const hit = mappingHits.find((entry) => entry?.variant === variant);
    if (hit?.itemId) return { itemId: hit.itemId, matchType: hit.matchType };
  }

  const skuHits = await Promise.all(
    variants.map(async (variant) => {
      const skuSnap = await db
        .collection("inventoryItems")
        .where("companyId", "==", normalizedCompanyId)
        .where("sku", "==", variant)
        .limit(1)
        .get();
      if (skuSnap.empty) return null;
      return { itemId: skuSnap.docs[0]!.id, matchType: "sku" as const, variant };
    }),
  );
  for (const variant of variants) {
    const hit = skuHits.find((entry) => entry?.variant === variant);
    if (hit?.itemId) return { itemId: hit.itemId, matchType: hit.matchType };
  }

  const barcodeHits = await Promise.all(
    variants.map(async (variant) => {
      const barcodeSnap = await db
        .collection("inventoryItems")
        .where("companyId", "==", normalizedCompanyId)
        .where("barcodes", "array-contains", variant)
        .limit(1)
        .get();
      if (barcodeSnap.empty) return null;
      return { itemId: barcodeSnap.docs[0]!.id, matchType: "barcode_field" as const, variant };
    }),
  );
  for (const variant of variants) {
    const hit = barcodeHits.find((entry) => entry?.variant === variant);
    if (hit?.itemId) return { itemId: hit.itemId, matchType: hit.matchType };
  }

  const tokens = [...new Set(variants.map(scanToken).filter((token) => token.length >= 3))];
  const tokenHits = await Promise.all(
    tokens.map(async (token) => {
      const tokenSnap = await db
        .collection("inventoryItems")
        .where("companyId", "==", normalizedCompanyId)
        .where("searchTokens", "array-contains", token)
        .limit(1)
        .get();
      if (tokenSnap.empty) return null;
      return { itemId: tokenSnap.docs[0]!.id, matchType: "search_token" as const, token };
    }),
  );
  for (const token of tokens) {
    const hit = tokenHits.find((entry) => entry?.token === token);
    if (hit?.itemId) return { itemId: hit.itemId, matchType: hit.matchType };
  }

  return null;
}

async function loadFuzzyInventoryPool(companyId: string): Promise<MobileScanItem[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("inventoryItems")
    .where("companyId", "==", normalizeCompanyId(companyId))
    .where("status", "==", "active")
    .limit(250)
    .get();

  return snap.docs.map((doc) => mapItem(doc.id, doc.data() as Record<string, unknown>));
}

function emptyResult(barcode: string): MobileScanResolveResult {
  return {
    found: false,
    confidence: 0,
    barcode,
    matchType: null,
    item: null,
    candidates: [],
    stockLevels: [],
  };
}

function successResult(
  barcode: string,
  matchType: MobileScanMatchType,
  item: MobileScanItem,
  stockLevels: MobileScanStockLevel[],
  confidence: number,
  candidates: MobileScanCandidate[] = [],
  aiReasoning?: string,
): MobileScanResolveResult {
  return {
    found: true,
    confidence,
    barcode,
    matchType,
    item,
    candidates,
    stockLevels,
    aiReasoning,
  };
}

export async function resolveMobileScan(
  companyId: string,
  rawBarcode: string,
  options?: { skipCache?: boolean; skipFuzzy?: boolean; strictBarcode?: boolean },
): Promise<MobileScanResolveResult> {
  const barcode = primaryScanCode(rawBarcode) || normalizeBarcode(rawBarcode);
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const strictBarcode = options?.strictBarcode ?? false;

  if (!barcode) return emptyResult("");

  if (!options?.skipCache) {
    const cached = readCache(normalizedCompanyId, barcode, strictBarcode);
    if (cached) return cached;
  }

  const variants = buildScanCodeVariants(rawBarcode);
  const exact = await resolveExactTier(normalizedCompanyId, variants);
  if (exact) {
    const [item, stockLevels] = await Promise.all([
      loadItem(normalizedCompanyId, exact.itemId),
      loadStockLevels(normalizedCompanyId, exact.itemId),
    ]);
    if (!item) return emptyResult(barcode);
    const result = successResult(barcode, exact.matchType, item, stockLevels, 1);
    writeCache(normalizedCompanyId, barcode, result, strictBarcode);
    return result;
  }

  if (options?.skipFuzzy || strictBarcode) {
    const result = emptyResult(barcode);
    writeCache(normalizedCompanyId, barcode, result, strictBarcode);
    return result;
  }

  const pool = await loadFuzzyInventoryPool(normalizedCompanyId);
  const ranked = rankFuzzyScanCandidates(barcode, pool, 5);
  if (ranked.length === 0) {
    const result = emptyResult(barcode);
    writeCache(normalizedCompanyId, barcode, result, strictBarcode);
    return result;
  }

  const top = ranked[0]!;
  const stockLevels = await loadStockLevels(normalizedCompanyId, top.item.id);
  const candidates = ranked.map((entry) => ({
    item: entry.item,
    score: entry.score,
    reason: entry.reason,
  }));

  const ambiguous = ranked.length > 1 && ranked[1]!.score >= top.score - 0.1;
  const autoAcceptThreshold = isBarcodeLikeCode(barcode) ? 0.99 : 0.8;
  if (ambiguous || top.score < autoAcceptThreshold) {
    const result: MobileScanResolveResult = {
      found: false,
      confidence: top.score,
      barcode,
      matchType: "fuzzy",
      item: null,
      candidates,
      stockLevels: [],
    };
    writeCache(normalizedCompanyId, barcode, result, strictBarcode);
    return result;
  }

  const result = successResult(barcode, "fuzzy", top.item, stockLevels, top.score, candidates);
  writeCache(normalizedCompanyId, barcode, result, strictBarcode);
  return result;
}

export async function resolveMobileScanForItemId(
  companyId: string,
  rawBarcode: string,
  itemId: string,
  matchType: MobileScanMatchType = "fuzzy",
  confidence = 0.9,
): Promise<MobileScanResolveResult> {
  const barcode = primaryScanCode(rawBarcode) || normalizeBarcode(rawBarcode);
  const item = await loadItem(companyId, itemId);
  if (!item) return emptyResult(barcode);
  const stockLevels = await loadStockLevels(companyId, itemId);
  return successResult(barcode, matchType, item, stockLevels, confidence);
}
