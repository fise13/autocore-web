import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { subcategoriesForGroup } from "@/domain/inventory-taxonomy";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { defaultWarehouseDocId } from "@/lib/warehouse/default-warehouse-id";

function categoryDocumentId(companyId: string, slug: string): string {
  return `${companyId}_${slug}`;
}

/** Seeds consumable taxonomy categories used by the warehouse (Расходники) UI. */
export async function ensureConsumableCategoriesAdmin(companyId: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  if (!normalized) return;

  const presets = subcategoriesForGroup("consumables");
  await Promise.all(
    presets.map((preset) =>
      db
        .collection("inventoryCategories")
        .doc(categoryDocumentId(normalized, preset.id))
        .set(
          {
            companyId: normalized,
            name: preset.label,
            path: ["Расходники", preset.label],
            inventoryGroup: "consumables",
            subcategoryId: preset.id,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
    ),
  );
}

/** Ensures «Основной склад» exists for the company consumables workspace. */
export async function ensureDefaultWarehouseAdmin(companyId: string): Promise<string> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  if (!normalized) {
    throw new Error("companyId is required");
  }

  await ensureConsumableCategoriesAdmin(normalized);

  const docId = defaultWarehouseDocId(normalized);
  const ref = db.collection("warehouses").doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    const defaults = await db
      .collection("warehouses")
      .where("companyId", "==", normalized)
      .where("isDefault", "==", true)
      .limit(1)
      .get();

    if (!defaults.empty) {
      return defaults.docs[0].id;
    }

    await ref.set({
      companyId: normalized,
      name: "Основной склад",
      code: "MAIN",
      isDefault: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return docId;
}
