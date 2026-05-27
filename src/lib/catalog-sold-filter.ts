import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { MotorEntity } from "@/domain/motor";

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function filterCatalogBySoldMotors(
  brands: BrandEntity[],
  engines: EngineEntity[],
  soldMotors: MotorEntity[],
): { brands: BrandEntity[]; engines: EngineEntity[] } {
  if (soldMotors.length === 0) {
    return { brands: [], engines: [] };
  }

  const brandNames = new Set(
    soldMotors.map((motor) => normalizeToken(motor.brandName)).filter((name) => name.length > 0),
  );

  const engineKeys = new Set(
    soldMotors
      .map((motor) => `${normalizeToken(motor.brandName)}::${normalizeToken(motor.engineCode)}`)
      .filter((key) => !key.startsWith("::") && !key.endsWith("::")),
  );

  const filteredBrands = brands.filter((brand) => brandNames.has(normalizeToken(brand.name)));

  const filteredEngines = engines.filter((engine) => {
    const brand = brands.find((item) => item.localId === engine.brandLocalId);
    if (!brand) return false;
    const key = `${normalizeToken(brand.name)}::${normalizeToken(engine.code)}`;
    return engineKeys.has(key);
  });

  return { brands: filteredBrands, engines: filteredEngines };
}

export function countSoldMotorsByBrand(
  brands: BrandEntity[],
  soldMotors: MotorEntity[],
): Map<number, number> {
  const counts = new Map<number, number>();

  for (const motor of soldMotors) {
    const brand = brands.find(
      (item) => normalizeToken(item.name) === normalizeToken(motor.brandName),
    );
    if (!brand) continue;
    counts.set(brand.localId, (counts.get(brand.localId) ?? 0) + 1);
  }

  return counts;
}
