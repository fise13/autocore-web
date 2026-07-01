import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { InventoryCategory } from "@/domain/inventory";
import { subcategoriesForGroup } from "@/domain/inventory-taxonomy";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

export type InventoryCategoryRepository = ReturnType<typeof createInventoryCategoryRepository>;

function categoryDocumentId(companyId: string, slug: string): string {
  return `${companyId}_${slug}`;
}

export function createInventoryCategoryRepository() {
  const db = getFirestoreDb();

  return {
    async ensureConsumableCategories(companyId: string): Promise<InventoryCategory[]> {
      const presets = subcategoriesForGroup("consumables");
      const categories: InventoryCategory[] = [];

      for (const preset of presets) {
        const category: InventoryCategory = {
          id: categoryDocumentId(companyId, preset.id),
          companyId,
          name: preset.label,
          path: ["Расходники", preset.label],
        };
        await setDoc(
          doc(db, "inventoryCategories", category.id),
          {
            companyId,
            name: category.name,
            path: category.path,
            inventoryGroup: "consumables",
            subcategoryId: preset.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        categories.push(category);
      }

      return categories;
    },
  };
}
