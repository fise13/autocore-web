import { CompanyAppConfig } from "@/domain/company-config";
import { createCompanyConfigRepository } from "@/infrastructure/firestore/company-config-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { applyCompanyModulesToSidebar } from "@/lib/navigation/apply-company-modules";
import { readSidebarCustomization, writeSidebarCustomization } from "@/lib/navigation/sidebar-customization";

const configRepository = createCompanyConfigRepository();
const specificRepository = createSpecificCategoryRepository();

type SaveCompanyAppConfigInput = {
  companyId: string;
  config: CompanyAppConfig;
  userId: string;
  markOnboardingCompleted?: boolean;
};

export async function saveCompanyAppConfig({
  companyId,
  config,
  userId,
  markOnboardingCompleted = false,
}: SaveCompanyAppConfigInput) {
  const finalConfig: CompanyAppConfig = {
    ...config,
    onboardingCompleted: markOnboardingCompleted ? true : config.onboardingCompleted,
  };

  await configRepository.saveAppConfig(companyId, finalConfig, userId);

  let existingCategories = await specificRepository.fetchCategories(companyId);
  for (const category of finalConfig.specificCategories.filter((item) => item.mode === "tracked")) {
    const ensured = await specificRepository.upsertCategory(
      companyId,
      category.name,
      existingCategories,
      userId,
      category.groupId,
      category.subcategoryId,
    );
    if (!existingCategories.some((item) => item.id === ensured.id)) {
      existingCategories = [...existingCategories, ensured];
    }
  }

  const sidebar = applyCompanyModulesToSidebar(readSidebarCustomization(), finalConfig);
  writeSidebarCustomization(sidebar);

  return finalConfig;
}
