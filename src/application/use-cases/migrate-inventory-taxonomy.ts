import {
  CompanyAppConfig,
  CompanySpecificCategoryConfig,
} from "@/domain/company-config";
import {
  InventoryGroupId,
  InventorySubcategoryId,
  resolveGroupForCategoryName,
  resolveSubcategoryForCategoryName,
} from "@/domain/inventory-taxonomy";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";

export const INVENTORY_TAXONOMY_VERSION = 2;

const LEGACY_CATEGORY_IDS: Record<string, { name: string; groupId: InventoryGroupId; subcategoryId?: InventorySubcategoryId }> = {
  gearboxes: { name: "КПП", groupId: "aggregates", subcategoryId: "gearboxes" },
  transfer_cases: { name: "Раздатки", groupId: "aggregates", subcategoryId: "transfer_cases" },
  turbos: { name: "Турбины", groupId: "aggregates", subcategoryId: "turbos" },
  ecu: { name: "Электрика", groupId: "parts", subcategoryId: "electrical" },
  alternators: { name: "Электрика", groupId: "parts", subcategoryId: "electrical" },
  starters: { name: "Электрика", groupId: "parts", subcategoryId: "electrical" },
  bumpers: { name: "Кузовщина", groupId: "parts", subcategoryId: "body" },
  fenders: { name: "Кузовщина", groupId: "parts", subcategoryId: "body" },
  headlights: { name: "Оптика", groupId: "parts", subcategoryId: "optics" },
};

export function normalizeCompanySpecificCategoryForTaxonomy(
  category: CompanySpecificCategoryConfig,
): CompanySpecificCategoryConfig {
  const legacy = LEGACY_CATEGORY_IDS[category.id];
  if (legacy) {
    return {
      ...category,
      name: legacy.name,
      groupId: legacy.groupId,
      subcategoryId: legacy.subcategoryId,
    };
  }

  const resolvedSubcategory = resolveSubcategoryForCategoryName(category.name);
  return {
    ...category,
    groupId: category.groupId ?? resolvedSubcategory?.groupId ?? resolveGroupForCategoryName(category.name),
    subcategoryId: category.subcategoryId ?? resolvedSubcategory?.id,
  };
}

export function normalizeCompanyConfigForTaxonomy(config: CompanyAppConfig): CompanyAppConfig {
  const byKey = new Map<string, CompanySpecificCategoryConfig>();
  for (const category of config.specificCategories.map(normalizeCompanySpecificCategoryForTaxonomy)) {
    const key = `${category.groupId}:${category.subcategoryId ?? category.name.toLocaleLowerCase("ru")}`;
    if (!byKey.has(key)) {
      byKey.set(key, category);
    }
  }

  return {
    ...config,
    specificCategories: [...byKey.values()],
    taxonomyVersion: INVENTORY_TAXONOMY_VERSION,
  };
}

function normalizeSpecificCategoryEntity(category: SpecificCategoryEntity): Partial<SpecificCategoryEntity> {
  const resolvedSubcategory = resolveSubcategoryForCategoryName(category.name);
  const nextName = category.name.trim().localeCompare("Коробки", "ru", { sensitivity: "accent" }) === 0
    ? "КПП"
    : resolvedSubcategory?.label ?? category.name;
  const nextGroupId = resolvedSubcategory?.groupId ?? resolveGroupForCategoryName(nextName);
  return {
    name: nextName,
    groupId: nextGroupId,
    subcategoryId: resolvedSubcategory?.id,
  };
}

export async function migrateInventoryTaxonomyUseCase(params: {
  companyId: string;
  actorUserId: string;
  config: CompanyAppConfig;
  specificCategoryRepository: SpecificCategoryRepository;
}) {
  if (!params.companyId || params.config.taxonomyVersion === INVENTORY_TAXONOMY_VERSION) {
    return params.config;
  }

  const configRepository = createCompanyConfigRepository();
  const nextConfig = normalizeCompanyConfigForTaxonomy(params.config);
  await configRepository.saveAppConfig(params.companyId, nextConfig, params.actorUserId);

  const categories = await params.specificCategoryRepository.fetchCategories(params.companyId);
  await Promise.all(
    categories.map((category) => {
      const patch = normalizeSpecificCategoryEntity(category);
      return params.specificCategoryRepository.updateCategory(params.companyId, category, patch);
    }),
  );

  return nextConfig;
}
