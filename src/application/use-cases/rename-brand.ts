import { MotorEntity } from "@/domain/motor";
import { BrandEntity, CatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

export async function renameBrandUseCase(
  catalogRepository: CatalogRepository,
  motorRepository: MotorRepository,
  params: {
    uid: string;
    brand: BrandEntity;
    newName: string;
    existingBrands: BrandEntity[];
    motors: MotorEntity[];
  },
): Promise<void> {
  const normalizedName = params.newName.trim();
  if (!normalizedName) {
    throw new Error("Пустое имя бренда");
  }
  if (
    normalizedName.localeCompare(params.brand.name, "ru", { sensitivity: "accent" }) === 0
  ) {
    return;
  }

  await catalogRepository.updateBrandName(params.brand, normalizedName, params.existingBrands);

  const oldName = params.brand.name;
  for (const motor of params.motors) {
    if (
      motor.brandName?.localeCompare(oldName, "ru", { sensitivity: "accent" }) !== 0
    ) {
      continue;
    }
    await motorRepository.update(params.uid, motor.id, { brandName: normalizedName });
  }
}
