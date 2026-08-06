import { MotorEntity } from "@/domain/motor";
import { BrandEntity, CatalogRepository, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

function isDerivedCatalogId(id: string): boolean {
  return id.startsWith("derived-brand-") || id.startsWith("derived-engine-");
}

/**
 * Removes a brand from the company catalog (Excel-folder delete).
 * Clears matching motor.brandName so useEffectiveCatalog cannot re-derive the brand.
 */
export async function deleteBrandUseCase(
  catalogRepository: CatalogRepository,
  motorRepository: MotorRepository,
  params: {
    uid: string;
    brand: BrandEntity;
    engines: EngineEntity[];
    motors: MotorEntity[];
  },
): Promise<void> {
  const brandEngines = params.engines.filter(
    (engine) => engine.brandLocalId === params.brand.localId,
  );

  for (const engine of brandEngines) {
    if (isDerivedCatalogId(engine.id)) continue;
    await catalogRepository.deleteEngine(engine);
  }

  if (!isDerivedCatalogId(params.brand.id)) {
    await catalogRepository.deleteBrand(params.brand);
  }

  const brandName = params.brand.name;
  for (const motor of params.motors) {
    if (
      motor.brandName?.localeCompare(brandName, "ru", { sensitivity: "accent" }) !== 0
    ) {
      continue;
    }
    await motorRepository.update(params.uid, motor.id, { brandName: "" });
  }
}
