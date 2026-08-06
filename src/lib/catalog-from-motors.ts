import { isMotorInIntake, type MotorEntity } from "@/domain/motor";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";

function stableId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash > 0 ? hash : -hash || 1;
}

function normalizeBrandName(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "Не указан") return "";
  return trimmed;
}

function normalizeEngineCode(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "—") return "";
  return trimmed;
}

function brandKey(name: string): string {
  return name.trim().toLowerCase();
}

function engineKey(brandName: string, code: string): string {
  return `${brandKey(brandName)}::${code.trim().toLowerCase()}`;
}

/** macOS хранит бренды/базы локально; в Firestore они часто только в полях motor.brandName / engineCode. */
export function deriveCatalogFromMotors(
  motors: MotorEntity[],
  companyId: string,
): { brands: BrandEntity[]; engines: EngineEntity[] } {
  const brandByName = new Map<string, BrandEntity>();
  const engineByKey = new Map<string, EngineEntity>();

  for (const motor of motors) {
    if (isMotorInIntake(motor)) continue;
    const brandName = normalizeBrandName(motor.brandName);
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

    const engineCode = normalizeEngineCode(motor.engineCode);
    if (!engineCode) continue;

    const key = engineKey(brandName, engineCode);
    if (engineByKey.has(key)) continue;

    engineByKey.set(key, {
      id: `derived-engine-${stableId(key)}`,
      localId: stableId(key),
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

export type MergeCatalogOptions = {
  /**
   * When true, motors were loaded for the catalog. Sidebar mirrors Excel:
   * only brands/engines that appear on motors (Firestore ids preferred when names match).
   * If motors have no brand names yet, keep Firestore brands (empty "+" folders).
   */
  motorsLoaded?: boolean;
};

/**
 * Combines Firestore catalog docs with brands derived from motor fields.
 * With motorsLoaded, orphan Firestore brands (not present on any motor) are hidden.
 */
export function mergeCatalogSources(
  primary: { brands: BrandEntity[]; engines: EngineEntity[] },
  fallback: { brands: BrandEntity[]; engines: EngineEntity[] },
  options?: MergeCatalogOptions,
): { brands: BrandEntity[]; engines: EngineEntity[] } {
  if (!options?.motorsLoaded) {
    if (primary.brands.length > 0) return primary;
    return fallback;
  }

  if (fallback.brands.length === 0) {
    return primary.brands.length > 0 ? primary : fallback;
  }

  const firestoreBrandByName = new Map(
    primary.brands.map((brand) => [brandKey(brand.name), brand] as const),
  );
  const brandsFromMotors = fallback.brands.map(
    (derived) => firestoreBrandByName.get(brandKey(derived.name)) ?? derived,
  );
  const motorBrandKeys = new Set(brandsFromMotors.map((brand) => brandKey(brand.name)));
  const manualFolders = primary.brands.filter(
    (brand) => brand.manual === true && !motorBrandKeys.has(brandKey(brand.name)),
  );
  const brands = [...brandsFromMotors, ...manualFolders];
  const brandLocalIdByName = new Map(
    brands.map((brand) => [brandKey(brand.name), brand.localId] as const),
  );

  const firestoreEngineByKey = new Map<string, EngineEntity>();
  for (const engine of primary.engines) {
    const brand = primary.brands.find((item) => item.localId === engine.brandLocalId);
    if (!brand) continue;
    firestoreEngineByKey.set(engineKey(brand.name, engine.code), engine);
  }

  const derivedBrandNameByLocalId = new Map(
    fallback.brands.map((brand) => [brand.localId, brand.name] as const),
  );

  const engines = fallback.engines.map((derived) => {
    const brandName = derivedBrandNameByLocalId.get(derived.brandLocalId) ?? "";
    const key = engineKey(brandName, derived.code);
    const firestoreEngine = firestoreEngineByKey.get(key);
    const mergedBrandLocalId =
      brandLocalIdByName.get(brandKey(brandName)) ?? derived.brandLocalId;
    if (firestoreEngine) {
      return { ...firestoreEngine, brandLocalId: mergedBrandLocalId };
    }
    return { ...derived, brandLocalId: mergedBrandLocalId };
  });

  return {
    brands: [...brands].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    engines: [...engines].sort((left, right) => left.code.localeCompare(right.code, "ru")),
  };
}

/** Brand / engine names currently referenced by active motors (or grid rows). */
export function collectUsedCatalogKeys(
  motors: Array<Pick<MotorEntity, "brandName" | "engineCode">>,
): {
  brandNames: Set<string>;
  engineKeys: Set<string>;
} {
  const brandNames = new Set<string>();
  const engineKeys = new Set<string>();

  for (const motor of motors) {
    const brandName = normalizeBrandName(motor.brandName);
    if (!brandName) continue;
    brandNames.add(brandKey(brandName));

    const code = normalizeEngineCode(motor.engineCode);
    if (!code) continue;
    engineKeys.add(engineKey(brandName, code));
  }

  return { brandNames, engineKeys };
}
