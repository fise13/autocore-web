import { BrandEntity } from "@/infrastructure/firestore/catalog-repository";
import { MotorEntity } from "@/domain/motor";

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function countMotorsByBrand(
  brands: BrandEntity[],
  motors: MotorEntity[],
): Map<number, number> {
  const counts = new Map<number, number>();

  for (const motor of motors) {
    if (motor.deletedAt) continue;
    const brand = brands.find(
      (item) => normalizeToken(item.name) === normalizeToken(motor.brandName),
    );
    if (!brand) continue;
    counts.set(brand.localId, (counts.get(brand.localId) ?? 0) + 1);
  }

  return counts;
}

export type EngineStock = { code: string; count: number };

/** In-stock motors per brand (keyed by lower-cased brand name), split by engine code. */
export function countStockByBrandEngine(motors: MotorEntity[]): Map<string, EngineStock[]> {
  const byBrand = new Map<string, Map<string, EngineStock>>();

  for (const motor of motors) {
    if (motor.deletedAt || motor.soldDate || motor.status === "sold") continue;
    const brand = normalizeToken(motor.brandName);
    const code = (motor.engineCode ?? "").trim();
    if (!brand || !code || code === "—") continue;

    const engines = byBrand.get(brand) ?? new Map<string, EngineStock>();
    byBrand.set(brand, engines);
    const key = code.toLowerCase();
    const entry = engines.get(key) ?? { code, count: 0 };
    entry.count += 1;
    engines.set(key, entry);
  }

  return new Map(
    Array.from(byBrand, ([brand, engines]) => [
      brand,
      Array.from(engines.values()).sort((a, b) =>
        a.code.localeCompare(b.code, "en", { numeric: true }),
      ),
    ]),
  );
}
