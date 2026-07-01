export type ProductUpdateTag =
  | "motors"
  | "warehouse"
  | "work-orders"
  | "documents"
  | "team"
  | "settings";

export type ProductUpdate = {
  id: string;
  date: string;
  title: string;
  summary: string;
  details?: string[];
  href?: string;
  tags?: ProductUpdateTag[];
  highlight?: boolean;
};

export const productUpdateTagLabels: Record<ProductUpdateTag, string> = {
  motors: "Моторы",
  warehouse: "Склад",
  "work-orders": "Заказ-наряды",
  documents: "Документы",
  team: "Команда",
  settings: "Настройки",
};

export const productUpdates: ProductUpdate[] = [
  {
    id: "2026-06-motor-sale-client",
    date: "2026-06-20",
    title: "Покупатель в продаже мотора",
    summary:
      "Указывайте клиента при продаже мотора — он сохранится в базе компании и попадёт в документы.",
    details: [
      "В диалоге продажи можно указать ФИО и телефон покупателя.",
      "Клиент автоматически создаётся в разделе клиентов компании.",
      "Данные покупателя подставляются в гарантийный талон и связанные документы.",
    ],
    href: "/motors",
    tags: ["motors", "documents"],
    highlight: true,
  },
  {
    id: "2026-06-inventory-subcategories",
    date: "2026-06-12",
    title: "Единый список расходников",
    summary: "Склад расходников без категорий — все позиции в одной таблице, проще искать и править.",
    details: [
      "Убраны подкатегории в сайдбаре и фильтры по ним.",
      "Таблица склада: артикул, название, остатки — без колонки «Категория».",
      "Импорт и поиск работают по всему списку сразу.",
    ],
    href: "/warehouse",
    tags: ["warehouse"],
  },
  {
    id: "2026-05-gradient-avatars",
    date: "2026-05-28",
    title: "Градиентные аватары команды",
    summary: "У сотрудников без фото — яркие стабильные аватары по имени.",
    details: [
      "Аватар одинаковый на всех устройствах для одного пользователя.",
      "Работает в журнале активности, команде и меню аккаунта.",
    ],
    href: "/team",
    tags: ["team"],
  },
  {
    id: "2026-05-sidebar-customize",
    date: "2026-05-15",
    title: "Настройка сайдбара",
    summary: "Скрывайте и переставляйте разделы под свой рабочий процесс.",
    details: [
      "Режим настройки доступен из шапки приложения.",
      "Порядок и видимость сохраняются для каждого пользователя.",
    ],
    href: "/settings",
    tags: ["settings"],
  },
];

export function getHighlightedProductUpdate(): ProductUpdate | null {
  return productUpdates.find((update) => update.highlight) ?? productUpdates[0] ?? null;
}

export function getProductUpdateById(id: string): ProductUpdate | undefined {
  return productUpdates.find((update) => update.id === id);
}

export function sortProductUpdatesByDate(updates: ProductUpdate[]): ProductUpdate[] {
  return [...updates].sort((a, b) => b.date.localeCompare(a.date));
}
