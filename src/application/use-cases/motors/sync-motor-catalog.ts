import { BrandEntity, CatalogRepository, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

export async function syncMotorCatalogUseCase(
  catalogRepository: CatalogRepository,
  params: {
    companyId: string;
    brandName?: string;
    engineCode?: string;
    existingBrands: BrandEntity[];
    existingEngines: EngineEntity[];
  },
): Promise<{ brands: BrandEntity[]; engines: EngineEntity[] }> {
  let brands = params.existingBrands;
  let engines = params.existingEngines;

  const brandName = params.brandName?.trim();
  if (!brandName || brandName === "Не указан") {
    return { brands, engines };
  }

  const brand = await catalogRepository.upsertBrand(params.companyId, brandName, brands);
  if (!brands.some((item) => item.localId === brand.localId)) {
    brands = [...brands, brand];
  }

  const engineCode = params.engineCode?.trim();
  if (!engineCode || engineCode === "—") {
    return { brands, engines };
  }

  const engine = await catalogRepository.upsertEngine(
    params.companyId,
    brand.localId,
    engineCode,
    engines,
  );
  if (!engines.some((item) => item.localId === engine.localId)) {
    engines = [...engines, engine];
  }

  return { brands, engines };
}
