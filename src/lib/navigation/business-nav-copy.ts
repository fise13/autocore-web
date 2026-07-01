import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";

export const businessNavCopy = {
  workspace: {
    dashboard: "Дашборд",
  },
  business: {
    inventory: "Склад",
    sales: "Продажи",
    workOrders: "Заказ-наряды",
    accounting: "Бухгалтерия",
    documents: "Документы",
    myEarnings: "Мои начисления",
    team: "Команда",
  },
  collections: {
    brands: "Бренды",
    consumableCategories: "Категории",
    uncategorized: "Неразобранное",
  },
  quickActions: {
    section: "Быстрые действия",
    importBusiness: "Импорт бизнеса",
    addEngine: "Добавить двигатель",
    sellItem: "Продать",
    createWorkOrder: "Создать заказ-наряд",
  },
  empty: {
    brands: "Бренды появятся после импорта двигателей",
    brandsAction: "Импортировать",
  },
  inventoryCollection: {
    engines: "Двигатели",
    transmissions: "КПП",
    parts: "Запчасти",
    consumables: "Расходники",
  } satisfies Record<InventoryCollectionId, string>,
} as const;

export function inventoryCollectionLabel(collection: InventoryCollectionId): string {
  return businessNavCopy.inventoryCollection[collection];
}
