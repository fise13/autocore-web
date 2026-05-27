import { MotorEntity } from "@/domain/motor";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

function stableId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash > 0 ? hash : -hash || 1;
}

/** macOS хранит бренды/базы локально; в Firestore они часто только в полях motor.brandName / engineCode. */
export function deriveCatalogFromMotors(
  motors: MotorEntity[],
  companyId: string,
): { brands: BrandEntity[]; engines: EngineEntity[] } {
  const brandByName = new Map<string, BrandEntity>();
  const engineByKey = new Map<string, EngineEntity>();

  for (const motor of motors) {
    const brandName = motor.brandName?.trim();
    if (!brandName) continue;

    let brand = brandByName.get(brandName);
    if (!brand) {
      brand = {
        id: `derived-brand-${stableId(brandName)}`,
        localId: stableId(brandName),
        name: brandName,
        companyId,
      };
      brandByName.set(brandName, brand);
    }

    const engineCode = motor.engineCode?.trim();
    if (!engineCode) continue;

    const engineKey = `${brand.localId}:${engineCode.toLowerCase()}`;
    if (engineByKey.has(engineKey)) continue;

    engineByKey.set(engineKey, {
      id: `derived-engine-${stableId(engineKey)}`,
      localId: stableId(engineKey),
      brandLocalId: brand.localId,
      code: engineCode,
      companyId,
    });
  }

  const brands = Array.from(brandByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );
  const engines = Array.from(engineByKey.values()).sort((a, b) =>
    a.code.localeCompare(b.code, "ru"),
  );

  return { brands, engines };
}

export function mergeCatalogSources(
  primary: { brands: BrandEntity[]; engines: EngineEntity[] },
  fallback: { brands: BrandEntity[]; engines: EngineEntity[] },
): { brands: BrandEntity[]; engines: EngineEntity[] } {
  if (primary.brands.length > 0) {
    return primary;
  }
  return fallback;
}
