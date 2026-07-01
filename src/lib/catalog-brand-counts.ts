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
