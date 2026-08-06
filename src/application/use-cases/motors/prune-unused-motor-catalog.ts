import { MotorEntity } from "@/domain/motor";
import { collectUsedCatalogKeys } from "@/lib/catalog-from-motors";
import {
  BrandEntity,
  CatalogRepository,
  EngineEntity,
} from "@/infrastructure/firestore/catalog-repository";

function isDerivedCatalogId(id: string): boolean {
  return id.startsWith("derived-brand-") || id.startsWith("derived-engine-");
}

/**
 * Deletes Firestore catalog brands/engines that no motor references.
 * Keeps Excel sidebar in sync after clearing cells / soft-deleting rows.
 */
export async function pruneUnusedMotorCatalogUseCase(
  catalogRepository: CatalogRepository,
  params: {
    motors: Array<Pick<MotorEntity, "brandName" | "engineCode">>;
    brands: BrandEntity[];
    engines: EngineEntity[];
  },
): Promise<{ brands: BrandEntity[]; engines: EngineEntity[] }> {
  const { brandNames: usedBrandNames, engineKeys: usedEngineKeys } = collectUsedCatalogKeys(
    params.motors,
  );

  const brandNameByLocalId = new Map(
    params.brands.map((brand) => [brand.localId, brand.name] as const),
  );

  const keptEngines: EngineEntity[] = [];
  for (const engine of params.engines) {
    if (isDerivedCatalogId(engine.id)) {
      keptEngines.push(engine);
      continue;
    }
    const brandName = brandNameByLocalId.get(engine.brandLocalId) ?? "";
    const key = `${brandName.trim().toLowerCase()}::${engine.code.trim().toLowerCase()}`;
    if (usedEngineKeys.has(key)) {
      keptEngines.push(engine);
      continue;
    }
    await catalogRepository.deleteEngine(engine);
  }

  const keptBrands: BrandEntity[] = [];
  for (const brand of params.brands) {
    if (isDerivedCatalogId(brand.id)) {
      keptBrands.push(brand);
      continue;
    }
    if (brand.manual === true) {
      keptBrands.push(brand);
      continue;
    }
    if (usedBrandNames.has(brand.name.trim().toLowerCase())) {
      keptBrands.push(brand);
      continue;
    }
    await catalogRepository.deleteBrand(brand);
  }

  return { brands: keptBrands, engines: keptEngines };
}
