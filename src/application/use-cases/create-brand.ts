import { BrandEntity, CatalogRepository } from "@/infrastructure/firestore/catalog-repository";

export async function createBrandUseCase(
  catalogRepository: CatalogRepository,
  params: {
    companyId: string;
    name: string;
    existingBrands: BrandEntity[];
  },
): Promise<BrandEntity> {
  return catalogRepository.upsertBrand(params.companyId, params.name, params.existingBrands);
}
