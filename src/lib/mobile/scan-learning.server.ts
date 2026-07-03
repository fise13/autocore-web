import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

export type ScanLearningExample = {
  payload: string;
  itemId: string;
  itemName: string;
  itemSku: string;
};

/** Few-shot examples for scan disambiguation (confirmed mappings). */
export async function loadScanFewShotExamples(
  companyId: string,
  limit = 5,
): Promise<ScanLearningExample[]> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);

  const snap = await db
    .collection("scanEvents")
    .where("companyId", "==", normalizedCompanyId)
    .where("outcome", "in", ["user_picked_candidate", "created_mapping", "auto_accept"])
    .orderBy("createdAt", "desc")
    .limit(40)
    .get()
    .catch(async () => {
      return db
        .collection("scanEvents")
        .where("companyId", "==", normalizedCompanyId)
        .limit(40)
        .get();
    });

  const examples: ScanLearningExample[] = [];
  const seen = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const itemId = String(data.itemId ?? "");
    const payload = String(data.normalizedPayload || data.rawPayload || "");
    if (!itemId || !payload) continue;
    const key = `${payload}::${itemId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const itemSnap = await db.collection("inventoryItems").doc(itemId).get();
    if (!itemSnap.exists) continue;
    const itemData = itemSnap.data() as Record<string, unknown>;
    examples.push({
      payload,
      itemId,
      itemName: String(itemData.name ?? ""),
      itemSku: String(itemData.sku ?? ""),
    });
    if (examples.length >= limit) break;
  }

  return examples;
}

export type ScanEventExportRow = {
  companyId: string;
  rawPayload: string;
  normalizedPayload: string;
  itemId: string | null;
  matchType: string | null;
  confidence: number;
  outcome: string;
  source: string;
  createdAt: string;
};

export async function exportScanEvents(
  companyId: string,
  options?: { limit?: number; sinceDays?: number },
): Promise<ScanEventExportRow[]> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const limit = options?.limit ?? 5000;

  const snap = await db
    .collection("scanEvents")
    .where("companyId", "==", normalizedCompanyId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const sinceMs =
    options?.sinceDays != null ? Date.now() - options.sinceDays * 24 * 60 * 60 * 1000 : null;

  return snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const createdAt = data.createdAt;
      const createdIso =
        createdAt && typeof createdAt === "object" && "toDate" in createdAt
          ? (createdAt as { toDate: () => Date }).toDate().toISOString()
          : "";
      return {
        companyId: normalizedCompanyId,
        rawPayload: String(data.rawPayload ?? ""),
        normalizedPayload: String(data.normalizedPayload ?? ""),
        itemId: data.itemId ? String(data.itemId) : null,
        matchType: data.matchType ? String(data.matchType) : null,
        confidence: Number(data.confidence ?? 0),
        outcome: String(data.outcome ?? ""),
        source: String(data.source ?? ""),
        createdAt: createdIso,
      };
    })
    .filter((row) => !sinceMs || (row.createdAt && Date.parse(row.createdAt) >= sinceMs));
}

export function aggregateScanMetrics(rows: ScanEventExportRow[]) {
  const total = rows.length;
  const exact = rows.filter((row) => row.matchType === "barcode_mapping" || row.matchType === "sku" || row.matchType === "barcode_field").length;
  const fuzzy = rows.filter((row) => row.matchType === "fuzzy").length;
  const overrides = rows.filter((row) =>
    ["user_picked_candidate", "user_rejected", "created_mapping"].includes(row.outcome),
  ).length;
  const unknown = rows.filter((row) => row.outcome === "unknown").length;

  return {
    total,
    resolveRateExact: total ? exact / total : 0,
    resolveRateFuzzy: total ? fuzzy / total : 0,
    userOverrideRate: total ? overrides / total : 0,
    unknownRate: total ? unknown / total : 0,
  };
}
