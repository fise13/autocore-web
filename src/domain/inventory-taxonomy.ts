export type InventoryGroupId = "aggregates" | "parts" | "consumables";

export type InventorySubcategoryId =
  | "engines"
  | "gearboxes"
  | "turbos"
  | "reducers"
  | "transfer_cases"
  | "body"
  | "optics"
  | "interior"
  | "suspension"
  | "electrical"
  | "oils"
  | "antifreeze"
  | "filters"
  | "spark_plugs"
  | "sealants";

export type InventoryTaxonomyKind = "motors" | "catalog" | "warehouse";

export type InventoryTaxonomyGroup = {
  id: InventoryGroupId;
  label: string;
};

export type InventoryTaxonomySubcategory = {
  id: InventorySubcategoryId;
  groupId: InventoryGroupId;
  label: string;
  kind: InventoryTaxonomyKind;
  aliases: readonly string[];
};

/**
 * Labels are English (US market). `aliases` still include the original
 * Russian terms so a supplier spreadsheet or a free-typed search in Russian
 * keeps matching the right subcategory — see `resolveSubcategoryForCategoryName`.
 */
export const INVENTORY_GROUPS = [
  { id: "aggregates", label: "Aggregates" },
  { id: "parts", label: "Parts" },
  { id: "consumables", label: "Consumables" },
] as const satisfies readonly InventoryTaxonomyGroup[];

export const INVENTORY_TAXONOMY = [
  {
    id: "engines",
    groupId: "aggregates",
    label: "Engines",
    kind: "motors",
    aliases: ["двигатель", "двигатели", "мотор", "моторы", "engine", "motor"],
  },
  {
    id: "gearboxes",
    groupId: "aggregates",
    label: "Transmissions",
    kind: "catalog",
    aliases: ["кпп", "коробка", "коробки", "акпп", "мкпп", "akpp", "mkpp", "gearbox", "transmission"],
  },
  {
    id: "turbos",
    groupId: "aggregates",
    label: "Turbos",
    kind: "catalog",
    aliases: ["турбина", "турбины", "турбо", "turbo", "turbos"],
  },
  {
    id: "reducers",
    groupId: "aggregates",
    label: "Differentials",
    kind: "catalog",
    aliases: ["редуктор", "редукторы", "мост", "мосты", "axle", "axles", "differential", "differentials"],
  },
  {
    id: "transfer_cases",
    groupId: "aggregates",
    label: "Transfer cases",
    kind: "catalog",
    aliases: ["раздатка", "раздатки", "раздаточная", "transfer", "tcase", "transfer case"],
  },
  {
    id: "body",
    groupId: "parts",
    label: "Body",
    kind: "catalog",
    aliases: [
      "кузов", "кузовщина", "бампер", "бамперы", "крыло", "крылья", "дверь", "двери",
      "body", "bumper", "bumpers", "fender", "fenders", "door", "doors",
    ],
  },
  {
    id: "optics",
    groupId: "parts",
    label: "Lighting",
    kind: "catalog",
    aliases: ["оптика", "фара", "фары", "фонарь", "фонари", "headlight", "headlights", "taillight", "taillights"],
  },
  {
    id: "interior",
    groupId: "parts",
    label: "Interior",
    kind: "catalog",
    aliases: ["салон", "интерьер", "сиденье", "сиденья", "торпедо", "interior", "seat", "seats", "dashboard"],
  },
  {
    id: "suspension",
    groupId: "parts",
    label: "Suspension",
    kind: "catalog",
    aliases: [
      "подвеска", "рычаг", "рычаги", "стойка", "стойки", "амортизатор",
      "suspension", "control arm", "strut", "struts", "shock", "shocks",
    ],
  },
  {
    id: "electrical",
    groupId: "parts",
    label: "Electrical",
    kind: "catalog",
    aliases: [
      "электрика", "эбу", "ecu", "блок", "блоки", "генератор", "генераторы", "стартер", "стартеры",
      "electrical", "alternator", "alternators", "starter", "starters",
    ],
  },
  {
    id: "oils",
    groupId: "consumables",
    label: "Oils",
    kind: "warehouse",
    aliases: ["масло", "масла", "oil", "oils"],
  },
  {
    id: "antifreeze",
    groupId: "consumables",
    label: "Antifreeze",
    kind: "warehouse",
    aliases: ["антифриз", "охлаждающая жидкость", "coolant", "antifreeze"],
  },
  {
    id: "filters",
    groupId: "consumables",
    label: "Filters",
    kind: "warehouse",
    aliases: ["фильтр", "фильтры", "filter", "filters"],
  },
  {
    id: "spark_plugs",
    groupId: "consumables",
    label: "Spark plugs",
    kind: "warehouse",
    aliases: ["свеча", "свечи", "spark plug", "spark plugs"],
  },
  {
    id: "sealants",
    groupId: "consumables",
    label: "Sealants",
    kind: "warehouse",
    aliases: ["герметик", "герметики", "sealant", "sealants"],
  },
] as const satisfies readonly InventoryTaxonomySubcategory[];

const GROUPS_BY_ID = new Map(INVENTORY_GROUPS.map((group) => [group.id, group]));
const SUBCATEGORIES_BY_ID = new Map(INVENTORY_TAXONOMY.map((item) => [item.id, item]));

function normalizeTaxonomyKey(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
}

export function isInventoryGroupId(value: unknown): value is InventoryGroupId {
  return typeof value === "string" && GROUPS_BY_ID.has(value as InventoryGroupId);
}

export function isInventorySubcategoryId(value: unknown): value is InventorySubcategoryId {
  return typeof value === "string" && SUBCATEGORIES_BY_ID.has(value as InventorySubcategoryId);
}

export function groupLabel(groupId: InventoryGroupId): string {
  return GROUPS_BY_ID.get(groupId)?.label ?? groupId;
}

export function subcategoryLabel(subcategoryId: InventorySubcategoryId): string {
  return SUBCATEGORIES_BY_ID.get(subcategoryId)?.label ?? subcategoryId;
}

export function presetForSubcategory(
  subcategoryId: InventorySubcategoryId,
): InventoryTaxonomySubcategory | undefined {
  return SUBCATEGORIES_BY_ID.get(subcategoryId);
}

export function subcategoriesForGroup(groupId: InventoryGroupId): InventoryTaxonomySubcategory[] {
  return INVENTORY_TAXONOMY.filter((item) => item.groupId === groupId);
}

export function resolveSubcategoryForCategoryName(
  value: string,
): InventoryTaxonomySubcategory | undefined {
  const key = normalizeTaxonomyKey(value);
  if (!key) return undefined;

  return INVENTORY_TAXONOMY.find((item) => {
    if (normalizeTaxonomyKey(item.label) === key) return true;
    return item.aliases.some((alias) => normalizeTaxonomyKey(alias) === key);
  });
}

export function resolveGroupForCategoryName(value: string): InventoryGroupId {
  const subcategory = resolveSubcategoryForCategoryName(value);
  if (subcategory) return subcategory.groupId;

  const key = normalizeTaxonomyKey(value);
  if (/насос|помпа|pump/.test(key)) return "aggregates";
  if (/масл|антифриз|фильтр|свеч|герметик|oil|coolant|filter|sealant/.test(key)) {
    return "consumables";
  }
  if (/кузов|фара|оптик|салон|подвес|электр|эбу|ecu|стартер|генератор/.test(key)) {
    return "parts";
  }

  return "parts";
}
