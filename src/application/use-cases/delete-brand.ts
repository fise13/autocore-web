import { BrandEntity, CatalogRepository, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

export async function deleteBrandUseCase(
  catalogRepository: CatalogRepository,
  params: {
    brand: BrandEntity;
    engines: EngineEntity[];
  },
): Promise<void> {
  const brandEngines = params.engines.filter((engine) => engine.brandLocalId === params.brand.localId);
  for (const engine of brandEngines) {
    await catalogRepository.deleteEngine(engine);
  }
  await catalogRepository.deleteBrand(params.brand);
}
